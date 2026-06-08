<template>
  <div class="left-sidebar">
    <a-card title="HTML导入" size="small">
      <a-space direction="vertical" style="width: 100%">
        <a-textarea
            v-model:value="htmlInputProxy"
            :rows="10"
            placeholder="请输入或粘贴HTML代码..."
        />
        <a-button type="primary" @click="$emit('import-html')" block>
          <template #icon>
            <ImportOutlined/>
          </template>
          导入HTML
        </a-button>
      </a-space>
    </a-card>
    <!-- 印章上传功能 -->
    <a-card v-if="htmlInputProxy" title="选择印章" size="small" style="margin-top: 0;">
      <a-upload
          :show-upload-list="false"
          accept="image/*"
          list-type="picture-card"
          :max-count="1"
          v-model:file-list="fileList"
          :before-upload="handleUpload"
      >
        <div v-if="!sealImage" class="upload-placeholder">
          <PlusOutlined/>
          <div style="margin-top: 8px">上传印章</div>
        </div>
        <img
            v-else
            :src="sealImage"
            alt="印章预览"
            style="width: 100%; height: 100%; object-fit: contain"
        />
      </a-upload>
    </a-card>

    <a-card v-if="htmlInputProxy" title="骑缝章设置" size="small" style="margin-top: 16px">
      <SeamlessStamp @stamp-applied="$emit('stamp-applied', $event)" @stamp-removed="$emit('stamp-removed')"/>
    </a-card>
  </div>
</template>

<script setup>
import {computed, ref} from 'vue';
import {ImportOutlined, PlusOutlined} from '@ant-design/icons-vue';
import SeamlessStamp from './HtmlSeamlessStamp.vue';
import {message} from 'ant-design-vue';

const props = defineProps({
  htmlInput: {
    type: String,
    default: ''
  }
});
const fileList = ref([]);
const sealImage = ref('');

const emit = defineEmits(['update:htmlInput', 'import-html', 'stamp-applied', 'stamp-removed', 'add-stamp-element']);

const htmlInputProxy = computed({
  get: () => props.htmlInput,
  set: val => emit('update:htmlInput', val)
});

// 处理印章图片上传
const handleUpload = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    sealImage.value = e.target.result;
    message.success('印章图片已上传');
    // 触发事件，将图片 base64 传递给父组件
    emit('add-stamp-element', {
      type: 'image',
      src: e.target.result,
      name: file.name || '印章图片',
    });
  };
  reader.readAsDataURL(file);
  return false; // 阻止自动上传
};
</script>

<style scoped>
.left-sidebar {
  width: 300px;
  padding: 16px;
  background: #fff;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}
</style>
