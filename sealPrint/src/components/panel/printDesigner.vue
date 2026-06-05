<template>
  <div class="print-designer-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <a-space wrap>
        <!-- 纸张大小 -->
        <a-button-group>
          <a-button @click="setPaper('A3')">A3</a-button>
          <a-button @click="setPaper('A4')">A4</a-button>
          <a-button @click="setPaper('A5')">A5</a-button>
          <a-button @click="setPaper('B3')">B3</a-button>
          <a-button @click="setPaper('B4')">B4</a-button>
          <a-button @click="setPaper('B5')">B5</a-button>
        </a-button-group>

        <!-- 自定义纸张 -->
        <a-input-number
          v-model:value="customWidth"
          :min="10"
          :max="1000"
          placeholder="宽度(mm)"
          style="width: 100px"
        />
        <a-input-number
          v-model:value="customHeight"
          :min="10"
          :max="1000"
          placeholder="高度(mm)"
          style="width: 100px"
        />
        <a-button @click="setCustomPaper">自定义</a-button>

        <!-- 操作按钮 -->
        <a-button @click="rotatePaper">
          <template #icon>
            <RedoOutlined />
          </template>
          旋转
        </a-button>
        <a-button danger @click="clearTemplate">
          <template #icon>
            <ClearOutlined />
          </template>
          清空
        </a-button>
        <a-button type="primary" @click="preview">
          <template #icon>
            <EyeOutlined />
          </template>
          预览
        </a-button>
        <a-button type="primary" danger @click="print">
          <template #icon>
            <PrinterOutlined />
          </template>
          打印
        </a-button>
      </a-space>
    </div>

    <!-- 打印设计区域 -->
    <div class="print-template-wrapper">
      <div id="hiprint-printTemplate" class="hiprint-printTemplate"></div>
    </div>

    <!-- 操作区域 -->
<!--    <div class="action-section">-->
<!--      <a-space direction="vertical" style="width: 100%">-->
<!--        <a-alert-->
<!--          message="提示"-->
<!--          description="可视化结果以 JSON 的形式存在，用户可以编辑 JSON 实现特殊化操作，如：数据 formatter、文本变色、单元格改变背景等。"-->
<!--          type="info"-->
<!--          show-icon-->
<!--        />-->

<!--        <a-space>-->
<!--          <a-button type="primary" @click="getJsonToTextarea">-->
<!--            <template #icon>-->
<!--              <DownloadOutlined />-->
<!--            </template>-->
<!--            生成 JSON-->
<!--          </a-button>-->
<!--          <a-button @click="loadJsonFromTextarea">-->
<!--            <template #icon>-->
<!--              <UploadOutlined />-->
<!--            </template>-->
<!--            从 JSON 加载-->
<!--          </a-button>-->
<!--          <a-button @click="getHtmlToTextarea">-->
<!--            <template #icon>-->
<!--              <CodeOutlined />-->
<!--            </template>-->
<!--            生成 HTML-->
<!--          </a-button>-->
<!--        </a-space>-->
<!--        <a-tabs v-model:activeKey="activeTab">-->
<!--          <a-tab-pane key="json" tab="JSON 模板">-->
<!--            <a-textarea-->
<!--              v-model:value="jsonContent"-->
<!--              :rows="10"-->
<!--              placeholder="JSON 模板内容"-->
<!--            />-->
<!--          </a-tab-pane>-->
<!--          <a-tab-pane key="html" tab="HTML 内容">-->
<!--            <a-textarea-->
<!--              v-model:value="htmlContent"-->
<!--              :rows="10"-->
<!--              placeholder="HTML 内容"-->
<!--            />-->
<!--          </a-tab-pane>-->
<!--        </a-tabs>-->
<!--      </a-space>-->
<!--    </div>-->
    <!-- 骑缝章切割预览 -->
    <!--    <a-card-->
    <!--      v-if="showStampPreview && splitStampPreviews.length > 0"-->
    <!--      title="骑缝章切割预览"-->
    <!--      :bordered="true"-->
    <!--      class="stamp-preview-card"-->
    <!--    >-->
    <!--      <template #extra>-->
    <!--        <a-button-->
    <!--          size="small"-->
    <!--          @click="showStampPreview = false"-->
    <!--        >-->
    <!--          隐藏-->
    <!--        </a-button>-->
    <!--      </template>-->
    <!--      <div class="stamp-preview-container">-->
    <!--        <div-->
    <!--          v-for="preview in splitStampPreviews"-->
    <!--          :key="preview.pageIndex"-->
    <!--          class="stamp-preview-item"-->
    <!--        >-->
    <!--          <div class="preview-label">第 {{ preview.pageIndex }} 页</div>-->
    <!--          <div class="preview-image-wrapper">-->
    <!--            <img-->
    <!--              :src="preview.image"-->
    <!--              :alt="`第${preview.pageIndex}页印章`"-->
    <!--              class="preview-image"-->
    <!--            />-->
    <!--          </div>-->
    <!--          <div class="preview-info">-->
    <!--            尺寸: {{ preview.width.toFixed(1) }} × {{ preview.height.toFixed(1) }} mm-->
    <!--          </div>-->
    <!--        </div>-->
    <!--      </div>-->
    <!--    </a-card>-->

  </div>
