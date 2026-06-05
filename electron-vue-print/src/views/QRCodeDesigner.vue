<template>
  <div class="designer-container">
    <!-- 左侧工具栏 -->
    <div class="left-toolbar">
      <div class="toolbar-title">元素工具</div>
      <div class="tool-items">
        <div 
          class="tool-item"
          draggable="true"
          @dragstart="handleToolDragStart"
          data-tool="textbox"
        >
          <div class="tool-icon">📝</div>
          <div class="tool-name">文本框</div>
        </div>
      </div>
    </div>
    
    <!-- 中间设计区域 -->
    <div class="main-content">
      <div class="toolbar">
        <a-space wrap>
          <!-- 操作按钮 -->
          <a-button type="primary" @click="handlePrint">
            <template #icon>
              <PrinterOutlined/>
            </template>
            打印
          </a-button>
        </a-space>
      </div>

      <!-- Canvas设计区 -->
      <div class="canvas-wrapper">
        <RulerCanvas
            :canvas-width="canvasWidth"
            :canvas-height="canvasHeight"
            :scale="3.78 * displayScale"
        >
          <canvas
              ref="canvasRef"
              class="design-canvas"
              :width="canvasWidth"
              :height="canvasHeight"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @dblclick="handleDoubleClick"
              @dragover="handleDragOver"
              @drop="handleDrop"
          ></canvas>
        </RulerCanvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import {message} from 'ant-design-vue';
import {PrinterOutlined} from '@ant-design/icons-vue';
import QRCode from 'qrcode';
import RulerCanvas from '../components/RulerCanvas.vue';

const canvasRef = ref(null);
// 使用当前打印纸张尺寸（60x40mm），显示时放大2倍
const displayScale = 2;
const paperWidth = 60;
const paperHeight = 40;
const canvasWidth = ref(paperWidth * 3.78 * displayScale);
const canvasHeight = ref(paperHeight * 3.78 * displayScale);

// 二维码设置
const qrCodeValue = ref('3-190787210592256000');
const qrCodeOptions = ref({
  errorCorrectionLevel: 'M',
  width: 100,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

// 文本框元素
const textboxes = ref([]);
const selectedElement = ref(null);
const elementIdCounter = ref(1000);

// 画布上的二维码
const qrCode = ref(null);
const selectedQRCode = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({x: 0, y: 0});
const resizeHandle = ref('');

// 编辑状态
const isEditing = ref(false);
const editingText = ref('');

// 常量定义
const CONSTANTS = {
  HANDLE_SIZE: 8,
  UPDATE_THROTTLE: 16, // 60fps
  MIN_SIZE: 30,
  INITIAL_SIZE: 100,
  MARGIN_OFFSET: 20,
  BORDER_OFFSET: 5
};

// 二维码图像缓存
let qrCodeImageCache = null;
let lastQRCodeHash = null;

// 动画优化
let animationFrameId = null;
let lastUpdateTime = 0;

let canvas = null;
let ctx = null;

onMounted(() => {
  canvas = canvasRef.value;
  ctx = canvas.getContext('2d');
  addDefaultQRCode();

  // 添加全局事件监听确保拖拽在canvas外也能正常工作
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
});

// 清理事件监听
const cleanup = () => {
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  // 清理缓存
  qrCodeImageCache = null;
  lastQRCodeHash = null;
};

// 组件卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}

// 添加默认二维码
const addDefaultQRCode = () => {
  const initialSize = CONSTANTS.INITIAL_SIZE * displayScale;
  qrCode.value = {
    id: Date.now(),
    value: qrCodeValue.value,
    options: {...qrCodeOptions.value},
    x: CONSTANTS.MARGIN_OFFSET * displayScale,
    y: CONSTANTS.MARGIN_OFFSET * displayScale,
    rotation: 0,
    scale: 1,
    width: initialSize,
    height: initialSize,
  };
  
  clearImageCache();
  drawCanvas();
};

// 绘制画布 - 优化性能
const drawCanvas = async () => {
  if (!ctx) return;

  try {
    // 清空画布
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

    // 绘制二维码
    if (qrCode.value) {
      await drawQRCode(qrCode.value);
    }
    
    // 绘制文本框
    textboxes.value.forEach(textbox => {
      drawTextBox(textbox);
    });
  } catch (error) {
    handleError(error, '绘制画布');
  }
};


// 生成二维码内容的哈希值，用于缓存判断
// 注意：这里只包含二维码的内容和生成选项，不包含显示尺寸
const generateQRCodeHash = (qrCode) => {
  return JSON.stringify({
    value: qrCode.value,
    options: qrCode.options
  });
};

// 生成并缓存二维码图像
const generateQRCodeImage = async (qrCode) => {
  const currentHash = generateQRCodeHash(qrCode);
  
  // 如果缓存存在且内容未变，直接返回缓存
  // 缓存的是二维码的原始图像，与显示尺寸无关
  if (qrCodeImageCache && lastQRCodeHash === currentHash) {
    return qrCodeImageCache;
  }
  
  try {
    // 生成新的二维码
    const dataURL = await QRCode.toDataURL(qrCode.value, qrCode.options);
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        // 更新缓存
        qrCodeImageCache = img;
        lastQRCodeHash = currentHash;
        resolve(img);
      };
      img.src = dataURL;
    });
  } catch (error) {
    handleError(error, '生成二维码');
    return null;
  }
};

