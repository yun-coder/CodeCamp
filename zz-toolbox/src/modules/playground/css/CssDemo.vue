<template>
  <div class="css-demo-container">
    <div class="demo-layout">
      <!-- 左侧功能菜单 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>CSS 功能演示</h3>
        </div>
        <div class="menu-list">
          <div
            v-for="(item, index) in demoList"
            :key="index"
            :class="['menu-item', { active: currentIndex === index }]"
            @click="switchDemo(index)"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-text">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧展示区域 -->
      <div class="content">
        <div class="content-header">
          <h2>{{ currentDemo.name }}</h2>
          <p class="description">{{ currentDemo.description }}</p>
        </div>

        <div class="demo-wrapper">
          <!-- CSS 形状 -->
          <div v-if="currentIndex === 0" class="demo-content shape-gallery">
            <div
              v-for="(shape, idx) in shapes"
              :key="idx"
              class="shape-item"
              :data-shape="shape.id"
            >
              <div :class="`shape ${shape.id}`"></div>
              <span>{{ shape.name }}</span>
            </div>
          </div>

          <!-- CSS 变换 -->
          <div v-else-if="currentIndex === 1" class="demo-content css-transform-demo">
            <div v-for="(item, idx) in transformItems" :key="idx" class="transform-item">
              <div :class="`box ${item.className}`"></div>
              <span>{{ item.name }}</span>
            </div>
          </div>

          <!-- CSS 变量 -->
          <div v-else-if="currentIndex === 2" class="demo-content css-variables-demo">
            <div
              v-for="(theme, idx) in themes"
              :key="idx"
              class="variable-box"
              :style="theme.style"
            >
              <h3>{{ theme.title }}</h3>
              <p>{{ theme.desc }}</p>
            </div>
          </div>

          <!-- 六面体 -->
          <div v-else-if="currentIndex === 3" class="demo-content cube-3d-demo">
            <div class="cube-wrapper">
              <div class="cube-3d">
                <div
                  v-for="face in cubeFaces"
                  :key="face.name"
                  :class="`cube-3d-face ${face.className}`"
                >
                  {{ face.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- 加载动画 -->
          <div v-else-if="currentIndex === 4" class="demo-content loading-demo">
            <div class="loader">
              <div class="loader-bounce"></div>
            </div>
          </div>

          <!-- 卡片边角丝带 -->
          <div v-else-if="currentIndex === 5" class="demo-content card-ribbon-demo">
            <div class="card-box">
              <span></span>
            </div>
          </div>

          <!-- 吊灯下坠 -->
          <div v-else-if="currentIndex === 6" class="demo-content pendant-demo">
            <i class="pendant"></i>
          </div>

          <!-- 开关按钮 -->
          <div v-else-if="currentIndex === 7" class="demo-content switch-demo">
            <label class="switch">
              <input type="checkbox" v-model="switchOn">
              <span class="slider"></span>
            </label>
            <p class="switch-status">{{ switchOn ? '开启' : '关闭' }}</p>
          </div>

          <!-- 边框圆角总结 -->
          <div v-else-if="currentIndex === 8" class="demo-content border-radius-summary">
            <div
              v-for="(item, idx) in radiusDemos"
              :key="idx"
              class="radius-demo"
            >
              <div :style="item.style"></div>
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CssDemo',
  data() {
    return {
      currentIndex: 0,
      switchOn: false,
      demoList: [
        { icon: '🔷', name: 'CSS 形状', description: '使用 CSS 绘制各种几何形状' },
        { icon: '🎭', name: 'CSS 变换', description: '综合使用各种变换效果' },
        { icon: '🎨', name: 'CSS 变量', description: '使用 CSS 自定义属性' },
        { icon: '🎲', name: '六面体', description: '3D 立方体效果' },
        { icon: '⏳', name: '加载动画', description: 'Loading 动画效果' },
        { icon: '🏷️', name: '卡片边角丝带', description: '丝带装饰效果' },
        { icon: '💡', name: '吊灯下坠', description: '物理下坠动画' },
        { icon: '🔘', name: '开关按钮', description: 'Toggle 开关效果' },
        { icon: '📐', name: '边框圆角总结', description: '各种圆角效果' }
      ],
      shapes: [
        { id: 'square', name: '正方形' },
        { id: 'rectangle', name: '矩形' },
        { id: 'circle', name: '圆形' },
        { id: 'oval', name: '椭圆' },
        { id: 'triangle-up', name: '正三角' },
        { id: 'triangle-down', name: '倒三角' },
        { id: 'triangle-left', name: '左三角' },
        { id: 'triangle-right', name: '右三角' },
        { id: 'parallelogram', name: '平行四边形' },
        { id: 'trapezoid', name: '梯形' },
        { id: 'pentagon', name: '五边形' },
        { id: 'hexagon', name: '六边形' },
        { id: 'star', name: '五角星' },
        { id: 'heart', name: '爱心' },
        { id: 'message', name: '消息框' }
      ],
      transformItems: [
        { name: '平移', className: 'translate' },
        { name: '旋转', className: 'rotate' },
        { name: '缩放', className: 'scale' },
        { name: '倾斜', className: 'skew' },
        { name: '组合', className: 'combined' }
      ],
      themes: [
        {
          title: '主题 1',
          desc: '使用 CSS 变量',
          style: { '--primary-color': '#4facfe', '--bg-color': '#f5f7fa' }
        },
        {
          title: '主题 2',
          desc: '自定义颜色',
          style: { '--primary-color': '#ff6b6b', '--bg-color': '#fff5f5' }
        },
        {
          title: '主题 3',
          desc: '轻松切换',
          style: { '--primary-color': '#ffd700', '--bg-color': '#fffde7' }
        }
      ],
      cubeFaces: [
        { name: 'front', className: 'front', label: '前' },
        { name: 'back', className: 'back', label: '后' },
        { name: 'right', className: 'right', label: '右' },
        { name: 'left', className: 'left', label: '左' },
        { name: 'top', className: 'top', label: '上' },
        { name: 'bottom', className: 'bottom', label: '下' }
      ],
      radiusDemos: [
        { name: '无圆角', style: 'width: 80px; height: 80px; background: #4facfe;' },
        { name: '小圆角', style: 'width: 80px; height: 80px; background: #4facfe; border-radius: 8px;' },
        { name: '中圆角', style: 'width: 80px; height: 80px; background: #4facfe; border-radius: 16px;' },
        { name: '大圆角', style: 'width: 80px; height: 80px; background: #4facfe; border-radius: 32px;' },
        { name: '圆形', style: 'width: 80px; height: 80px; background: #4facfe; border-radius: 50%;' },
        { name: '异形', style: 'width: 80px; height: 80px; background: #4facfe; border-radius: 20px 50px;' }
      ]
    }
  },
  computed: {
    currentDemo() {
      return this.demoList[this.currentIndex]
    }
  },
  methods: {
    switchDemo(index) {
      this.currentIndex = index
    }
  }
}
</script>

<style lang="scss" scoped>
// ==================== 全局样式 ====================
.css-demo-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .demo-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
}

