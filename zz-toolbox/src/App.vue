<script setup>
import { ref } from "vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import PrintHome from "./modules/print/views/PrintHome.vue";
import CommonHome from "./modules/common/views/CommonHome.vue";
import PlaygroundHome from "./modules/playground/views/PlaygroundHome.vue";
import SettingsView from "./modules/settings/SettingsView.vue";

dayjs.locale("zh-cn");

const tabs = [
  { key: "print", label: "打印工具" },
  { key: "common", label: "组件库" },
  { key: "playground", label: "演练场" },
  { key: "settings", label: "设置" },
];

const currentTab = ref("print");
const isPrinting = ref(false);
const printProgress = ref({ current: 0, total: 0 });

if (window.electronAPI) {
  window.electronAPI.onPrintStart((event, data) => {
    isPrinting.value = true;
    printProgress.value = { current: 0, total: data.count || 0 };
  });
  window.electronAPI.onPrintEnd(() => {
    isPrinting.value = false;
  });
}
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div v-if="isPrinting" class="print-loading-overlay">
      <a-spin size="large" tip="打印中...">
        <div class="loading-content">
          <div class="loading-text">正在打印，请稍候...</div>
        </div>
      </a-spin>
    </div>

    <a-layout style="height: 100vh">
      <a-layout-sider width="80" theme="dark" class="tab-sider">
        <div class="logo-area">
          <div class="logo-icon">⚙</div>
        </div>
        <div class="tab-nav">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-item', { active: currentTab === tab.key }]"
            @click="currentTab = tab.key"
          >
            <div class="tab-icon">{{ tab.key === "print" ? "🖨" : tab.key === "common" ? "🧩" : tab.key === "playground" ? "🎮" : "⚙" }}</div>
            <div class="tab-label">{{ tab.label }}</div>
          </div>
        </div>
        <div class="sider-footer">
          <div class="version-text">v1.0</div>
        </div>
      </a-layout-sider>

      <a-layout-content class="main-content">
        <PrintHome v-if="currentTab === 'print'" />
        <CommonHome v-else-if="currentTab === 'common'" />
        <PlaygroundHome v-else-if="currentTab === 'playground'" />
        <SettingsView v-else-if="currentTab === 'settings'" />
      </a-layout-content>
    </a-layout>
  </a-config-provider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.tab-sider {
  display: flex;
  flex-direction: column;
  height: 100vh;
  user-select: none;
}

.logo-area {
  padding: 16px 0;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  font-size: 28px;
}

.tab-nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.tab-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.tab-item.active {
  color: #fff;
  background: rgba(24, 144, 255, 0.2);
  border-left-color: #1890ff;
}

.tab-icon {
  font-size: 22px;
  margin-bottom: 4px;
}

.tab-label {
  font-size: 11px;
  white-space: nowrap;
}

.sider-footer {
  padding: 12px 0;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.version-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.main-content {
  height: 100vh;
  overflow-y: auto;
  background: #f0f2f5;
}

.print-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  padding: 40px;
  background: white;
  border-radius: 8px;
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  color: #333;
}
</style>
