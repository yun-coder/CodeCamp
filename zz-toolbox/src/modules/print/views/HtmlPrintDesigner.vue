<template>
  <div class="designer-container">
    <!-- 左侧工具栏 -->
    <LeftSidebar
      v-model:htmlInput="htmlInput"
      @import-html="importHTML"
      @stamp-applied="handleStampApplied"
      @stamp-removed="handleStampRemoved"
      @add-stamp-element="handleAddStampElement"
    />

    <!-- 中间设计区域 -->
    <div class="main-content">
      <div class="toolbar">
        <a-space wrap>
          <!-- 纸张大小 -->
          <a-button-group>
            <a-button @click="setPaper('A4')" type="primary">A4</a-button>
          </a-button-group>

          <!-- 自定义纸张 -->
          <a-input-number
            v-model:value="customWidth"
            :min="10"
            :max="1000"
            placeholder="宽度(mm)"
            style="width: 100px"
          />
          <a-input-number
            v-model:value="customHeight"
            :min="10"
            :max="1000"
            placeholder="高度(mm)"
            style="width: 100px"
          />
          <a-button @click="setCustomPaper">自定义</a-button>

          <a-divider type="vertical" />

          <!-- 操作按钮 -->
          <a-button @click="clearCanvas" danger>
            <template #icon><ClearOutlined /></template>
            清空
          </a-button>
          <a-button type="primary" @click="handlePreview">
            <template #icon><EyeOutlined /></template>
            预览
          </a-button>
        </a-space>
      </div>

      <!-- Canvas设计区 -->
      <div class="canvas-wrapper">
        <RulerCanvas
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
          :scale="3.78"
        >
          <canvas
            ref="canvasRef"
            class="design-canvas"
            :width="canvasWidth"
            :height="canvasHeight"
          ></canvas>
        </RulerCanvas>
      </div>
    </div>

    <!-- 右侧属性面板 -->
    <div class="right-sidebar">
      <a-card title="元素属性" size="small">
        <PropertyPanel
          v-if="selectedElement"
          :element="selectedElement"
          @update="handlePropertyUpdate"
          @delete="handleDeleteElement"
        />
        <a-empty
          v-else
          description="请选择一个元素"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </a-card>
    </div>

    <!-- 预览弹窗 -->
    <PreviewModal
      v-model:visible="previewVisible"
      :elements="elements"
      :paper-size="paperSize"
      :stamp-config="stampConfig"
      :print-mode="props.printMode"
      :canceled="canceled"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue';
import { message, Empty } from 'ant-design-vue';
import { ClearOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { CanvasDesigner } from '../../../shared/utils/canvasDesigner.js';
import LeftSidebar from '../components/HtmlLeftSidebar.vue';
import PropertyPanel from '../components/HtmlPropertyPanel.vue';
import PreviewModal from '../components/HtmlPreviewModal.vue';
import RulerCanvas from '../components/RulerCanvas.vue';

const props = defineProps({
  entityCode: {
    type: String,
    required: true
  },
  qryType: {
    type: String,
    required: true
  },
  printMode: {
    // vertical_print  纵向  horizontal_print 横向
    type: String,
    required: true
  }
});
const hideLoading = inject('hideLoading', null);

// 纸张尺寸配置（mm）
const PAPER_SIZES = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 }
};

const canvasRef = ref(null);
const htmlInput = ref('');
const customWidth = ref(210);
const customHeight = ref(297);
const basePaperSize = ref({ width: 210, height: 297 }); // 基础纸张尺寸
const elements = ref([]);
const selectedElement = ref(null);
const previewVisible = ref(false);
const stampConfig = ref(null);
const htmlPictures = ref([]); // 存储印章图片列表
const canceled = ref(false); // 是否已作废
// 根据打印模式计算实际纸张尺寸
const paperSize = computed(() => {
  const base = basePaperSize.value;
  // horizontal_print 横向打印时，宽高对换
  if (props.printMode === 'horizontal_print') {
    return { width: base.height, height: base.width };
  }
  // vertical_print 纵向打印，保持原样
  return { width: base.width, height: base.height };
});

// 计算 canvas 尺寸
const canvasWidth = computed(() => paperSize.value.width * 3.78);
const canvasHeight = computed(() => paperSize.value.height * 3.78);

let designer = null;

onMounted(() => {
  designer = new CanvasDesigner(canvasRef.value, {
    printMode: props.printMode,
    paperSize: paperSize.value,
    onChange: (changedElements) => {
      // 创建新数组引用以确保响应式更新
      elements.value = [...changedElements];
    }
  });
  setPaper('A4');

  // 监听选中元素变化
  const checkInterval = setInterval(() => {
    if (designer && designer.selectedElement !== selectedElement.value) {
      selectedElement.value = designer.selectedElement;
    }
  }, 100);

  // 清理定时器
  onBeforeUnmount(() => {
    clearInterval(checkInterval);
  });
});