// ==================== 侧边栏样式 ====================
.sidebar {
  width: 280px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  .sidebar-header {
    padding: 20px;
    background: rgba(0, 0, 0, 0.1);

    h3 {
      margin: 0;
      color: #fff;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .menu-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      margin: 5px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #fff;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateX(5px);
      }

      &.active {
        background: rgba(255, 255, 255, 0.25);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .menu-icon {
        font-size: 20px;
        margin-right: 12px;
        width: 30px;
        text-align: center;
      }

      .menu-text {
        font-size: 14px;
        font-weight: 500;
        flex: 1;
      }
    }
  }
}

// ==================== 内容区域样式 ====================
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 30px;
  overflow: hidden;

  .content-header {
    margin-bottom: 20px;
    text-align: center;

    h2 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #333;
      font-weight: 600;
    }

    .description {
      margin: 0;
      font-size: 16px;
      color: #666;
    }
  }

  .demo-wrapper {
    flex: 1;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;

    .demo-content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

// ==================== CSS 形状 ====================
.shape-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
  padding: 20px;
  max-width: 100%;

  .shape-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .shape {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 20px rgba(79, 172, 254, 0.4);
      }
    }

    // 各种形状样式
    .square {
      border-radius: 0;
    }

    .rectangle {
      width: 120px;
    }

    .circle {
      border-radius: 50%;
    }

    .oval {
      border-radius: 50%;
      width: 120px;
    }

    .triangle-up {
      width: 0;
      height: 0;
      border-left: 40px solid transparent;
      border-right: 40px solid transparent;
      border-bottom: 80px solid #4facfe;
      background: transparent;
    }

    .triangle-down {
      width: 0;
      height: 0;
      border-left: 40px solid transparent;
      border-right: 40px solid transparent;
      border-top: 80px solid #4facfe;
      background: transparent;
    }

    .triangle-left {
      width: 0;
      height: 0;
      border-top: 40px solid transparent;
      border-bottom: 40px solid transparent;
      border-right: 80px solid #4facfe;
      background: transparent;
    }

    .triangle-right {
      width: 0;
      height: 0;
      border-top: 40px solid transparent;
      border-bottom: 40px solid transparent;
      border-left: 80px solid #4facfe;
      background: transparent;
    }

    .parallelogram {
      transform: skew(-20deg);
    }

    .trapezoid {
      width: 80px;
      height: 0;
      border-left: 20px solid transparent;
      border-right: 20px solid transparent;
      border-bottom: 80px solid #4facfe;
      background: transparent;
    }

    .pentagon {
      clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
    }

    .hexagon {
      clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    }

    .star {
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }

    .heart {
      clip-path: path('M40 70 C30 90 0 90 0 60 C0 30 40 20 40 0 C40 20 80 30 80 60 C80 90 50 90 40 70');
      transform: rotate(45deg) scale(0.8);
    }

    .message {
      width: 100px;
      height: 60px;
      border-radius: 10px;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 20px;
        border-width: 10px 10px 0;
        border-style: solid;
        border-color: #4facfe transparent transparent;
      }
    }

    span {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
  }
}

