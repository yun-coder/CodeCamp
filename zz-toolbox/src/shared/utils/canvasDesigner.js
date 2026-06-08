/**
 * Canvas设计器核心类
 * 处理HTML元素导入、Canvas渲染、元素操作
 */

export class CanvasDesigner {
  // 常量定义
  static CONSTANTS = {
    // 单位转换
    SCALE: 3.78, // mm to px (1mm = 3.78px at 96dpi)
    // 默认纸张尺寸
    DEFAULT_PAPER_WIDTH: 210, // A4宽度
    DEFAULT_PAPER_HEIGHT: 297, // A4高度
    // 分页相关
    PAGE_HEIGHT: 280, // 每页高度 280mm
    PAGE_FOOTER_HEIGHT: 8, // 页脚高度 8mm
    PAGE_START_MARGIN: 10, // 新页面起始边距
    // 间距相关
    MIN_ELEMENT_SIZE: 20, // 最小元素尺寸
    HANDLE_SIZE: 6, // 控制点大小
    HANDLE_VISUAL_SIZE: 8, // 控制点视觉大小
    SELECTION_BORDER_WIDTH: 2, // 选中边框宽度
    SELECTION_DASH: [5, 5], // 选中边框虚线样式
    // 行判定阈值
    ROW_Y_THRESHOLD: 3, // Y坐标差异小于3px认为是同一行
    MAX_TABLE_GAP_MM: 20, // 表格最大间隔20mm
    // 其他
    DEFAULT_FONT_SIZE: 14,
    DEFAULT_LINE_HEIGHT: 1.4,
    CANVAS_BOTTOM_PADDING: 50
  };

  /**
   * 图片缓存，避免重复渲染和闪烁
   */
  imageCache = new Map();

  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.elements = [];
    this.selectedElement = null;
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeStartSize = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.scale = options.scale || CanvasDesigner.CONSTANTS.SCALE;
    this.paperWidth = options.paperWidth || CanvasDesigner.CONSTANTS.DEFAULT_PAPER_WIDTH;
    this.paperHeight = options.paperHeight || CanvasDesigner.CONSTANTS.DEFAULT_PAPER_HEIGHT;
    this.printMode = options.printMode || 'vertical_print';
    this.onChange = options.onChange || null;

    // 根据打印模式计算页面高度
    this.updatePageHeight();

