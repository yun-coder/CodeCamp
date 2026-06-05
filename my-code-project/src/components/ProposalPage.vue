<template>
  <div class="proposal-page">
    <!-- 粒子画布 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 漂浮爱心 -->
    <div class="hearts-container">
      <div v-for="(heart, index) in hearts" :key="index"
           class="floating-heart"
           :style="{
             left: heart.left,
             animationDelay: heart.delay,
             fontSize: heart.size
           }">
        ❤
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-container">
      <!-- 照片轮播 -->
      <div class="photo-slider">
        <div class="slider-container">
          <div class="slider-track" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
            <div class="slide" v-for="(photo, index) in photos" :key="index">
              <img :src="photo" :alt="`Photo ${index + 1}`" />
            </div>
          </div>
        </div>

        <!-- 指示点 -->
        <div class="slider-dots">
          <span
            v-for="(photo, index) in photos"
            :key="index"
            :class="['dot', { active: currentIndex === index }]"
            @click="goToSlide(index)"
          ></span>
        </div>

        <!-- 箭头按钮 -->
        <button class="slider-arrow prev" @click="prevSlide">❮</button>
        <button class="slider-arrow next" @click="nextSlide">❯</button>
      </div>

      <div class="message-box">
        <div class="typewriter-text">{{ displayedText }}</div>
        <div class="cursor" :class="{ blink: showCursor }">|</div>
      </div>

      <div class="yes-button-container" v-show="showButton">
        <button class="yes-button" @click="handleYes">
          ❤ 我愿意 ❤
        </button>
      </div>
    </div>

    <!-- 成功弹窗 -->
    <div class="success-modal" v-if="showSuccessModal">
      <div class="modal-content">
        <div class="heart-animation">❤</div>
        <p>我爱你，琴琴！</p>
        <p>一生一世，永不分离！</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProposalPage',
  data() {
    return {
      fullText: '琴琴，我们结婚吧',
      displayedText: '',
      showCursor: true,
      showButton: false,
      hearts: [],
      showSuccessModal: false,
      particles: [],
      // 照片轮播相关
      photos: [
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1920&h=1080&fit=crop',
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1920&h=1080&fit=crop',
        'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1920&h=1080&fit=crop',
      ],
      currentIndex: 0,
      autoPlayInterval: null,
      autoPlayDelay: 3000 // 3秒切换一次
    }
  },
  mounted() {
    this.createHearts();
    this.typeWriter();
    this.initParticles();
    this.startAnimation();
    this.startPhotoSlider();
  },
  beforeUnmount() {
    this.stopPhotoSlider();
  },
  methods: {
    typeWriter() {
      let i = 0;
      const typeSpeed = 300;

      const type = () => {
        if (i < this.fullText.length) {
          this.displayedText += this.fullText.charAt(i);
          i++;
          setTimeout(type, typeSpeed);
        } else {
          this.showButton = true;
        }
      };

      type();
    },

    createHearts() {
      const heartCount = 30;
      for (let i = 0; i < heartCount; i++) {
        this.hearts.push({
          left: Math.random() * 100 + '%',
          delay: Math.random() * 15 + 's',
          size: (Math.random() * 20 + 15) + 'px'
        });
      }
    },

    initParticles() {
      const canvas = this.$refs.particleCanvas;
      const ctx = canvas.getContext('2d');

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particleCount = 150;
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedY: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.01
        });
      }
    },

    startAnimation() {
      const animate = () => {
        const canvas = this.$refs.particleCanvas;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.particles.forEach(particle => {
          particle.opacity += particle.twinkleSpeed;
          if (particle.opacity > 0.8 || particle.opacity < 0.2) {
            particle.twinkleSpeed *= -1;
          }

          particle.y -= particle.speedY;
          if (particle.y < 0) {
            particle.y = canvas.height;
            particle.x = Math.random() * canvas.width;
          }

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
          ctx.fill();

          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        });

        requestAnimationFrame(animate);
      };

      animate();

      window.addEventListener('resize', () => {
        const canvas = this.$refs.particleCanvas;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    },

    createConfetti() {
      console.log('庆祝！');
    },

    // 照片轮播相关方法
    startPhotoSlider() {
      this.autoPlayInterval = setInterval(() => {
        this.nextSlide();
      }, this.autoPlayDelay);
    },

    stopPhotoSlider() {
      if (this.autoPlayInterval) {
        clearInterval(this.autoPlayInterval);
      }
    },

    nextSlide() {
      this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    },

    prevSlide() {
      this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    },

    goToSlide(index) {
      this.currentIndex = index;
    }
  }
}
</script>

<style lang="scss" scoped>
.proposal-page {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.hearts-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.floating-heart {
  position: absolute;
  bottom: -50px;
  color: rgba(255, 255, 255, 0.6);
  animation: floatUp 15s linear infinite;
  text-shadow: 0 0 10px rgba(255, 192, 203, 0.5);
}

@keyframes floatUp {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
}

.content-container {
  position: relative;
  z-index: 10;
  text-align: center;
}

.photo-slider {
  position: relative;
  width: 66.666%;
  max-width: 90vw;
  height: 50vh;
  max-height: 60vh;
  margin: 0 auto 3rem;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.slider-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.slider-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.slide {
  flex-shrink: 0;
  width: 100%;
  height: 100%;
}

.slide img {
  width: 100%;
  height: 100%;
  object-fit: contain; // 改为contain，确保完整显示
  display: block;
  background: rgba(0, 0, 0, 0.3); // 添加背景色
}

.slider-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  &.active {
    background: #fff;
    transform: scale(1.2);
  }
}

.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.5);
    transform: translateY(-50%) scale(1.1);
  }

  &.prev {
    left: 20px;
  }

  &.next {
    right: 20px;
  }
}

.message-box {
  font-size: 4rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5),
               0 0 40px rgba(255, 255, 255, 0.3),
               0 0 60px rgba(255, 192, 203, 0.3);
  min-height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.typewriter-text {
  display: inline-block;
}

.cursor {
  display: inline-block;
  width: 0.1em;
  height: 1em;
  background: #fff;
  animation: none;

  &.blink {
    animation: blink 1s step-end infinite;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.yes-button-container {
  margin-top: 3rem;
  animation: fadeInUp 1s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.yes-button {
  padding: 1.2rem 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: #fff;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(238, 90, 111, 0.4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 15px 40px rgba(238, 90, 111, 0.6);
  }

  &:active {
    transform: translateY(0) scale(1.02);
  }

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transform: rotate(45deg);
    animation: shine 3s infinite;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) rotate(45deg);
  }
}

.success-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 3rem;
  border-radius: 20px;
  text-align: center;
  color: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.heart-animation {
  font-size: 6rem;
  margin-bottom: 1rem;
  animation: heartbeat 1s infinite;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.modal-content p {
  font-size: 2rem;
  margin: 0.5rem 0;
  font-weight: bold;
}

@media (max-width: 768px) {
  .photo-slider {
    width: 95vw;
    height: 50vh;
  }

  .slider-arrow {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;

    &.prev {
      left: 10px;
    }

    &.next {
      right: 10px;
    }
  }

  .message-box {
    font-size: 2.5rem;
  }

  .yes-button {
    padding: 1rem 2rem;
    font-size: 1.2rem;
  }

  .modal-content p {
    font-size: 1.5rem;
  }
}
</style>
