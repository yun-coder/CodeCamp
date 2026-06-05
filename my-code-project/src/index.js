import fabricPage from './packages/fabricPage/index.vue'
import Util from "./packages/tools";

// 将引入的组件模块存储，方便循环注册所有组件
const components = [fabricPage];

const install = function (app, opts = {}) {
  components.map(component => {
    app.component(component.name, component);
  })
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export {
  install,
  fabricPage,
  Util
}

