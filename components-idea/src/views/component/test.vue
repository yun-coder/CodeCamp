<!--
 @description 
 @author yunLiang
 @date 2025/12/19 15:37
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { getCurrentInstance } from 'vue'
import { confirmModal, cancelModal } from '@/utils/util.js'

// 获取弹窗ID（由zzOpen自动注入）
const modalId = getCurrentInstance().appContext.config.globalProperties.$modalId

// 保存按钮处理
const handleSave = () => {
  // 执行保存逻辑
  // ...
  confirmModal(modalId)
}

// 取消按钮处理
const handleCancel = () => {
  cancelModal(modalId)
}
</script>
<template>
  <div class="modal-content-wrapper">
    <!-- 内容区域 -->
    <div class="content-area">
      <p>这是一个自定义内容弹窗</p>
      <p>可以放置HTML内容或Vue组件</p>
      <input type="text" placeholder="请输入内容" class="content-input" />
    </div>

    <!-- 底部按钮区域 -->
    <div class="vxe-modal--footer footer-area">
      <a-button type="link" @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </div>
  </div>
</template>
<style scoped>
.modal-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content-area {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.content-input {
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.footer-area {
  text-align: center;
  padding: 12px 0;
}

/* 确保 ant-design-vue 按钮样式生效 */
.footer-area :deep(.ant-btn) {
  margin: 0 4px;
}
</style>
