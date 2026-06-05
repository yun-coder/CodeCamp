# Hiprint.js API 文档

> **版本**: 2.5.4  
> **作者**: www.hinnn.com  
> **许可证**: LGPL / 商业许可

## 目录

- [简介](#简介)
- [核心对象](#核心对象)
  - [hiprint](#hiprint)
  - [hinnn](#hinnn)
- [PrintTemplate 类](#printtemplate-类)
- [工具方法](#工具方法)
- [事件系统](#事件系统)
- [打印客户端](#打印客户端)

---

## 简介

Hiprint是一个用于Web打印的JavaScript库，提供可视化的打印模板设计、预览和打印功能。支持拖拽设计、表格打印、图片打印等多种打印元素。

### 特性

- ✅ 可视化打印模板设计器
- ✅ 支持多种打印元素（文本、表格、图片、条形码、二维码等）
- ✅ 拖拽式操作，所见即所得
- ✅ 支持JSON模板导入/导出
- ✅ 支持浏览器打印和客户端打印
- ✅ 支持PDF导出
- ✅ 支持图片转Base64
- ✅ 支持自动保存

---

## 核心对象

### hiprint

全局主对象，用于初始化和访问打印功能。

#### `hiprint.init(providers)`

初始化打印库并注册打印元素提供器。

**参数:**
- `providers` (Array): 打印元素提供器数组

**示例:**
```javascript
hiprint.init([
  {
    name: 'default',
    addElementTypes: function(api) {
      // 注册打印元素类型
    }
  }
]);
```

#### `hiprint.PrintTemplate(options)`

创建打印模板实例。

**参数:**
- `options` (Object): 配置选项
  - `template` (Object): 模板JSON数据
  - `settingContainer` (String): 设置面板容器选择器
  - `paginationContainer` (String): 分页容器选择器
  - `fields` (Array): 可用字段列表
  - `autoSave` (Boolean): 是否自动保存
  - `autoSaveKey` (String): 自动保存键名
  - `autoSaveMode` (Number): 自动保存模式 (1: 完整JSON, 2: 不含tid的JSON)

**返回:**
- `PrintTemplate` 实例

**示例:**
```javascript
const hiprintTemplate = new hiprint.PrintTemplate({
  template: templateJson,
  settingContainer: '#PrintElementOptionSetting',
  paginationContainer: '.hiprint-printPagination',
  fields: fieldsList
});
```

---

### hinnn

工具对象，提供单位转换和通用工具方法。

#### `hinnn.event`

事件管理对象。

**方法:**
- `on(eventName, callback)` - 注册事件监听
- `off(eventName, callback)` - 移除事件监听
- `trigger(eventName, ...args)` - 触发事件
- `clear(eventName)` - 清除事件
- `getId()` - 获取唯一ID
- `getNameWithId(name)` - 获取带ID的名称

#### `hinnn.pt`

点（pt）单位转换。

**方法:**
- `toPx(pt)` - pt转px
- `getDpi()` - 获取DPI

#### `hinnn.px`

像素（px）单位转换。

**方法:**
- `toPt(px)` - px转pt
- `getDpi()` - 获取DPI

#### `hinnn.mm`

毫米（mm）单位转换。

**方法:**
- `toPt(mm)` - mm转pt
- `toPx(mm)` - mm转px

#### `hinnn.form`

表单工具。

**方法:**
- `serialize(formElement)` - 序列化表单数据

#### 工具函数

```javascript
// 节流函数
hinnn.throttle(func, wait, options)

// 防抖函数
hinnn.debounce(func, wait, immediate)

// UTF-8编码
hinnn.toUtf8(str)

// 分组
hinnn.groupBy(array, keys, keyFunc)
```

---

## PrintTemplate 类

打印模板主类，提供模板设计、预览、打印等核心功能。

### 模板设计

#### `design(container, options)`

启动设计模式，在指定容器中显示设计器。

**参数:**
- `container` (String|Element): 容器选择器或DOM元素
- `options` (Object): 设计选项

**示例:**
```javascript
hiprintTemplate.design('#printTemplateContainer');
```

#### `getJson()`

获取模板的JSON数据（包含所有元素的tid）。

**返回:**
- (Object): 模板JSON对象

**示例:**
```javascript
const templateJson = hiprintTemplate.getJson();
console.log(JSON.stringify(templateJson));
```

#### `getJsonTid()`

获取模板的JSON数据（不包含空面板）。

**返回:**
- (Object): 简化的模板JSON对象

#### `clear()`

清空所有打印元素，保留第一个面板。

**示例:**
```javascript
hiprintTemplate.clear();
```

---

### 纸张操作

#### `setPaper(paperType, width, height)`

设置纸张类型或自定义尺寸。

**参数:**
- `paperType` (String): 纸张类型 (A3, A4, A5, B3, B4, B5等)
- `width` (Number): 自定义宽度（mm）
- `height` (Number): 自定义高度（mm）

**示例:**
```javascript
// 设置为A4纸张
hiprintTemplate.setPaper('A4');

// 自定义尺寸
hiprintTemplate.setPaper(210, 297);
```

#### `rotatePaper()`

旋转当前纸张（横向/纵向切换）。

**示例:**
```javascript
hiprintTemplate.rotatePaper();
```

#### `getPaperType(index)`

获取指定面板的纸张类型。

**参数:**
- `index` (Number): 面板索引，默认为0

**返回:**
- (String): 纸张类型

#### `getOrient(index)`

获取纸张方向。

**参数:**
- `index` (Number): 面板索引，默认为0

**返回:**
- (Number): 1=纵向, 2=横向

---

### 预览和打印

#### `getHtml(data, options)`

生成打印的HTML内容。

**参数:**
- `data` (Object|Array): 打印数据
  - 如果是对象，将应用到所有面板
  - 如果是数组，每个元素对应一个数据记录
- `options` (Object): 生成选项
  - `imgToBase64` (Boolean): 是否将图片转为Base64
  - `styleHandler` (Function): 样式处理函数

**返回:**
- (jQuery): 包含打印HTML的jQuery对象

**示例:**
```javascript
const printData = {
  name: '张三',
  date: '2024-01-01',
  amount: 1000
};

const html = hiprintTemplate.getHtml(printData);
```

#### `print(data, options)`

使用浏览器原生打印功能打印。

**参数:**
- `data` (Object|Array): 打印数据
- `options` (Object): 打印选项

**示例:**
```javascript
hiprintTemplate.print(printData);
```

#### `print2(data, options)`

使用客户端打印（需要安装客户端）。

**参数:**
- `data` (Object): 打印数据
- `options` (Object): 打印选项
  - `printer` (String): 打印机名称
  - `pageSize` (String): 纸张大小
  - `orientation` (String): 纸张方向

**示例:**
```javascript
hiprintTemplate.print2(printData, {
  printer: 'Microsoft Print to PDF',
  orientation: 'portrait'
});
```

---

### 面板管理

#### `addPrintPanel(panelData, design)`

添加新的打印面板。

**参数:**
- `panelData` (Object): 面板数据
- `design` (Boolean): 是否立即进入设计模式

**返回:**
- (Panel): 新创建的面板实例

**示例:**
```javascript
const newPanel = hiprintTemplate.addPrintPanel({
  paperType: 'A4',
  width: 210,
  height: 297
}, true);
```

#### `selectPanel(index)`

选中指定索引的面板。

**参数:**
- `index` (Number): 面板索引

#### `deletePanel(index)`

删除指定索引的面板。

**参数:**
- `index` (Number): 面板索引

#### `getPaneltotal()`

获取面板总数。

**返回:**
- (Number): 面板数量

#### `getPanel(index)`

获取指定索引的面板实例。

**参数:**
- `index` (Number): 面板索引，默认为0

**返回:**
- (Panel): 面板实例

---

### 元素操作

#### `getElementByTid(tid, panelIndex)`

根据tid获取打印元素。

**参数:**
- `tid` (String): 元素的tid
- `panelIndex` (Number): 面板索引，默认为0

**返回:**
- (PrintElement): 打印元素实例

#### `getElementByName(name, panelIndex)`

根据名称获取打印元素。

**参数:**
- `name` (String): 元素名称
- `panelIndex` (Number): 面板索引，默认为0

**返回:**
- (PrintElement): 打印元素实例

#### `deletePrintElement(tid)`

删除指定tid的打印元素。

**参数:**
- `tid` (String): 元素的tid

---

### 字段管理

#### `setFields(fields)`

设置可用字段列表。

**参数:**
- `fields` (Array): 字段数组

**示例:**
```javascript
hiprintTemplate.setFields([
  { name: 'name', text: '姓名', type: 'text' },
  { name: 'date', text: '日期', type: 'date' },
  { name: 'amount', text: '金额', type: 'number' }
]);
```

#### `getFields()`

获取可用字段列表。

**返回:**
- (Array): 字段数组

#### `getFieldsInPanel()`

获取面板中使用的所有字段。

**返回:**
- (Array): 字段数组

---

### PDF导出

#### `toPdf(data, filename, options)`

导出为PDF文件。

**参数:**
- `data` (Object): 打印数据
- `filename` (String): 文件名
- `options` (Object): 导出选项
  - `scale` (Number): 缩放比例，默认2
  - `width` (Number): 宽度
  - `useCORS` (Boolean): 是否使用CORS

**示例:**
```javascript
hiprintTemplate.toPdf(printData, 'document.pdf', {
  scale: 2,
  useCORS: true
});
```

---

### 事件监听

#### `on(eventName, callback)`

监听模板事件。

**参数:**
- `eventName` (String): 事件名称
  - `printSuccess` - 打印成功
  - `printError` - 打印失败
- `callback` (Function): 回调函数

**示例:**
```javascript
hiprintTemplate.on('printSuccess', function() {
  console.log('打印成功');
});

hiprintTemplate.on('printError', function(error) {
  console.error('打印失败:', error);
});
```

---

### 客户端打印

#### `clientIsOpened()`

检查打印客户端是否已连接。

**返回:**
- (Boolean): true=已连接, false=未连接

#### `getPrinterList()`

获取可用的打印机列表。

**返回:**
- (Array): 打印机列表

**示例:**
```javascript
if (hiprintTemplate.clientIsOpened()) {
  const printers = hiprintTemplate.getPrinterList();
  console.log('可用打印机:', printers);
}
```

---

## 工具方法

### hiLocalStorage

本地存储工具。

**方法:**
```javascript
// 保存数据
hiLocalStorage.saveLocalData(key, value)

// 获取数据
hiLocalStorage.getLocalData(key)

// 移除数据
hiLocalStorage.removeItem(key)
```

### hiwebSocket

WebSocket客户端连接工具。

**属性:**
- `opened` (Boolean): 连接状态

**方法:**
```javascript
// 发送数据
hiwebSocket.send(data)

// 获取打印机列表
hiwebSocket.getPrinterList()

// 启动连接
hiwebSocket.start()

// 停止连接
hiwebSocket.stop()

// 重连
hiwebSocket.reconnect()
```

---

## 事件系统

### 全局事件

通过 `hinnn.event` 触发和监听：

#### 模板数据变化
```javascript
hinnn.event.on('hiprintTemplateDataChanged_' + templateId, function() {
  console.log('模板数据已更改');
});
```

#### 打印元素选中
```javascript
hinnn.event.on('PrintElementSelectEventKey_' + templateId, function(data) {
  console.log('选中元素:', data.printElement);
});
```

#### 构建自定义选项面板
```javascript
hinnn.event.on('BuildCustomOptionSettingEventKey_' + templateId, function(data) {
  console.log('构建选项面板:', data);
});
```

---

## 打印元素类型

### 基础元素

- **text** - 文本
- **image** - 图片
- **longText** - 长文本
- **table** - 表格
- **tableCustom** - 自定义表格
- **html** - HTML内容

### 条码元素

- **barcode** - 条形码
- **qrcode** - 二维码

### 其他元素

- **hline** - 横线
- **vline** - 竖线
- **rect** - 矩形
- **oval** - 椭圆

---

## 打印元素选项

每个打印元素都支持以下通用选项：

### 位置和尺寸
```javascript
{
  left: 10,          // 左边距(pt)
  top: 10,           // 上边距(pt)
  width: 100,        // 宽度(pt)
  height: 20,        // 高度(pt)
}
```

### 样式
```javascript
{
  fontSize: 12,              // 字体大小
  fontFamily: 'Microsoft YaHei', // 字体
  color: '#000000',          // 颜色
  textAlign: 'left',         // 对齐方式: left/center/right
  fontWeight: 'normal',      // 字重: normal/bold
  textDecoration: 'none',    // 文本装饰: none/underline/line-through
  lineHeight: 1.5,           // 行高
  letterSpacing: 0,          // 字间距
}
```

### 边框
```javascript
{
  borderWidth: 1,            // 边框宽度
  borderStyle: 'solid',      // 边框样式: solid/dashed/dotted
  borderColor: '#000000',    // 边框颜色
  borderRadius: 0,           // 圆角
}
```

### 数据绑定
```javascript
{
  field: 'fieldName',        // 绑定字段名
  testData: 'test value',    // 测试数据
  formatter: function(value, row, index, options) {
    // 格式化函数
    return value;
  },
  columns: [[                // 表格列配置
    {
      title: '列名',
      field: 'fieldName',
      width: 100
    }
  ]]
}
```

### 固定位置
```javascript
{
  fixed: false,              // 是否固定位置
  isFixed: false,            // 是否相对固定
}
```

---

## 纸张类型常量

```javascript
const PAPER_TYPES = {
  A3: { width: 297, height: 420 },   // A3纸
  A4: { width: 210, height: 297 },   // A4纸
  A5: { width: 148, height: 210 },   // A5纸
  B3: { width: 353, height: 500 },   // B3纸
  B4: { width: 250, height: 353 },   // B4纸
  B5: { width: 176, height: 250 },   // B5纸
};
```

---

## 完整示例

### 创建打印模板

```javascript
// 1. 初始化
hiprint.init();

// 2. 创建模板
const hiprintTemplate = new hiprint.PrintTemplate({
  template: {},
  settingContainer: '#PrintElementOptionSetting',
  paginationContainer: '.hiprint-printPagination'
});

// 3. 启动设计器
hiprintTemplate.design('#hiprint-printTemplate');

// 4. 设置纸张
hiprintTemplate.setPaper('A4');

// 5. 保存模板
const templateJson = hiprintTemplate.getJson();
localStorage.setItem('template', JSON.stringify(templateJson));
```

### 打印文档

```javascript
// 1. 加载模板
const templateJson = JSON.parse(localStorage.getItem('template'));

// 2. 创建模板实例
const hiprintTemplate = new hiprint.PrintTemplate({
  template: templateJson
});

// 3. 准备数据
const printData = {
  name: '张三',
  date: '2024-01-01',
  items: [
    { product: '商品1', quantity: 2, price: 100 },
    { product: '商品2', quantity: 1, price: 200 }
  ],
  total: 400
};

// 4. 打印
hiprintTemplate.print(printData);

// 或导出PDF
hiprintTemplate.toPdf(printData, 'document.pdf');
```

### 批量打印

```javascript
// 准备多条数据
const printDataList = [
  { name: '张三', code: '001' },
  { name: '李四', code: '002' },
  { name: '王五', code: '003' }
];

// 使用数组方式打印
hiprintTemplate.print(printDataList);
```

---

## 最佳实践

### 1. 单位转换

使用 `hinnn` 工具进行单位转换：

```javascript
// mm转pt
const pt = hinnn.mm.toPt(10);

// pt转px
const px = hinnn.pt.toPx(10);

// px转pt
const pt2 = hinnn.px.toPt(100);
```

### 2. 图片处理

打印前将图片转为Base64：

```javascript
const html = hiprintTemplate.getHtml(printData, {
  imgToBase64: true
});
```

### 3. 自动保存

启用自动保存功能：

```javascript
const hiprintTemplate = new hiprint.PrintTemplate({
  template: templateJson,
  autoSave: true,
  autoSaveKey: 'myTemplateAutoSave',
  autoSaveMode: 1  // 1=完整JSON, 2=简化JSON
});
```

### 4. 错误处理

添加打印错误监听：

```javascript
hiprintTemplate.on('printError', function(error) {
  console.error('打印失败:', error);
  alert('打印失败，请检查打印机连接');
});

hiprintTemplate.on('printSuccess', function() {
  console.log('打印成功');
});
```

### 5. 客户端打印

检查客户端连接状态：

```javascript
function printWithClient() {
  if (!hiprintTemplate.clientIsOpened()) {
    alert('打印客户端未连接，请安装并启动打印客户端');
    return;
  }
  
  const printers = hiprintTemplate.getPrinterList();
  if (printers.length === 0) {
    alert('未检测到打印机');
    return;
  }
  
  hiprintTemplate.print2(printData, {
    printer: printers[0]
  });
}
```

---

## 注意事项

1. **浏览器兼容性**: 支持现代浏览器（Chrome、Firefox、Edge等）
2. **jQuery依赖**: 需要jQuery库支持
3. **图片跨域**: 如果图片涉及跨域，需要服务器支持CORS
4. **打印客户端**: `print2` 方法需要安装配套的打印客户端
5. **PDF导出**: 需要引入 `jspdf`、`html2canvas`、`canvg` 等库
6. **性能优化**: 大量数据打印时建议分批处理

---

## 相关资源

- **官方网站**: www.hinnn.com
- **客户端下载**: [打印客户端下载地址]
- **示例代码**: [GitHub示例仓库]
- **技术支持**: hinnn.com@gmail.com

---

## 更新日志

### v2.5.4
- 当前版本

---

**文档生成时间**: 2024-11-07  
**文档作者**: AI Assistant  
**基于代码**: hiprint.bundle.js v2.5.4