</template>

<script setup>
/**
 * 打印模板设计器组件
 *
 * 功能说明：
 * - 提供可视化的打印模板设计界面
 * - 支持多种纸张尺寸和自定义尺寸
 * - 支持骑缝章（seamless stamp）功能，可自动切割并分布到多页
 * - 支持预览和打印功能，使用浏览器原生打印
 * - 支持JSON模板的导入导出
 *
 * 骑缝章处理流程：
 * 1. 预加载骑缝章图片并转换为base64
 * 2. 根据页数计算切割参数
 * 3. 使用StampSplitter切割图片
 * 4. 在每页HTML中移除原有骑缝章元素
 * 5. 插入切割后的骑缝章图片到指定位置
 */

import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  ClearOutlined,
  EyeOutlined,
  PrinterOutlined,
  RedoOutlined,
  DownloadOutlined,
  UploadOutlined,
  CodeOutlined,
} from '@ant-design/icons-vue';
import { getCustomPrintJson, getPrintData } from '@utils/printData.js';
import { StampSplitter } from '@utils/stampSplitter.js';

// ==================== 常量定义 ====================
const STAMP_CONSTANTS = {
  DEFAULT_MARGIN: 20, // 印章默认边距 (mm)
  DEFAULT_Z_INDEX: 9999, // 印章层级
  // MM_TO_PT: 2.83465, // mm转pt的转换系数
};

const PRINT_CONSTANTS = {
  IFRAME_LOAD_DELAY: 800, // iframe加载延迟 (ms)
  PRINT_FOCUS_DELAY: 100, // 打印焦点延迟 (ms)
  PRINT_CLEANUP_DELAY: 500, // 打印清理延迟 (ms)
};

const PAPER_PRESETS = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B3: { width: 353, height: 500 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
};

// ==================== 事件和属性 ====================
const emit = defineEmits(['template-change', 'preview']);

// ==================== 响应式状态 ====================
// 纸张设置
const customWidth = ref(210);
const customHeight = ref(297);

// UI状态
const activeTab = ref('json');
const jsonContent = ref('');
const htmlContent = ref('');
const showStampPreview = ref(false);

// 印章相关状态
const splitStampPreviews = ref([]);

// 核心模板对象（非响应式）
let hiprintTemplate = null;
let stampConfig = null;

// ==================== 生命周期 ====================
onMounted(() => {
  setTimeout(() => {
    initTemplate();
  }, 300);
});

// ==================== 工具函数 ====================
/**
 * 单位转换：mm转pt
 */
// const mmToPt = (mm) => mm * STAMP_CONSTANTS.MM_TO_PT;

/**
 * 判断是否为骑缝章元素
 */
const isStampElement = (el) => {
  return el?.options?.field === 'seamless_stamp_img' ||
    (el?.options?.seamless === true && el?.type === 'image');
};

/**
 * 预加载图片并转换为 base64
 */