// 导入HTML
const importHTML = () => {
  if (!htmlInput.value.trim()) {
    message.warning('请输入HTML内容');
    return;
  }

  try {
    designer.importFromHTML(htmlInput.value);
    // 应用分页调整逻辑，避免内容覆盖页码
    setTimeout(() => {
      designer.applyPaginationAdjustment();
      message.success('HTML导入成功，已应用分页调整');
    }, 100);
  } catch (error) {
    console.error('导入失败:', error);
    message.error('HTML导入失败，请检查格式');
  }
};

// 设置纸张大小
const setPaper = (size) => {
  const paper = PAPER_SIZES[size];
  if (paper) {
    basePaperSize.value = { ...paper };
    const actualSize = paperSize.value; // 使用 computed 计算后的尺寸
    designer.setPaperSize(actualSize.width, actualSize.height);
    designer.updatePrintMode(props.printMode, actualSize);
    customWidth.value = paper.width;
    customHeight.value = paper.height;
  }
};

// 设置自定义纸张
const setCustomPaper = () => {
  if (!customWidth.value || !customHeight.value) {
    message.warning('请输入纸张宽度和高度');
    return;
  }

  basePaperSize.value = {
    width: customWidth.value,
    height: customHeight.value
  };
  const actualSize = paperSize.value; // 使用 computed 计算后的尺寸
  designer.setPaperSize(actualSize.width, actualSize.height);
  designer.updatePrintMode(props.printMode, actualSize);
  message.success('纸张大小已设置');
};

// 清空画布
const clearCanvas = () => {
  designer.clear();
  elements.value = [];
  selectedElement.value = null;
  handleStampRemoved();
  message.success('画布已清空');
};

// 处理属性更新
const handlePropertyUpdate = (updates) => {
  if (selectedElement.value) {
    designer.updateElement(selectedElement.value.id, updates);
  }
};

// 删除元素
const handleDeleteElement = () => {
  if (selectedElement.value) {
    designer.deleteElement(selectedElement.value.id);
    selectedElement.value = null;
    message.success('元素已删除');
  }
};

// 骑缝章应用
const handleStampApplied = (config) => {
  stampConfig.value = config;
  message.success('骑缝章已应用');
};

// 骑缝章移除
const handleStampRemoved = () => {
  stampConfig.value = null;
  message.success('骑缝章已移除');
};

// 预览
const handlePreview = () => {
  if (elements.value.length === 0) {
    message.warning('请先添加设计内容');
    return;
  }
  previewVisible.value = true;
};

// 处理印章图片上传后添加到设计器
const handleAddStampElement = (stamp) => {
  if (!designer) return;

  let x = 600;
  let y = designer.canvas.height - 200;

  // 如果有拖拽坐标，计算相对坐标
  if (
    stamp.clientX !== undefined &&
    stamp.clientY !== undefined &&
    canvasRef.value
  ) {
    const rect = canvasRef.value.getBoundingClientRect();
    // 计算鼠标在 Canvas 内部的相对坐标，并考虑 Canvas 的缩放比例
    const scaleX = canvasRef.value.width / rect.width;
    const scaleY = canvasRef.value.height / rect.height;

    x = (stamp.clientX - rect.left) * scaleX;
    y = (stamp.clientY - rect.top) * scaleY;
  }

  // 生成一个图片元素并添加到设计器
  designer.addElement({
    type: stamp.type,
    src: stamp.src,
    name: stamp.name,
    x: x,
    y: y,
    width: 120,
    height: 120,
    styles: {},
    properties: {
      tag: 'image',
      className: '',
      id: '',
      editable: false
    },
    deletable: stamp.deletable || false // 添加可删除标识
  });
};
</script>

<style scoped>
.designer-container {
  display: flex;
  height: 100%;
  background: #f0f2f5;
}

.left-sidebar {
  width: 300px;
  padding: 16px;
  background: #fff;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #e8e8e8;
}

.design-canvas {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #d9d9d9;
  display: block;
}

.right-sidebar {
  width: 320px;
  padding: 16px;
  background: #fff;
  overflow-y: auto;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

:deep(.ant-card) {
  margin-bottom: 16px;
}

:deep(.ant-card:last-child) {
  margin-bottom: 0;
}

:deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 12px;
}

:deep(.ant-card-head-title) {
  padding: 8px 0;
  font-size: 14px;
  font-weight: 600;
}

:deep(.ant-card-body) {
  padding: 12px;
}
</style>
