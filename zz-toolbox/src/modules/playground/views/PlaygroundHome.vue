<template>
  <div class="playground-home">
    <div class="home-header">
      <h1>演练场</h1>
      <p>Canvas / CSS / 算法 交互演示（来自 zyl-plug-common）</p>
    </div>

    <a-layout class="pg-layout">
      <!-- 分类侧边栏 -->
      <a-layout-sider width="200" theme="light" class="pg-sider">
        <a-menu v-model:selectedKeys="selectedKeys" mode="inline" @click="handleMenuClick">
          <a-menu-item-group key="canvas" title="Canvas 演示">
            <a-menu-item v-for="d in canvasDemos" :key="'canvas-' + d.id">{{ d.name }}</a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group key="css" title="CSS 演示">
            <a-menu-item v-for="d in cssDemos" :key="'css-' + d.id">{{ d.name }}</a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group key="algorithm" title="算法演示">
            <a-menu-item v-for="d in algoDemos" :key="'algo-' + d.id">{{ d.name }}</a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group key="tools" title="工具函数">
            <a-menu-item key="tools-list">40+ 工具函数</a-menu-item>
          </a-menu-item-group>
        </a-menu>
      </a-layout-sider>

      <!-- 演示区 -->
      <a-layout-content class="pg-content">
        <!-- Canvas 演示列表 -->
        <div v-if="currentCategory === 'canvas'">
          <CanvasDemo v-if="selectedKeys[0] === 'canvas-all'" />
          <div v-else class="demo-placeholder">
            <a-empty :description="'选择左侧演示项查看 '" />
          </div>
        </div>

        <!-- CSS 演示列表 -->
        <div v-else-if="currentCategory === 'css'">
          <CssDemo />
        </div>

        <!-- 算法演示列表 -->
        <div v-else-if="currentCategory === 'algorithm'">
          <SuanfaDemo />
        </div>

        <!-- 工具函数 -->
        <div v-else-if="currentCategory === 'tools'">
          <a-card title="40+ 工具函数列表">
            <a-descriptions bordered size="small" :column="2">
              <a-descriptions-item label="文件转换">arrayBufferToBase64, dataURLtoFile, fileToBase64, base64ToBlob</a-descriptions-item>
              <a-descriptions-item label="树/列表转换">listToTree, treeToList, flatToTree</a-descriptions-item>
              <a-descriptions-item label="排序算法">bubbleSort, quickSort, mergeSort, insertionSort, selectionSort</a-descriptions-item>
              <a-descriptions-item label="数组操作">unique, flatten, shuffle, chunk, groupBy</a-descriptions-item>
              <a-descriptions-item label="验证">isEmail, isPhone, isIdCard, passwordStrength, isUrl</a-descriptions-item>
              <a-descriptions-item label="其他">UUID, deepClone, debounce, throttle, bracketValidation</a-descriptions-item>
            </a-descriptions>
            <p style="margin-top: 12px; color: #666;">位于 src/shared/utils/tools.js，可全局导入使用</p>
          </a-card>
        </div>

        <div v-else class="welcome-placeholder">
          <a-empty description="请从左侧选择分类开始探索" />
        </div>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import CanvasDemo from "../canvas/CanvasDemo.vue";
import CssDemo from "../css/CssDemo.vue";
import SuanfaDemo from "../algorithm/SuanfaDemo.vue";

const selectedKeys = ref([]);

const canvasDemos = [
  { id: 1, name: "坐标轴" }, { id: 2, name: "贝塞尔曲线" },
  { id: 3, name: "烟花动画" }, { id: 4, name: "仪表盘" },
  { id: 5, name: "实时时钟" }, { id: 6, name: "电子印章" },
  { id: 7, name: "太极图" }, { id: 8, name: "3D轨道" },
  { id: 9, name: "拓扑图" },
];

const cssDemos = [
  { id: 1, name: "CSS 形状" }, { id: 2, name: "3D 立方体" },
  { id: 3, name: "加载动画" }, { id: 4, name: "开关按钮" },
];

const algoDemos = [
  { id: 1, name: "栈" }, { id: 2, name: "队列" },
  { id: 3, name: "链表" }, { id: 4, name: "堆" },
  { id: 5, name: "哈希表" }, { id: 6, name: "Dijkstra" },
];

const currentCategory = computed(() => {
  const key = selectedKeys.value[0] || "";
  if (key.startsWith("canvas-")) return "canvas";
  if (key.startsWith("css-")) return "css";
  if (key.startsWith("algo-")) return "algorithm";
  if (key.startsWith("tools-")) return "tools";
  return "";
});

const handleMenuClick = ({ key }) => {
  selectedKeys.value = [key];
};
</script>

<style scoped>
.playground-home { padding: 24px; }
.home-header { margin-bottom: 16px; }
.home-header h1 { font-size: 24px; margin: 0 0 8px 0; }
.home-header p { color: #666; margin: 0; }
.pg-layout { background: #fff; border-radius: 8px; overflow: hidden; min-height: calc(100vh - 160px); }
.pg-sider { border-right: 1px solid #f0f0f0; overflow-y: auto; }
.pg-content { padding: 24px; overflow-y: auto; }
.demo-placeholder, .welcome-placeholder { display: flex; align-items: center; justify-content: center; min-height: 400px; }
</style>
