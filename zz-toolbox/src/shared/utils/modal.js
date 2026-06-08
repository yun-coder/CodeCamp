/**
 * @description 封装 VxeUI.modal 弹窗方法
 * @author yunLiang
 * @date 2025/12/19 10:30
 * 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 */

import {getCurrentInstance, h} from 'vue';
import {VxeUI} from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css';
import {Button} from 'ant-design-vue';
import '../styles/modal.css';

/**
 * @description 生成唯一key
 * @returns {string}
 * @function
 */
export function UUID(long = 18) {
    return Array.from({length: long}, () =>
        Math.floor(Math.random() * 10)
    ).join('');
}

/**
 * 打开自定义弹窗
 * @param {Object} options 弹窗配置
 * @param {string} options.title 弹窗标题
 * @param {string} options.id 弹窗ID
 * @param {string|vnode} options.content 弹窗内容，可以是HTML字符串或Vue组件
 * @param {number} options.width 弹窗宽度
 * @param {number} options.height 弹窗高度
 * @param {boolean} options.mask 是否显示遮罩层
 * @param {boolean} options.lockView 是否锁定视图
 * @param {Array} options.buttons 自定义按钮配置
 * @param {Function} options.onShow 弹窗显示回调
 * @param {Function} options.onHide 弹窗隐藏回调
 * @param {Function} options.onConfirm 确认回调
 * @param {Function} options.onCancel 取消回调
 * @returns {Object} 返回弹窗实例，包含close方法
 */
export function zzOpen(options = {}) {
    const {
        id = UUID(),
        title = '弹框',
        content = '',
        loading = false,
        mask = true,
        maskClosable = false,
        lockView = true,
        lockScroll = true,
        escClosable = false,
        showClose = true,
        width = 600,
        height = 400,
        minWidth = 600,
        minHeight = 400,
        zIndex = 10,
        showMinimize = false,
        showZoom = true,
        resize = true,
        fullscreen = false,
        draggable = true,
        showHeader = true,
        confirmClosable = false,
        cancelClosable = false,
        className = 'custom-modal',
        buttons,
        onShow,
        onHide,
        onConfirm,
        onCancel
    } = options

    // 检查content是否为Vue组件对象
    const isVueComponent = content && typeof content === 'object' && (content.template || content.render || content.setup)

    // 基本配置
    const modalOptions = {
        id,
        title,
        loading,
        mask,
        maskClosable,
        lockView,
        lockScroll,
        escClosable,
        showClose,
        width,
        height,
        minWidth,
        minHeight,
        zIndex,
        showMinimize,
        showZoom,
        resize,
        fullscreen,
        draggable,
        showHeader,
        confirmClosable,
        cancelClosable,
        className,
        onShow,
        onHide,
        onConfirm,
        onCancel
    }

    // 构建弹窗slots
    const modalSlots = {
        default: () => {
            // Vue组件：创建包装组件，传递modalId给子组件
           const app = getCurrentInstance().appContext.app
           app.config.globalProperties.$modalId = id
            if (isVueComponent) {
                return h(content)
            }
            // 非Vue组件但有按钮：创建包含内容和按钮的布局
            if (buttons && buttons.length > 0) {
                return h('div', {
                    style: 'display: flex; flex-direction: column; height: 100%;'
                }, [
                    h('div', {
                        style: 'flex: 1; padding: 20px; overflow: auto;'
                    }, content),
                    h('div', {
                        class: 'vxe-modal--footer',
                        style: 'text-align: center;'
                    }, buttons.map(btn => h(Button, {
                        type: btn.type || 'default',
                        onClick: btn.click
                    }, () => btn.name)))
                ])
            }

            // 普通内容：直接返回
            return content
        }
    }

    const modal = VxeUI.modal.open({
        ...modalOptions,
        slots: modalSlots
    })
    
    // 确保返回的对象包含 id 属性
    modal.id = id
    return modal
}

/**
 * 关闭弹窗
 * @param {string} modalId 弹窗ID
 */
export function closeModal(modalId) {
    VxeUI.modal.close(modalId)
}

export function confirmModal(modalId) {
    VxeUI.modal.get(modalId).dispatchEvent('confirm', { type: 'confirm' }, null);
    VxeUI.modal.close(modalId)
}

export function cancelModal(modalId) {
    VxeUI.modal.get(modalId).dispatchEvent('cancel', { type: 'cancel' }, null);
    VxeUI.modal.close(modalId);
}

export default {
    zzOpen,
    closeModal,
    confirmModal,
    cancelModal,
}
