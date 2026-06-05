<!--
  文件描述：打印模板
  创建时间：2025/10/29 11:33
  创建人：liyujie
  版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script>
export default {
  name: 'zz-print',
  inheritAttrs: false,
};
</script>
<script setup>
import { ref, onMounted } from 'vue';
import DraggableList from '@components/panel/draggableList.vue';
import PrintDesigner from '@components/panel/printDesigner.vue';
import SettingsPanel from '@components/panel/settingsPanel.vue';
import SeamlessStamp from '@components/panel/seamlessStamp.vue';
import PreviewModal from '@components/panel/previewModal.vue';
import { initHiprint } from '@components/plugins/hiprintConfig.js';

const designerRef = ref(null);
const previewVisible = ref(false);
const previewHtml = ref('');
const rightPanelKey = ref('settings');

onMounted(() => {
  // 初始化 hiprint（Vue 应用启动时 hiprint 已就绪）
  const success = initHiprint();
  if (!success) {
    console.error('hiprint 初始化失败，请检查配置');
  }
});

const handleTemplateChange = (template) => {
  console.log('模板变化:', template);
};

const handlePreview = (content) => {
  previewHtml.value = content;
  if (previewHtml.value) {
    previewVisible.value = true;
  }
};

const handlePrint = () => {
  if (designerRef.value) {
    designerRef.value.print();
  }
};

const handleStampApplied = (stampConfig) => {
  if (designerRef.value) {
    // 调用设计器的方法添加印章
    designerRef.value.addStamp(stampConfig);
  }
};

const handleStampRemoved = () => {
  if (designerRef.value) {
    // 调用设计器的方法移除印章
    designerRef.value.removeStamp();
  }
};
</script>

<template>
  <div class="zz-print">
    <!-- 头部 -->
    <a-layout-header class="app-header">
      <h1>打印模板设计器</h1>
    </a-layout-header>

    <!-- 主体内容 -->
    <a-layout class="app-content">
      <!-- 左侧拖拽元素列表 -->
      <a-layout-sider
        width="250"
        theme="light"
        :style="{ borderRight: '1px solid #f0f0f0' }"
      >
        <DraggableList />
      </a-layout-sider>

      <!-- 中间设计区域 -->
      <a-layout-content class="design-area">
        <PrintDesigner
          ref="designerRef"
          @template-change="handleTemplateChange"
          @preview="handlePreview"
        />
      </a-layout-content>

      <!-- 右侧属性设置 -->
      <a-layout-sider
        width="300"
        theme="light"
        :style="{ borderLeft: '1px solid #f0f0f0',padding: '10px' }"
      >
        <a-tabs v-model:activeKey="rightPanelKey">
          <a-tab-pane key="settings" tab="属性设置">
            <SettingsPanel />
          </a-tab-pane>
          <a-tab-pane key="stamp" tab="骑缝章">
            <SeamlessStamp
              @stamp-applied="handleStampApplied"
              @stamp-removed="handleStampRemoved"
            />
          </a-tab-pane>
        </a-tabs>
      </a-layout-sider>
    </a-layout>

    <!-- 预览模态框 -->
    <PreviewModal
      v-model:visible="previewVisible"
      :html-content="previewHtml"
      @print="handlePrint"
    />
  </div>
</template>

<style scoped>
.zz-print {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #001529;
  color: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
  color: #fff;
}

.app-content {
  flex: 1;
  overflow: hidden;
}

.design-area {
  background: #f0f2f5;
  overflow: auto;
}

/* 右侧标签页样式 */
:deep(.ant-layout-sider .ant-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;

  .ant-tabs-nav-list {
    padding: 0 10px;
  }
}

:deep(.ant-layout-sider .ant-tabs .ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
  overflow-y: auto;
}

:deep(.ant-layout-sider .ant-tabs-tabpane) {
  height: 100%;
  overflow: hidden;
}
</style>