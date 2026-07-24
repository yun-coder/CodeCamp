<template>
  <div class="seamless-stamp-container">
    <a-form layout="vertical" size="small">
      <a-form-item label="印章图片">
        <a-upload
          v-model:file-list="fileList"
          :before-upload="handleUpload"
          accept="image/*"
          list-type="picture-card"
          :max-count="1"
          :show-upload-list="false"
        >
          <div v-if="!stampImageUrl" class="upload-placeholder">
            <PlusOutlined />
            <div style="margin-top: 8px">上传印章</div>
          </div>
          <img
            v-else
            :src="stampImageUrl"
            alt="印章预览"
            style="width: 100%; height: 100%; object-fit: contain"
          />
        </a-upload>
      </a-form-item>

      <a-form-item label="盖章位置">
        <a-radio-group v-model:value="stampPosition" size="small">
          <a-radio value="top">右侧顶部</a-radio>
          <a-radio value="middle">右侧中间</a-radio>
          <a-radio value="bottom">右侧底部</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="印章宽度 (mm)">
        <a-input-number
          v-model:value="stampWidth"
          :min="10"
          :max="100"
          size="small"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="印章高度 (mm)">
        <a-input-number
          v-model:value="stampHeight"
          :min="10"
          :max="100"
          size="small"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item>
        <a-space direction="vertical" style="width: 100%">
          <a-button type="primary" @click="applyStamp" block size="small">
            应用骑缝章
          </a-button>
          <a-button danger @click="removeStamp" block size="small">
            移除骑缝章
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

const emit = defineEmits(['stamp-applied', 'stamp-removed']);

const fileList = ref([]);
const stampImageUrl = ref('');
const stampPosition = ref('middle');
const stampWidth = ref(40);
const stampHeight = ref(40);

const handleUpload = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    stampImageUrl.value = e.target.result;
    message.success('印章图片已上传');
  };
  reader.readAsDataURL(file);
  return false; // 阻止自动上传
};

const applyStamp = () => {
  if (!stampImageUrl.value) {
    message.warning('请先上传印章图片');
    return;
  }

  const stampConfig = {
    imageUrl: stampImageUrl.value,
    position: stampPosition.value,
    width: stampWidth.value,
    height: stampHeight.value,
  };

  emit('stamp-applied', stampConfig);
};

const removeStamp = () => {
  fileList.value = [];
  stampImageUrl.value = '';
  emit('stamp-removed');
};
</script>

<style scoped>
.seamless-stamp-container {
  width: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

:deep(.ant-upload-list-picture-card-container) {
  width: 100%;
  height: 120px;
}

:deep(.ant-upload.ant-upload-select-picture-card) {
  width: 100%;
  height: 120px;
  margin: 0;
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
