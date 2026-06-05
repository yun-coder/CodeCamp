# HTML打印设计器

基于Canvas的可视化HTML打印设计器，支持HTML导入、元素拖拽调整、骑缝章功能。

## 核心功能

1. **HTML导入** - 直接导入HTML内容，自动解析并转换为可编辑的设计元素
2. **可视化设计** - 基于Canvas实现，支持元素拖拽、调整大小、自定义属性配置
3. **骑缝章功能** - 完整保留骑缝章切割逻辑，支持多页文档骑缝章应用
4. **预览打印** - 支持实时预览和打印输出

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 技术栈

- Vue 3 + Composition API
- Canvas API
- Ant Design Vue
- Vite

## 项目结构

```
src/
  ├── components/
  │   ├── designer/          # 设计器核心组件
  │   ├── stamp/             # 骑缝章相关组件
  │   └── preview/           # 预览打印组件
  ├── utils/                 # 工具函数
  ├── styles/                # 样式文件
  └── views/                 # 页面视图
```
