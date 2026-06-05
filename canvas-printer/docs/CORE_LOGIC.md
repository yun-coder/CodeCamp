# Canvas Designer 核心逻辑文档

## 📚 目录

1. [系统概述](#系统概述)
2. [核心架构](#核心架构)
3. [关键流程](#关键流程)
4. [核心算法](#核心算法)
5. [样式处理](#样式处理)
6. [文本渲染](#文本渲染)
7. [边框渲染](#边框渲染)
8. [优化策略](#优化策略)

---

## 系统概述

Canvas Designer 是一个将 HTML 内容转换为 Canvas 图形的渲染引擎，主要用于实现所见即所得的打印预览功能。

### 核心特性

- ✅ HTML 到 Canvas 的精确转换
- ✅ 真实 DOM 布局计算
- ✅ 智能文本自动换行
- ✅ 段落间距自动处理
- ✅ 表格元素垂直居中
- ✅ 边框精确渲染
- ✅ 防重复元素创建

---

## 核心架构

### 类结构

```javascript
class CanvasDesigner {
    constructor(canvas, options)
    importFromHTML(htmlString)      // HTML导入入口
    parseElementWithLayout()        // 递归解析元素
    shouldCreateElement()           // 元素创建判断
    renderText()                    // 文本渲染
    renderBorder()                  // 边框渲染
    // ... 其他方法
}
```

### 数据流

```
HTML字符串 
    ↓
临时DOM容器（真实布局）
    ↓
递归解析元素树
    ↓
创建Canvas元素对象
    ↓
累积偏移调整（段落间距）
    ↓
Canvas渲染
```

---

## 关键流程

### 1. HTML 导入流程

```javascript
importFromHTML(htmlString) {
    // 1. 清空现有元素
    this.elements = [];
    
    // 2. 创建临时DOM容器获取真实布局
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;
    document.body.appendChild(tempContainer);
    
    // 3. 等待DOM渲染完成
    requestAnimationFrame(() => {
        // 4. 递归解析所有元素
        this.parseElementWithLayout(tempContainer, containerRect);
        
        // 5. 累积偏移调整（段落间距）
        let cumulativeOffset = 0;
        sortedElements.forEach(el => {
            if (el.styles.marginTop > 0) {
                cumulativeOffset += el.styles.marginTop;
            }
            el.y += cumulativeOffset;
            if (el.styles.marginBottom > 0) {
                cumulativeOffset += el.styles.marginBottom;
            }
        });
        
        // 6. 清理并渲染
        document.body.removeChild(tempContainer);
        this.render();
    });
}
```

**关键点：**
- 使用真实DOM获取准确的布局信息（`getBoundingClientRect()`）
- `requestAnimationFrame` 确保布局计算完成
- **累积偏移算法**：遍历排序后的元素，累加 margin 并应用到 Y 坐标

---

### 2. 元素解析流程

```javascript
parseElementWithLayout(element, containerRect, parentElement) {
    for (let child of element.childNodes) {
        // 1. 处理文本节点
        if (child.nodeType === Node.TEXT_NODE) {
            // 检查父元素是否会创建Canvas对象
            if (shouldCreateElement(parentElement)) {
                continue; // 避免重复，父元素会渲染文本
            }
            // 创建文本元素...
        }
        
        // 2. 处理元素节点
        if (child.nodeType === Node.ELEMENT_NODE) {
            // 防重复标记
            if (child._parsed) continue;
            child._parsed = true;
            
            // 获取布局信息
            const rect = child.getBoundingClientRect();
            
            // 跳过不可见元素
            if (rect.width === 0 || rect.height === 0) continue;
            
            // 判断是否创建Canvas对象
            if (shouldCreateElement(child, computed, directText, fullText)) {
                // 创建元素...
                // 处理margin、border等样式
            }
            
            // 递归处理子节点
            this.parseElementWithLayout(child, containerRect, child);
        }
    }
}
```

**关键点：**
- **防重复机制**：使用 `_parsed` 标记避免重复处理
- **智能跳过**：不可见元素跳过但继续递归子节点
- **层级关系**：通过 `parentElement` 参数传递父子关系

---

### 3. 元素创建判断

```javascript
shouldCreateElement(element, computed, directText, fullText) {
    const tag = element.tagName.toLowerCase();
    
    // 1. 跳过不可见元素
    if (computed.display === 'none') return false;
    
    // 2. 跳过纯容器元素
    if (['body', 'html', 'thead', 'tbody', 'tfoot'].includes(tag)) {
        return false;
    }
    
    // 3. 表格行：仅在有背景色时创建
    if (tag === 'tr') {
        return hasBackgroundColor;
    }
    
    // 4. 表格：仅在有边框时创建
    if (tag === 'table') {
        return hasVisibleBorder;
    }
    
    // 5. 单元格：有子元素时需检查样式，无子元素直接创建
    if (['td', 'th'].includes(tag)) {
        if (hasChildElements) {
            return hasVisibleBorder || hasBackground;
        }
        return true;
    }
    
    // 6. P标签：有子元素时不创建（避免与子元素重复）
    if (tag === 'p' && hasChildElements) {
        return false;
    }
    
    // 7. 其他元素：有文本或特殊样式时创建
    return fullText.length > 0 || hasVisibleStyle;
}
```

**设计原则：**
- **最小化原则**：只创建必要的Canvas对象
- **避免重复**：父子元素不重复渲染相同内容
- **样式驱动**：有可见样式（边框、背景）才创建

---

## 核心算法

### 1. 累积偏移算法（段落间距）

**问题：** HTML中 `line-height: 1` 的段落之间没有间距，需要添加合理的段落间距。

**解决方案：** 累积偏移法

```javascript
// 1. 在元素解析时记录margin
if (tag === 'p' && hasLineHeightOne) {
    marginTop = 10;
    marginBottom = 10;
}

// 2. 在所有元素解析完成后，统一调整Y坐标
let cumulativeOffset = 0;
const sortedElements = [...this.elements].sort((a, b) => a.y - b.y);

sortedElements.forEach(el => {
    // 累加上边距
    if (el.styles.marginTop > 0) {
        cumulativeOffset += el.styles.marginTop;
    }
    
    // 应用累积偏移
    el.y += cumulativeOffset;
    
    // 累加下边距
    if (el.styles.marginBottom > 0) {
        cumulativeOffset += el.styles.marginBottom;
    }
});
```

**优势：**
- ✅ 一次性调整，避免递归计算
- ✅ 保持元素间相对位置
- ✅ 易于维护和调试

---

### 2. 文本自动换行算法

**问题：** 文本内容超出元素宽度需要自动换行。

**解决方案：** 逐字符宽度测量

```javascript
const maxWidth = width - (padding * 2);
const paragraphs = content.split(/\r?\n/);
const wrappedLines = [];

for (let paragraph of paragraphs) {
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
    
    if (currentLine) {
        wrappedLines.push(currentLine);
    }
}
```

**特点：**
- ✅ 使用Canvas的 `measureText` 获取精确宽度
- ✅ 支持中英文混排
- ✅ 保留段落分隔（`\n`）

---

### 3. 文本垂直居中算法

**问题：** 表格单元格需要垂直居中，但普通文本需要考虑段落间距。

**解决方案：** 分类处理

```javascript
// 1. 区分表格单元格和普通元素
const isTableCell = element.type === 'table-cell' || element.type === 'table-row';

// 2. 计算内容区域
const contentY = isTableCell ? y : (y + marginTop);
const contentHeight = isTableCell ? height : (height - marginTop - marginBottom);

// 3. 计算文本总高度（单行用fontSize，多行用lineHeight）
let totalTextHeight;
if (wrappedLines.length === 1) {
    totalTextHeight = styles.fontSize;  // 单行使用字体大小
} else {
    totalTextHeight = wrappedLines.length * lineHeight;  // 多行使用行高
}

// 4. 垂直居中计算
let startY;
if (totalTextHeight <= contentHeight) {
    // 文本未超出，垂直居中
    startY = contentY + (contentHeight - totalTextHeight) / 2;
} else {
    // 文本超出，从顶部开始
    startY = contentY + padding;
}
```

**关键点：**
- **表格单元格**：使用完整高度，不考虑margin
- **单行文本**：用 `fontSize` 计算高度（精确居中）
- **多行文本**：用 `lineHeight * 行数` 计算总高度

---

## 样式处理

### 1. 内联样式解析

```javascript
parseInlineStyles(element) {
    const inlineStyle = element.getAttribute('style') || '';
    const styles = {};
    
    // 解析 line-height
    const lineHeightMatch = inlineStyle.match(/line-height\s*:\s*([\d.]+)/);
    if (lineHeightMatch) {
        styles.lineHeight = parseFloat(lineHeightMatch[1]);
    }
    
    // 解析 border-width
    const borderMatch = inlineStyle.match(/border(?:-width)?\s*:\s*(\d+(?:\.\d+)?)\s*px/);
    if (borderMatch) {
        const width = parseFloat(borderMatch[1]);
        styles.borderWidth = width;
        styles.borderTopWidth = width;
        styles.borderRightWidth = width;
        styles.borderBottomWidth = width;
        styles.borderLeftWidth = width;
    }
    
    // ... 其他样式解析
    
    return styles;
}
```

**优先级：** 内联样式 > 计算样式

---

### 2. Margin 继承机制

**场景：** `<p style="line-height: 1"><span>文本</span></p>`

```javascript
// 子元素继承父P标签的margin设置
if (parentElement && parentElement.tagName.toLowerCase() === 'p') {
    const parentInlineStyles = this.parseInlineStyles(parentElement);
    const parentHasLineHeightOne = parentInlineStyles.lineHeight === 1;
    
    if (parentHasLineHeightOne) {
        marginTop = 6;
        marginBottom = 6;
    } else {
        marginTop = 8;
        marginBottom = 8;
    }
    // 注意：不直接调整Y位置，只存储margin值用于渲染
}
```

**目的：** 让子元素在渲染时能考虑父元素的间距要求

---

## 文本渲染

### 完整渲染流程

```javascript
renderText(element) {
    // 1. 提取样式信息
    const { x, y, width, height, content, styles } = element;
    
    // 2. 区分表格单元格和普通元素
    const isTableCell = element.type === 'table-cell' || element.type === 'table-row';
    const contentY = isTableCell ? y : (y + marginTop);
    const contentHeight = isTableCell ? height : (height - marginTop - marginBottom);
    
    // 3. 绘制背景
    if (styles.backgroundColor !== 'transparent') {
        this.ctx.fillRect(x, contentY, width, contentHeight);
    }
    
    // 4. 设置字体和对齐
    this.ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = textAlign;
    
    // 5. 文本自动换行
    const wrappedLines = this.wrapText(content, maxWidth);
    
    // 6. 计算垂直居中位置
    const totalTextHeight = wrappedLines.length === 1 
        ? styles.fontSize 
        : wrappedLines.length * lineHeight;
    const startY = contentY + (contentHeight - totalTextHeight) / 2;
    
    // 7. 逐行渲染
    wrappedLines.forEach((line, index) => {
        const textY = startY + (index * lineHeight);
        this.ctx.fillText(line, textX, textY);
    });
}
```

---

## 边框渲染

### 独立边框绘制

```javascript
renderBorder(element) {
    const { x, y, width, height, styles } = element;
    
    // 分别处理四条边
    // 上边框
    if (borderTopWidth > 0) {
        this.ctx.strokeStyle = borderTopColor;
        this.ctx.lineWidth = borderTopWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + borderTopWidth / 2);
        this.ctx.lineTo(x + width, y + borderTopWidth / 2);
        this.ctx.stroke();
    }
    
    // 右边框
    if (borderRightWidth > 0) {
        this.ctx.strokeStyle = borderRightColor;
        this.ctx.lineWidth = borderRightWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x + width - borderRightWidth / 2, y);
        this.ctx.lineTo(x + width - borderRightWidth / 2, y + height);
        this.ctx.stroke();
    }
    
    // ... 下边框、左边框
}
```

**优势：**
- ✅ 支持四条边不同颜色和宽度
- ✅ 精确对齐（考虑线宽偏移）
- ✅ 避免边角重叠

---

## 优化策略

### 1. 防重复机制

```javascript
// 标记已处理的元素
child._parsed = true;

// 检查父元素是否会创建Canvas对象
if (shouldCreateElement(parentElement)) {
    continue; // 避免重复
}
```

### 2. 智能跳过

```javascript
// 跳过不可见元素但继续处理子节点
if (rect.width === 0 || rect.height === 0) {
    if (child.childNodes.length > 0) {
        this.parseElementWithLayout(child, containerRect, child);
    }
    continue;
}
```

### 3. 样式缓存

```javascript
// 只解析一次内联样式
const inlineStyles = this.parseInlineStyles(element);
```

### 4. 按需渲染

```javascript
// 只渲染可见区域内的文本行
if (textY >= contentY && textY <= contentY + contentHeight) {
    this.ctx.fillText(line, textX, textY);
}
```

---

## 关键配置

### 默认值

```javascript
{
    scale: 3.78,           // mm to px (96dpi)
    paperWidth: 210,       // A4宽度(mm)
    paperHeight: 297,      // A4高度(mm)
    fontSize: 14,          // 默认字体大小(px)
    lineHeight: 1.5,       // 默认行高倍数
    padding: 0,            // 默认内边距(px)
    marginTop: 10,         // P标签上边距(px)
    marginBottom: 10       // P标签下边距(px)
}
```

### 段落间距规则

| 标签 | 条件 | marginTop | marginBottom |
|-----|------|-----------|--------------|
| P标签 | line-height: 1 | 10px | 10px |
| P标签 | 其他 | 13px | 13px |
| Span | 父P有 line-height: 1 | 6px | 6px |
| Span | 父P其他 | 8px | 8px |
| 表格单元格 | - | 0 | 0 |

---

## 常见问题与解决方案

### Q1: 文本出现重复渲染

**原因：** P标签和其子Span都创建了Canvas对象

**解决：**
```javascript
// P标签有子元素时不创建
if (tag === 'p' && hasChildElements) {
    return false;
}
```

### Q2: 段落之间没有间距

**原因：** line-height: 1 导致行高等于字体大小

**解决：** 使用累积偏移算法添加margin

### Q3: 表格表头不垂直居中

**原因：** 表格单元格被误加了margin或使用了多行lineHeight计算

**解决：**
```javascript
// 1. 表格单元格不使用margin
const isTableCell = element.type === 'table-cell';
const contentHeight = isTableCell ? height : (height - marginTop - marginBottom);

// 2. 单行文本使用fontSize计算高度
if (wrappedLines.length === 1) {
    totalTextHeight = styles.fontSize;
}
```

### Q4: 长文本未自动换行

**原因：** 未实现宽度检测和换行逻辑

**解决：** 使用 `ctx.measureText()` 逐字符测量并换行

---

## 版本历史

### v2.0 (2025-11-24)
- ✅ 实现累积偏移算法处理段落间距
- ✅ 修复表格单元格垂直居中
- ✅ 优化单行/多行文本高度计算
- ✅ 完善防重复机制

### v1.0 (2025-11)
- ✅ 基础HTML到Canvas转换
- ✅ 文本自动换行
- ✅ 边框独立渲染
- ✅ 样式解析引擎

---

## 参考资料

- [Canvas API 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [getBoundingClientRect](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getBoundingClientRect)
- [measureText](https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/measureText)

---

**最后更新：** 2025年11月24日  
**维护者：** GitHub Copilot
