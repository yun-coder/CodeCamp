/**
 * 骑缝章切割工具类
 * 封装骑缝章切割的核心逻辑
 */

/**
 * 计算印章 top 位置（返回 mm 单位）
 * @param {string} position - 位置 ('top'|'middle'|'bottom')
 * @param {number} height - 印章高度 (mm)
 * @param {number} paperHeight - 纸张高度 (mm)
 * @returns {number} top 位置 (mm)
 */
const getStampTopPositionMm = (position, height, paperHeight = 297) => {
  const positions = {
    top: 20,
    middle: (paperHeight - height) / 2,
    bottom: paperHeight - height - 20,
  };

  return positions[position] || positions.middle;
};

export class StampSplitter {
  /**
   * 计算骑缝章切割参数
   * @param {Object} config - 配置参数
   * @param {number} config.stampWidth - 印章宽度 (mm)
   * @param {number} config.stampHeight - 印章高度 (mm)
   * @param {number} config.pageIndex - 当前页索引（从0开始）
   * @param {number} config.totalPages - 总页数
   * @param {number} config.paperWidth - 纸张宽度 (mm)
   * @param {number} config.paperHeight - 纸张高度 (mm)
   * @param {string} config.position - 印章位置 ('top'|'middle'|'bottom')
   * @returns {Object} 切割参数
   */
  static calculateSplitParams(config) {
    const {
      stampWidth,
      stampHeight,
      pageIndex,
      totalPages,
      paperWidth,
      paperHeight,
      position,
    } = config;

    // 骑缝章切割逻辑（水平方向切割）：
    // 印章按照总页数水平平均切割，每页显示对应的那一部分
    // 例如：2页时，第1页显示左侧1/2，第2页显示右侧1/2

    // 每页显示的印章宽度 = 印章总宽度 / 总页数
    const stampWidthPerPage = stampWidth / totalPages;

    // 当前页应该显示的印章部分的起始X坐标（在印章图片中的位置）
    const viewBoxX = pageIndex * stampWidthPerPage;

    // 当前页显示的印章宽度
    const viewBoxWidth = stampWidthPerPage;

    // 纵向位置：所有页面的印章片段显示在相同的垂直位置（根据position配置）
    const stampTopMm = getStampTopPositionMm(position, stampHeight, paperHeight);

    // 横向位置：印章片段显示在纸张右边缘
    const stampLeftMm = paperWidth - stampWidthPerPage;

    return {
      stampWidthPerPage,
      viewBoxX,
      viewBoxWidth,
      stampTopMm,
      stampLeftMm,
      viewBoxY: 0,
      viewBoxHeight: stampHeight,
    };
  }

