<template>
  <div class="draggable-list-container">
    <a-typography-title :level="5" style="padding: 16px 16px 0">
      拖拽元素列表
    </a-typography-title>

    <div class="draggable-items">
      <!-- 常规元素 -->
      <a-collapse
        v-model:activeKey="activeKeys"
        :bordered="false"
        expand-icon-position="end"
      >
        <a-collapse-panel key="1" header="常规元素">
          <div
            v-for="item in regularElements"
            :key="item.tid"
            class="ep-draggable-item draggable-item"
            :tid="item.tid"
          >
            <component :is="item.icon" class="draggable-item-icon" />
            <span>{{ item.text }}</span>
          </div>
        </a-collapse-panel>

        <a-collapse-panel key="2" header="辅助元素">
          <div
            v-for="item in auxiliaryElements"
            :key="item.tid"
            class="ep-draggable-item draggable-item"
            :tid="item.tid"
          >
            <component :is="item.icon" class="draggable-item-icon" />
            <span>{{ item.text }}</span>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  FontSizeOutlined,
  PictureOutlined,
  FileTextOutlined,
  TableOutlined,
  CodeOutlined,
  LineOutlined,
  ColumnHeightOutlined,
  BorderOutlined,
  RadiusSettingOutlined,
} from '@ant-design/icons-vue';

const activeKeys = ref(['1', '2']);

// 常规元素
const regularElements = [
  { tid: 'testModule.text', text: '文本', icon: FontSizeOutlined },
  { tid: 'testModule.image', text: '图片', icon: PictureOutlined },
  { tid: 'testModule.longText', text: '长文', icon: FileTextOutlined },
  { tid: 'testModule.tableCustom', text: '表格', icon: TableOutlined },
  { tid: 'testModule.html', text: 'HTML', icon: CodeOutlined },
];

// 辅助元素
const auxiliaryElements = [
  { tid: 'testModule.hline', text: '横线', icon: LineOutlined },
  { tid: 'testModule.vline', text: '竖线', icon: ColumnHeightOutlined },
  { tid: 'testModule.rect', text: '矩形', icon: BorderOutlined },
  { tid: 'testModule.oval', text: '椭圆', icon: RadiusSettingOutlined },
];

onMounted(() => {
  // 等待 hiprint 加载完成后初始化拖拽
  setTimeout(() => {
    if (window.hiprint && window.hiprint.PrintElementTypeManager) {
      const items = document.querySelectorAll('.ep-draggable-item');
      window.hiprint.PrintElementTypeManager.buildByHtml(items);
    }
  }, 300);
});
</script>

<style scoped>
.draggable-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.draggable-items {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 16px;
}

.draggable-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: move;
  transition: all 0.3s;
  user-select: none;
}

.draggable-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
}

.draggable-item-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #1890ff;
}

:deep(.ant-collapse) {
  background: transparent;
}

:deep(.ant-collapse-item) {
  margin-bottom: 8px;
  border: none;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.ant-collapse-header) {
  padding: 12px 16px !important;
  font-weight: 600;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-collapse-content) {
  border-top: none;
  background: #fff;
}

:deep(.ant-collapse-content-box) {
  padding: 8px;
}
</style>
