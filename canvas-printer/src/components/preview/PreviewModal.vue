<template>
  <a-modal
    v-model:open="modalVisible"
    title="打印预览"
    width="100%"
    :footer="false"
    wrapClassName="full-modal"
    :body-style="{ background: '#f0f2f5' }"
    @cancel="handleClose"
  >
    <div class="preview-container">
      <div class="preview-toolbar">
        <a-space>
          <span>页数: {{ totalPages }}</span>
          <a-divider type="vertical" />
          <a-button type="primary" @click="handlePrint">
            <template #icon><PrinterOutlined /></template>
            打印
          </a-button>
          <a-button @click="handleClose">关闭</a-button>
        </a-space>
      </div>

      <div class="preview-pages" ref="previewRef">
        <div
          v-for="(pageData, index) in pagesData"
          :key="index"
          class="preview-page"
          :style="pageStyle"
        >
          <div class="page-number">第 {{ index + 1 }} 页</div>
          <div
            class="page-content"
            ref="pageRefs"
            :style="{
              width: `${props.paperSize.width}mm`,
              height: `${props.paperSize.height}mm`,
              transform: `scale(${printableWidth / props.paperSize.width}, ${printableHeight / props.paperSize.height})`
            }"
          >
            <!-- 渲染元素内容 -->
            <div
              v-for="element in pageData.elements"
              :key="`${element.id}-${index}`"
              class="preview-element"
              :style="getElementStyleForPage(element)"
            >
              <template
                v-if="
                  element.type === 'text' ||
                  element.type === 'input' ||
                  element.type === 'table-cell'
                "
              >
                <span
                  v-if="element.content"
                  style="display: inline-block; width: 100%"
                  >{{ element.content }}</span
                >
              </template>
              <template v-else-if="element.type === 'table-row'">
                <!-- table-row 只显示背景色，不显示内容 -->
              </template>
              <template v-else-if="element.type === 'image'">
                <img
                  v-if="element.src"
                  :src="element.src"
                  style="width: 100%; height: 100%; object-fit: contain"
                />
                <div v-else class="image-placeholder">图片</div>
              </template>
              <template v-else-if="element.type === 'table'">
                <div
                  v-if="element.domElement"
                  v-html="getTableHTML(element)"
                ></div>
                <div v-else class="table-placeholder">表格</div>
              </template>
            </div>

            <!-- 骑缝章 -->
            <div
              v-if="stampConfig"
              class="stamp-container"
              v-html="getStampSVG(index)"
            ></div>

            <!-- 页内页码 -->
            <div class="page-number-in-content">第 {{ index + 1 }} 页</div>

            <!-- 水印 -->
            <div v-if="canceled" class="watermark-container">
              <div
                v-for="i in 20"
                :key="i"
                class="watermark-text"
                :style="getWatermarkStyle(i)"
              >
                {{ watermarkText }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { PrinterOutlined } from '@ant-design/icons-vue';
import { StampSplitter } from '@/utils/stampSplitter';

// 常量定义
const CONSTANTS = {
  SCALE: 3.78, // px to mm conversion
  PAGE_HEIGHT: 280, // 竖向打印页高 200mm
  PAGE_FOOTER_HEIGHT: 8, // 页脚高度 8mm
  PAPER_MARGIN: 6, // 纸张边距 3mm * 2
  WATERMARK_ROWS: 5,
  WATERMARK_COLS: 4,
  DEFAULT_FONT_SIZE: 14,
  DEFAULT_LINE_HEIGHT: 1.4,
  PRINT_DELAY: 250 // 打印延迟
};

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  elements: {
    type: Array,
    default: () => []
  },
  paperSize: {
    type: Object,
    default: () => ({ width: 210, height: 297 })
  },
  stampConfig: {
    type: Object,
    default: null
  },
  printMode: {
    // vertical_print  纵向  horizontal_print 横向
    type: String,
    default: 'vertical_print'
  },
  canceled: {
    type: Boolean
  }
});

const emit = defineEmits(['update:visible']);

const modalVisible = ref(props.visible);
const previewRef = ref(null);
const pageRefs = ref([]);
const totalPages = ref(1);
const watermarkText = ref('已作废');

// 根据打印模式动态计算页面高度
const pageHeight = computed(() => {
  if (props.printMode === 'horizontal_print') {
    // 横向打印：宽高对换，页面高度为200mm（原竖向宽度-页脚）
    return 200; // 210mm - 页码区域后的安全值
  } else {
    // 竖向打印：使用默认页面高度280mm
    return CONSTANTS.PAGE_HEIGHT;
  }
});