const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve({ img, dataURL });
      } catch (error) {
        console.warn('无法转换图片为 base64，使用原始 URL:', error);
        resolve({ img, dataURL: url });
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * 获取当前纸张尺寸
 */
const getPaperSize = () => {
  const templateJson = hiprintTemplate?.getJson();
  const panel = templateJson?.panels?.[0];
  return {
    width: panel?.width || 210,
    height: panel?.height || 297,
  };
};

// ==================== 模板初始化 ====================
/**
 * 初始化打印模板
 */
const initTemplate = () => {
  if (!window.hiprint) {
    message.error('hiprint 库未加载');
    return;
  }

  try {
    hiprintTemplate = new window.hiprint.PrintTemplate({
      template: getCustomPrintJson(),
      settingContainer: '#PrintElementOptionSetting',
      paginationContainer: '.hiprint-printPagination',
    });
    hiprintTemplate.design('#hiprint-printTemplate');
    message.success('打印设计器初始化成功');
  } catch (error) {
    console.error('初始化失败:', error);
    message.error('初始化失败: ' + error.message);
  }
};

/**
 * 清空模板
 */
const clearTemplate = () => {
  if (hiprintTemplate) {
    hiprintTemplate.clear();
    jsonContent.value = '';
    htmlContent.value = '';
    stampConfig = null;
    removeStampOverlay();
    message.success('模板已清空');
  }
};

// ==================== 纸张操作 ====================
/**
 * 设置纸张
 */
const setPaper = (paperType) => {
  if (hiprintTemplate) {
    hiprintTemplate.setPaper(paperType);
    reapplyStamp();
    message.success(`已设置纸张为 ${paperType}`);
  }
};

/**
 * 设置自定义纸张
 */
const setCustomPaper = () => {
  if (!hiprintTemplate) return;
  if (!customWidth.value || !customHeight.value) {
    message.warning('请输入宽度和高度');
    return;
  }

  hiprintTemplate.setPaper(customWidth.value, customHeight.value);
  reapplyStamp();
  message.success(`已设置自定义纸张: ${customWidth.value}x${customHeight.value}mm`);
};

/**
 * 旋转纸张
 */
const rotatePaper = () => {
  if (hiprintTemplate) {
    hiprintTemplate.rotatePaper();
    reapplyStamp();
    message.success('纸张已旋转');
  }
};

// ==================== 骑缝章位置计算 ====================
/**
 * 计算印章垂直位置（返回 mm 单位）
 */
const getStampTopPositionMm = (position, height, paperHeight = 297) => {
  const positions = {
    top: STAMP_CONSTANTS.DEFAULT_MARGIN,
    middle: (paperHeight - height) / 2,
    bottom: paperHeight - height - STAMP_CONSTANTS.DEFAULT_MARGIN,
  };
  return positions[position] || positions.middle;
};

/**
 * 计算印章垂直位置（返回 pt 单位）
 */
const getStampTopPosition = (position, height, paperHeight = 297) => {
  return hinnn.mm.toPt(getStampTopPositionMm(position, height, paperHeight));
};

/**
 * 计算印章水平位置（返回 pt 单位）
 */
const getStampLeftPosition = (paperWidth, stampWidth) => {
  const leftMm = paperWidth - stampWidth;
  return hinnn.mm.toPt(leftMm);
};

// ==================== 骑缝章HTML处理 ====================
/**
 * 处理页面HTML，移除原有骑缝章并添加切割后的骑缝章
 * @param {string} pageHtml - 页面HTML
 * @param {number} pageIndex - 页面索引
 * @param {Array} stampPreviews - 切割后的骑缝章预览数组
 * @param {number} totalPages - 总页数
 * @returns {string} 处理后的HTML
 */
const processStampInHTML = (pageHtml, pageIndex, stampPreviews, totalPages) => {
  if (!stampConfig) return pageHtml;

  // 创建临时 DOM 来处理骑缝章元素
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = pageHtml;

  // 步骤1: 隐藏带有特定标识的骑缝章元素
  const stampElements = tempDiv.querySelectorAll(
    '[field="seamless_stamp_img"], .hiprint-printElement-image[data-seamless="true"], .seamless-stamp-fixed, [tid="stampModule.seamlessStamp"]',
  );
  let removedCount = stampElements.length;
  stampElements.forEach(el => {
    el.style.display = 'none';
    el.style.visibility = 'hidden';
  });

  // 步骤2: 移除包含骑缝章的图片容器
  const imageContainers = tempDiv.querySelectorAll('.hiprint-printElement.hiprint-printElement-image');
  imageContainers.forEach(container => {
    const img = container.querySelector('img');
    if (!img) return;

    const srcAttr = img.getAttribute('src');
    const fieldAttr = img.getAttribute('field');
    const styleAttr = img.getAttribute('style') || '';

    // 判断是否为骑缝章图片
    const isStampImage =
      fieldAttr === 'seamless_stamp_img' ||
      !srcAttr ||
      srcAttr === '' ||
      (styleAttr.includes('width:100%') && styleAttr.includes('height:100%'));

    if (isStampImage) {
      container.remove();
      removedCount++;
    }
  });

  // 步骤3: 清理所有空src的图片及其父容器
  tempDiv.querySelectorAll('img').forEach(img => {
    const srcAttr = img.getAttribute('src');
    if (srcAttr && srcAttr !== '') return;

    const parent = img.parentElement;
    if (parent && !parent.classList.contains('hiprint-printPaper')) {
      parent.children.length === 1 ? parent.remove() : img.remove();
    } else {
      img.remove();
    }
    removedCount++;
  });

  console.log(`第 ${pageIndex + 1} 页移除了 ${removedCount} 个骑缝章相关元素`);

  // 步骤4: 添加切割后的骑缝章图片
  const preview = stampPreviews?.[pageIndex];
  if (!preview) {
    console.warn(`第 ${pageIndex + 1} 页没有切割预览图`);
    return tempDiv.innerHTML;
  }

  // 验证预览图片
  if (!preview.image) {
    console.error(`第 ${pageIndex + 1} 页的切割图片 src 为空！`, preview);
    return tempDiv.innerHTML;
  }

  console.log(`第 ${pageIndex + 1} 页添加切割图片, 尺寸: ${preview.width}mm × ${preview.height}mm`);

  // 计算骑缝章位置
  const { width: paperWidth, height: paperHeight } = getPaperSize();
  const stampWidthPerPage = stampConfig.width / totalPages;
  const stampLeftMm = paperWidth - stampWidthPerPage;
  const stampTopMm = getStampTopPositionMm(stampConfig.position, stampConfig.height, paperHeight);

  // 创建骑缝章图片HTML
  const stampImg = `<img src="${preview.image}" style="position: absolute; left: ${stampLeftMm}mm; top: ${stampTopMm}mm; width: ${preview.width}mm; height: ${preview.height}mm; z-index: ${STAMP_CONSTANTS.DEFAULT_Z_INDEX}; pointer-events: none;" class="preview-stamp-split" alt="骑缝章-${pageIndex + 1}" data-page="${pageIndex + 1}" />`;

  // 在最后一个</div>之前插入图片
  let processedHtml = tempDiv.innerHTML;
  const lastDivIndex = processedHtml.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    processedHtml = processedHtml.substring(0, lastDivIndex) + stampImg + processedHtml.substring(lastDivIndex);
  } else {
    processedHtml += stampImg;
  }

  return processedHtml;
};

