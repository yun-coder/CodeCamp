# common-tool

## 中造软件私有组件库

为了节省开发时间，提升开发效率，将一些频繁使用的组件封装出来，提供给项目使用。

## 安装

```bash
npm install common-tool
```

## 使用方法

### 全局引入

```js
import { createApp } from 'vue'
import CommonTool from 'common-tool'
import 'common-tool/dist/style.css'

const app = createApp(App)
app.use(CommonTool)
```

### 按需引入

```js
import { SvgIcon } from 'common-tool'
import 'common-tool/dist/style.css'

export default {
  components: {
    SvgIcon
  }
}
```

## 组件示例

### SvgIcon 组件

SvgIcon 是一个功能丰富的 SVG 图标组件，支持自定义图标、旋转、颜色等属性。

```html
<!-- 基础用法 -->
<SvgIcon icon-class="home" />

<!-- 带旋转效果 -->
<SvgIcon icon-class="loading" :spin="true" />

<!-- 自定义颜色和大小 -->
<SvgIcon icon-class="star" color="#ff9900" size="24px" />

<!-- 带旋转角度 -->
<SvgIcon icon-class="arrow" :rotate="90" />
```

#### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| icon-class | String | - | 必填，图标类名 |
| class-name | String | '' | 自定义类名 |
| spin | Boolean | false | 是否无限旋转 |
| rotate | String/Number | 0 | 旋转角度 |
| color | String | 'currentColor' | 图标颜色 |
| speed | Number | 1 | 旋转速度（仅当spin为true时有效） |
| size | String/Number | '1.2em' | 图标尺寸 |

#### 事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| svgIconClick | 点击图标时触发 | - |

## License

仅限中造前端开发使用