// 计算元素所属的页面
// 分页调整已在canvasDesigner中完成，这里直接根据Y坐标判断页面
const getElementPage = (element) => {
  const elementTopMm = element.y / CONSTANTS.SCALE;
  return Math.floor(elementTopMm / pageHeight.value);
};

// 计算总页数并分配元素到各页
const pagesData = computed(() => {
  if (!props.elements?.length) {
    totalPages.value = 1;
    return [{ elements: [] }];
  }

  // 找出最大的页面索引
  const maxPage = props.elements.reduce((max, element) => {
    return Math.max(max, getElementPage(element));
  }, 0);

  totalPages.value = maxPage + 1;

  // 为每一页分配元素
  return Array.from({ length: maxPage + 1 }, (_, i) => {
    const pageElements = props.elements
      .filter((element) => getElementPage(element) === i)
      .map((element) => {
        // 计算元素在当前页面上的位置
        const elementTopMm = element.y / CONSTANTS.SCALE;
        const topInPage = elementTopMm - i * pageHeight.value;

        // 计算元素高度，如果超出页面则裁剪
        const elementBottomMm = (element.y + element.height) / CONSTANTS.SCALE;
        const bottomInPage = elementBottomMm - i * pageHeight.value;
        const maxHeight = pageHeight.value - topInPage;
        const actualHeight = Math.min(bottomInPage - topInPage, maxHeight);

        return {
          ...element,
          pageY: topInPage * CONSTANTS.SCALE, // 转回px
          displayHeight: actualHeight * CONSTANTS.SCALE, // 在该页面上显示的高度
          visible: true
        };
      });

    return { elements: pageElements };
  });
});

watch(
  () => props.visible,
  (val) => {
    modalVisible.value = val;
  }
);

watch(modalVisible, (val) => {
  emit('update:visible', val);
});

// 计算去除边距后的实际可打印区域
const printableWidth = computed(
  () => props.paperSize.width - CONSTANTS.PAPER_MARGIN
);
const printableHeight = computed(
  () => props.paperSize.height - CONSTANTS.PAPER_MARGIN
);

// 页面样式 - 匹配打印效果
const pageStyle = computed(() => ({
  width: `${printableWidth.value}mm`,
  height: `${printableHeight.value}mm`,
  background: '#ffffff',
  position: 'relative',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  margin: '20px auto',
  overflow: 'hidden'
}));

