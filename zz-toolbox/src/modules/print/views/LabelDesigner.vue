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
            <template #icon><PrinterOutlined /></template>
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
import {PrinterOutlined,} from '@ant-design/icons-vue';
import JsBarcode from 'jsbarcode';
import RulerCanvas from '../components/RulerCanvas.vue';

const canvasRef = ref(null);
// 使用当前打印纸张尺寸（60x40mm），显示时放大2倍
const displayScale = 2;
const paperWidth = 60;
const paperHeight = 40;
const canvasWidth = ref(paperWidth * 3.78 * displayScale);
const canvasHeight = ref(paperHeight * 3.78 * displayScale);

// 条形码设置
const barcodeValue = ref('3-190787210592256000');
const barcodeFormat = ref('CODE128');
const barcodeOptions = ref({
  width: 2,
  height: 100,
  displayValue: false,
  fontSize: 14,
});

// 文本框元素
const textboxes = ref([]);
const selectedElement = ref(null);
const elementIdCounter = ref(1000);

// 画布上的条形码
const barcode = ref(null);
const selectedBarcode = ref(null);
const isDragging = ref(false);
const isResizing = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const resizeHandle = ref('');

// 编辑状态
const isEditing = ref(false);
const editingText = ref('');

// 常量定义
const CONSTANTS = {
  HANDLE_SIZE: 8,
  UPDATE_THROTTLE: 16, // 60fps
  MIN_WIDTH: 50,
  MIN_HEIGHT: 30,
  INITIAL_WIDTH: 200,
  INITIAL_HEIGHT: 100,
  MARGIN_OFFSET: 50,
  BORDER_OFFSET: 5
};

// 条形码图像缓存
let barcodeImageCache = null;
let lastBarcodeHash = null;

// 动画优化
let animationFrameId = null;
let lastUpdateTime = 0;

let canvas = null;
let ctx = null;

