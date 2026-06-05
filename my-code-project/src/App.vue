<template>
  <div id="app">
    <div class="nav-tabs">
      <!-- <div :class="['nav-item', { active: currentTab === 'proposal' }]" @click="switchTab('proposal')">
        💕 求婚页面
      </div> -->
      <div :class="['nav-item', { active: currentTab === 'canvas' }]" @click="switchTab('canvas')">
        🎨 Canvas 演示
      </div>
      <div :class="['nav-item', { active: currentTab === 'css' }]" @click="switchTab('css')">
        💅 CSS 演示
      </div>
      <div :class="['nav-item', { active: currentTab === 'suanfa' }]" @click="switchTab('suanfa')">
        🧮 算法演示
      </div>
    </div>

    <!-- <proposal-page v-if="currentTab === 'proposal'"></proposal-page> -->
    <canvas-demo v-if="currentTab === 'canvas'"></canvas-demo>
    <css-demo v-if="currentTab === 'css'"></css-demo>
    <suanfa-demo v-if="currentTab === 'suanfa'"></suanfa-demo>
  </div>
</template>

<script>
// import ProposalPage from './components/ProposalPage.vue';
import CanvasDemo from './components/CanvasDemo.vue';
import CssDemo from './components/CssDemo.vue';
import SuanfaDemo from './components/SuanfaDemo.vue';

export default {
  name: 'app',
  components: {
<<<<<<< HEAD
    Prop  osalPage,
=======
    // ProposalPage,
>>>>>>> d7f437cbb8f49c461891334d0479b827c1a21e0e
    CanvasDemo,
    CssDemo,
    SuanfaDemo,
  },
  data() {
    return {
      currentTab: 'canvas'
    }
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {

    },
    switchTab(tab) {
      this.currentTab = tab
    }
  }
}
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .nav-tabs {
    display: flex;
    gap: 20px;
    padding: 20px 30px;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 100;

    .nav-item {
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: #666;
      transition: all 0.3s ease;
      background: #f5f5f5;

      &:hover {
        background: #e0e0e0;
      }

      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }
    }
  }

  :deep(.proposal-page),
  :deep(.canvas-demo-container),
  :deep(.css-demo-container),
  :deep(.suanfa-demo-container) {
    flex: 1;
    height: calc(100vh - 80px);
  }
}
</style>