// 解析边框宽度（可能是 '1px' 字符串或数字）
const parseBorderWidth = (width) => {
  if (!width) return 0;
  if (typeof width === 'number') return width;
  if (typeof width === 'string') {
    const match = width.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
};

// 获取边框样式对象
const getBorderStyles = (styles, element) => {
  // 针对 table-row 类型的表头行，强制加顶部和左侧边框
  if (element.type === 'table-row') {
    return {
      borderTop: '1px solid #000',
      borderLeft: '1px solid #000'
    };
  }

  const borderStyles = {};
  const sides = [
    {
      key: 'Top',
      widthKey: 'borderTopWidth',
      colorKey: 'borderTopColor',
      styleKey: 'borderTopStyle'
    },
    {
      key: 'Right',
      widthKey: 'borderRightWidth',
      colorKey: 'borderRightColor',
      styleKey: 'borderRightStyle'
    },
    {
      key: 'Bottom',
      widthKey: 'borderBottomWidth',
      colorKey: 'borderBottomColor',
      styleKey: 'borderBottomStyle'
    },
    {
      key: 'Left',
      widthKey: 'borderLeftWidth',
      colorKey: 'borderLeftColor',
      styleKey: 'borderLeftStyle'
    }
  ];

  sides.forEach(({ key, widthKey, colorKey, styleKey }) => {
    const width = parseBorderWidth(styles[widthKey] || styles.borderWidth);
    if (width > 0) {
      const color = styles[colorKey] || styles.borderColor || '#000000';
      const style = styles[styleKey] || styles.borderStyle || 'solid';
      borderStyles[`border${key}`] = `${width}px ${style} ${color}`;
    }
  });

  return borderStyles;
};

// 获取元素在特定页面的样式
const getElementStyleForPage = (element) => {
  const styles = element.styles || {};
  const marginTop = styles.marginTop || 0;
  const marginBottom = styles.marginBottom || 0;
  const topPosition = element.pageY ?? element.y;
  const displayHeight = element.displayHeight ?? element.height;
  const padding = styles.padding || 0;

  // 基础样式
  const baseStyle = {
    position: 'absolute',
    left: `${element.x / CONSTANTS.SCALE}mm`,
    top: `${topPosition / CONSTANTS.SCALE}mm`,
    width: `${element.width / CONSTANTS.SCALE}mm`,
    height: `${displayHeight / CONSTANTS.SCALE}mm`,
    maxHeight: `${displayHeight / CONSTANTS.SCALE}mm`,
    fontSize: `${styles.fontSize || CONSTANTS.DEFAULT_FONT_SIZE}px`,
    fontFamily: styles.fontFamily || 'Arial',
    color: styles.color || '#000000',
    backgroundColor:
      styles.backgroundColor !== 'transparent'
        ? styles.backgroundColor
        : 'transparent',
    fontWeight: styles.fontWeight || 'normal',
    fontStyle: styles.fontStyle || 'normal',
    textAlign: styles.textAlign || 'left',
    textDecoration: styles.textDecoration || 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    wordWrap: 'break-word',
    padding: `${padding}px`,
    paddingTop: `${padding + marginTop / CONSTANTS.SCALE}px`,
    paddingBottom: `${padding + marginBottom / CONSTANTS.SCALE}px`,
    lineHeight: styles.lineHeight ?? CONSTANTS.DEFAULT_LINE_HEIGHT,
    // 应用边框样式
    ...getBorderStyles(styles, element)
  };

  return baseStyle;
};

// 获取骑缝章SVG
const getStampSVG = (pageIndex) => {
  if (!props.stampConfig) return '';

  const params = StampSplitter.calculateSplitParams({
    stampWidth: props.stampConfig.width,
    stampHeight: props.stampConfig.height,
    pageIndex,
    totalPages: totalPages.value,
    paperWidth: props.paperSize.width,
    paperHeight: props.paperSize.height,
    position: props.stampConfig.position
  });

  return StampSplitter.createSVGString(
    props.stampConfig.imageUrl,
    params,
    props.stampConfig,
    pageIndex
  );
};

// 生成打印样式
const generatePrintStyles = (
  pageWidth,
  pageHeight,
  pageOrientation,
  printableWidth,
  printableHeight
) => {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @page {
        size: A4 ${pageOrientation};
        margin: 3mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: white;
        width: 100%;
        height: auto;
      }

      .preview-page {
        width: ${printableWidth}mm;
        height: ${printableHeight}mm;
        background: #ffffff;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid;
        margin: 0;
        padding: 0;
        display: block;
        box-sizing: border-box;
      }

      .preview-page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }

      .page-number {
        display: none !important;
      }

      .page-number-in-content {
        position: absolute;
        bottom: 5mm;
        right: 10mm;
        font-size: 10px;
        color: #666;
      }

      .page-content {
        width: ${pageWidth}mm;
        height: ${pageHeight}mm;
        position: relative;
        overflow: visible;
        transform: scale(${printableWidth / pageWidth}, ${printableHeight / pageHeight});
        transform-origin: 0 0;
      }

      .preview-element {
        line-height: inherit;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      table {
        border-collapse: collapse !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        width: 100% !important;
      }

      table, th, td, thead, tbody, tr {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      th, td {
        border-top: 1px solid #000 !important;
        border-right: 1px solid #000 !important;
        border-bottom: 1px solid #000 !important;
        border-left: 1px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .stamp-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .watermark-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
      }

      .watermark-text {
        position: absolute;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 48px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.06);
        white-space: nowrap;
        user-select: none;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }

        .preview-page {
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          width: ${printableWidth}mm !important;
          height: ${printableHeight}mm !important;
        }

        .preview-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
          margin-bottom: 0 !important;
        }

        .page-content {
          width: ${pageWidth}mm !important;
          height: ${pageHeight}mm !important;
          transform: scale(${printableWidth / pageWidth}, ${printableHeight / pageHeight}) !important;
          transform-origin: 0 0 !important;
          overflow: visible !important;
        }

        table {
          border-collapse: collapse !important;
          width: 100% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        th, td {
          border-top: 1px solid #000 !important;
          border-right: 1px solid #000 !important;
          border-bottom: 1px solid #000 !important;
          border-left: 1px solid #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
  `;
};

// 处理打印
const handlePrint = () => {
  if (!previewRef.value) return;

  // 获取预览内容并移除最后一页的分页标记
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = previewRef.value.innerHTML;
  const pages = tempDiv.querySelectorAll('.preview-page');
  if (pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    lastPage.style.pageBreakAfter = 'avoid';
    lastPage.style.breakAfter = 'avoid';
  }
  const printContent = tempDiv.innerHTML;

  // 计算打印参数
  const { width: pageWidth, height: pageHeight } = props.paperSize;
  const pageOrientation =
    props.printMode === 'horizontal_print' ? 'landscape' : 'portrait';
  const printableW = pageWidth - CONSTANTS.PAPER_MARGIN;
  const printableH = pageHeight - CONSTANTS.PAPER_MARGIN;

  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以进行打印');
    return;
  }

  // 生成并写入打印内容
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>打印预览</title>
      ${generatePrintStyles(pageWidth, pageHeight, pageOrientation, printableW, printableH)}
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `);

  printWindow.document.close();

  // 等待内容加载完成后打印
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, CONSTANTS.PRINT_DELAY);
  };
};

