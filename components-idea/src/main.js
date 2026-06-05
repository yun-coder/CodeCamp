import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
// 导入 SVG 图标
import 'virtual:svg-icons-register'

createApp(App).use(router).mount('#app')