// ==================== 预览和打印 ====================
/**
 * 预览打印内容
 */
const preview = async () => {
  if (!hiprintTemplate) {
    message.warning('请先初始化模板');
    return;
  }

  try {
    const printData = getPrintData();

    // 如果有骑缝章配置，预加载图片
    let imageDataUrl = null;
    if (stampConfig) {
      const { dataURL } = await preloadImage(stampConfig.imageUrl);
      imageDataUrl = dataURL;
    }

    // 使用原始模板生成 HTML（包含所有分页）
    const html = hiprintTemplate.getHtml(printData);
    let htmlContent = '';
    let stampPreviews = null;

    console.log('预览 HTML 类型:', html?.constructor?.name, 'length:', html?.length, 'jquery:', html?.jquery);

    if (html) {
      // 转换为数组并检查实际页面数
      let elements = [];
      if (html.jquery) {
        // jQuery 对象，可能是包含多个页面的容器
        // 检查是否有 .hiprint-printPaper 子元素
        const $html = window.$(html);
        const papers = $html.find('.hiprint-printPaper');
        if (papers.length > 0) {
          elements = Array.from(papers);
          console.log(`jQuery 模式：找到 ${papers.length} 个 .hiprint-printPaper 页面`);
        } else {
          // 如果没有找到，则按原逻辑处理
          elements = Array.from(html);
          console.log(`jQuery 模式：直接转换，共 ${elements.length} 个元素`);
        }
      } else if (Array.isArray(html)) {
        elements = html;
      } else if (html.length) {
        elements = Array.from(html);
      } else {
        elements = [html];
      }

      const totalPages = elements.length;
      const isMultiPage = totalPages > 1;

      console.log(`判断结果: ${isMultiPage ? '多页' : '单页'}模式, 共 ${totalPages} 页`);

      if (isMultiPage) {
        // 多页情况
        console.log(`多页模式: 共 ${totalPages} 页`);

        // 如果有骑缝章配置，生成切割后的图片
        if (stampConfig && imageDataUrl) {
          stampPreviews = await generateStampPreviewsForPreview(stampConfig, totalPages, imageDataUrl);
          console.log(`生成了 ${stampPreviews?.length} 个切割预览图`);
        }

        htmlContent = elements.map((el, pageIndex) => {
          const pageHtml = el.jquery ? el[0].outerHTML : (el.outerHTML || el.toString());
          return processStampInHTML(pageHtml, pageIndex, stampPreviews, totalPages);
        }).join('');
      } else {
        // 单页情况
        console.log('单页模式');
        const element = html.jquery ? html[0] : html;
        const pageHtml = element.outerHTML || element.toString();

        if (stampConfig && imageDataUrl) {
          stampPreviews = await generateStampPreviewsForPreview(stampConfig, 1, imageDataUrl);
        }

        htmlContent = processStampInHTML(pageHtml, 0, stampPreviews, 1);
      }
    }

    console.log('预览 HTML 长度:', htmlContent.length);
    emit('preview', htmlContent);
    message.success('预览生成成功');
  } catch (error) {
    console.error('预览失败:', error);
    message.error('预览失败: ' + error.message);
  }
};

