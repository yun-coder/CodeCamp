# 快速启动指南

## 项目已创建完成！

新项目位于：`d:\workSpace\html-print-designer`

## 立即开始

### 1. 进入项目目录

```powershell
cd d:\workSpace\html-print-designer
```

### 2. 安装依赖

```powershell
npm install
```

### 3. 启动开发服务器

```powershell
npm run dev
```

项目将自动在浏览器中打开 http://localhost:3000

## 功能测试流程

### 测试HTML导入功能

1. 在左侧面板选择一个示例模板（如"合同示例"）
2. 点击"导入HTML"按钮
3. Canvas中会显示解析后的内容

### 测试元素编辑功能

1. 点击Canvas中的任意元素进行选择
2. 拖拽元素可移动位置
3. 拖拽边角控制点可调整大小
4. 在右侧属性面板修改样式属性

### 测试骑缝章功能

1. 在左侧"骑缝章设置"面板上传一张印章图片
2. 选择盖章位置（建议选择"右侧中间"）
3. 设置印章尺寸（建议宽度40mm，高度40mm）
4. 点击"应用骑缝章"

### 测试预览和打印

1. 点击顶部工具栏的"预览"按钮
2. 查看预览效果（包括骑缝章效果）
3. 点击"打印"按钮测试打印功能

## 项目特色

✅ **HTML导入** - 直接导入HTML内容，自动转换为可编辑元素
✅ **Canvas设计器** - 高性能Canvas渲染，流畅的拖拽体验
✅ **骑缝章功能** - 完整保留原项目逻辑，支持多页切割
✅ **属性配置** - 丰富的属性配置面板，支持实时预览
✅ **打印预览** - 所见即所得的预览和打印功能

## 主要改进

相比原项目的优势：

1. **不依赖第三方打印插件** - 使用原生Canvas实现，更加轻量
2. **保留设计器样式** - 沿用原项目的UI设计风格
3. **骑缝章功能完整** - 完全保留了骑缝章的切割逻辑
4. **更灵活的HTML支持** - 可以导入任意HTML内容
5. **属性配置更完善** - 支持更多的样式属性配置

## 项目结构

```
html-print-designer/
├── docs/                    # 文档目录
│   └── USER_GUIDE.md       # 详细使用指南
├── src/
│   ├── components/         # Vue组件
│   │   ├── designer/       # 设计器相关组件
│   │   ├── stamp/          # 骑缝章组件
│   │   └── preview/        # 预览组件
│   ├── utils/              # 工具类
│   │   ├── canvasDesigner.js    # Canvas设计器核心
│   │   ├── stampSplitter.js     # 骑缝章切割工具
│   │   └── sampleTemplates.js   # 示例模板
│   ├── styles/             # 样式文件
│   ├── views/              # 页面视图
│   ├── router/             # 路由配置
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── index.html              # HTML入口
├── package.json            # 项目配置
├── vite.config.js          # Vite配置
└── README.md               # 项目说明
```

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **Canvas API** - 用于图形渲染
- **Ant Design Vue** - UI组件库
- **Vite** - 新一代前端构建工具
- **Pinia** - Vue状态管理

## 需要帮助？

查看详细文档：`docs/USER_GUIDE.md`

## 下一步

开始开发你的打印设计器应用吧！🚀