// 获取表格HTML
const getTableHTML = (element) => {
  if (!element.domElement) return '';

  const clone = element.domElement.cloneNode(true);
  const tableBorderStyle =
    'border-collapse: collapse !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;';
  const cellBorderStyle =
    'border-top: 1px solid #000 !important; border-right: 1px solid #000 !important; border-bottom: 1px solid #000 !important; border-left: 1px solid #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;';

  // 为表格添加边框样式
  clone.style.cssText = tableBorderStyle;

  // 为所有单元格添加边框
  clone.querySelectorAll('th, td').forEach((cell) => {
    cell.style.cssText = `${cell.style.cssText}; ${cellBorderStyle}`;
  });

  return clone.outerHTML;
};

// 计算水印位置样式
const getWatermarkStyle = (index) => {
  const row = Math.floor((index - 1) / CONSTANTS.WATERMARK_COLS);
  const col = (index - 1) % CONSTANTS.WATERMARK_COLS;

  return {
    left: `${(col + 0.5) * (100 / CONSTANTS.WATERMARK_COLS)}%`,
    top: `${(row + 0.5) * (100 / CONSTANTS.WATERMARK_ROWS)}%`
  };
};

// 关闭弹窗
const handleClose = () => {
  modalVisible.value = false;
};
</script>

<style scoped>
.preview-container {
  width: 100%;
}

.preview-toolbar {
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-pages {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  padding: 20px 0;
}

.preview-page {
  margin: 0 auto 20px;
}

.page-number {
  position: absolute;
  top: -30px;
  left: 0;
  font-size: 12px;
  color: #999;
}

.page-content {
  width: 100%;
  height: 100%;
  position: relative;
  transform-origin: 0 0;
}

/* 页内页码样式 */
.page-number-in-content {
  position: absolute;
  bottom: 5mm;
  right: 10mm;
  font-size: 10px;
  color: #666;
  z-index: 10;
}

.preview-element {
  line-height: inherit;
}

/* 表格边框样式 */
.preview-element :deep(table) {
  border-collapse: collapse;
}

.preview-element :deep(th),
.preview-element :deep(td) {
  border-top: 1px solid #000;
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
  border-left: 1px solid #000;
}

.image-placeholder,
.table-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #999;
  border: 1px dashed #ccc;
}

.stamp-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 水印样式 */
.watermark-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.watermark-text {
  position: absolute;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 48px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  user-select: none;
}

/* 打印样式 */
@media print {
  @page {
    size: A4;
    margin: 0;
  }

  .preview-toolbar {
    display: none !important;
  }

  .preview-pages {
    max-height: none !important;
    overflow: visible !important;
    padding: 0 !important;
  }

  .preview-page {
    page-break-after: always;
    page-break-inside: avoid;
    box-shadow: none !important;
    margin: 0 !important;
    width: 210mm !important;
    height: 297mm !important;
    display: block;
  }

  .preview-page:last-child {
    page-break-after: auto;
  }

  .page-number {
    display: none !important;
  }

  .page-content {
    width: 210mm !important;
    height: 297mm !important;
  }
}
</style>

<style>
.full-modal {
  .ant-modal {
    top: 0;
    padding-bottom: 0;
    margin: 0 auto;
  }
  .ant-modal-content {
    display: flex;
    flex-direction: column;
    height: calc(100vh);
    padding: 20px 24px !important;
  }
  .ant-modal-body {
    width: 100%;
    height: 100%;
  }
}
/* 全局打印样式 */
@media print {
  /* 隐藏其他元素 */
  body > *:not(.ant-modal-root) {
    display: none !important;
  }

  /* 确保模态框内容可见 */
  .ant-modal-root {
    position: static !important;
  }

  .ant-modal-wrap {
    position: static !important;
    overflow: visible !important;
  }

  .ant-modal-mask {
    display: none !important;
  }

  .ant-modal {
    position: static !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    top: 0 !important;
  }

  .ant-modal-content {
    box-shadow: none !important;
    background: transparent !important;
  }

  .ant-modal-body {
    padding: 0 !important;
    background: transparent !important;
  }

  .preview-container {
    background: transparent !important;
  }

  .preview-pages {
    position: static !important;
    padding: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }

  /* 加强表头边框，确保左侧和顶部始终显示 */
  th {
    border-top: 1px solid #000 !important;
    border-left: 1px solid #000 !important;
  }
}
</style>
