<!--
 @description 图片组价使用示例
 @author yunLiang
 @date 2025/12/18 18:21
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref } from 'vue'
// 导入组件库中的 SvgIcon 组件
import { SvgIcon } from '@/components'

// 定义一些示例图标
const icons = ['home', 'user', 'settings', 'search', 'heart']
const currentIcon = ref('home')
const isSpinning = ref(false)
const rotation = ref(0)
const iconColor = ref('#1890ff')
const iconSize = ref('24px')

// 切换图标
const changeIcon = () => {
  const currentIndex = icons.indexOf(currentIcon.value)
  currentIcon.value = icons[(currentIndex + 1) % icons.length]
}

// 切换旋转状态
const toggleSpin = () => {
  isSpinning.value = !isSpinning.value
}

// 增加旋转角度
const increaseRotation = () => {
  rotation.value = (rotation.value + 45) % 360
}

// 随机改变颜色
const randomColor = () => {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']
  const currentIndex = colors.indexOf(iconColor.value)
  iconColor.value = colors[(currentIndex + 1) % colors.length]
}

// 改变大小
const changeSize = () => {
  const sizes = ['16px', '24px', '32px', '48px']
  const currentIndex = sizes.indexOf(iconSize.value)
  iconSize.value = sizes[(currentIndex + 1) % sizes.length]
}

// 图标点击事件
const handleIconClick = () => {
  console.log('图标被点击了！')
}
</script>
<template>
  <div class="container">
    <h1>组件库测试 - SvgIcon 组件</h1>

    <div class="demo-section">
      <h2>基础用法</h2>
      <div class="icon-row">
        <SvgIcon icon-class="home" />
        <SvgIcon icon-class="user" />
        <SvgIcon icon-class="settings" />
        <SvgIcon icon-class="search" />
        <SvgIcon icon-class="heart" />
      </div>
    </div>

    <div class="demo-section">
      <h2>动态切换图标</h2>
      <div class="icon-row">
        <SvgIcon :icon-class="currentIcon" :size="iconSize" />
        <button @click="changeIcon">切换图标</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>旋转效果</h2>
      <div class="icon-row">
        <SvgIcon icon-class="settings" :spin="isSpinning" />
        <button @click="toggleSpin">{{ isSpinning ? '停止旋转' : '开始旋转' }}</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>旋转角度</h2>
      <div class="icon-row">
        <SvgIcon icon-class="arrow" :rotate="rotation" />
        <button @click="increaseRotation">旋转45度 (当前: {{ rotation }}°)</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>自定义颜色</h2>
      <div class="icon-row">
        <SvgIcon icon-class="heart" :color="iconColor" />
        <button @click="randomColor">随机颜色</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>图标尺寸</h2>
      <div class="icon-row">
        <SvgIcon icon-class="star" :size="iconSize" />
        <button @click="changeSize">改变大小 (当前: {{ iconSize }})</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>点击事件</h2>
      <div class="icon-row">
        <SvgIcon icon-class="bell" @svgIconClick="handleIconClick" />
        <p>点击图标查看控制台输出</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.demo-section {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

h1 {
  text-align: center;
  color: #1890ff;
  margin-bottom: 30px;
}

h2 {
  color: #333;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

button {
  padding: 6px 12px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #40a9ff;
}

p {
  margin: 0;
  color: #666;
}
</style>