/**
 * 执行打印（与预览使用相同的骑缝章处理逻辑）
 */
const print = async () => {
  if (!hiprintTemplate) {
    message.warning('请先初始化模板');
    return;
  }

  try {
    const printData = getPrintData();

    // 如果有骑缝章配置，使用与预览相同的处理逻辑
    if (stampConfig) {
      const { dataURL } = await preloadImage(stampConfig.imageUrl);
      const html = hiprintTemplate.getHtml(printData);

      // 处理HTML，添加切割后的骑缝章
      let elements = [];
      if (html.jquery) {
        const $html = window.$(html);
        const papers = $html.find('.hiprint-printPaper');
        elements = papers.length > 0 ? Array.from(papers) : Array.from(html);
      } else if (Array.isArray(html)) {
        elements = html;
      } else if (html.length) {
        elements = Array.from(html);
      } else {
        elements = [html];
      }

      const totalPages = elements.length;
      console.log(`打印模式: 共 ${totalPages} 页`);

      const stampPreviews = await generateStampPreviewsForPreview(stampConfig, totalPages, dataURL);
      console.log(`打印: 生成了 ${stampPreviews?.length} 个切割预览图`);

      // 处理每一页的HTML
      const processedHtmlPages = elements.map((el, pageIndex) => {
        const pageHtml = el.jquery ? el[0].outerHTML : (el.outerHTML || el.toString());
        const processed = processStampInHTML(pageHtml, pageIndex, stampPreviews, totalPages);
        console.log(`处理第 ${pageIndex + 1} 页，HTML长度: ${processed.length}`);
        return processed;
      });

      console.log(`打印: 总共处理了 ${processedHtmlPages.length} 页`);

      // 使用浏览器原生打印功能
      printWithBrowser(processedHtmlPages, totalPages);
    } else {
      // 没有骑缝章，直接打印
      hiprintTemplate.print(printData);
    }
  } catch (error) {
    console.error('打印失败:', error);
    message.error('打印失败: ' + error.message);
  }
};

/**
 * 获取当前页面的所有样式
 */
const getAllPageStyles = () => {
  let allStyles = '';
  try {
    // 获取所有内联样式
    document.querySelectorAll('style').forEach(style => {
      allStyles += style.textContent + '\n';
    });

    // 获取所有外部样式表
    Array.from(document.styleSheets).forEach(styleSheet => {
      try {
        if (styleSheet.cssRules) {
          allStyles += Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n') + '\n';
        }
      } catch (e) {
        // 跨域样式表无法访问，忽略
        console.warn('无法访问某个样式表:', e);
      }
    });
  } catch (e) {
    console.warn('获取样式失败:', e);
  }
  return allStyles;
};

/**
 * 生成打印页面的CSS样式
 */
