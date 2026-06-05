<!--
 @description 
 @author yunLiang
 @date 2025/12/19 13:36
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// 导入组件库中的 SvgIcon 组件
import { SvgIcon } from '@/components'

const router = useRouter()

// 组件列表
const componentList = ref([
  {
    name: 'SvgIcon',
    title: 'SVG 图标组件',
    description: '功能丰富的 SVG 图标组件，支持自定义图标、旋转、颜色等属性',
    path: '/svg-icon',
    icon: 'star'
  },
  {
    name: 'openDialog',
    title: '弹窗组件',
    description: '功能丰富的弹窗组件，支持自定义属性',
    path: '/openDialog',
    icon: 'star'
  },
  {
    name: 'tableSearch',
    title: '搜索组件',
    description: '功能丰富的搜索组件，支持自定义属性',
    path: '/tableSearch',
    icon: 'star'
  }
])

// 跳转到组件详情页
const goToComponent = path => {
  router.push(path)
}
</script>

<template>
  <div class="container">
    <h1>组件库菜单</h1>

    <div class="component-list">
      <div
        v-for="component in componentList"
        :key="component.name"
        class="component-card"
        @click="goToComponent(component.path)"
      >
        <div class="card-icon">
          <SvgIcon :icon-class="component.icon" size="48px" />
        </div>
        <div class="card-content">
          <h3>{{ component.title }}</h3>
          <p>{{ component.description }}</p>
          <a-button type="primary">查看详情</a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #1890ff;
  margin-bottom: 40px;
}

.component-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.component-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.component-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}

.card-icon {
  margin-bottom: 15px;
}

.card-content h3 {
  margin: 0 0 10px;
  color: #333;
}

.card-content p {
  margin: 0 0 15px;
  color: #666;
  font-size: 14px;
}
</style>
