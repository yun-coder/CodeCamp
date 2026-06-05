<template>
  <div class="settings-panel">
    <a-typography-title :level="5" style="margin-bottom: 16px">
      属性设置
    </a-typography-title>

    <div 
      id="PrintElementOptionSetting" 
      :style="{ display: hasSettings ? 'block' : 'none' }"
    ></div>

    <a-empty
      v-if="!hasSettings"
      description="请在设计区域选择一个元素"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      style="margin-top: 100px"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Empty } from 'ant-design-vue';

const hasSettings = ref(false);

// 检查设置面板是否有内容
const checkSettings = () => {
  const container = document.getElementById('PrintElementOptionSetting');
  hasSettings.value = container && container.children.length > 0;
};

onMounted(() => {
  const container = document.getElementById('PrintElementOptionSetting');

  if (container) {
    // 检查初始状态
    checkSettings();
    
    // 监听设置面板变化
    const observer = new MutationObserver(() => {
      checkSettings();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });
  }
});
</script>

<style scoped>
.settings-panel {
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background: #fafafa;
}

:deep(#PrintElementOptionSetting) {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

:deep(.hiprint-option-item) {
  margin-bottom: 16px;
}

:deep(.hiprint-option-item-label) {
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

:deep(.hiprint-option-item input),
:deep(.hiprint-option-item select),
:deep(.hiprint-option-item textarea) {
  width: 100%;
  padding: 0 11px;
  font-size: 14px;
  line-height: 1.5715;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  transition: all 0.3s;
}

:deep(.hiprint-option-item input:focus),
:deep(.hiprint-option-item select:focus),
:deep(.hiprint-option-item textarea:focus) {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
</style>