// 绘制单个二维码（优化版本）
const drawQRCode = async (qrCode) => {
  try {
    // 获取缓存的或新生成的二维码图像
    const img = await generateQRCodeImage(qrCode);
    if (!img) return;

    // 保存画布状态
    ctx.save();

    // 移动到二维码位置并旋转
    ctx.translate(qrCode.x + qrCode.width / 2, qrCode.y + qrCode.height / 2);
    ctx.rotate(qrCode.rotation * Math.PI / 180);

    // 绘制二维码，使用实际设置的尺寸
    ctx.drawImage(img, -qrCode.width / 2, -qrCode.height / 2, qrCode.width, qrCode.height);

    // 如果是选中的二维码，绘制选中框（隐藏缩放控制点）
    if (selectedQRCode.value && selectedQRCode.value.id === qrCode.id) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      const offset = CONSTANTS.BORDER_OFFSET;
      ctx.strokeRect(-qrCode.width / 2 - offset, -qrCode.height / 2 - offset,
          qrCode.width + offset * 2, qrCode.height + offset * 2);
    }

    // 恢复画布状态
    ctx.restore();
  } catch (error) {
    handleError(error, '绘制二维码');
  }
};

// 工具栏拖拽开始
const handleToolDragStart = (event) => {
  const toolType = event.target.closest('.tool-item').dataset.tool;
  event.dataTransfer.setData('text/plain', toolType);
  event.dataTransfer.effectAllowed = 'copy';
};

// 画布拖拽悬停
const handleDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
};

// 画布拖拽放置
const handleDrop = (event) => {
  event.preventDefault();
  const toolType = event.dataTransfer.getData('text/plain');
  
  if (toolType === 'textbox') {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    addTextBox(x, y);
  }
};

// 添加文本框
const addTextBox = (x, y) => {
  const textbox = {
    id: elementIdCounter.value++,
    type: 'textbox',
    x: x,
    y: y,
    width: 120,
    height: 30,
    text: '文本内容',
    fontSize: 14,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: 'transparent',
    borderColor: '#cccccc',
    borderWidth: 1
  };
  
  textboxes.value.push(textbox);
  selectedElement.value = textbox;
  selectedQRCode.value = null;
  drawCanvas();
};