    // 绑定事件处理器，避免在事件监听器中重复创建函数
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    this.initEvents();
  }

  /**
   * 更新页面高度（根据打印模式）
   * 横向打印：页面高度 = 200mm（横向时宽高对换）
   * 竖向打印：页面高度 = 280mm
   */
  updatePageHeight() {
    if (this.printMode === 'horizontal_print') {
      this.pageHeight = 200;
    } else {
      this.pageHeight = CanvasDesigner.CONSTANTS.PAGE_HEIGHT;
    }
  }

  /**
   * 更新打印模式
   */
  updatePrintMode(printMode) {
    this.printMode = printMode;
    this.updatePageHeight();
  }

  /**
   * 添加元素到设计器
   */
  addElement(element) {
    // 自动生成唯一 id
    if (!element.id) {
      element.id = this.generateId();
    }
    this.elements.push(element);
    // 完全重绘画布以确保所有元素正确渲染
    this.render();
    // 通知外部元素发生变化
    this.notifyChange();
  }

  /**
   * 从HTML字符串导入元素
   */
  importFromHTML(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') {
      console.warn('Invalid HTML string provided');
      return [];
    }

    // 清空现有元素
    this.elements = [];

    // 创建临时容器来渲染HTML，获取真实布局
    const tempContainer = document.createElement('div');
    const defaultFontSize = CanvasDesigner.CONSTANTS.DEFAULT_FONT_SIZE;
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: ${this.canvas.width}px;
      opacity: 0;
      pointer-events: none;
      font-size: ${defaultFontSize}px;
      line-height: 1.5;
      background: white;
      padding: 10px;
      box-sizing: border-box;
    `;
    tempContainer.innerHTML = htmlString;
    document.body.appendChild(tempContainer);

    // 使用 requestAnimationFrame 确保DOM已渲染
    requestAnimationFrame(() => {
      try {
        // 获取容器的初始位置作为参考点
        const containerRect = tempContainer.getBoundingClientRect();

        // console.log('Container rect:', containerRect);
        // console.log('Container children:', tempContainer.children.length);

        // 解析所有可见元素
        this.parseElementWithLayout(tempContainer, containerRect);

        // console.log('✅ 解析完成，共创建元素:', this.elements.length);

        // 调整元素位置：为有 marginTop 的元素添加累积偏移
        let cumulativeOffset = 0;
        const sortedElements = [...this.elements].sort((a, b) => a.y - b.y);
        sortedElements.forEach((el) => {
          if (el.styles.marginTop && el.styles.marginTop > 0) {
            cumulativeOffset += el.styles.marginTop;
          }
          el.y += cumulativeOffset;
          if (el.styles.marginBottom && el.styles.marginBottom > 0) {
            cumulativeOffset += el.styles.marginBottom;
          }
        });

        // 移除临时容器
        document.body.removeChild(tempContainer);
        
        // 应用分页调整
        this.applyPaginationAdjustment();
        
        // 通知外部元素发生变化
        this.notifyChange();
      } catch (error) {
        console.error('Import HTML error:', error);
        // 移除临时容器
        if (tempContainer && document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }
    });

    return this.elements;
  }

  /**
   * 递归解析HTML元素（基于真实布局）
   */
  parseElementWithLayout(element, containerRect, parentElement = null) {
    // 遍历所有子节点（包括文本节点）
    for (let child of element.childNodes) {
      // 处理文本节点
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text.length > 0 && parentElement) {
          const parentComputed = window.getComputedStyle(parentElement);

          // 获取父元素的直接文本内容（不包括子元素）
          const directText = this.getDirectTextContent(parentElement);
          const fullText = this.getFullTextContent(parentElement);

          // 如果父元素本身会被渲染，则不额外创建文本节点，避免重复
          if (
            this.shouldCreateElement(
              parentElement,
              parentComputed,
              directText,
              fullText
            )
          ) {
            continue;
          }

          // 文本节点使用父元素的位置和样式
          const parentRect = parentElement.getBoundingClientRect();

          // 跳过不可见的父元素
          if (parentRect.width === 0 || parentRect.height === 0) continue;
          if (parentComputed.display === 'none') continue;

          const x = parentRect.left - containerRect.left;
          const y = parentRect.top - containerRect.top;

          // 使用父元素的完整宽度，让文本自动换行
          const constants = CanvasDesigner.CONSTANTS;
          const fontSize = parseFloat(parentComputed.fontSize) || constants.DEFAULT_FONT_SIZE;

          const canvasElement = {
            id: this.generateId(),
            type: 'text',
            x: x,
            y: y,
            width: parentRect.width,
            height: parentRect.height,
            content: text,
            styles: {
              fontSize: fontSize,
              fontFamily: parentComputed.fontFamily || 'Arial',
              color: this.rgbToHex(parentComputed.color) || '#000000',
              backgroundColor: this.rgbToHex(parentComputed.backgroundColor) || 'transparent',
              fontWeight: parentComputed.fontWeight || 'normal',
              fontStyle: parentComputed.fontStyle || 'normal',
              textAlign: parentComputed.textAlign || 'left',
              textDecoration: parentComputed.textDecoration || 'none',
              padding: 0, // 文本节点不需要 padding，避免换行
              borderWidth: 0,
              borderTopWidth: 0,
              borderRightWidth: 0,
              borderBottomWidth: 0,
              borderLeftWidth: 0,
              borderColor: 'transparent',
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              borderStyle: 'none'
            },
            properties: {
              tag: 'text',
              className: '',
              id: '',
              editable: true
            }
          };

          this.elements.push(canvasElement);
        }
        continue;
      }

      // 处理元素节点
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      // 跳过已经处理过的元素，避免重复
      if (child._parsed) continue;

      // 立即标记为已处理，避免重复（无论是否创建 Canvas 对象）
      child._parsed = true;

      const computed = window.getComputedStyle(child);
      const rect = child.getBoundingClientRect();

      // 跳过真正不可见的元素（不包括 opacity: 0）
      if (rect.width === 0 || rect.height === 0) {
        // console.log('Skipping zero-size element:', child.tagName, child.className);
        // 继续递归处理子节点
        if (child.childNodes.length > 0) {
          this.parseElementWithLayout(child, containerRect, child);
        }
        continue;
      }
      if (computed.display === 'none') {
        // console.log('Skipping display:none element:', child.tagName);
        // 继续递归处理子节点（某些情况下 display:none 的父元素下可能有可见子元素）
        if (child.childNodes.length > 0) {
          this.parseElementWithLayout(child, containerRect, child);
        }
        continue;
      }

      // 计算相对于容器的位置
      const x = rect.left - containerRect.left;
      const y = rect.top - containerRect.top;

      // 获取文本内容
      const directText = this.getDirectTextContent(child);
      const fullText = this.getFullTextContent(child);
      // 如果直接文本为空但有完整文本，使用完整文本（处理<p><span>text</span></p>的情况）
      const textContent = directText.length > 0 ? directText : fullText;

      // 判断是否应该创建独立元素
      // 只有以下情况才创建：
      // 1. 元素有直接文本内容（不是从子元素继承的）
      // 2. 元素是叶子节点且有文本
      // 3. 元素有特殊样式（背景色、边框等）需要渲染
      const shouldCreate = this.shouldCreateElement(
        child,
        computed,
        directText,
        fullText
      );

      // const tag = child.tagName.toLowerCase();
      // console.log('Element:', child.tagName, 'shouldCreate:', shouldCreate, 'directText:', directText.substring(0, 20), 'fullText:', fullText.substring(0, 20));

      if (shouldCreate) {
        const tag = child.tagName.toLowerCase();

        // 处理块级元素的上下 margin
        let elementX = x;
        let elementY = y;
        let elementWidth = rect.width;
        let elementHeight = rect.height;
        let marginTop = 0;
        let marginBottom = 0;

        // 解析内联样式（优先级最高）
        const inlineStyles = this.parseInlineStyles(child);

        // 检查父元素是否是 P 标签，如果是则继承其 margin 设置（用于渲染时的间距）
        if (parentElement && parentElement.tagName.toLowerCase() === 'p') {
          const parentInlineStyles = this.parseInlineStyles(parentElement);
          const parentInlineStyle = parentElement.getAttribute('style') || '';
          const parentHasLineHeightOne =
            parentInlineStyles.lineHeight === 1 ||
            parentInlineStyle.match(/line-height\s*:\s*1(?:\s|;|$)/);

          if (parentHasLineHeightOne) {
            marginTop = 6;
            marginBottom = 6;
          } else {
            marginTop = 8;
            marginBottom = 8;
          }
          // 不调整 Y 位置，只存储 margin 值用于渲染
        }

        // 读取元素的内联样式
        const inlineStyle = child.getAttribute('style') || '';
        const hasLineHeightOne =
          inlineStyles.lineHeight === 1 ||
          inlineStyle.match(/line-height\s*:\s*1(?:\s|;|$)/);

        const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        if (blockTags.includes(tag)) {
          // P标签的段落间距
          if (tag === 'p' && hasLineHeightOne) {
            marginTop = 10;
            marginBottom = 10;
          } else {
            marginTop = 13;
            marginBottom = 13;
          }
          elementY = y - marginTop;
          elementHeight = rect.height + marginTop + marginBottom;
        }

        // 决定是否渲染文本内容
        // 如果元素有子元素（非纯文本节点），则不渲染文本，因为文本会由子节点渲染，避免重复
        const hasChildElements = Array.from(child.children).length > 0;
        const shouldRenderContent = !hasChildElements || directText.length > 0;

        // 辅助函数：获取样式值（优先使用内联样式）
        const getStyleValue = (key, defaultValue, transform = null) => {
          if (inlineStyles[key] !== undefined) {
            return inlineStyles[key];
          }
          const computedValue = computed[key];
          return transform ? transform(computedValue) : (computedValue || defaultValue);
        };

        // 创建元素对象
        const constants = CanvasDesigner.CONSTANTS;
        const canvasElement = {
          id: this.generateId(),
          type: this.getElementType(child),
          x: elementX,
          y: elementY,
          width: elementWidth,
          height: elementHeight,
          content: shouldRenderContent ? fullText : '',
          styles: {
            fontSize: getStyleValue('fontSize', constants.DEFAULT_FONT_SIZE, parseFloat),
            fontFamily: getStyleValue('fontFamily', 'Arial'),
            color: getStyleValue('color', '#000000', (val) => this.rgbToHex(val)),
            backgroundColor: getStyleValue('backgroundColor', 'transparent', (val) => this.rgbToHex(val)),
            fontWeight: getStyleValue('fontWeight', 'normal'),
            fontStyle: getStyleValue('fontStyle', 'normal'),
            textAlign: getStyleValue('textAlign', 'left'),
            textDecoration: getStyleValue('textDecoration', 'none'),
            padding: getStyleValue('padding', 0, parseFloat),
            marginTop: marginTop,
            marginBottom: marginBottom,
            lineHeight: inlineStyles.lineHeight !== undefined
              ? inlineStyles.lineHeight
              : parseFloat(computed.lineHeight) / parseFloat(computed.fontSize) || 1.5,
            // 边框样式：只使用内联样式，不使用计算样式（避免浏览器默认样式干扰）
            borderWidth: inlineStyles.borderWidth || 0,
            borderTopWidth: inlineStyles.borderTopWidth || 0,
            borderRightWidth: inlineStyles.borderRightWidth || 0,
            borderBottomWidth: inlineStyles.borderBottomWidth || 0,
            borderLeftWidth: inlineStyles.borderLeftWidth || 0,
            borderColor: inlineStyles.borderColor || '#000000',
            borderTopColor: inlineStyles.borderTopColor || '#000000',
            borderRightColor: inlineStyles.borderRightColor || '#000000',
            borderBottomColor: inlineStyles.borderBottomColor || '#000000',
            borderLeftColor: inlineStyles.borderLeftColor || '#000000',
            borderStyle: inlineStyles.borderStyle || 'solid'
          },
          properties: {
            tag: tag,
            className: child.className,
            id: child.id,
            editable: true
          }
        };

        this.elements.push(canvasElement);
      }

      // 继续递归处理所有子节点（无论是否创建了当前元素）
      if (child.childNodes.length > 0) {
        this.parseElementWithLayout(child, containerRect, child);
      }
    }
  }

  /**
   * 获取元素的直接文本内容（不包括子元素的文本）
   */
  getDirectTextContent(element) {
    let text = '';
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * 获取元素的完整文本内容（包括子元素）
   */
  getFullTextContent(element) {
    return element.textContent?.trim() || '';
  }

  /**
   * 解析元素的内联样式
   */
  parseInlineStyles(element) {
    const styles = {};
    const styleAttr = element.getAttribute('style');

    if (!styleAttr) return styles;

    // 辅助函数：解析边框属性
    const parseBorderValue = (value) => {
      const parts = value.split(/\s+/);
      const width = parseFloat(parts[0]);
      const color = parts.length > 2 ? parts[2] : 'black';
      const colorHex = this.rgbToHex(color);
      return { width, color: colorHex, isValid: !isNaN(width) && colorHex !== 'transparent' };
    };

    // 解析 style 属性
    const styleRules = styleAttr.split(';').filter((rule) => rule.trim());

    for (let rule of styleRules) {
      const [property, value] = rule.split(':').map((s) => s.trim());
      if (!property || !value) continue;

      switch (property) {
        case 'font-size':
          const fontSize = parseFloat(value);
          if (!isNaN(fontSize)) styles.fontSize = fontSize;
          break;
        case 'font-family':
          styles.fontFamily = value.replace(/['"]/g, '');
          break;
        case 'color':
          styles.color = this.rgbToHex(value);
          break;
        case 'background-color':
          styles.backgroundColor = this.rgbToHex(value);
          break;
        case 'font-weight':
          styles.fontWeight = value;
          break;
        case 'font-style':
          styles.fontStyle = value;
          break;
        case 'text-align':
          styles.textAlign = value;
          break;
        case 'text-decoration':
          styles.textDecoration = value;
          break;
        case 'padding':
          styles.padding = parseFloat(value);
          break;
        case 'line-height':
          const lineHeight = parseFloat(value);
          if (!isNaN(lineHeight)) styles.lineHeight = lineHeight;
          break;
        case 'border': {
          const border = parseBorderValue(value);
          if (border.isValid) {
            styles.borderWidth = border.width;
            styles.borderTopWidth = border.width;
            styles.borderRightWidth = border.width;
            styles.borderBottomWidth = border.width;
            styles.borderLeftWidth = border.width;
            styles.borderColor = border.color;
            styles.borderTopColor = border.color;
            styles.borderRightColor = border.color;
            styles.borderBottomColor = border.color;
            styles.borderLeftColor = border.color;
          }
          break;
        }
        case 'border-width': {
          const width = parseFloat(value);
          if (!isNaN(width)) {
            styles.borderWidth = width;
            styles.borderTopWidth = width;
            styles.borderRightWidth = width;
            styles.borderBottomWidth = width;
            styles.borderLeftWidth = width;
          }
          break;
        }
        case 'border-top':
        case 'border-right':
        case 'border-bottom':
        case 'border-left': {
          const border = parseBorderValue(value);
          if (border.isValid) {
            const side = property.split('-')[1]; // 'top', 'right', 'bottom', 'left'
            const widthKey = `border${side.charAt(0).toUpperCase() + side.slice(1)}Width`;
            const colorKey = `border${side.charAt(0).toUpperCase() + side.slice(1)}Color`;
            styles[widthKey] = border.width;
            styles[colorKey] = border.color;
          }
          break;
        }
        case 'border-top-width':
        case 'border-right-width':
        case 'border-bottom-width':
        case 'border-left-width': {
          const width = parseFloat(value);
          if (!isNaN(width)) {
            const key = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[key] = width;
          }
          break;
        }
        case 'border-color': {
          const color = this.rgbToHex(value);
          if (color !== 'transparent') {
            styles.borderColor = color;
            styles.borderTopColor = color;
            styles.borderRightColor = color;
            styles.borderBottomColor = color;
            styles.borderLeftColor = color;
          }
          break;
        }
        case 'border-top-color':
        case 'border-right-color':
        case 'border-bottom-color':
        case 'border-left-color': {
          const color = this.rgbToHex(value);
          if (color !== 'transparent') {
            const key = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[key] = color;
          }
          break;
        }
        case 'border-style':
          styles.borderStyle = value;
          break;
      }
    }

    return styles;
  }

  /**
   * 将 RGB 颜色转换为十六进制
   */
  rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return 'transparent';
    
    // 如果已经是十六进制，直接返回
    if (rgb.startsWith('#')) return rgb;

    // 处理 rgba/rgb，检查 alpha 通道
    const rgbaMatch = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,?\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const alpha = rgbaMatch[4];
      // 如果 alpha 为 0，返回透明
      if (alpha !== undefined && parseFloat(alpha) === 0) {
        return 'transparent';
      }

      const toHex = (num) => {
        const hex = parseInt(num).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(rgbaMatch[3])}`;
    }

    return rgb;
  }

  /**
   * 文本换行处理
   * @param {string} text - 要换行的文本
   * @param {number} maxWidth - 最大宽度
   * @returns {string[]} 换行后的文本数组
   */
  wrapText(text, maxWidth) {
    const paragraphs = text.split(/\r?\n/);
    const wrappedLines = [];

    for (let paragraph of paragraphs) {
      if (!paragraph || paragraph.trim().length === 0) {
        // 保留空行
        wrappedLines.push('');
        continue;
      }

      // 按宽度自动换行
      let currentLine = '';
      for (let i = 0; i < paragraph.length; i++) {
        const char = paragraph[i];
        const testLine = currentLine + char;
        const metrics = this.ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          // 当前行已满，保存并开始新行
          wrappedLines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }

      // 添加段落的最后一行
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    return wrappedLines;
  }

  /**
   * 判断是否应该为元素创建Canvas对象
   */
  shouldCreateElement(element, computed, directText = '', fullText = '') {
    const tag = element.tagName.toLowerCase();

    // 跳过不可见元素
    if (computed.display === 'none') return false;

    // body、html 不创建
    if (['body', 'html'].includes(tag)) return false;

    // 纯布局容器元素
    const pureContainers = ['thead', 'tbody', 'tfoot'];
    if (pureContainers.includes(tag)) return false;

    // 辅助函数：检查是否有可见边框
    const hasVisibleBorder = (inlineStyles) => {
      return ['Top', 'Right', 'Bottom', 'Left'].some(side => {
        const widthKey = `border${side}Width`;
        const colorKey = `border${side}Color`;
        return inlineStyles[widthKey] > 0 && 
               inlineStyles[colorKey] && 
               inlineStyles[colorKey] !== 'transparent';
      });
    };

    // 辅助函数：检查是否有背景色
    const hasBackground = (inlineStyles) => {
      return inlineStyles.backgroundColor &&
             inlineStyles.backgroundColor !== 'transparent' &&
             inlineStyles.backgroundColor !== '#ffffff';
    };

    // tr: 仅在有背景色时创建
    if (tag === 'tr') {
      return hasBackground(this.parseInlineStyles(element));
    }

    // 检查是否有子元素
    const hasChildElements = Array.from(element.children).length > 0;

    // table: 仅在有边框时创建
    if (tag === 'table') {
      return hasVisibleBorder(this.parseInlineStyles(element));
    }

    // td/th: 有子元素时需检查样式,无子元素则直接创建
    if (['td', 'th'].includes(tag)) {
      if (hasChildElements) {
        const inlineStyles = this.parseInlineStyles(element);
        return hasVisibleBorder(inlineStyles) || hasBackground(inlineStyles);
      }
      return true;
    }

    // 有子元素则不创建,避免重复
    if (hasChildElements) return false;

    // 叶子节点且有文本
    if (fullText.length > 0) return true;

    // 表单元素
    if (['input', 'textarea', 'select', 'button'].includes(tag)) return true;

    // 媒体元素
    if (['img', 'video', 'canvas', 'svg'].includes(tag)) return true;

    // 分隔线
    if (['hr', 'br'].includes(tag)) return true;

    // 有背景色或边框的元素
    const hasComputedBackground =
      computed.backgroundColor &&
      computed.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      computed.backgroundColor !== 'transparent';
    const hasComputedBorder = ['Top', 'Right', 'Bottom', 'Left'].some(side =>
      parseFloat(computed[`border${side}Width`] || 0) > 0
    );
    if (hasComputedBackground || hasComputedBorder) return true;

    return false;
  }

  /**
   * 获取元素类型
   */
  getElementType(element) {
    const tag = element.tagName.toLowerCase();
    if (['img', 'image'].includes(tag)) return 'image';
    if (['td', 'th'].includes(tag)) return 'table-cell';
    if (tag === 'tr') return 'table-row';
    if (['input', 'textarea'].includes(tag)) return 'input';
    return 'text';
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `elem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 渲染Canvas
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制背景
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制所有元素
    this.elements.forEach((element) => {
      this.renderElement(element);
    });

    // 绘制选中元素的边框和控制点
    if (this.selectedElement) {
      this.renderSelection(this.selectedElement);
    }
  }

  /**
   * 渲染单个元素
   */
  renderElement(element) {
    const { x, y, width, height, content, styles, type } = element;

    // 绘制背景
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = styles.backgroundColor;
      this.ctx.fillRect(x, y, width, height);
    }

    // 绘制边框
    this.drawElementBorders(element);

    // 根据类型绘制内容
    if (type === 'text' || type === 'input' || type === 'table-cell') {
      this.renderText(element);
    } else if (type === 'image') {
      this.renderImage(element);
    }
  }

  /**
   * 绘制元素的四条边框
   */
  drawElementBorders(element) {
    const { x, y, width, height, styles } = element;

    // 辅助函数：获取边框属性
    const getBorderProps = (side) => {
      const widthKey = `border${side}Width`;
      const colorKey = `border${side}Color`;
      const borderWidth = parseFloat(styles[widthKey]) || parseFloat(styles.borderWidth) || 0;
      let borderColor = styles[colorKey];
      if (!borderColor || borderColor === 'transparent') {
        borderColor = styles.borderColor !== 'transparent' ? styles.borderColor : '#000000';
      }
      return { width: borderWidth, color: borderColor };
    };

    // 绘制单条边框
    const drawBorder = (side, startX, startY, endX, endY) => {
      const props = getBorderProps(side);
      if (props.width > 0) {
        this.ctx.strokeStyle = props.color;
        this.ctx.lineWidth = props.width;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    };

    // 绘制四条边框
    const topProps = getBorderProps('Top');
    drawBorder('Top', x, y + topProps.width / 2, x + width, y + topProps.width / 2);
    
    const rightProps = getBorderProps('Right');
    drawBorder('Right', x + width - rightProps.width / 2, y, x + width - rightProps.width / 2, y + height);
    
    const bottomProps = getBorderProps('Bottom');
    drawBorder('Bottom', x, y + height - bottomProps.width / 2, x + width, y + height - bottomProps.width / 2);
    
    const leftProps = getBorderProps('Left');
    drawBorder('Left', x + leftProps.width / 2, y, x + leftProps.width / 2, y + height);
  }

  /**
   * 渲染文本
   */
  renderText(element) {
    const { x, y, width, height, content, styles } = element;

    if (!content || content.trim().length === 0) return;

    // 计算内容区域
    const marginTop = styles.marginTop || 0;
    const marginBottom = styles.marginBottom || 0;

    // 对于表格单元格和表格行，不使用 margin（表格内部没有段落间距）
    const isTableCell =
      element.type === 'table-cell' || element.type === 'table-row';

    // 表格单元格直接使用元素的完整高度，其他元素减去 margin
    const contentY = isTableCell ? y : y + marginTop;
    const contentHeight = isTableCell
      ? height
      : height - marginTop - marginBottom;

    // 绘制背景
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = styles.backgroundColor;
      this.ctx.fillRect(x, contentY, width, contentHeight);
    }

    // 设置字体
    this.ctx.fillStyle = styles.color;
    const fontStyle =
      styles.fontStyle !== 'normal' ? styles.fontStyle + ' ' : '';
    const fontWeight =
      styles.fontWeight !== 'normal' ? styles.fontWeight + ' ' : '';
    this.ctx.font = `${fontStyle}${fontWeight}${styles.fontSize}px ${styles.fontFamily}`;
    this.ctx.textBaseline = 'top';

    const padding = styles.padding || 0;

    // 设置文本对齐方式
    let textX;
    if (styles.textAlign === 'center') {
      this.ctx.textAlign = 'center';
      textX = x + width / 2;
    } else if (styles.textAlign === 'right') {
      this.ctx.textAlign = 'right';
      textX = x + width - padding;
    } else {
      this.ctx.textAlign = 'left';
      textX = x + padding;
    }

    // 计算行高
    const lineHeightMultiplier = styles.lineHeight ?? CanvasDesigner.CONSTANTS.DEFAULT_LINE_HEIGHT;
    const lineHeight = styles.fontSize * lineHeightMultiplier;

    // 计算可用宽度（减去 padding）
    const maxWidth = width - padding * 2;

    // 分割文本并处理自动换行
    const wrappedLines = this.wrapText(content, maxWidth);

    // 计算文本总高度
    // 对于单行文本，使用 fontSize；多行文本使用 lineHeight
    let totalTextHeight;
    if (wrappedLines.length === 1) {
      totalTextHeight = styles.fontSize;
    } else {
      totalTextHeight = wrappedLines.length * lineHeight;
    }

    // 计算起始Y位置（垂直居中，但如果文本超出高度则从顶部开始）
    let startY;
    if (totalTextHeight <= contentHeight) {
      // 文本未超出，垂直居中
      startY = contentY + (contentHeight - totalTextHeight) / 2;
    } else {
      // 文本超出，从顶部开始
      startY = contentY + padding;
    }

    // 渲染所有行
    wrappedLines.forEach((line, index) => {
      const textY = startY + index * lineHeight;
      // 只渲染在可见区域内的文本
      if (textY >= contentY && textY <= contentY + contentHeight) {
        this.ctx.fillText(line, textX, textY);
      }
    });
  }

  /**
   * 渲染图片
   */
  renderImage(element) {
    const { x, y, width, height, src } = element;
    
    // 绘制占位图
    const drawPlaceholder = (text = '图片') => {
      this.ctx.strokeStyle = '#cccccc';
      this.ctx.strokeRect(x, y, width, height);
      this.ctx.fillStyle = '#f0f0f0';
      this.ctx.fillRect(x, y, width, height);
      this.ctx.fillStyle = '#999999';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x + width / 2, y + height / 2);
    };

    if (!src) {
      drawPlaceholder();
      return;
    }

    let img = this.imageCache.get(src);
    if (img && img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(img, x, y, width, height);
    } else {
      // 首次加载
      if (!img) {
        img = new window.Image();
        img.onload = () => {
          this.imageCache.set(src, img);
          this.render(); // 加载完成后刷新整个画布
        };
        img.onerror = () => {
          this.imageCache.set(src, null);
          this.render();
        };
        img.src = src;
        this.imageCache.set(src, img);
      }
      drawPlaceholder();
    }
  }

  /**
   * 渲染选中状态
   */
  renderSelection(element) {
    const { x, y, width, height } = element;
    const constants = CanvasDesigner.CONSTANTS;
    const borderWidth = constants.SELECTION_BORDER_WIDTH;
    const handleSize = constants.HANDLE_VISUAL_SIZE;
    const halfHandle = handleSize / 2;

    // 绘制选中边框
    this.ctx.strokeStyle = '#1890ff';
    this.ctx.lineWidth = borderWidth;
    this.ctx.setLineDash(constants.SELECTION_DASH);
    this.ctx.strokeRect(x - borderWidth, y - borderWidth, width + borderWidth * 2, height + borderWidth * 2);
    this.ctx.setLineDash([]);

    // 绘制控制点
    const handles = this.getResizeHandles(element);
    handles.forEach((handle) => {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
      this.ctx.strokeStyle = '#1890ff';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(handle.x - halfHandle, handle.y - halfHandle, handleSize, handleSize);
    });

    // 如果元素可删除，在右上角显示删除提示
    if (element.deletable === true) {
      const deleteIconSize = 20;
      const deleteX = x + width - deleteIconSize - 2;
      const deleteY = y - deleteIconSize - 2;

      // 绘制删除按钮背景
      // this.ctx.fillStyle = '#ff4d4f';
      // this.ctx.fillRect(deleteX, deleteY, deleteIconSize, deleteIconSize);

      // 绘制删除图标（X）
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(deleteX + 5, deleteY + 5);
      this.ctx.lineTo(
        deleteX + deleteIconSize - 5,
        deleteY + deleteIconSize - 5
      );
      this.ctx.moveTo(deleteX + deleteIconSize - 5, deleteY + 5);
      this.ctx.lineTo(deleteX + 5, deleteY + deleteIconSize - 5);
      this.ctx.stroke();

      // 绘制提示文字
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = '#666';
      this.ctx.fillText('按 Delete 键删除', x, y + height + 15);
    }
  }

  /**
   * 获取调整大小的控制点
   */
  getResizeHandles(element) {
    const { x, y, width, height } = element;

    return [
      { x: x, y: y, cursor: 'nw-resize', type: 'nw' },
      { x: x + width / 2, y: y, cursor: 'n-resize', type: 'n' },
      { x: x + width, y: y, cursor: 'ne-resize', type: 'ne' },
      { x: x, y: y + height / 2, cursor: 'w-resize', type: 'w' },
      { x: x + width, y: y + height / 2, cursor: 'e-resize', type: 'e' },
      { x: x, y: y + height, cursor: 'sw-resize', type: 'sw' },
      { x: x + width / 2, y: y + height, cursor: 's-resize', type: 's' },
      { x: x + width, y: y + height, cursor: 'se-resize', type: 'se' }
    ];
  }

  /**
   * 初始化事件监听
   */
  initEvents() {
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(e) {
    // 按 Delete 或 Backspace 键删除选中的可删除元素
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElement) {
      // 检查元素是否标记为可删除
      if (this.selectedElement.deletable === true) {
        const elementId = this.selectedElement.id;
        this.deleteElement(elementId);
        this.selectedElement = null;
        this.render();
        e.preventDefault(); // 阻止默认行为
      }
    }
  }

  /**
   * 销毁事件监听
   */
  destroy() {
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    
    // 清理资源
    this.imageCache.clear();
    this.elements = [];
    this.selectedElement = null;
  }

  /**
   * 处理鼠标按下
   */
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否点击了控制点
    if (this.selectedElement) {
      const handles = this.getResizeHandles(this.selectedElement);
      for (let handle of handles) {
        if (this.isPointInHandle(x, y, handle)) {
          this.isResizing = true;
          this.resizeHandle = handle;
          this.dragStartPos = { x, y };
          return;
        }
      }
    }

    // 检查是否点击了元素
    const element = this.getElementAtPoint(x, y);
    if (element) {
      this.selectedElement = element;
      this.isDragging = true;
      this.dragStartPos = { x: x - element.x, y: y - element.y };
      this.render();
    } else {
      this.selectedElement = null;
      this.render();
    }
  }

  /**
   * 处理鼠标移动
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isResizing && this.selectedElement) {
      this.resizeElement(x, y);
      this.render();
    } else if (this.isDragging && this.selectedElement) {
      this.selectedElement.x = x - this.dragStartPos.x;
      this.selectedElement.y = y - this.dragStartPos.y;
      this.render();
    } else {
      // 更新鼠标样式
      this.updateCursor(x, y);
    }
  }

  /**
   * 处理鼠标释放
   */
  handleMouseUp() {
    const wasInteracting = this.isDragging || this.isResizing;
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeStartSize = null; // 清除调整大小的初始尺寸

    // 如果刚才在拖动或调整大小，通知外部元素发生了变化
    if (wasInteracting) {
      this.notifyChange();
    }
  }

  /**
   * 调整元素大小
   */
  resizeElement(mouseX, mouseY) {
    if (!this.resizeHandle || !this.selectedElement) return;

    const element = this.selectedElement;
    const handle = this.resizeHandle;

    // 如果没有保存初始尺寸，保存它
    if (!this.resizeStartSize) {
      this.resizeStartSize = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      };
    }

    // 计算相对于初始拖动位置的偏移量
    const dx = mouseX - this.dragStartPos.x;
    const dy = mouseY - this.dragStartPos.y;

    const startX = this.resizeStartSize.x;
    const startY = this.resizeStartSize.y;
    const startWidth = this.resizeStartSize.width;
    const startHeight = this.resizeStartSize.height;

    const minSize = CanvasDesigner.CONSTANTS.MIN_ELEMENT_SIZE;

    switch (handle.type) {
      case 'se':
        element.width = Math.max(minSize, startWidth + dx);
        element.height = Math.max(minSize, startHeight + dy);
        break;
      case 'nw':
        const newWidth = Math.max(minSize, startWidth - dx);
        const newHeight = Math.max(minSize, startHeight - dy);
        element.x = startX + (startWidth - newWidth);
        element.y = startY + (startHeight - newHeight);
        element.width = newWidth;
        element.height = newHeight;
        break;
      case 'ne':
        const newHeightNE = Math.max(minSize, startHeight - dy);
        element.y = startY + (startHeight - newHeightNE);
        element.width = Math.max(minSize, startWidth + dx);
        element.height = newHeightNE;
        break;
      case 'sw':
        const newWidthSW = Math.max(minSize, startWidth - dx);
        element.x = startX + (startWidth - newWidthSW);
        element.width = newWidthSW;
        element.height = Math.max(minSize, startHeight + dy);
        break;
      case 'n':
        const newHeightN = Math.max(minSize, startHeight - dy);
        element.y = startY + (startHeight - newHeightN);
        element.height = newHeightN;
        break;
      case 's':
        element.height = Math.max(minSize, startHeight + dy);
        break;
      case 'w':
        const newWidthW = Math.max(minSize, startWidth - dx);
        element.x = startX + (startWidth - newWidthW);
        element.width = newWidthW;
        break;
      case 'e':
        element.width = Math.max(minSize, startWidth + dx);
        break;
    }
  }

  /**
   * 更新鼠标样式
   */
  updateCursor(x, y) {
    if (this.selectedElement) {
      const handles = this.getResizeHandles(this.selectedElement);
      for (let handle of handles) {
        if (this.isPointInHandle(x, y, handle)) {
          this.canvas.style.cursor = handle.cursor;
          return;
        }
      }
    }

    const element = this.getElementAtPoint(x, y);
    this.canvas.style.cursor = element ? 'move' : 'default';
  }

  /**
   * 检查点是否在控制点内
   */
  isPointInHandle(x, y, handle) {
    const handleSize = CanvasDesigner.CONSTANTS.HANDLE_SIZE;
    return Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize;
  }

  /**
   * 获取指定坐标的元素
   */
  getElementAtPoint(x, y) {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const element = this.elements[i];
      if (
        x >= element.x &&
        x <= element.x + element.width &&
        y >= element.y &&
        y <= element.y + element.height
      ) {
        return element;
      }
    }
    return null;
  }

  /**
   * 更新元素属性
   */
  updateElement(elementId, properties) {
    const element = this.elements.find((e) => e.id === elementId);
    if (element) {
      Object.assign(element, properties);
      this.render();
      this.notifyChange();
    }
  }

  /**
   * 删除元素
   */
  deleteElement(elementId) {
    const index = this.elements.findIndex((e) => e.id === elementId);
    if (index !== -1) {
      this.elements.splice(index, 1);
      if (this.selectedElement && this.selectedElement.id === elementId) {
        this.selectedElement = null;
      }
      this.render();
      this.notifyChange();
    }
  }

  /**
   * 清空所有元素
   */
  clear() {
    this.elements = [];
    this.selectedElement = null;
    this.render();
  }

  /**
   * 通知外部元素发生变化
   */
  notifyChange() {
    if (this.onChange && typeof this.onChange === 'function') {
      this.onChange(this.elements);
    }
  }

  /**
   * 设置纸张大小
   */
  setPaperSize(width, height) {
    this.paperWidth = width;
    this.paperHeight = height;
    this.canvas.width = width * this.scale;

    // 自动调整画布高度以适应内容
    this.adjustCanvasHeight();
    this.render();
  }

  /**
   * 调整画布高度以适应内容
   */
  adjustCanvasHeight() {
    if (this.elements.length === 0) {
      this.canvas.height = this.paperHeight * this.scale;
      return;
    }

    // 找到最低的元素位置
    const maxY = this.elements.reduce((max, element) => {
      const elementBottom = element.y + element.height;
      return Math.max(max, elementBottom);
    }, 0);

    // 设置画布高度，至少为纸张高度，最多为内容高度+边距
    const minHeight = this.paperHeight * this.scale;
    const contentHeight = maxY + CanvasDesigner.CONSTANTS.CANVAS_BOTTOM_PADDING;
    this.canvas.height = Math.max(minHeight, contentHeight);
  }

  /**
   * 导出为JSON
   */
  exportToJSON() {
    return JSON.stringify(
      {
        elements: this.elements,
        paperSize: {
          width: this.canvas.width / this.scale,
          height: this.canvas.height / this.scale
        }
      },
      null,
      2
    );
  }

  /**
   * 从JSON导入
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.elements = data.elements || [];
      if (data.paperSize) {
        this.setPaperSize(data.paperSize.width, data.paperSize.height);
      }
      this.render();
      return true;
    } catch (error) {
      console.error('导入JSON失败:', error);
      return false;
    }
  }

  /**
   * 应用分页逻辑，避免内容覆盖页码
   * 每200mm或者280mm为一页，页面底部8mm为页码区域
   * 对于表格，按行重新生成新表格；对于其他元素，整体下移
   */
  applyPaginationAdjustment() {
    // 先过滤掉之前添加的表头副本，避免重复处理
    this.elements = this.elements.filter(el => !el._isHeaderCopy);
    
    const pageHeight = this.pageHeight;
    const safeZoneStart = pageHeight - CanvasDesigner.CONSTANTS.PAGE_FOOTER_HEIGHT;

    // 按Y坐标排序元素
    const sortedElements = [...this.elements].sort((a, b) => a.y - b.y);

    // 识别表格结构
    const tableGroups = this.identifyTableGroups(sortedElements);
    
    // 创建元素到表格组的映射
    const elementToTableGroup = new Map();
    tableGroups.forEach((group, index) => {
      group.elements.forEach(el => {
        elementToTableGroup.set(el.id, { group, index });
      });
    });

    const newElements = [];
    let cumulativeYOffset = 0;
    let lastAdjustmentY = 0;
    let processedTableGroups = new Set();

    // 统一按Y坐标顺序处理所有元素
    sortedElements.forEach((element) => {
      // 检查是否是表格元素
      const tableInfo = elementToTableGroup.get(element.id);
      
      if (tableInfo && !processedTableGroups.has(tableInfo.index)) {
        // 处理整个表格组
        const tableGroup = tableInfo.group;
        processedTableGroups.add(tableInfo.index);
        
        // 应用累积偏移
        if (cumulativeYOffset !== 0) {
          tableGroup.elements.forEach((el) => {
            el.y += cumulativeYOffset;
          });
          tableGroup.startY += cumulativeYOffset;
          tableGroup.endY += cumulativeYOffset;
        }
        
        const result = this.adjustTableForPagination(tableGroup, pageHeight);
        newElements.push(...result.elements);
        
        // 如果表格被切割，累加偏移
        if (result.wasSplit && result.yOffsetAdded) {
          cumulativeYOffset += result.yOffsetAdded;
          lastAdjustmentY = tableGroup.endY - result.yOffsetAdded;
        }
        
      } else if (!tableInfo) {
        // 非表格元素
        const elementHeightMm = element.height / this.scale;
        
        // 跳过超大容器
        if (element.type === 'text' && elementHeightMm > 150) {
          return;
        }
        
        const originalY = element.y;
        
        // 应用累积偏移
        let adjustedY = element.y;
        if (cumulativeYOffset !== 0 && element.y >= lastAdjustmentY) {
          adjustedY = element.y + cumulativeYOffset;
        }
        
        // 检查是否跨页
        const elementTopMm = adjustedY / this.scale;
        const startPage = Math.floor(elementTopMm / pageHeight);
        const positionInPage = elementTopMm - startPage * pageHeight;
        const elementBottomInPage = positionInPage + elementHeightMm;
        
        if (elementBottomInPage > safeZoneStart && positionInPage < safeZoneStart) {
          // 跨页，移到下一页
          const newY = (startPage + 1) * pageHeight * this.scale + CanvasDesigner.CONSTANTS.PAGE_START_MARGIN * this.scale;
          const elementOffset = newY - adjustedY;
          
          cumulativeYOffset += elementOffset;
          lastAdjustmentY = originalY;
          
          newElements.push({
            ...element,
            y: newY,
            _movedToNextPage: true
          });
        } else {
          newElements.push({
            ...element,
            y: adjustedY
          });
        }
      }
    });

    // 更新元素数组
    this.elements = newElements;
    this.adjustCanvasHeight();
    this.render();
    this.notifyChange();

    return newElements;
  }

  /**
   * 识别表格分组
   * 将相邻的表格行/单元格识别为一个表格
   */
  identifyTableGroups(elements) {
    const tableGroups = [];
    let currentGroup = null;

    elements.forEach((element) => {
      const isTableElement = this.isTableCell(element);

      if (isTableElement) {
        if (!currentGroup) {
          // 开始新的表格组
          currentGroup = {
            startY: element.y,
            endY: element.y + element.height,
            elements: [element],
            minX: element.x,
            maxX: element.x + element.width,
            tableId: element._tableId || null  // 记录表格ID
          };
        } else {
          // 检查是否属于当前表格
          const elementBottom = element.y + element.height;
          const maxGapMM = CanvasDesigner.CONSTANTS.MAX_TABLE_GAP_MM; // 最大间隔20mm
          const maxGapPx = maxGapMM * this.scale; // 转换为像素
          const isWithinTable =
            element.y >= currentGroup.startY - maxGapPx &&
            element.y <= currentGroup.endY + maxGapPx;
          
          // 如果有相同的tableId，说明是同一表格的不同段落（被切割后）
          const isSameTable = element._tableId && element._tableId === currentGroup.tableId;

          // 如果Y坐标在表格范围附近(±20mm)，或者有相同的tableId，就认为属于同一个表格
          if (isWithinTable || isSameTable) {
            // 属于当前表格
            currentGroup.elements.push(element);
            currentGroup.startY = Math.min(currentGroup.startY, element.y);
            currentGroup.endY = Math.max(currentGroup.endY, elementBottom);
            currentGroup.minX = Math.min(currentGroup.minX, element.x);
            currentGroup.maxX = Math.max(
              currentGroup.maxX,
              element.x + element.width
            );
          } else {
            // 新的表格
            tableGroups.push(currentGroup);
            currentGroup = {
              startY: element.y,
              endY: elementBottom,
              elements: [element],
              minX: element.x,
              maxX: element.x + element.width,
              tableId: element._tableId || null  // 记录表格ID
            };
          }
        }
      } else {
        // 非表格元素，结束当前表格组
        if (currentGroup) {
          tableGroups.push(currentGroup);
          currentGroup = null;
        }
      }
    });

    // 添加最后一个表格组
    if (currentGroup) {
      tableGroups.push(currentGroup);
    }

    // console.log(`📊 识别到 ${tableGroups.length} 个表格组`);
    // tableGroups.forEach((group, index) => {
    //     const startMM = (group.startY / this.scale).toFixed(2);
    //     const endMM = (group.endY / this.scale).toFixed(2);
    //     console.log(`  表格${index + 1}: ${group.elements.length}个单元格, Y范围=${startMM}-${endMM}mm`);
    // });

    return tableGroups;
  }

  /**
   * 如果需要，插入表头副本
   * @param {boolean} hasTableBorder - 表格是否有边框
   * @param {Object} headerRow - 表头行对象
   * @param {number} rowIndex - 当前行索引
   * @param {number} pageStartY - 页面起始Y坐标
   * @param {number} fallbackY - 备用Y坐标（用于自然换页）
   * @returns {{newRows: Array, yPosition: number}} 新行数组和Y位置
   */
  insertHeaderIfNeeded(hasTableBorder, headerRow, rowIndex, pageStartY, fallbackY = null) {
    const newRows = [];
    let yPosition = fallbackY || pageStartY;
    
    if (hasTableBorder && headerRow && rowIndex > 0) {
      const headerCopy = {
        ...headerRow,
        y: pageStartY,
        _originalY: headerRow.y,
        _offset: 0,
        _isHeaderCopy: true,
        cells: headerRow.cells.map(cell => ({
          ...cell,
          y: pageStartY + (cell.y - headerRow.y),
          height: cell.height, // 确保单元格保持原始高度
          _isHeaderCopy: true
        })),
        height: headerRow.height,
        minY: pageStartY,
        maxY: pageStartY + headerRow.height
      };
      newRows.push(headerCopy);
      yPosition = pageStartY + headerRow.height;
    }
    
    return { newRows, yPosition };
  }

  /**
   * 计算页面起始Y坐标
   * @param {number} pageNumber - 页码
   * @param {number} pageHeight - 页面高度（mm）
   * @returns {number} 页面起始Y坐标（像素）
   */
  getPageStartY(pageNumber, pageHeight) {
    const startYMm = pageNumber * pageHeight + CanvasDesigner.CONSTANTS.PAGE_START_MARGIN;
    return startYMm * this.scale;
  }

  /**
   * 调整表格以适应分页
   * 将跨页的表格按行拆分，生成新的表格结构
   * @param {Object} tableGroup - 表格组对象
   * @param {number} pageHeight - 页面高度（mm）
   * @returns {{ elements: Array, wasSplit: boolean, yOffsetAdded: number }}
   */
  adjustTableForPagination(tableGroup, pageHeight) {
    const rows = this.groupTableElementsByRow(tableGroup.elements);
    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const headerRow = rows.length > 0 ? rows[0] : null;
    const hasTableBorder = this.checkTableHasBorder(headerRow);
    
    // 使用段落(segment)模型来组织表格片段
    const segments = [];
    let currentSegment = {
      rows: [],
      startY: null,
      endY: null,
      page: null
    };
    
    // 统一的Y坐标偏移量累积器
    let globalYOffset = 0;
    
    // 第一遍遍历：识别需要切割的位置，构建段落
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // 应用累积的偏移量
      const adjustedRowY = row.y + globalYOffset;
      const rowTopMm = adjustedRowY / this.scale;
      const rowHeightMm = row.height / this.scale;
      const rowPage = Math.floor(rowTopMm / pageHeight);
      const positionInPage = rowTopMm - rowPage * pageHeight;
      const rowBottomInPage = positionInPage + rowHeightMm;
      
      // 判断是否需要移到下一页
      const needsMove = rowBottomInPage > pageHeight;
      const isPageChange = currentSegment.page !== null && rowPage !== currentSegment.page;
      
      if (needsMove) {
        // 行被切断，需要移到下一页
        
        // 1. 保存当前段落（如果有内容）
        if (currentSegment.rows.length > 0) {
          currentSegment.endY = currentSegment.rows[currentSegment.rows.length - 1].y + 
                                currentSegment.rows[currentSegment.rows.length - 1].height;
          segments.push({...currentSegment});
        }
        
        // 2. 计算新页面的起始位置
        const nextPageNumber = rowPage + 1;
        const pageStartYMm = nextPageNumber * pageHeight + CanvasDesigner.CONSTANTS.PAGE_START_MARGIN;
        const pageStartY = pageStartYMm * this.scale;
        
        // 3. 开始新段落
        const newSegmentRows = [];
        let currentYPosition = pageStartY; // 当前可用的Y位置
        
        // 如果表格有边框且有表头且当前不是第一行，在新段落开始处插入表头
        if (hasTableBorder && headerRow && rowIndex > 0) {
          // 复制表头行，放在页面起始位置
          const headerCopy = {
            ...headerRow,
            y: currentYPosition,
            _originalY: headerRow.y,
            _offset: 0,
            _isHeaderCopy: true, // 标记为表头副本
            cells: headerRow.cells.map(cell => ({
              ...cell,
              y: currentYPosition + (cell.y - headerRow.y),
              height: cell.height, // 保留原始单元格高度
              _isHeaderCopy: true
            })),
            height: headerRow.height,
            minY: currentYPosition,
            maxY: currentYPosition + headerRow.height
          };
          newSegmentRows.push(headerCopy);
          
          // 更新当前Y位置，数据行需要在表头之后
          currentYPosition += headerRow.height;
        }
        
        // 4. 计算当前数据行的偏移量（相对于其原始调整后位置）
        const rowOffset = currentYPosition - adjustedRowY;
        globalYOffset += rowOffset;
        
        // 5. 添加当前数据行
        newSegmentRows.push({
          ...row,
          y: currentYPosition,
          _originalY: row.y,
          _offset: globalYOffset
        });
        
        currentSegment = {
          rows: newSegmentRows,
          startY: pageStartY, // 段落开始位置（包含表头）
          endY: null,
          page: nextPageNumber
        };
        
      } else if (isPageChange) {
        // 自然换页（行没有被切断，但进入了新页面）
        if (currentSegment.rows.length > 0) {
          const lastRow = currentSegment.rows[currentSegment.rows.length - 1];
          currentSegment.endY = lastRow.y + lastRow.height;
          segments.push({...currentSegment});
        }
        
        const pageStartY = this.getPageStartY(rowPage, pageHeight);
        const { newRows, yPosition } = this.insertHeaderIfNeeded(
          hasTableBorder, headerRow, rowIndex, pageStartY, adjustedRowY
        );
        
        // 检查是否需要额外偏移以避免与表头重叠
        let currentYPosition = adjustedRowY;
        if (yPosition > currentYPosition) {
          globalYOffset += (yPosition - currentYPosition);
          currentYPosition = yPosition;
        }
        
        newRows.push({
          ...row,
          y: currentYPosition,
          _originalY: row.y,
          _offset: globalYOffset
        });
        
        currentSegment = {
          rows: newRows,
          startY: newRows[0].y,
          endY: null,
          page: rowPage
        };
        
      } else {
        // 同页继续
        if (currentSegment.rows.length === 0) {
          // 第一行
          currentSegment.startY = adjustedRowY;
          currentSegment.page = rowPage;
        }
        
        currentSegment.rows.push({
          ...row,
          y: adjustedRowY,
          _originalY: row.y,
          _offset: globalYOffset
        });
      }
    }
    
    // 保存最后一个段落
    if (currentSegment.rows.length > 0) {
      currentSegment.endY = currentSegment.rows[currentSegment.rows.length - 1].y + 
                            currentSegment.rows[currentSegment.rows.length - 1].height;
      segments.push(currentSegment);
    }
    
    // 第二遍遍历：根据段落生成调整后的元素
    const adjustedElements = [];
    const wasSplit = segments.length > 1;
    
    segments.forEach((segment, segmentIndex) => {
      const isFirstSegment = segmentIndex === 0;
      const isLastSegment = segmentIndex === segments.length - 1;
      
      // 应用段落内的Y坐标调整到所有单元格
      const adjustedRows = segment.rows.map(row => {
        if (row._isHeaderCopy) {
          // 表头副本的单元格已经设置好了Y坐标和高度
          return { 
            ...row, 
            cells: row.cells.map(cell => ({ 
              ...cell, 
              y: row.y, // 统一使用行的Y坐标
              height: row.height, // 统一使用行的高度
              _movedToNextPage: false 
            })) 
          };
        } else {
          // 普通数据行：统一所有单元格的Y坐标和高度
          return { 
            ...row, 
            cells: row.cells.map(cell => ({ 
              ...cell, 
              y: row.y, // 统一使用行的Y坐标，不保留原始偏移
              height: row.height, // 统一使用行的高度
              _movedToNextPage: row._offset > 0 
            })) 
          };
        }
      });
      
      // 生成表格元素
      const elements = this.createTableElements(
        adjustedRows,
        segment.startY,
        {
          isTableEnd: isLastSegment,
          needsTopBorder: !isFirstSegment && wasSplit,
          isSplitTable: wasSplit,
          tableId: tableId  // 传递表格ID
        }
      );
      
      adjustedElements.push(...elements);
    });
    
    // 计算总的Y偏移量（最后一个元素的位置 - 原始表格的结束位置）
    const yOffsetAdded = segments.length > 0 
      ? segments[segments.length - 1].endY - tableGroup.endY
      : 0;
    
    return {
      elements: adjustedElements,
      wasSplit: wasSplit,
      yOffsetAdded: yOffsetAdded
    };
  }

  /**
   * 检查表格是否有边框
   * @param {Object} headerRow - 表头行对象
   * @returns {boolean} 是否有边框
   */
  checkTableHasBorder(headerRow) {
    if (!headerRow) return false;
    return headerRow.cells.some(cell => {
      const styles = cell.styles || {};
      return parseFloat(styles.borderTopWidth) > 0 || 
             parseFloat(styles.borderBottomWidth) > 0 ||
             parseFloat(styles.borderLeftWidth) > 0 ||
             parseFloat(styles.borderRightWidth) > 0;
    });
  }

  /**
   * 将表格元素按行分组
   * 保持每行的原始高度
   */
  groupTableElementsByRow(elements) {
    const rows = [];
    const sorted = [...elements].sort((a, b) => {
      const yDiff = a.y - b.y;
      // 如果Y坐标差异很小（<3px），认为是同一行，按X坐标排序
      if (Math.abs(yDiff) < 3) {
        return a.x - b.x;
      }
      return yDiff;
    });

    let currentRow = null;

    const rowThreshold = CanvasDesigner.CONSTANTS.ROW_Y_THRESHOLD;
    sorted.forEach((element) => {
      // Y坐标差异小于阈值认为是同一行
      if (!currentRow || Math.abs(element.y - currentRow.y) >= rowThreshold) {
        // 新的一行
        if (currentRow) {
          rows.push(currentRow);
        }
        currentRow = {
          y: element.y,
          height: element.height,
          cells: [element],
          minY: element.y,
          maxY: element.y + element.height
        };
      } else {
        // 同一行
        currentRow.cells.push(element);
        // 更新行的Y坐标为最小值（确保对齐）
        currentRow.y = Math.min(currentRow.y, element.y);
        currentRow.minY = Math.min(currentRow.minY, element.y);
        // 更新行高：从最小Y到最大底部Y的距离
        const elementBottom = element.y + element.height;
        currentRow.maxY = Math.max(currentRow.maxY, elementBottom);
        currentRow.height = currentRow.maxY - currentRow.minY;
      }
    });

    if (currentRow) {
      rows.push(currentRow);
    }

    // 统一每行中所有单元格的Y坐标和高度
    rows.forEach(row => {
      row.cells.forEach(cell => {
        cell.y = row.y; // 强制统一Y坐标
        cell.height = row.height; // 强制统一高度
      });
    });

    return rows;
  }

  /**
   * 创建表格元素
   * 将行数据转换为可渲染的表格单元格元素，并为切割表格添加闭合边框
   * @param {Array} rows - 表格行数组，每行包含cells数组
   * @param {number} startY - 表格起始Y坐标（像素）
   * @param {Object} options - 配置选项
   * @param {boolean} options.isTableEnd - 是否是表格的最后一部分
   * @param {boolean} options.needsTopBorder - 是否是切割后的第二部分（需要顶部边框）
   * @param {boolean} options.isSplitTable - 表格是否被切割
   * @param {string} options.tableId - 表格唯一标识符
   */
  createTableElements(rows, startY, { isTableEnd = false, needsTopBorder = false, isSplitTable = false, tableId = null } = {}) {
    const elements = [];

    rows.forEach((row, rowIndex) => {
      const isFirstRow = rowIndex === 0;
      const isLastRow = rowIndex === rows.length - 1;
      const isHeaderCopy = row._isHeaderCopy || false; // 是否是表头副本

      row.cells.forEach((cell, cellIndex) => {
        // 过滤无效单元格：必须有type、x、y属性
        if (
          !cell ||
          !cell.type ||
          (!cell.x && cell.x !== 0) ||
          (!cell.y && cell.y !== 0)
        ) {
          console.warn('⚠️ 跳过无效单元格:', cell);
          return;
        }

        const isFirstCell = cellIndex === 0;
        const isLastCell = cellIndex === row.cells.length - 1;
        
        // 深拷贝样式，确保边框属性被完整保留
        const cellStyles = {
          ...cell.styles,
          // 显式保留边框属性
          borderTopWidth: cell.styles.borderTopWidth,
          borderTopColor: cell.styles.borderTopColor,
          borderTopStyle: cell.styles.borderTopStyle,
          borderBottomWidth: cell.styles.borderBottomWidth,
          borderBottomColor: cell.styles.borderBottomColor,
          borderBottomStyle: cell.styles.borderBottomStyle,
          borderLeftWidth: cell.styles.borderLeftWidth,
          borderLeftColor: cell.styles.borderLeftColor,
          borderLeftStyle: cell.styles.borderLeftStyle,
          borderRightWidth: cell.styles.borderRightWidth,
          borderRightColor: cell.styles.borderRightColor,
          borderRightStyle: cell.styles.borderRightStyle
        };

        // 为表格边缘添加闭合边框（无论是否跨页切割）
        const needsBorderFix = isFirstRow || isLastRow || isFirstCell || isLastCell;
        
        if (needsBorderFix) {
          if (isHeaderCopy) {
            // 表头副本需要确保有顶部和底部边框
            this.addSplitTableBorders(cellStyles, {
              isFirstRow: true,
              isLastRow: false, // 表头后面还有数据行
              isFirstCell,
              isLastCell,
              needsTopBorder: true, // 表头副本需要顶部边框
              isTableEnd: false,
              originalStyles: cell.styles
            });
          } else {
            // 普通数据行的边框处理
            this.addSplitTableBorders(cellStyles, {
              isFirstRow,
              isLastRow,
              isFirstCell,
              isLastCell,
              needsTopBorder,
              isTableEnd,
              originalStyles: cell.styles
            });
          }
        }

        // 创建新的单元格对象（Y坐标和高度统一为行的属性）
        // 注意：先展开 cell，再设置 styles，避免原始样式覆盖修改后的边框样式
        const adjustedCell = {
          ...cell,
          styles: {}, // 先清空 styles，防止被覆盖
          y: row.y, // 统一使用行的Y坐标
          height: row.height, // 统一使用行高，确保同一行所有单元格高度一致
          _isInTable: true,
          _tableStartY: startY,
          _isTableStart: isFirstRow,
          _isTableEnd: isLastRow && isTableEnd,
          _isSplitTable: isSplitTable,
          _movedToNextPage: cell._movedToNextPage || false,
          _isHeaderCopy: isHeaderCopy, // 标记表头副本
          _tableId: tableId // 添加表格ID，用于识别同一表格的不同段落
        };
        
        // 最后设置样式，确保边框不被覆盖
        adjustedCell.styles = cellStyles;

        elements.push(adjustedCell);
      });
    });

    return elements;
  }

  /**
   * 为切割表格添加闭合边框
   * @param {Object} cellStyles - 单元格样式对象
   * @param {Object} position - 单元格位置信息
   */
  addSplitTableBorders(cellStyles, position) {
    const { isFirstRow, isLastRow, isFirstCell, isLastCell, needsTopBorder, isTableEnd, originalStyles } = position;
    
    // 检查原始单元格是否有边框
    const hasTopBorder = originalStyles.borderTopWidth && parseFloat(originalStyles.borderTopWidth) > 0;
    const hasBottomBorder = originalStyles.borderBottomWidth && parseFloat(originalStyles.borderBottomWidth) > 0;
    const hasLeftBorder = originalStyles.borderLeftWidth && parseFloat(originalStyles.borderLeftWidth) > 0;
    const hasRightBorder = originalStyles.borderRightWidth && parseFloat(originalStyles.borderRightWidth) > 0;
    
    // 如果单元格四个边都没有边框，说明是无边框表格，不添加任何边框
    const hasAnyBorder = hasTopBorder || hasBottomBorder || hasLeftBorder || hasRightBorder;
    if (!hasAnyBorder) {
      return;
    }
    
    // 使用原有的边框样式，确保是数字格式
    const defaultColor = originalStyles.borderColor || originalStyles.borderTopColor || originalStyles.borderBottomColor || '#000000';
    const rawBorderWidth = originalStyles.borderTopWidth || originalStyles.borderBottomWidth || 
                           originalStyles.borderLeftWidth || originalStyles.borderRightWidth || '1';
    const borderWidth = parseFloat(rawBorderWidth) || 1;

    // 辅助函数：设置边框（使用数字格式）
    const setBorder = (side) => {
      cellStyles[`border${side}Width`] = borderWidth;
      cellStyles[`border${side}Color`] = defaultColor;
      cellStyles[`border${side}Style`] = 'solid';
    };

    // 顶部边框：强制为第一行添加（确保闭合）
    if (isFirstRow) {
      setBorder('Top');
    }

    // 底部边框：强制为最后一行添加（确保闭合）
    if (isLastRow) {
      setBorder('Bottom');
    }

    // 左右边框：强制添加（确保完全闭合）
    if (isFirstCell) {
      setBorder('Left');
    }
    if (isLastCell) {
      setBorder('Right');
    }
  }

  /**
   * 判断元素是否是表格单元格
   * @param {Object} element - 待判断的元素
   * @returns {boolean} 是否是表格单元格
   */
  isTableCell(element) {
    return (
      element.type === 'table-cell' ||
      element.type === 'table-row' ||
      (element.properties &&
        (element.properties.tag === 'td' ||
          element.properties.tag === 'th' ||
          element.properties.tag === 'tr'))
    );
  }
}
