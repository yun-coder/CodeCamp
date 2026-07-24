<template>
  <div class="print-home">
    <div v-if="currentView === ''">
      <div class="home-header">
        <h1>打印工具</h1>
        <p>标签设计、批量打印、模板设计</p>
      </div>
      <div class="card-grid">
        <a-card hoverable class="func-card" @click="currentView = 'label'">
          <div class="card-icon">🏷️</div>
          <h3>标签设计器</h3>
          <p>条码 / 二维码标签设计与静默打印</p>
        </a-card>
        <a-card hoverable class="func-card" @click="currentView = 'batch'">
          <div class="card-icon">📦</div>
          <h3>批量打印</h3>
          <p>WebSocket 接收工单自动批量打印</p>
        </a-card>
        <a-card hoverable class="func-card" @click="currentView = 'template'">
          <div class="card-icon">📄</div>
          <h3>模板设计器</h3>
          <p>可视化打印模板设计 + 印章跨页 (Hiprint.js)</p>
        </a-card>
        <a-card hoverable class="func-card" @click="currentView = 'htmlprint'">
          <div class="card-icon">🖼️</div>
          <h3>HTML打印设计器</h3>
          <p>HTML→Canvas渲染 + 表格智能分页</p>
        </a-card>
      </div>
    </div>

    <div v-else>
      <a-button type="text" @click="currentView = ''" style="margin-bottom: 12px">
        ← 返回打印工具
      </a-button>
      <LabelDesigner v-if="currentView === 'label'" />
      <BatchPrint v-else-if="currentView === 'batch'" />
      <TemplateDesigner v-else-if="currentView === 'template'" />
      <HtmlPrintDesigner v-else-if="currentView === 'htmlprint'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import LabelDesigner from "./LabelDesigner.vue";
import BatchPrint from "./BatchPrint.vue";
import TemplateDesigner from "./TemplateDesigner.vue";
import HtmlPrintDesigner from "./HtmlPrintDesigner.vue";

const currentView = ref("");
</script>

<style scoped>
.print-home { padding: 24px; }
.home-header { margin-bottom: 24px; }
.home-header h1 { font-size: 24px; margin: 0 0 8px 0; }
.home-header p { color: #666; margin: 0; }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.func-card { text-align: center; padding: 16px; cursor: pointer; }
.func-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.card-icon { font-size: 40px; margin-bottom: 8px; }
.func-card h3 { margin: 0 0 8px 0; font-size: 16px; }
.func-card p { margin: 0; color: #999; font-size: 13px; }
</style>