// ==================== CSS 变换 ====================
.css-transform-demo {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  justify-content: center;

  .transform-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;

    .box {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      transition: all 0.3s ease;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      }

      &.translate:hover {
        transform: translate(20px, 20px) scale(1.1);
      }

      &.rotate:hover {
        transform: rotate(45deg) scale(1.1);
      }

      &.scale:hover {
        transform: scale(1.3);
      }

      &.skew:hover {
        transform: skew(15deg) scale(1.1);
      }

      &.combined:hover {
        transform: translate(20px, 20px) rotate(30deg) scale(1.2);
      }
    }

    span {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
  }
}

// ==================== CSS 变量 ====================
.css-variables-demo {
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;

  .variable-box {
    width: 180px;
    height: 200px;
    background: var(--bg-color, #f5f7fa);
    border-radius: 16px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    border: 2px solid transparent;

    &:hover {
      transform: translateY(-10px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      border-color: var(--primary-color, #4facfe);
    }

    h3 {
      margin: 0;
      color: var(--primary-color, #4facfe);
      font-size: 18px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
      text-align: center;
    }

    &::after {
      content: '';
      width: 60px;
      height: 60px;
      background: var(--primary-color, #4facfe);
      border-radius: 50%;
      opacity: 0.3;
    }
  }
}

// ==================== 六面体 3D ====================
.cube-3d-demo {
  .cube-wrapper {
    perspective: 1000px;
    width: 200px;
    height: 200px;
  }

  .cube-3d {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    animation: rotateCube 12s infinite linear;

    .cube-3d-face {
      position: absolute;
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 600;
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(2px);

      &.front {
        background: rgba(255, 107, 107, 0.85);
        transform: translateZ(100px);
      }

      &.back {
        background: rgba(79, 172, 254, 0.85);
        transform: rotateY(180deg) translateZ(100px);
      }

      &.right {
        background: rgba(255, 215, 0, 0.85);
        transform: rotateY(90deg) translateZ(100px);
      }

      &.left {
        background: rgba(46, 213, 115, 0.85);
        transform: rotateY(-90deg) translateZ(100px);
      }

      &.top {
        background: rgba(155, 89, 182, 0.85);
        transform: rotateX(90deg) translateZ(100px);
      }

      &.bottom {
        background: rgba(52, 152, 219, 0.85);
        transform: rotateX(-90deg) translateZ(100px);
      }
    }
  }
}

@keyframes rotateCube {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}

// ==================== 加载动画 ====================
.loading-demo {
  .loader {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;

    .loader-bounce {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      animation: bounce 1.4s ease-in-out infinite both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
      }

      &:nth-child(3) {
        animation-delay: 0;
      }
    }
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

// ==================== 卡片边角丝带 ====================
.card-ribbon-demo {
  .card-box {
    width: 200px;
    height: 250px;
    border-radius: 20px;
    background-image: linear-gradient(43deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%);
    position: relative;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.55);
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: scale(0.9);
    }

    span {
      position: absolute;
      overflow: hidden;
      width: 150px;
      height: 150px;
      top: -10px;
      left: -10px;
      display: flex;
      align-items: center;
      justify-content: center;

      &::before {
        content: '我的相册';
        position: absolute;
        width: 150%;
        height: 40px;
        background-image: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%);
        transform: rotate(-45deg) translateY(-20px);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.23);
      }

      &::after {
        content: '';
        position: absolute;
        width: 10px;
        bottom: 0;
        left: 0;
        height: 10px;
        z-index: -1;
        box-shadow: 140px -140px #cc3f47;
        background-image: linear-gradient(45deg, #FF512F 0%, #F09819 51%, #FF512F 100%);
      }
    }
  }
}

// ==================== 吊灯下坠 ====================
.pendant-demo {
  position: relative;
  width: 100%;
  height: 100%;

  .pendant {
    display: block;
    position: absolute;
    right: 16%;
    top: 0;
    height: 8em;
    width: 2px;
    background-color: #000;
    transform-origin: 0 -1em;
    animation: swing 3.5s ease-in-out forwards infinite;

    &::before {
      content: '';
      display: block;
      width: 6em;
      height: 3em;
      background-color: #111;
      position: absolute;
      top: 8em;
      left: -2.9em;
      border-radius: 4em 4em 0 0;
      box-shadow:
        inset 0 0 0 1px hsla(0, 0%, 0%, 0.1),
        inset 3px 3px 3px hsla(0, 0%, 100%, 0.2),
        inset -3px -3px 3px hsla(0, 0%, 0%, 0.2),
        1.5em -1em 3px hsla(0, 0%, 0%, 0.15);
    }

    &::after {
      content: '';
      display: block;
      position: absolute;
      left: 1.5em;
      top: -1em;
      width: 1px;
      height: inherit;
      background-color: hsla(0, 0%, 0%, 0.1);
      box-shadow: 0 0 2px hsla(0, 0%, 0%, 0.15);
    }
  }
}

@keyframes swing {
  0% {
    transform: translateX(-50%) rotate(4deg);
  }
  50% {
    transform: translateX(-50%) rotate(-4deg) skewX(5deg) skewY(-2deg);
  }
  100% {
    transform: translateX(-50%) rotate(4deg);
  }
}

// ==================== 开关按钮 ====================
.switch-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;

  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;

    input {
      opacity: 0;
      width: 0;
      height: 0;

      &:checked + .slider {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
      }

      &:checked + .slider:before {
        transform: translateX(26px);
      }

      &:focus + .slider {
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.25);
      }
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.4s ease;
      border-radius: 34px;

      &:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: #fff;
        transition: 0.4s ease;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      &:active:before {
        width: 28px;
      }
    }
  }

  .switch-status {
    font-size: 16px;
    color: #666;
    font-weight: 500;
    transition: color 0.3s ease;

    &.on {
      color: #667eea;
    }
  }
}

// ==================== 边框圆角总结 ====================
.border-radius-summary {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  justify-content: center;

  .radius-demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    div {
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
      }
    }

    span {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
  }
}
</style>
