<template>
  <div class="settings-view">
    <div class="home-header">
      <h1>设置</h1>
      <p>打印机配置、WebSocket 连接、关于信息</p>
    </div>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="printer" tab="打印机配置">
        <a-card title="打印参数">
          <a-form layout="vertical" style="max-width: 400px">
            <a-form-item label="页面宽度 (mm)">
              <a-input-number v-model:value="pageWidth" :min="1" :max="300" style="width: 100%" />
            </a-form-item>
            <a-form-item label="页面高度 (mm)">
              <a-input-number v-model:value="pageHeight" :min="1" :max="300" style="width: 100%" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="savePrintParams" :disabled="!isElectron">
                <template #icon><PrinterOutlined /></template>
                保存打印参数
              </a-button>
              <a-tag v-if="!isElectron" color="warning" style="margin-left: 8px">仅在 Electron 环境下可用</a-tag>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card title="打印机列表" style="margin-top: 16px">
          <a-button :loading="loadingPrinters" :disabled="!isElectron" @click="fetchPrinters">获取打印机列表</a-button>
          <a-list
            v-if="printerList.length"
            :data-source="printerList"
            bordered
            size="small"
            style="margin-top: 12px"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                {{ item.displayName || item.name }}
                <a-tag v-if="item.isDefault" color="blue" style="margin-left: 8px">默认</a-tag>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="ws" tab="WebSocket">
        <a-card title="WebSocket 连接设置" style="max-width: 500px">
          <a-form layout="vertical">
            <a-form-item label="WebSocket URL">
              <a-input v-model:value="wsUrl" placeholder="ws://192.168.2.113:8010/infra/ws" />
            </a-form-item>
            <a-form-item label="Token">
              <a-input v-model:value="wsToken" placeholder="请输入打印令牌" />
            </a-form-item>
            <a-form-item>
              <a-button :disabled="!isElectron" @click="saveWsSettings">保存 WebSocket 设置</a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="about" tab="关于">
        <a-card title="关于工具箱">
          <a-descriptions bordered :column="1" size="small">
            <a-descriptions-item label="应用名称">中造工具箱 (ZZ Toolbox)</a-descriptions-item>
            <a-descriptions-item label="版本">1.0.0</a-descriptions-item>
            <a-descriptions-item label="技术栈">Electron 35 + Vue 3 + Vite 7 + Ant Design Vue 4</a-descriptions-item>
            <a-descriptions-item label="功能模块">打印工具 / 组件库 / 演练场</a-descriptions-item>
            <a-descriptions-item label="整合来源">
              electron-vue-print, electron-vue-print2, sealPrint, components-idea, my-code-project
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { message } from "ant-design-vue";
import { PrinterOutlined } from "@ant-design/icons-vue";

const activeTab = ref("printer");
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

const pageWidth = ref(60);
const pageHeight = ref(40);
const wsUrl = ref("ws://192.168.2.113:8010/infra/ws");
const wsToken = ref("");
const printerList = ref([]);
const loadingPrinters = ref(false);

async function savePrintParams() {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.setPrintParams({
      width: pageWidth.value * 1000,
      height: pageHeight.value * 1000,
    });
    message.success("打印参数已保存");
  } catch (e) {
    message.warning("设置失败");
  }
}

async function fetchPrinters() {
  if (!window.electronAPI) return;
  loadingPrinters.value = true;
  try {
    printerList.value = await window.electronAPI.getPrinters();
  } catch (e) {
    message.error(e.message);
  } finally {
    loadingPrinters.value = false;
  }
}

async function saveWsSettings() {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.setWsUrl(wsUrl.value);
    await window.electronAPI.setWsToken(wsToken.value);
    message.success("WebSocket 设置已保存");
  } catch (e) {
    message.error("设置失败");
  }
}
</script>

<style scoped>
.settings-view { padding: 24px; }
.home-header { margin-bottom: 24px; }
.home-header h1 { font-size: 24px; margin: 0 0 8px 0; }
.home-header p { color: #666; margin: 0; }
</style>