const generatePrintStyles = (paperWidth, paperHeight, existingStyles) => {
  return `
    ${existingStyles}
    
    /* 重置样式 */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      overflow: visible;
    }
    
    /* 页面容器样式 */
    .hiprint-printPaper {
      width: ${paperWidth}mm;
      height: ${paperHeight}mm;
      min-height: ${paperHeight}mm;
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      display: block;
      overflow: visible;
      box-sizing: border-box;
    }
    
    .hiprint-printPaper:last-child {
      page-break-after: auto;
    }
    
    /* 骑缝章样式 */
    .preview-stamp-split {
      position: absolute !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    @page {
      size: ${paperWidth}mm ${paperHeight}mm;
      margin: 0;
    }
    
    @media screen {
      .hiprint-printPaper {
        margin-bottom: 10px;
        box-shadow: 0 0 5px rgba(0,0,0,0.1);
      }
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      html, body {
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: visible;
      }
      
      .hiprint-printPaper {
        width: ${paperWidth}mm !important;
        height: ${paperHeight}mm !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        page-break-before: auto !important;
        display: block !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      .hiprint-printPaper:last-child {
        page-break-after: auto !important;
      }
      
      .preview-stamp-split {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
};

/**
 * 使用浏览器原生打印功能
 * @param {Array} htmlPages - 页面HTML数组
 * @param {number} totalPages - 总页数
 */
const printWithBrowser = (htmlPages, totalPages) => {
  console.log(`开始打印: 共 ${htmlPages.length} 页`);

  // 获取纸张尺寸
  const { width: paperWidth, height: paperHeight } = getPaperSize();
  console.log(`纸张尺寸: ${paperWidth}mm × ${paperHeight}mm`);

  // 创建隐藏的iframe用于打印
  const printFrame = document.createElement('iframe');
  printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(printFrame);

  // 获取iframe的document
  const printDocument = printFrame.contentDocument || printFrame.contentWindow.document;

  // 获取所有样式
  const allStyles = getAllPageStyles();

  // 确保每个页面都有正确的容器
  const htmlContent = htmlPages.map((pageHtml, index) => {
    if (!pageHtml.includes('hiprint-printPaper')) {
      const breakAfter = index < htmlPages.length - 1 ? 'always' : 'auto';
      return `<div class="hiprint-printPaper page-${index + 1}" style="page-break-after: ${breakAfter}; page-break-inside: avoid;">${pageHtml}</div>`;
    }
    return pageHtml;
  }).join('');

  console.log(`打印HTML总长度: ${htmlContent.length} 字符`);

  // 生成打印页面CSS
  const printStyles = generatePrintStyles(paperWidth, paperHeight, allStyles);

  // 写入HTML内容到iframe
  printDocument.open();
  printDocument.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>打印</title>
  <style>${printStyles}</style>
</head>
<body>
  ${htmlContent}
</body>
</html>
`);
  printDocument.close();

  // 等待内容加载完成后打印
  printFrame.contentWindow.onload = () => {
    setTimeout(() => {
      try {
        const pages = printFrame.contentDocument.querySelectorAll('.hiprint-printPaper');
        console.log(`iframe已渲染 ${pages.length} 个页面，准备打印...`);

        // 聚焦iframe并调用打印
        printFrame.contentWindow.focus();

        setTimeout(() => {
          printFrame.contentWindow.print();

          // 打印对话框关闭后清理iframe
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
              console.log('打印完成，iframe已移除');
            }
          }, PRINT_CONSTANTS.PRINT_CLEANUP_DELAY);
        }, PRINT_CONSTANTS.PRINT_FOCUS_DELAY);
      } catch (e) {
        console.error('打印出错:', e);
        message.error('打印出错: ' + e.message);
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }
    }, PRINT_CONSTANTS.IFRAME_LOAD_DELAY);
  };
};

// ==================== JSON/HTML 操作 ====================
/**
 * 生成 JSON 模板
 */
const getJsonToTextarea = () => {
  if (hiprintTemplate) {
    const json = hiprintTemplate.getJson();
    jsonContent.value = JSON.stringify(json, null, 2);
    activeTab.value = 'json';
    message.success('JSON 已生成');
  }
};

/**
 * 从 JSON 加载模板
 */
const loadJsonFromTextarea = () => {
  if (!jsonContent.value) {
    message.warning('请先输入 JSON 内容');
    return;
  }

  try {
    const template = JSON.parse(jsonContent.value);
    hiprintTemplate = new window.hiprint.PrintTemplate({
      template: template,
      settingContainer: '#PrintElementOptionSetting',
    });
    hiprintTemplate.design('#hiprint-printTemplate');
    reapplyStamp();
    message.success('模板已加载');
    emit('template-change', template);
  } catch (error) {
    console.error('加载失败:', error);
    message.error('JSON 格式错误: ' + error.message);
  }
};

/**
 * 生成 HTML 内容
 */
const getHtmlToTextarea = async () => {
  if (!hiprintTemplate) return;

  try {
    const printData = getPrintData();
    let imageDataUrl = null;

    if (stampConfig) {
      const { dataURL } = await preloadImage(stampConfig.imageUrl);
      printData.seamless_stamp_img = dataURL;
      imageDataUrl = dataURL;
    }

    const html = hiprintTemplate.getHtml(printData);
    if (html && html.length > 0) {
      const elements = Array.from(html);
      const totalPages = elements.length;

      // 合并所有页面的 HTML
      htmlContent.value = elements.map((page, pageIndex) => {
        let pageHtml = `<!-- 第 ${pageIndex + 1} 页 -->\n${page.outerHTML}`;

        // 如果有骑缝章配置，为每一页添加切割后的骑缝章
        if (imageDataUrl && stampConfig) {
          const stampSvg = createStampSVGForPreview(imageDataUrl, pageIndex, totalPages);
          if (stampSvg) {
            pageHtml = pageHtml.replace('</div>', stampSvg + '</div>');
          }
        }

        return pageHtml;
      }).join('\n\n');
      activeTab.value = 'html';
      message.success(`HTML 已生成，共 ${totalPages} 页${stampConfig ? '（含切割骑缝章）' : ''}`);
    }
  } catch (error) {
    console.error('生成 HTML 失败:', error);
    message.error('生成 HTML 失败: ' + error.message);
  }
};

// ==================== 骑缝章管理 ====================
/**
 * 生成骑缝章切割预览
 * @param {Object} config - 骑缝章配置
 * @param {number} totalPages - 总页数
 * @param {string} imageDataUrl - 已经加载的图片 base64 数据
 */