onMounted(() => {
  canvas = canvasRef.value;
  ctx = canvas.getContext('2d');
  addDefaultBarcode();
  
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
  barcodeImageCache = null;
  lastBarcodeHash = null;
};

// 组件卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}

// 添加默认条形码
const addDefaultBarcode = () => {
  barcode.value = {
    id: Date.now(),
    value: barcodeValue.value,
    format: barcodeFormat.value,
    options: { ...barcodeOptions.value },
    x: CONSTANTS.MARGIN_OFFSET * displayScale,
    y: CONSTANTS.MARGIN_OFFSET * displayScale,
    rotation: 0,
    width: CONSTANTS.INITIAL_WIDTH * displayScale,
    height: CONSTANTS.INITIAL_HEIGHT * displayScale,
  };
  
  clearImageCache();
  drawCanvas();
};


// 绘制画布
const drawCanvas = () => {
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  
  // 绘制背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
  
  // 绘制条形码
  if (barcode.value) {
    drawBarcode(barcode.value);
  }
  
  // 绘制文本框
  textboxes.value.forEach(textbox => {
    drawTextBox(textbox);
  });
};


// 生成条形码内容的哈希值，用于缓存判断
const generateBarcodeHash = (barcode) => {
  return JSON.stringify({
    value: barcode.value,
    format: barcode.format,
    options: barcode.options
  });
};

// 生成并缓存条形码图像
const generateBarcodeImage = (barcode) => {
  const currentHash = generateBarcodeHash(barcode);
  
  // 如果缓存存在且内容未变，直接返回缓存
  if (barcodeImageCache && lastBarcodeHash === currentHash) {
    return barcodeImageCache;
  }
  
  try {
    // 创建临时canvas来生成条形码
    const tempCanvas = document.createElement('canvas');
    JsBarcode(tempCanvas, barcode.value, {
      format: barcode.format,
      width: barcode.options.width,
      height: barcode.options.height,
      displayValue: barcode.options.displayValue,
      fontSize: barcode.options.fontSize,
    });
    
    // 更新缓存
    barcodeImageCache = tempCanvas;
    lastBarcodeHash = currentHash;
    
    return tempCanvas;
  } catch (error) {
    handleError(error, '生成条形码');
    return null;
  }
};

// 绘制单个条形码（优化版本）
const drawBarcode = (barcode) => {
  try {
    // 获取缓存的或新生成的条形码图像
    const tempCanvas = generateBarcodeImage(barcode);
    if (!tempCanvas) return;
    
    // 保存画布状态
    ctx.save();
    
    // 移动到条形码位置并旋转
    ctx.translate(barcode.x + tempCanvas.width / 2, barcode.y + tempCanvas.height / 2);
    ctx.rotate(barcode.rotation * Math.PI / 180);
    
    // 绘制条形码
    ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
    
    // 如果是选中的条形码，绘制选中框（隐藏缩放控制点）
    if (selectedBarcode.value && selectedBarcode.value.id === barcode.id) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      const offset = CONSTANTS.BORDER_OFFSET;
      ctx.strokeRect(-tempCanvas.width / 2 - offset, -tempCanvas.height / 2 - offset, 
                     tempCanvas.width + offset * 2, tempCanvas.height + offset * 2);
    }
    
    // 恢复画布状态
    ctx.restore();
    
    // 更新条形码尺寸
    barcode.width = tempCanvas.width;
    barcode.height = tempCanvas.height;
    
  } catch (error) {
    handleError(error, '绘制条形码');
  }
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
      selectedBarcode.value = null;
      
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
    } else if (elementInfo.type === 'barcode') {
      selectedBarcode.value = elementInfo.element;
      selectedElement.value = null;
      
      // 条形码只支持拖动，不支持缩放
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
    selectedBarcode.value = null;
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
    if (selectedBarcode.value) {
      // 条形码只支持拖动，不显示缩放光标
      if (isWithinBounds(x, y, selectedBarcode.value)) {
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
    // 条形码不支持缩放，仅保留文本框缩放功能
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
    if (selectedBarcode.value) {
      // 条形码拖拽逻辑
      selectedBarcode.value.x = x - dragOffset.value.x;
      selectedBarcode.value.y = y - dragOffset.value.y;
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

// 查找指定位置的元素（条形码或文本框）
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
  
  // 再检查条形码
  if (barcode.value) {
    const bc = barcode.value;
    const handleSize = CONSTANTS.HANDLE_SIZE;
    if (x >= bc.x - handleSize && x <= bc.x + bc.width + handleSize &&
        y >= bc.y - handleSize && y <= bc.y + bc.height + handleSize) {
      return { element: bc, type: 'barcode' };
    }
  }
  
  return null;
};

// 查找指定位置的条形码（包含控制点区域）
const findBarcodeAtPosition = (x, y) => {
  if (!barcode.value) return null;
  
  const bc = barcode.value;
  const handleSize = CONSTANTS.HANDLE_SIZE;
  // 扩大检测区域，包含控制点
  return (x >= bc.x - handleSize && x <= bc.x + bc.width + handleSize &&
          y >= bc.y - handleSize && y <= bc.y + bc.height + handleSize) ? bc : null;
};

// 工具函数
const isWithinBounds = (x, y, element) => {
  return x >= element.x && x <= element.x + element.width &&
         y >= element.y && y <= element.y + element.height;
};

const clearImageCache = () => {
  barcodeImageCache = null;
  lastBarcodeHash = null;
};

// 统一错误处理
const handleError = (error, context = '') => {
  console.error(`[条形码设计器${context}] 错误:`, error);
  message.error(`操作失败: ${error.message || '未知错误'}`);
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
  selectedBarcode.value = null;
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
  
  // 如果是选中的元素，绘制选择框（编辑时也要显示）
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

// 获取元素的缩放控制点（统一函数，适用于所有元素类型）
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


// 绘制文本框到打印canvas - 简单直接的文本绘制
const drawTextBoxToPrint = (printCtx, textbox) => {
  if (!printCtx || !textbox) {
    throw new Error('Invalid parameters for drawTextBoxToPrint');
  }
  
  printCtx.save();
  
  try {
    // 按设计器中的位置和尺寸缩放到打印尺寸，保持与条形码一致
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
  if (!barcode.value && textboxes.value.length === 0) {
    message.warning('请先添加条形码或文本框');
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
    
    // 绘制条形码到打印canvas
    if (barcode.value) {
      const tempCanvas = document.createElement('canvas');
      try {
        const bc = barcode.value;
        // 使用调整后的尺寸生成条形码
        JsBarcode(tempCanvas, bc.value, {
          format: bc.format,
          width: bc.options.width,
          height: bc.options.height,
          displayValue: bc.options.displayValue,
          fontSize: bc.options.fontSize,
        });
        
        printCtx.save();
        // 按设计器中的位置和尺寸缩放到打印尺寸
        const printX = bc.x / displayScale;
        const printY = bc.y / displayScale;
        const printWidth = bc.width / displayScale;
        const printHeight = bc.height / displayScale;
        
        printCtx.translate(printX + printWidth / 2, printY + printHeight / 2);
        printCtx.rotate(bc.rotation * Math.PI / 180);
        // 绘制时使用设计器中调整后的尺寸
        printCtx.drawImage(tempCanvas, -printWidth / 2, -printHeight / 2, printWidth, printHeight);
        printCtx.restore();
      } catch (error) {
        handleError(error, '生成打印条形码');
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
    
    // 优化打印数据生成 - 使用较低的质量以减少数据量
    console.log('生成打印数据...');
    const printData = printCanvas.toDataURL('image/png', 0.8);
    console.log(`打印数据大小: ${(printData.length / 1024).toFixed(2)} KB`);
    
    await window.electronAPI?.printBarCode(barcodeValue.value, printData);
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

.ruler-canvas-wrapper {
  position: relative;
}

.design-canvas {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #d9d9d9;
  display: block;
  cursor: pointer;
}
</style>
