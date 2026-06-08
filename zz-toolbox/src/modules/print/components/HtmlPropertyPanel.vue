<template>
  <div class="property-panel">
    <a-form layout="vertical" size="small">
      <!-- 基本属性 -->
      <a-divider orientation="left">基本属性</a-divider>

      <a-form-item label="内容">
        <a-textarea
            v-model:value="localElement.content"
            :rows="3"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-row :gutter="8">
        <a-col :span="12">
          <a-form-item label="X位置 (px)">
            <a-input-number
                v-model:value="localElement.x"
                :min="0"
                style="width: 100%"
                @change="handleUpdate"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Y位置 (px)">
            <a-input-number
                v-model:value="localElement.y"
                :min="0"
                style="width: 100%"
                @change="handleUpdate"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="8">
        <a-col :span="12">
          <a-form-item label="宽度 (px)">
            <a-input-number
                v-model:value="localElement.width"
                :min="20"
                style="width: 100%"
                @change="handleUpdate"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="高度 (px)">
            <a-input-number
                v-model:value="localElement.height"
                :min="20"
                style="width: 100%"
                @change="handleUpdate"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 文本样式 -->
      <a-divider orientation="left">文本样式</a-divider>

      <a-form-item label="字体大小 (px)">
        <a-input-number
            v-model:value="localElement.styles.fontSize"
            :min="8"
            :max="100"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-form-item label="字体">
        <a-select
            v-model:value="localElement.styles.fontFamily"
            style="width: 100%"
            @change="handleUpdate"
        >
          <a-select-option value="Arial">Arial</a-select-option>
          <a-select-option value="SimSun">宋体</a-select-option>
          <a-select-option value="SimHei">黑体</a-select-option>
          <a-select-option value="Microsoft YaHei">微软雅黑</a-select-option>
          <a-select-option value="KaiTi">楷体</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="文字颜色">
        <a-input
            v-model:value="localElement.styles.color"
            type="color"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-form-item label="文字对齐">
        <a-radio-group
            v-model:value="localElement.styles.textAlign"
            @change="handleUpdate"
        >
          <a-radio-button value="left">左对齐</a-radio-button>
          <a-radio-button value="center">居中</a-radio-button>
          <a-radio-button value="right">右对齐</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="字体粗细">
        <a-select
            v-model:value="localElement.styles.fontWeight"
            style="width: 100%"
            @change="handleUpdate"
        >
          <a-select-option value="normal">正常</a-select-option>
          <a-select-option value="bold">粗体</a-select-option>
          <a-select-option value="bolder">更粗</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 背景和边框 -->
      <a-divider orientation="left">背景和边框</a-divider>

      <a-form-item label="背景颜色">
        <a-input
            v-model:value="localElement.styles.backgroundColor"
            type="color"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-form-item label="边框宽度 (px)">
        <a-input-number
            v-model:value="localElement.styles.borderWidth"
            :min="0"
            :max="10"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-form-item label="边框颜色">
        <a-input
            v-model:value="localElement.styles.borderColor"
            type="color"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <a-form-item label="内边距 (px)">
        <a-input-number
            v-model:value="localElement.styles.padding"
            :min="0"
            :max="50"
            style="width: 100%"
            @change="handleUpdate"
        />
      </a-form-item>

      <!-- 操作按钮 -->
      <a-divider/>

      <a-button danger block @click="handleDelete">
        <template #icon>
          <DeleteOutlined/>
        </template>
        删除元素
      </a-button>
    </a-form>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';
import {DeleteOutlined} from '@ant-design/icons-vue';

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update', 'delete']);

const localElement = ref({...props.element});

// 监听props变化
watch(
    () => props.element,
    (newVal) => {
      localElement.value = {...newVal};
    },
    {deep: true}
);

const handleUpdate = () => {
  emit('update', localElement.value);
};

const handleDelete = () => {
  emit('delete');
};
</script>

<style scoped>
.property-panel {
  width: 100%;
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-divider) {
  margin: 12px 0;
}

:deep(.ant-divider-horizontal.ant-divider-with-text-left::before) {
  width: 5%;
}

:deep(.ant-divider-horizontal.ant-divider-with-text-left::after) {
  width: 95%;
}

:deep(.ant-radio-group) {
  width: 100%;
}

:deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
}
</style>