const generateStampPreviewsForPreview = async (config, totalPages, imageDataUrl) => {
  try {
    if (!imageDataUrl) {
      console.error('imageDataUrl 为空，无法生成切割预览');
      return null;
    }

    console.log('开始生成切割预览，imageDataUrl 长度:', imageDataUrl.length);
    const { width: paperWidth, height: paperHeight } = getPaperSize();
    const previews = [];

    // 为每一页生成切割后的预览图
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const params = StampSplitter.calculateSplitParams({
        stampWidth: config.width,
        stampHeight: config.height,
        pageIndex,
        totalPages,
        paperWidth,
        paperHeight,
        position: config.position,
      });

      console.log(`生成第 ${pageIndex + 1} 页切割参数:`, params);
      const previewImage = await StampSplitter.createPreviewImage(imageDataUrl, params, config);
      console.log(`第 ${pageIndex + 1} 页切割图片生成完成，长度:`, previewImage?.length);

      previews.push({
        pageIndex: pageIndex + 1,
        image: previewImage,
        width: params.viewBoxWidth,
        height: params.viewBoxHeight,
      });
    }

    console.log(`已为预览生成 ${totalPages} 个切割后的印章图片`);
    return previews;
  } catch (error) {
    console.error('生成印章预览失败:', error);
    return null;
  }
};

/**
 * 重新应用骑缝章（用于纸张变更后）
 */
const reapplyStamp = () => {
  if (stampConfig) {
    setTimeout(() => createStampOverlay(), 300);
  }
};

/**
 * 创建骑缝章（将骑缝章添加到 printElements 中）
 */
const createStampOverlay = () => {
  if (!hiprintTemplate || !stampConfig) return;

  const templateJson = hiprintTemplate.getJson();

  // 向第一个 panel 添加骑缝章元素（骑缝章会自动应用到所有分页）
  if (templateJson.panels && templateJson.panels.length > 0) {
    const panel = templateJson.panels[0];

    if (!panel.printElements) {
      panel.printElements = [];
    }

    // 移除所有旧的骑缝章元素
    panel.printElements = panel.printElements.filter(
      (el) => !isStampElement(el),
    );

    // 获取纸张尺寸
    const paperWidth = panel.width || 210;
    const paperHeight = panel.height || 297;

    // 添加新的骑缝章元素
    panel.printElements.push({
      tid: 'stampModule.seamlessStamp',
      type: 'image',
      options: {
        left: getStampLeftPosition(paperWidth, stampConfig.width),
        top: getStampTopPosition(stampConfig.position, stampConfig.height, paperHeight),
        height: hinnn.mm.toPt(stampConfig.height),
        width: hinnn.mm.toPt(stampConfig.width),
        field: 'seamless_stamp_img',
        src: stampConfig.imageUrl,
        hidden: false,
        lock: false,
        seamless: true,
        fixed: true,
        zIndex: STAMP_CONSTANTS.DEFAULT_Z_INDEX,
        customCss: 'seamless-stamp-fixed',
      },
      printElementType: {
        title: '骑缝章',
        type: 'image',
      },
    });
  }

  // 清理并重新创建设计器
  recreateDesigner(templateJson);
};

/**
 * 重新创建打印设计器
 */
const recreateDesigner = (templateJson) => {
  const container = document.querySelector('#hiprint-printTemplate');
  if (container) {
    container.innerHTML = '';
    void container.offsetHeight;
  }

  hiprintTemplate = null;
  hiprintTemplate = new window.hiprint.PrintTemplate({
    template: templateJson,
    settingContainer: '#PrintElementOptionSetting',
    paginationContainer: '.hiprint-printPagination',
  });
  hiprintTemplate.design('#hiprint-printTemplate');
};

/**
 * 生成骑缝章切割预览图片
 */
const generateStampPreviews = async (config) => {
  try {
    const { dataURL } = await preloadImage(config.imageUrl);
    const { width: paperWidth, height: paperHeight } = getPaperSize();
    const totalPages = 2;
    const previews = [];

    // 为每一页生成切割后的预览图
    for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
      const params = StampSplitter.calculateSplitParams({
        stampWidth: config.width,
        stampHeight: config.height,
        pageIndex,
        totalPages,
        paperWidth,
        paperHeight,
        position: config.position,
      });

      const previewImage = await StampSplitter.createPreviewImage(dataURL, params, config);

      previews.push({
        pageIndex: pageIndex + 1,
        image: previewImage,
        width: params.viewBoxWidth,
        height: params.viewBoxHeight,
      });
    }

    splitStampPreviews.value = previews;
    showStampPreview.value = true;

    console.log(`已生成 ${totalPages} 个切割后的印章预览`);
  } catch (error) {
    console.error('生成印章预览失败:', error);
    message.warning('生成印章预览失败，但骑缝章已应用');
  }
};

