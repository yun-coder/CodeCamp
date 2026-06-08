<template>
  <a-modal
    v-model:open="visible"
    title="打印预览"
    width="1200px"
    :z-index="10"
    :footer="null"
    centered
  >
    <div class="preview-header">
      <a-space>
        <a-button type="primary" danger @click="handlePrint">
          <template #icon>
            <PrinterOutlined />
          </template>
          打印
        </a-button>
        <a-button @click="handleClose">关闭</a-button>
      </a-space>
    </div>

    <div class="preview-content" v-html="htmlContent"></div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue';
import { PrinterOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  htmlContent: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:visible', 'print']);

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const handlePrint = () => {
  emit('print');
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.preview-header {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-content {
  max-height: 700px;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

:deep(.preview-content table) {
  border-collapse: collapse;
  width: 100%;
}

:deep(.preview-content table td),
:deep(.preview-content table th) {
  border: 1px solid #d9d9d9;
  padding: 8px;
}

/* 确保打印面板容器支持绝对定位的骑缝章 */
:deep(.preview-content > div) {
  position: relative;
  margin-bottom: 20px;
}

:deep(.preview-content .hiprint-printPanel) {
  position: relative;
}

/* 骑缝章 SVG 样式 */
:deep(.preview-content .seamless-stamp-dynamic) {
  position: absolute;
  z-index: 9999;
  pointer-events: none;
}
</style>