// 绘制文本框
const drawTextBox = (textbox) => {
  // 如果正在编辑这个文本框，跳过绘制文本内容
  const isEditingThis = isEditing.value && selectedElement.value && selectedElement.value.id === textbox.id;
  
  ctx.save();
  
  // 绘制背景
  if (textbox.backgroundColor && textbox.backgroundColor !== 'transparent') {
    ctx.fillStyle = textbox.backgroundColor;
    ctx.fillRect(textbox.x, textbox.y, textbox.width, textbox.height);
  }
  
  // 绘制边框
  if (textbox.borderWidth > 0) {
    ctx.strokeStyle = textbox.borderColor;
    ctx.lineWidth = textbox.borderWidth;
    ctx.strokeRect(textbox.x, textbox.y, textbox.width, textbox.height);
  }
  
  // 只有不在编辑模式时才绘制文本内容
  if (!isEditingThis) {
    // 绘制文本
    ctx.fillStyle = textbox.color;
    ctx.font = `${textbox.fontSize}px ${textbox.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 文本换行处理
    const lines = wrapText(textbox.text, textbox.width - 10);
    const lineHeight = textbox.fontSize + 2;
    const startY = textbox.y + textbox.height / 2 - (lines.length - 1) * lineHeight / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, textbox.x + 5, startY + index * lineHeight);
    });
  }
  
  // 如果是选中的元素，绘制选择框（编辑时不显示）
  if (selectedElement.value && selectedElement.value.id === textbox.id && !isEditingThis) {
    ctx.strokeStyle = '#1890ff';
    ctx.lineWidth = 2;
    const offset = CONSTANTS.BORDER_OFFSET;
    ctx.strokeRect(textbox.x - offset, textbox.y - offset, 
                   textbox.width + offset * 2, textbox.height + offset * 2);
    
    // 绘制缩放控制点
    const handleSize = CONSTANTS.HANDLE_SIZE;
    ctx.fillStyle = '#1890ff';
    ctx.fillRect(textbox.x + textbox.width - handleSize / 2, 
                textbox.y + textbox.height - handleSize / 2, handleSize, handleSize);
  }
  
  ctx.restore();
};

// 文本换行函数
const wrapText = (text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

// 查找指定位置的元素（二维码或文本框）
const findElementAtPosition = (x, y) => {
  // 先检查文本框
  for (let i = textboxes.value.length - 1; i >= 0; i--) {
    const textbox = textboxes.value[i];
    const handleSize = CONSTANTS.HANDLE_SIZE;
    if (x >= textbox.x - handleSize && x <= textbox.x + textbox.width + handleSize &&
        y >= textbox.y - handleSize && y <= textbox.y + textbox.height + handleSize) {
      return { element: textbox, type: 'textbox' };
    }
  }
  
  // 再检查二维码
  if (qrCode.value) {
    const qr = qrCode.value;
    const handleSize = CONSTANTS.HANDLE_SIZE;
    if (x >= qr.x - handleSize && x <= qr.x + qr.width + handleSize &&
        y >= qr.y - handleSize && y <= qr.y + qr.height + handleSize) {
      return { element: qr, type: 'qrcode' };
    }
  }
  
  return null;
};

// 获取元素的缩放控制点
const getResizeHandleForElement = (x, y, element) => {
  const handleSize = CONSTANTS.HANDLE_SIZE;
  const rightX = element.x + element.width;
  const bottomY = element.y + element.height;
  
  // 检查右下角控制点（扩大检测区域）
  if (x >= rightX - handleSize / 2 && x <= rightX + handleSize / 2 &&
      y >= bottomY - handleSize / 2 && y <= bottomY + handleSize / 2) {
    return 'se';
  }
  
  return null;
};

// 双击事件处理
const handleDoubleClick = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const elementInfo = findElementAtPosition(x, y);
  if (elementInfo && elementInfo.type === 'textbox') {
    startTextEdit(elementInfo.element);
  }
};

// 开始文本编辑
const startTextEdit = (textbox) => {
  selectedElement.value = textbox;
  isEditing.value = true;
  editingText.value = textbox.text;
  
  // 立即重绘canvas，清除该文本框的内容显示
  drawCanvas();
  
  // 创建临时输入框
  const input = document.createElement('input');
  input.type = 'text';
  input.value = textbox.text;
  input.style.position = 'absolute';
  
  // 计算输入框的正确位置，需要考虑canvas的位置
  const canvasRect = canvas.getBoundingClientRect();
  const canvasWrapper = canvas.parentElement;
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  
  const inputLeft = textbox.x + (canvasRect.left - wrapperRect.left);
  const inputTop = textbox.y + (canvasRect.top - wrapperRect.top);
  
  input.style.left = `${inputLeft}px`;
  input.style.top = `${inputTop}px`;
  input.style.width = `${textbox.width}px`;
  input.style.height = `${textbox.height}px`;
  input.style.fontSize = `${textbox.fontSize}px`;
  input.style.fontFamily = textbox.fontFamily;
  input.style.color = textbox.color;
  input.style.backgroundColor = textbox.backgroundColor === 'transparent' ? 'white' : (textbox.backgroundColor || 'white');
  input.style.border = '2px solid #1890ff';
  input.style.outline = 'none';
  input.style.zIndex = '1000';
  input.style.padding = '2px';
  input.style.boxSizing = 'border-box';
  
  canvasWrapper.style.position = 'relative';
  canvasWrapper.appendChild(input);
  
  // 延迟一帧再聚焦，确保输入框已经渲染
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);
  
  const finishEdit = () => {
    if (input.parentNode) {
      textbox.text = input.value || '文本内容';
      canvasWrapper.removeChild(input);
    }
    isEditing.value = false;
    drawCanvas();
  };
  
  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      finishEdit();
    }
  });
};

// 鼠标事件处理
const handleMouseDown = (event) => {
  // 如果正在编辑文本，不处理鼠标事件
  if (isEditing.value) {
    return;
  }
  
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const elementInfo = findElementAtPosition(x, y);
  if (elementInfo) {
    if (elementInfo.type === 'textbox') {
      selectedElement.value = elementInfo.element;
      selectedQRCode.value = null;
      
      // 检查是否点击了缩放控制点
      const handle = getResizeHandleForElement(x, y, elementInfo.element);
      if (handle) {
        isResizing.value = true;
        resizeHandle.value = handle;
        isDragging.value = false;
      } else if (isWithinBounds(x, y, elementInfo.element)) {
        isDragging.value = true;
        isResizing.value = false;
        dragOffset.value = {
          x: x - elementInfo.element.x,
          y: y - elementInfo.element.y,
        };
      }
    } else if (elementInfo.type === 'qrcode') {
      selectedQRCode.value = elementInfo.element;
      selectedElement.value = null;
      
      // 二维码只支持拖动，不支持缩放
      if (isWithinBounds(x, y, elementInfo.element)) {
        isDragging.value = true;
        isResizing.value = false;
        dragOffset.value = {
          x: x - elementInfo.element.x,
          y: y - elementInfo.element.y,
        };
      }
    }
    drawCanvas();
  } else {
    selectedQRCode.value = null;
    selectedElement.value = null;
    isDragging.value = false;
    isResizing.value = false;
    drawCanvas();
  }
};

const handleMouseMove = (event) => {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 只在需要时更新光标
  if (!isDragging.value && !isResizing.value) {
    if (selectedQRCode.value) {
      // 二维码只支持拖动，不显示缩放光标
      if (isWithinBounds(x, y, selectedQRCode.value)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    } else if (selectedElement.value) {
      const handle = getResizeHandleForElement(x, y, selectedElement.value);
      if (handle) {
        canvas.style.cursor = 'se-resize';
      } else if (isWithinBounds(x, y, selectedElement.value)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }
};

// 全局鼠标移动事件（用于拖拽和缩放）
const handleGlobalMouseMove = (event) => {
  if (!canvas || (!isDragging.value && !isResizing.value)) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (isResizing.value) {
    // 二维码不支持缩放，仅保留文本框缩放功能
    if (selectedElement.value) {
      // 文本框缩放逻辑
      const element = selectedElement.value;
      const newWidth = Math.max(50, Math.abs(x - element.x));
      const newHeight = Math.max(20, Math.abs(y - element.y));
      
      element.width = newWidth;
      element.height = newHeight;
    }
    
    throttledDraw();
  } else if (isDragging.value) {
    if (selectedQRCode.value) {
      // 二维码拖拽逻辑
      selectedQRCode.value.x = x - dragOffset.value.x;
      selectedQRCode.value.y = y - dragOffset.value.y;
    } else if (selectedElement.value) {
      // 文本框拖拽逻辑
      selectedElement.value.x = x - dragOffset.value.x;
      selectedElement.value.y = y - dragOffset.value.y;
    }
    
    throttledDraw();
  }
};

// 全局鼠标释放事件
const handleGlobalMouseUp = () => {
  if (isDragging.value || isResizing.value) {
    handleMouseUp();
  }
};

// 节流重绘函数
const throttledDraw = () => {
  const now = Date.now();
  if (now - lastUpdateTime < CONSTANTS.UPDATE_THROTTLE) {
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        drawCanvas();
        lastUpdateTime = Date.now();
        animationFrameId = null;
      });
    }
    return;
  }

  drawCanvas();
  lastUpdateTime = now;
};

const handleMouseUp = () => {
  if (!isDragging.value && !isResizing.value) return;

  isDragging.value = false;
  isResizing.value = false;
  resizeHandle.value = '';

  // 重置光标
  if (canvas) {
    canvas.style.cursor = 'default';
  }

  // 清理动画帧并确保最终重绘
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  drawCanvas();
};

// 查找指定位置的二维码（包含控制点区域）
const findQRCodeAtPosition = (x, y) => {
  if (!qrCode.value) return null;

  const qr = qrCode.value;
  const handleSize = CONSTANTS.HANDLE_SIZE;
  // 扩大检测区域，包含控制点
  return (x >= qr.x - handleSize && x <= qr.x + qr.width + handleSize &&
      y >= qr.y - handleSize && y <= qr.y + qr.height + handleSize) ? qr : null;
};

// 工具函数
const isWithinBounds = (x, y, element) => {
  return x >= element.x && x <= element.x + element.width &&
         y >= element.y && y <= element.y + element.height;
};

const clearImageCache = () => {
  qrCodeImageCache = null;
  lastQRCodeHash = null;
};

// 统一错误处理
const handleError = (error, context = '') => {
  console.error(`[二维码设计器${context}] 错误:`, error);
  message.error(`操作失败: ${error.message || '未知错误'}`);
};


// 绘制文本框到打印canvas - 简单直接的文本绘制
const drawTextBoxToPrint = (printCtx, textbox) => {
  if (!printCtx || !textbox) {
    throw new Error('Invalid parameters for drawTextBoxToPrint');
  }
  
  printCtx.save();
  
  try {
    // 按设计器中的位置和尺寸缩放到打印尺寸，保持与二维码一致
    const printX = Math.round(textbox.x / displayScale);
    const printY = Math.round(textbox.y / displayScale);
    const printWidth = Math.round(textbox.width / displayScale);
    const printHeight = Math.round(textbox.height / displayScale);
    
    console.log(`绘制文本框: "${textbox.text}" 位置: (${printX}, ${printY}) 尺寸: ${printWidth}x${printHeight}`);
    
    // 验证尺寸
    if (printWidth <= 0 || printHeight <= 0) {
      console.warn('文本框尺寸无效，跳过绘制');
      return;
    }
    
    // 绘制文本内容
    if (textbox.text && textbox.text.trim() !== '') {
      // 优化打印字体配置
      const PRINT_CONFIG = {
        fontSize: 13,
        lineSpacing: 4,
        strokeWidth: 0.1,
        fontStack: 'SimSun, "Courier New", Tahoma, "Microsoft YaHei", Arial, sans-serif'
      };
      
      printCtx.font = `${PRINT_CONFIG.fontSize}px ${PRINT_CONFIG.fontStack}`;
      
      printCtx.fillStyle = textbox.color || '#000000';
      printCtx.textAlign = 'left';
      printCtx.textBaseline = 'middle';
      
      // 文本换行处理
      const printLines = wrapTextForPrint(printCtx, textbox.text, printWidth - 8);
      const printLineHeight = PRINT_CONFIG.fontSize + PRINT_CONFIG.lineSpacing;
      const totalTextHeight = printLines.length * printLineHeight;
      const startY = Math.round(printY + printHeight / 2 - totalTextHeight / 2 + printLineHeight / 2);
      
      // 抗锯齿渲染设置
      printCtx.imageSmoothingEnabled = false;
      if (printCtx.textRenderingOptimization) {
        printCtx.textRenderingOptimization = 'optimizeSpeed';
      }
      
      // 绘制每一行文本
      const strokeColor = textbox.color || '#000000';
      printCtx.lineWidth = PRINT_CONFIG.strokeWidth;
      printCtx.strokeStyle = strokeColor;
      
      printLines.forEach((line, index) => {
        if (line.trim() !== '') {
          const x = Math.round(printX + 4);
          const y = Math.round(startY + index * printLineHeight);
          
          printCtx.strokeText(line, x, y);
          printCtx.fillText(line, x, y);
        }
      });
    }
    
  } catch (error) {
    console.error('绘制文本框时出错:', error);
    throw error;
  } finally {
    printCtx.restore();
  }
};

// 专用于打印的文本换行函数 - 改进版，支持中英文混合，更精确的换行判断
const wrapTextForPrint = (printCtx, text, maxWidth) => {
  if (!text || text.trim() === '') {
    return [''];
  }
  
  // 首先检查整个文本是否需要换行
  const totalWidth = printCtx.measureText(text).width;
  if (totalWidth <= maxWidth) {
    return [text];
  }
  
  const lines = [];
  let currentLine = '';
  
  // 逐字符检查，但更智能地处理标点符号和空格，避免断裂
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    
    // 确保测量文本宽度时使用正确的字体设置
    const width = printCtx.measureText(testLine).width;
    
    if (width > maxWidth && currentLine !== '') {
      // 如果当前行不为空，才进行换行
      lines.push(currentLine.trim()); // 移除行尾空格
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine !== '') {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [''];
};

// 打印
const handlePrint = async () => {
  if (!qrCode.value && textboxes.value.length === 0) {
    message.warning('请先添加二维码或文本框');
    return;
  }

  try {
    // 创建打印用的canvas，按实际尺寸（缩小2倍）
    const printCanvas = document.createElement('canvas');
    printCanvas.width = paperWidth * 3.78;
    printCanvas.height = paperHeight * 3.78;
    const printCtx = printCanvas.getContext('2d');

    // 绘制白色背景
    printCtx.fillStyle = '#ffffff';
    printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // 绘制二维码到打印canvas
    if (qrCode.value) {
      try {
        const qr = qrCode.value;
        // 使用调整后的尺寸生成二维码
        const printOptions = {
          ...qr.options,
          width: Math.round(qr.width / displayScale), // 转换为实际打印尺寸
          margin: 1
        };

        const dataURL = await QRCode.toDataURL(qr.value, printOptions);
        const img = new Image();

        await new Promise((resolve) => {
          img.onload = () => {
            printCtx.save();
            // 按设计器中的位置和尺寸缩放到打印尺寸
            const printX = qr.x / displayScale;
            const printY = qr.y / displayScale;
            const printWidth = qr.width / displayScale;
            const printHeight = qr.height / displayScale;

            printCtx.translate(printX + printWidth / 2, printY + printHeight / 2);
            printCtx.rotate(qr.rotation * Math.PI / 180);
            printCtx.drawImage(img, -printWidth / 2, -printHeight / 2, printWidth, printHeight);
            printCtx.restore();
            resolve();
          };
          img.src = dataURL;
        });
      } catch (error) {
        handleError(error, '生成打印二维码');
      }
    }

    // 绘制文本框到打印canvas
    console.log(`准备绘制 ${textboxes.value.length} 个文本框`);
    
    for (let index = 0; index < textboxes.value.length; index++) {
      const textbox = textboxes.value[index];
      try {
        console.log(`绘制文本框 ${index + 1}: "${textbox.text}"`);
        drawTextBoxToPrint(printCtx, textbox);
      } catch (error) {
        console.error(`绘制文本框 ${index + 1} 失败:`, error);
        // 继续处理其他文本框，不中断整个打印流程
      }
    }

    // 这里可以调用electron的打印API，传入打印用的canvas数据
    const printData = printCanvas.toDataURL();
    await window.electronAPI?.printQRCode(qrCodeValue.value, printData);
    message.success('打印成功');
  } catch (error) {
    handleError(error, '打印操作');
  }
};
</script>

<style scoped>
.designer-container {
  width: 100%;
  height: 100%;
  display: flex;
}

.left-toolbar {
  width: 200px;
  background: #f5f5f5;
  border-right: 1px solid #e8e8e8;
  padding: 16px;
  box-sizing: border-box;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.tool-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
}

.tool-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-item:active {
  cursor: grabbing;
}

.tool-icon {
  font-size: 20px;
  margin-right: 8px;
}

.tool-name {
  font-size: 14px;
  color: #333;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #ffffff;
}

.design-canvas {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #d9d9d9;
  display: block;
  cursor: pointer;
}
</style>