/**
 * 移除骑缝章（从 printElements 中移除）
 */
const removeStampOverlay = () => {
  if (!hiprintTemplate) return;

  const templateJson = hiprintTemplate.getJson();
  let hasStampElement = false;

  // 从 JSON 中移除骑缝章元素
  if (templateJson.panels && templateJson.panels.length > 0) {
    templateJson.panels.forEach((panel) => {
      if (panel.printElements) {
        const originalLength = panel.printElements.length;
        panel.printElements = panel.printElements.filter(
          (el) => !isStampElement(el),
        );
        if (panel.printElements.length < originalLength) {
          hasStampElement = true;
        }
      }
    });
  }

  // 如果有骑缝章，则重新创建设计器
  if (hasStampElement) {
    recreateDesigner(templateJson);
  }

  // 清空预览
  splitStampPreviews.value = [];
  showStampPreview.value = false;
};

// ==================== 对外暴露的方法 ====================
/**
 * 添加骑缝章
 */
const addStamp = async (config) => {
  try {
    if (!hiprintTemplate) {
      message.error('模板未初始化');
      return;
    }

    // 获取当前模板并清除骑缝章元素
    const templateJson = hiprintTemplate.getJson();

    if (templateJson.panels && templateJson.panels.length > 0) {
      templateJson.panels.forEach((panel) => {
        if (panel.printElements) {
          panel.printElements = panel.printElements.filter(
            (el) => !isStampElement(el),
          );
        }
      });
    }

    // 清空DOM并重新创建设计器
    recreateDesigner(templateJson);

    // 保存骑缝章配置并应用
    stampConfig = {
      imageUrl: config.imageUrl,
      position: config.position,
      width: config.width,
      height: config.height,
      totalPages: 2,
    };

    createStampOverlay();

    // 生成切割后的预览图片
    await generateStampPreviews(config);

    message.success('骑缝章已应用');
  } catch (error) {
    console.error('添加骑缝章失败:', error);
    message.error('添加骑缝章失败: ' + error.message);
  }
};

/**
 * 移除骑缝章
 */
const removeStamp = () => {
  try {
    removeStampOverlay();
    stampConfig = null;
    splitStampPreviews.value = [];
    showStampPreview.value = false;
    message.success('骑缝章已移除');
  } catch (error) {
    console.error('移除骑缝章失败:', error);
    message.error('移除骑缝章失败: ' + error.message);
  }
};

/**
 * 生成HTML（公共函数，用于生成 HTML）
 */
const generateHtml = async () => {
  const printData = getPrintData();

  if (stampConfig) {
    const { dataURL } = await preloadImage(stampConfig.imageUrl);
    printData.seamless_stamp_img = dataURL;
  }

  return hiprintTemplate.getHtml(printData);
};

/**
 * 获取HTML内容
 */
const getHtml = async () => {
  if (!hiprintTemplate) return null;
  try {
    return await generateHtml();
  } catch (error) {
    console.error('获取 HTML 失败:', error);
    return null;
  }
};

// 暴露方法给父组件
defineExpose({
  print,
  preview,
  getJson: () => hiprintTemplate?.getJson(),
  getHtml,
  getTemplate: () => hiprintTemplate,
  addStamp,
  removeStamp,
  getStampConfig: () => stampConfig,
  hasStamp: () => !!stampConfig,
});

</script>

<style scoped>
.print-designer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.toolbar {
  background: #fff;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.print-template-wrapper {
  background: #fff;
  padding: 24px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.action-section {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.hiprint-printTemplate) {
  min-height: 450px;
}

/* 骑缝章切割预览样式 */
.stamp-preview-card {
  margin-top: 16px;
  margin-bottom: 16px;
}

.stamp-preview-container {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
}

.stamp-preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
}

.stamp-preview-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.preview-label {
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
  font-size: 14px;
}

.preview-image-wrapper {
  background: white;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  margin-bottom: 8px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  display: block;
  object-fit: contain;
}

.preview-info {
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>

<style>
/* 打印时骑缝章固定显示在每页 */
@media print {
  .seamless-stamp-fixed,
  [field="seamless_stamp_img"],
  .hiprint-printElement-image[data-seamless="true"] {
    position: fixed !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* 确保骑缝章在打印时可见 */
  img[field="seamless_stamp_img"] {
    position: fixed !important;
    z-index: 9999 !important;
  }
}

/* 骑缝章的通用样式 */
.seamless-stamp-svg,
[data-stamp-type="seamless"] {
  pointer-events: none;
  user-select: none;
}
</style>
