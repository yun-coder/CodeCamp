/**
 @description 组件库输出口
 @author yunLiang
 @date 2025/12/18 18:11
  版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 **/

import { defineAsyncComponent } from 'vue'

// 组件集合
const components = {}

// 自动注册组件
function registerComponents() {
  // 使用 Vite 的 import.meta.glob 动态导入所有组件
  const componentModules = import.meta.glob('./*.vue')

  // 遍历所有组件模块
  for (const path in componentModules) {
    // 获取组件名（去掉路径和.vue后缀）
    const componentName = path.replace(/^\.\/(.*)\.vue$/, '$1')

    // 使用defineAsyncComponent实现异步加载组件
    components[componentName] = defineAsyncComponent(componentModules[path])
  }
}

// 执行自动注册
registerComponents()

// 按需导出组件
export const SvgIcon = components.svgIcon
export const tableSearch = components.tableSearch

// 安装函数
const install = app => {
  // 注册所有组件
  Object.keys(components).forEach(key => {
    app.component(key, components[key])
  })
}

// 支持按需引入和全局引入
export default {
  install,
  ...components
}