  /**
   * 生成切割后的SVG元素（DOM节点）
   * @param {string} imageDataUrl - 印章图片的 data URL
   * @param {Object} params - 切割参数（由 calculateSplitParams 返回）
   * @param {Object} stampConfig - 印章配置
   * @param {number} pageIndex - 当前页索引
   * @returns {SVGElement} SVG DOM 元素
   */
  static createSVGElement(imageDataUrl, params, stampConfig, pageIndex) {
    const {
      viewBoxX,
      viewBoxWidth,
      viewBoxHeight,
      stampTopMm,
      stampLeftMm,
    } = params;

    // 创建 SVG 元素
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${viewBoxWidth}mm`);
    svg.setAttribute('height', `${viewBoxHeight}mm`);
    svg.setAttribute('viewBox', `${viewBoxX} 0 ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('data-stamp-type', 'seamless');
    svg.setAttribute('data-page-index', pageIndex.toString());
    svg.setAttribute('class', 'seamless-stamp-dynamic');

    Object.assign(svg.style, {
      position: 'absolute',
      left: `${stampLeftMm}mm`,
      top: `${stampTopMm}mm`,
      zIndex: '9999',
      pointerEvents: 'none',
    });

    const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageDataUrl);
    svgImage.setAttribute('href', imageDataUrl);
    svgImage.setAttribute('x', '0');
    svgImage.setAttribute('y', '0');
    svgImage.setAttribute('width', stampConfig.width);
    svgImage.setAttribute('height', stampConfig.height);
    svgImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    svg.appendChild(svgImage);
    return svg;
  }

  /**
   * 生成切割后的SVG字符串（用于HTML预览）
   * @param {string} imageDataUrl - 印章图片的 data URL
   * @param {Object} params - 切割参数（由 calculateSplitParams 返回）
   * @param {Object} stampConfig - 印章配置
   * @param {number} pageIndex - 当前页索引
   * @returns {string} SVG HTML 字符串
   */
  static createSVGString(imageDataUrl, params, stampConfig, pageIndex) {
    const {
      viewBoxX,
      viewBoxWidth,
      viewBoxHeight,
      stampTopMm,
      stampLeftMm,
    } = params;

    return `
    <svg
      width="${viewBoxWidth}mm"
      height="${viewBoxHeight}mm"
      viewBox="${viewBoxX} 0 ${viewBoxWidth} ${viewBoxHeight}"
      xmlns="http://www.w3.org/2000/svg"
      data-stamp-type="seamless"
      data-page-index="${pageIndex}"
      class="seamless-stamp-dynamic"
      style="position: absolute; left: ${stampLeftMm}mm; top: ${stampTopMm}mm; z-index: 9999; pointer-events: none;">
      <image
        href="${imageDataUrl}"
        x="0"
        y="0"
        width="${stampConfig.width}"
        height="${stampConfig.height}"
        preserveAspectRatio="xMidYMid meet" />
    </svg>
  `;
  }

  /**
   * 生成切割后的预览图片（Canvas转base64）
   * @param {string} imageDataUrl - 印章图片的 data URL
   * @param {Object} params - 切割参数
   * @param {Object} stampConfig - 印章配置
   * @returns {Promise<string>} 切割后图片的 data URL
   */
  static async createPreviewImage(imageDataUrl, params, stampConfig) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const { viewBoxX, viewBoxWidth, viewBoxHeight } = params;
          
          // 计算实际像素
          const scaleX = img.width / stampConfig.width;
          const scaleY = img.height / stampConfig.height;
          
          const sourceX = viewBoxX * scaleX;
          const sourceWidth = viewBoxWidth * scaleX;
          const sourceHeight = viewBoxHeight * scaleY;
          
          canvas.width = sourceWidth;
          canvas.height = sourceHeight;
          
          const ctx = canvas.getContext('2d');
          // 绘制切割后的图片部分
          ctx.drawImage(
            img,
            sourceX, 0, sourceWidth, sourceHeight,
            0, 0, sourceWidth, sourceHeight
          );
          
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  /**
   * 验证骑缝章配置
   * @param {Object} config - 印章配置
   * @returns {Object} 验证结果 { valid: boolean, message: string }
   */
  static validateConfig(config) {
    if (!config.imageUrl) {
      return { valid: false, message: '请上传印章图片' };
    }
    
    if (!config.width || config.width <= 0) {
      return { valid: false, message: '印章宽度必须大于0' };
    }
    
    if (!config.height || config.height <= 0) {
      return { valid: false, message: '印章高度必须大于0' };
    }
    
    if (!['top', 'middle', 'bottom'].includes(config.position)) {
      return { valid: false, message: '印章位置配置错误' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * 计算骑缝章在Canvas上的渲染位置（像素单位）
   * @param {Object} params - 切割参数
   * @param {number} scale - mm到px的转换比例
   * @returns {Object} 像素位置 { x, y, width, height }
   */
  static calculateCanvasPosition(params, scale = 3.78) {
    return {
      x: params.stampLeftMm * scale,
      y: params.stampTopMm * scale,
      width: params.viewBoxWidth * scale,
      height: params.viewBoxHeight * scale,
    };
  }
}
