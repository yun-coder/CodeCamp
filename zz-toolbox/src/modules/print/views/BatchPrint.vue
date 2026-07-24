<template>
  <div class="batch-print">
    <h2 style="margin: 0 0 16px 0">批量打印</h2>
    <a-alert
      message="WebSocket 批量打印模式"
      description="启动后通过 WebSocket 接收工单数据，自动静默打印条码标签。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-card title="WebSocket 连接设置" style="margin-bottom: 16px">
      <a-form layout="vertical">
        <a-form-item label="WebSocket URL">
          <a-input v-model:value="wsUrl" placeholder="ws://192.168.2.113:8010/infra/ws" />
        </a-form-item>
        <a-form-item label="令牌 (Token)">
          <a-input v-model:value="wsToken" placeholder="请输入打印令牌" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="saveWsToken" :loading="connecting">
            {{ connecting ? '连接中...' : '连接 WebSocket' }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="打印参数设置" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="页面宽度 (mm)">
          <a-input-number v-model:value="printParams.pageWidth" :min="1" :max="300" />
        </a-form-item>
        <a-form-item label="页面高度 (mm)">
          <a-input-number v-model:value="printParams.pageHeight" :min="1" :max="300" />
        </a-form-item>
        <a-form-item>
          <a-button @click="savePrintParams">保存打印参数</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="打印机状态">
      <a-button :loading="loadingPrinters" @click="fetchPrinters">获取打印机列表</a-button>
      <a-list
        v-if="printerList.length"
        :data-source="printerList"
        bordered
        size="small"
        style="margin-top: 12px"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                {{ item.name }}
                <a-tag v-if="item.isDefault" color="blue" style="margin-left: 8px">默认</a-tag>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { message } from "ant-design-vue";

const wsUrl = ref("ws://192.168.2.113:8010/infra/ws");
const wsToken = ref("");
const connecting = ref(false);

const printParams = ref({ pageWidth: 60, pageHeight: 40 });
const printerList = ref([]);
const loadingPrinters = ref(false);

async function saveWsToken() {
  if (!window.electronAPI) {
    message.warning("仅在 Electron 环境下可用");
    return;
  }
  connecting.value = true;
  try {
    await window.electronAPI.setWsUrl(wsUrl.value);
    await window.electronAPI.setWsToken(wsToken.value);
    message.success("WebSocket 连接成功");
  } catch (e) {
    message.error("连接失败: " + e.message);
  } finally {
    connecting.value = false;
  }
}

async function savePrintParams() {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.setPrintParams({
      width: printParams.value.pageWidth * 1000,
      height: printParams.value.pageHeight * 1000,
    });
    message.success("打印参数已保存");
  } catch (e) {
    message.warning("设置失败，将使用默认参数");
  }
}

async function fetchPrinters() {
  if (!window.electronAPI) {
    message.warning("仅在 Electron 环境下可用");
    return;
  }
  loadingPrinters.value = true;
  try {
    printerList.value = await window.electronAPI.getPrinters();
  } catch (e) {
    message.error(e.message);
  } finally {
    loadingPrinters.value = false;
  }
}
</script>

<style scoped>
.batch-print { padding: 24px; }
</style>
