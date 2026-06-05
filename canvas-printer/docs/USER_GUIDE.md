# HTML打印设计器 - 使用指南

## 项目简介

这是一个基于Vue 3和Canvas的可视化HTML打印设计器，支持HTML内容导入、元素拖拽调整、骑缝章功能以及打印预览。

## 核心功能

### 1. HTML导入功能

**功能说明：**
- 支持直接导入HTML代码，自动解析并转换为可编辑的设计元素
- 保留HTML元素的基本样式（字体、颜色、尺寸等）
- 提供多个示例模板供快速测试

**使用方法：**
1. 在左侧面板选择"示例模板"或直接在文本框输入HTML代码
2. 点击"导入HTML"按钮
3. HTML内容会自动解析并显示在Canvas设计器中

**支持的HTML元素：**
- 文本元素（h1-h6, p, span, div等）
- 图片元素（img）
- 表格元素（table）
- 输入框（input, textarea）

### 2. Canvas设计器

**功能说明：**
- 基于Canvas实现的高性能设计器
- 支持元素拖拽移动
- 支持元素大小调整（8个控制点）
- 实时渲染预览

**操作方法：**
- **选择元素**：点击Canvas中的元素
- **移动元素**：拖拽选中的元素
- **调整大小**：拖拽选中元素周围的8个控制点
- **删除元素**：选中元素后，在右侧属性面板点击"删除元素"

### 3. 元素属性设置

**可配置属性：**

#### 基本属性
- **内容**：元素的文本内容
- **位置**：X、Y坐标（像素）
- **尺寸**：宽度、高度（像素）

#### 文本样式
- **字体大小**：8-100px
- **字体**：Arial、宋体、黑体、微软雅黑、楷体
- **文字颜色**：支持颜色选择器
- **文字对齐**：左对齐、居中、右对齐
- **字体粗细**：正常、粗体、更粗

#### 背景和边框
- **背景颜色**：支持颜色选择器
- **边框宽度**：0-10px
- **边框颜色**：支持颜色选择器
- **内边距**：0-50px

### 4. 骑缝章功能

**功能说明：**
- 完整保留原项目的骑缝章切割逻辑
- 支持多页文档的骑缝章自动分割
- 支持自定义印章位置和尺寸

**使用方法：**
1. 在左侧"骑缝章设置"面板上传印章图片
2. 选择盖章位置（右侧顶部/中间/底部）
3. 设置印章宽度和高度（单位：mm）
4. 点击"应用骑缝章"
5. 预览或打印时会自动按页数切割印章

**骑缝章原理：**
- 印章按总页数水平平均切割
- 每页显示对应的印章片段
- 多页拼接后形成完整的骑缝章效果

### 5. 纸张设置

**预设纸张：**
- A3：297mm × 420mm
- A4：210mm × 297mm（默认）
- A5：148mm × 210mm

**自定义纸张：**
- 支持自定义宽度和高度
- 范围：10-1000mm

### 6. 预览和打印

**预览功能：**
- 点击"预览"按钮打开预览弹窗
- 显示实际打印效果
- 支持多页文档预览
- 自动应用骑缝章效果

**打印功能：**
- 点击"打印"按钮直接打印
- 或在预览弹窗中点击打印
- 支持浏览器打印对话框
- 保留所有样式和骑缝章

## 技术实现

### Canvas设计器类（CanvasDesigner）

**核心方法：**

```javascript
// 导入HTML
importFromHTML(htmlString)

// 渲染Canvas
render()

// 更新元素属性
updateElement(elementId, properties)

// 删除元素
deleteElement(elementId)

// 设置纸张大小
setPaperSize(width, height)

// 导出/导入JSON
exportToJSON()
importFromJSON(jsonString)
```

**事件处理：**
- mousedown：选择元素或开始拖拽/调整大小
- mousemove：拖拽元素或调整大小
- mouseup：结束拖拽/调整大小

### 骑缝章切割类（StampSplitter）

**核心方法：**

```javascript
// 计算切割参数
StampSplitter.calculateSplitParams(config)

// 生成SVG元素
StampSplitter.createSVGElement(imageDataUrl, params, stampConfig, pageIndex)

// 生成SVG字符串
StampSplitter.createSVGString(imageDataUrl, params, stampConfig, pageIndex)

// 验证配置
StampSplitter.validateConfig(config)
```

## 项目结构

```
src/
├── components/
│   ├── designer/
│   │   └── PropertyPanel.vue      # 属性面板组件
│   ├── stamp/
│   │   └── SeamlessStamp.vue      # 骑缝章配置组件
│   └── preview/
│       └── PreviewModal.vue       # 预览弹窗组件
├── utils/
│   ├── canvasDesigner.js          # Canvas设计器核心类
│   ├── stampSplitter.js           # 骑缝章切割工具类
│   └── sampleTemplates.js         # 示例模板
├── styles/
│   └── main.css                   # 全局样式
├── views/
│   └── DesignerView.vue          # 主视图
├── router/
│   └── index.js                   # 路由配置
├── App.vue                        # 根组件
└── main.js                        # 入口文件
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 添加自定义模板

在 `src/utils/sampleTemplates.js` 中添加新模板：

```javascript
export const sampleHTMLTemplates = {
  // ... 现有模板
  
  myTemplate: `
    <div>
      <h1>我的自定义模板</h1>
      <p>模板内容...</p>
    </div>
  `,
};
```

### 扩展元素类型

1. 在 `canvasDesigner.js` 的 `getElementType()` 方法中添加新类型
2. 在 `renderElement()` 方法中添加渲染逻辑
3. 在 `PropertyPanel.vue` 中添加相应的属性配置

## 常见问题

### Q: 导入的HTML样式不完整？
A: 目前只支持基本的内联样式，复杂的CSS类和外部样式表不支持。建议使用内联样式。

### Q: Canvas元素显示模糊？
A: 已使用3.78的缩放比例（96dpi），如需更高清晰度，可调整 `canvasDesigner.js` 中的 `scale` 参数。

### Q: 骑缝章位置不准确？
A: 确保纸张尺寸设置正确，骑缝章位置是基于纸张尺寸计算的。

### Q: 打印时样式丢失？
A: 检查CSS中的 `@media print` 样式，确保 `print-color-adjust: exact` 已设置。

## 后续优化建议

1. **性能优化**
   - 使用虚拟滚动优化大量元素渲染
   - 添加Canvas离屏渲染
   - 实现元素层级管理

2. **功能增强**
   - 支持撤销/重做操作
   - 支持元素组合和锁定
   - 添加对齐辅助线
   - 支持更多元素类型（二维码、条形码等）

3. **用户体验**
   - 添加快捷键支持
   - 实现拖拽导入文件
   - 添加元素库和模板库
   - 支持保存和加载设计方案

## 许可证

MIT License
