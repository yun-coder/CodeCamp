<template>
  <div class="common-home">
    <div class="home-header">
      <h1>组件库</h1>
      <p>可复用 Vue3 组件展示（来自 common-tool）</p>
    </div>

    <a-tabs v-model:activeKey="activeTab">
      <!-- SvgIcon 演示 -->
      <a-tab-pane key="svg" tab="SvgIcon 图标">
        <a-card title="SvgIcon - 可旋转动画图标">
          <a-space wrap>
            <div v-for="icon in iconList" :key="icon" class="icon-demo">
              <SvgIcon :icon="icon" :size="32" :spin="true" :spin-speed="2" />
              <div class="icon-label">{{ icon }}</div>
            </div>
          </a-space>
        </a-card>
      </a-tab-pane>

      <!-- tableSearch 演示 -->
      <a-tab-pane key="search" tab="tableSearch 搜索表单">
        <a-card title="tableSearch - 响应式表格搜索表单">
          <p>根据屏幕宽度动态调整每行列数，展开/收起搜索条件</p>
          <a-alert type="info" message="此组件需搭配后端 API 使用，此处仅展示结构" style="margin-bottom: 16px" />
        </a-card>
      </a-tab-pane>

      <!-- formItemRender 演示 -->
      <a-tab-pane key="form" tab="formItemRender 动态表单">
        <a-card title="formItemRender - 动态表单字段渲染器">
          <p>支持 18+ 种字段类型：input, inputNum, select, datePicker, rangePicker, timePicker, upload, selectTree, userSelect, userGroup 等</p>
          <a-alert type="info" message="此组件需搭配后端 API 使用，此处仅展示结构" style="margin-bottom: 16px" />
        </a-card>
      </a-tab-pane>

      <!-- HTTP 客户端演示 -->
      <a-tab-pane key="http" tab="HTTP 客户端">
        <a-card title="HTTP 客户端 (sm-crypto 加密)">
          <p>基于 Axios 封装，内置请求去重、sm-crypto 加密令牌、401 自动刷新重试</p>
          <a-descriptions bordered size="small" :column="2">
            <a-descriptions-item label="加密算法">sm-crypto</a-descriptions-item>
            <a-descriptions-item label="基础库">Axios</a-descriptions-item>
            <a-descriptions-item label="请求去重">pending 请求映射</a-descriptions-item>
            <a-descriptions-item label="401 处理">自动刷新令牌重试</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>

      <!-- 工具函数演示 -->
      <a-tab-pane key="utils" tab="工具函数">
        <a-card title="modal.js - 模态框工具">
          <a-button type="primary" @click="testModal">测试打开模态框</a-button>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { message } from "ant-design-vue";
import SvgIcon from "../components/SvgIcon.vue";

const activeTab = ref("svg");

const iconList = [
  "icon-home", "icon-setting", "icon-user", "icon-lock",
  "icon-edit", "icon-delete", "icon-search", "icon-add",
];

const testModal = () => {
  message.info("模态框工具函数已就绪");
};
</script>

<style scoped>
.common-home { padding: 24px; }
.home-header { margin-bottom: 24px; }
.home-header h1 { font-size: 24px; margin: 0 0 8px 0; }
.home-header p { color: #666; margin: 0; }
.icon-demo { text-align: center; width: 80px; padding: 8px; }
.icon-label { font-size: 11px; color: #999; margin-top: 4px; }
</style>
