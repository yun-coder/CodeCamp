<!--
 @description 弹窗使用示例
 @author yunLiang
 @date 2025/12/19 15:08
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { zzOpen, cancelModal, confirmModal } from '@/utils/util.js'
import test from './component/test.vue'

// 自定义弹窗示例
const handleCustomDialog = () => {
  zzOpen({
    title: '自定义弹窗',
    content: test,
    width: 500,
    height: 300,
    showMinimize: true,
    onShow: () => {
      console.log('弹窗已显示')
    },
    onHide: () => {
      console.log('弹窗已隐藏')
    },
    onConfirm: () => {
      console.log('确认事件被触发')
    },
    onCancel: () => {
      console.log('取消事件被触发')
    }
  })
}

// 自定义弹窗示例（无按钮）
const handleOpenCustomDialog = () => {
  const modalInstance = zzOpen({
    title: '自定义弹窗',
    content: '这是自定义的内容',
    width: 500,
    height: 300,
    showMinimize: true,
    buttons: [
      {
        name: '取消',
        type: 'link',
        click: () => {
          console.log(modalInstance.id)
          cancelModal(modalInstance.id)
        }
      },
      {
        name: '确认',
        type: 'primary',
        click: () => {
          console.log(modalInstance.id)
          confirmModal(modalInstance.id)
        }
      }
    ],
    onShow: () => {
      console.log('弹窗已显示')
    },
    onHide: () => {
      console.log('弹窗已隐藏')
    },
    onConfirm: () => {
      console.log('确认事件被触发')
    },
    onCancel: () => {
      console.log('取消事件被触发')
    }
  })
}
</script>

<template>
  <div class="dialog-demo-container">
    <h1>弹窗组件使用示例</h1>

    <div class="demo-section">
      <h2>自定义弹窗 (zzOpen)</h2>
      <p>用于显示自定义内容和按钮的弹窗</p>
      <button @click="handleCustomDialog">打开自定义弹窗(自定义按钮)</button>
      <button @click="handleOpenCustomDialog">打开自定义弹窗</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-demo-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.demo-section h2 {
  margin-top: 0;
  color: #333;
}

.demo-section p {
  color: #666;
  margin-bottom: 15px;
}

button {
  padding: 8px 16px;
  margin-right: 10px;
  margin-bottom: 10px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #3a80d2;
}

.button-group button {
  margin-right: 10px;
}
</style>
