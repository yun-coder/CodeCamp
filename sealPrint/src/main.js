import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import 'ant-design-vue/dist/reset.css'
import './style.css'

// 验证依赖库已加载
if (!window.$ || !window.jQuery) {
    throw new Error('jQuery 未加载！请检查 index.html')
}

if (!window.$.ui) {
    throw new Error('jQuery UI 未加载！请检查 index.html')
}

if (!window.hiprint) {
    throw new Error('hiprint 库未加载！请检查 index.html')
}

const app = createApp(App);
// 使用全局公共组件
app.use(router);
app.use(createPinia());
app.mount("#app");
