<template>
  <div class="seamless-stamp-container">
    <div class="stamp-config-panel">
      <h3>骑缝章设置</h3>

      <a-form layout="vertical">
        <a-form-item label="印章图片">
          <a-upload
            v-model:file-list="fileList"
            :before-upload="handleUpload"
            accept="image/*"
            list-type="picture-card"
            :max-count="1"
          >
            <div v-if="!stampImageUrl">
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
          <a-radio-group v-model:value="stampPosition">
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
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="印章高度 (mm)">
          <a-input-number
            v-model:value="stampHeight"
            :min="10"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" @click="applyStamp" block>
            应用骑缝章
          </a-button>
        </a-form-item>

        <a-form-item>
          <a-button danger @click="removeStamp" block> 移除骑缝章</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

const emit = defineEmits(['stamp-applied', 'stamp-removed']);

const fileList = ref([]);
const stampImageUrl = ref('');
const stampPosition = ref('middle');
const stampWidth = ref(40);
const stampHeight = ref(40);
const isStampApplied = ref(false); // 标记骑缝章是否已应用

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
  isStampApplied.value = true;
};

// 防抖定时器
let updateTimer = null;

// 自动更新骑缝章配置（当参数改变时）
const autoUpdateStamp = () => {
  if (!isStampApplied.value || !stampImageUrl.value) {
    return;
  }

  // 清除之前的定时器
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  // 使用防抖，避免短时间内多次触发
  updateTimer = setTimeout(() => {
    const stampConfig = {
      imageUrl: stampImageUrl.value,
      position: stampPosition.value,
      width: stampWidth.value,
      height: stampHeight.value,
    };

    console.log('自动更新骑缝章:', stampConfig);
    emit('stamp-applied', stampConfig);
  }, 300); // 300ms 防抖
};

// 监听骑缝章相关参数的变化，自动更新
watch(
  [stampPosition, stampWidth, stampHeight],
  () => {
    autoUpdateStamp();
  }
);

const removeStamp = () => {
  emit('stamp-removed');
  isStampApplied.value = false;
};
</script>

<style scoped>
.seamless-stamp-container {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background: #fafafa;
}

.stamp-config-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.stamp-config-panel {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}
</style>
