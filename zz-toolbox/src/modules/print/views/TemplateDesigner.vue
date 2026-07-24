<template>
  <div class="template-designer">
    <a-layout class="td-content">
      <!-- 左侧拖拽元素列表 -->
      <a-layout-sider width="250" theme="light" :style="{ borderRight: '1px solid #f0f0f0' }">
        <DraggableList />
      </a-layout-sider>

      <!-- 中间设计区域 -->
      <a-layout-content class="td-design-area">
        <PrintDesigner
          ref="designerRef"
          @template-change="handleTemplateChange"
          @preview="handlePreview"
        />
      </a-layout-content>

      <!-- 右侧属性设置 -->
      <a-layout-sider width="300" theme="light" :style="{ borderLeft: '1px solid #f0f0f0', padding: '10px' }">
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

<script setup>
import { ref, onMounted } from "vue";
import DraggableList from "../components/draggableList.vue";
import PrintDesigner from "../components/printDesigner.vue";
import SettingsPanel from "../components/settingsPanel.vue";
import SeamlessStamp from "../components/seamlessStamp.vue";
import PreviewModal from "../components/previewModal.vue";
import { initHiprint } from "../../../plugins/hiprintConfig.js";

const designerRef = ref(null);
const previewVisible = ref(false);
const previewHtml = ref("");
const rightPanelKey = ref("settings");

onMounted(() => {
  const success = initHiprint();
  if (!success) {
    console.error("hiprint 初始化失败，请检查配置");
  }
});

const handleTemplateChange = (template) => {
  console.log("模板变化:", template);
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
    designerRef.value.addStamp(stampConfig);
  }
};

const handleStampRemoved = () => {
  if (designerRef.value) {
    designerRef.value.removeStamp();
  }
};
</script>

<style scoped>
.template-designer {
  width: 100%;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.td-content {
  flex: 1;
  overflow: hidden;
}

.td-design-area {
  background: #f0f2f5;
  overflow: auto;
}
</style>
