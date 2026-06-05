/**
 * @description 组件库和工具函数入口文件
 * @author yunLiang
 * @date 2025/12/19
 * 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 */

// 导入组件
import components from './components/index.js'

// 导入工具函数
import util, {
    zzOpen,
    closeModal
} from './utils/util.js'

// 安装函数
const install = (app) => {
    // 注册所有组件
    if (components.install) {
        app.use(components)
    }

    return app
}

// 支持按需引入和全局引入
export default {
    install,
    ...components,
    ...util
}

// 按需导出
export * from './components/index.js'
export {
    zzOpen,
    closeModal
}
