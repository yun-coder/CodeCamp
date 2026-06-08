<template>
  <div class="canvas-demo-container">
    <div class="demo-layout">
      <!-- 左侧功能菜单 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>Canvas 功能演示</h3>
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
        <div class="canvas-wrapper" ref="canvasWrapper">
          <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
          <div v-if="showControls" class="controls">
            <button v-if="currentDemo.hasClear" @click="clearCanvas">清空画布</button>
            <button v-if="currentDemo.hasReset" @click="resetCanvas">重置</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CanvasDemo',
  data() {
    return {
      canvasWidth: 800,
      canvasHeight: 600,
      currentIndex: 0,
      ctx: null,
      isDragging: false,
      startX: 0,
      startY: 0,
      imageData: null,
      showControls: false,
      animationId: null,
      demoList: [
        { icon: '📐', name: '坐标轴绘制', description: '绘制带刻度的坐标轴' },
        { icon: '〰️', name: '贝塞尔曲线', description: '二次和三次贝塞尔曲线绘制' },
        { icon: '🎆', name: '烟花特效', description: '烟花发射、爆炸动画' },
        { icon: '🎨', name: '五角星', description: '绘制五角星和双色风车' },
        { icon: '✂️', name: '剪纸效果', description: '圆环镂空/剪纸效果' },
        { icon: '📊', name: '仪表盘', description: '仪表盘绘制' },
        { icon: '📏', name: '直线绘制', description: '鼠标拖拽绘制直线' },
        { icon: '⭕', name: '圆形拖拽', description: '圆形拖拽交互' },
        { icon: '✏️', name: '可编辑贝塞尔曲线', description: '交互式编辑贝塞尔曲线控制点' },
        { icon: '🏢', name: '电子印章', description: '绘制圆形电子印章' },
        { icon: '🖼️', name: '图片合成', description: '图片水印/合成' },
        { icon: '🔺', name: '圆角矩形', description: '绘制圆角矩形' },
        { icon: '🔄', name: '旋转交互', description: '图形旋转交互效果' },
        { icon: '☯️', name: '太极图', description: '绘制太极图' },
        { icon: '🌍', name: '三维圆周运动', description: '3D圆周运动动画' },
        { icon: '📈', name: 'Sin函数图像', description: '绘制正弦函数曲线' },
        { icon: '🕐', name: '时钟', description: '动态时钟绘制' },
        { icon: '💫', name: '弧形文字', description: '沿圆弧排列文字' },
        { icon: '✨', name: '蚂蚁线', description: '虚线边框动画' },
        { icon: '📉', name: '拓扑图', description: '树形拓扑结构图' }
      ]
    }
  },
  computed: {
    currentDemo() {
      return this.demoList[this.currentIndex]
    }
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d')
    this.renderCurrentDemo()
  },
  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  },
  methods: {
    switchDemo(index) {
      this.currentIndex = index
      this.clearCanvas()
      this.stopAnimation()
      this.renderCurrentDemo()
    },

    clearCanvas() {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    },

    resetCanvas() {
      this.clearCanvas()
      this.renderCurrentDemo()
    },

    stopAnimation() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    },

    renderCurrentDemo() {
      const demos = [
        this.drawAxis,
        this.drawBezierCurve,
        this.drawFireworks,
        this.drawStar,
        this.drawCutOut,
        this.drawDashboard,
        this.drawLine,
        this.drawDragCircle,
        this.drawEditableBezier,
        this.drawSeal,
        this.drawPictureSynthesis,
        this.drawRadiusShape,
        this.drawRotateInteractive,
        this.drawTaiji,
        this.drawCircularMotion,
        this.drawSinCurve,
        this.drawClock,
        this.drawCircularText,
        this.drawDashedLine,
        this.drawTopologyMap
      ]
      demos[this.currentIndex]?.call(this)
    },

    // 1. 坐标轴绘制
    drawAxis() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight
      const padding = 50

      this.showControls = true
      this.currentDemo.hasClear = true

      // 绘制网格
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 0.5
      for (let x = padding; x < w - padding; x += 50) {
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, h - padding)
        ctx.stroke()
      }
      for (let y = padding; y < h - padding; y += 50) {
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(w - padding, y)
        ctx.stroke()
      }

      // 绘制X轴
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding, h - padding)
      ctx.lineTo(w - padding, h - padding)
      ctx.stroke()

      // 绘制Y轴
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, h - padding)
      ctx.stroke()

      // 绘制箭头
      ctx.fillStyle = '#333'
      // X轴箭头
      ctx.beginPath()
      ctx.moveTo(w - padding, h - padding)
      ctx.lineTo(w - padding - 10, h - padding - 5)
      ctx.lineTo(w - padding - 10, h - padding + 5)
      ctx.closePath()
      ctx.fill()
      // Y轴箭头
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding - 5, padding + 10)
      ctx.lineTo(padding + 5, padding + 10)
      ctx.closePath()
      ctx.fill()

      // 绘制刻度和标签
      ctx.font = '12px Arial'
      ctx.fillStyle = '#666'
      ctx.textAlign = 'center'
      for (let i = 0; i <= 10; i++) {
        const x = padding + i * 50
        const y = h - padding + 20
        ctx.fillText(i.toString(), x, y)
      }
      ctx.textAlign = 'right'
      for (let i = 0; i <= 8; i++) {
        const x = padding - 10
        const y = h - padding - i * 50
        ctx.fillText(i.toString(), x, y + 5)
      }

      // 轴标签
      ctx.font = '14px Arial'
      ctx.fillText('X', w - padding + 15, h - padding + 5)
      ctx.fillText('Y', padding - 10, padding - 15)
    },

    // 2. 贝塞尔曲线
    drawBezierCurve() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight
      const cx = w / 2
      const cy = h / 2

      // 二次贝塞尔曲线
      ctx.beginPath()
      ctx.moveTo(cx - 150, cy)
      ctx.quadraticCurveTo(cx - 100, cy - 100, cx, cy)
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 3
      ctx.stroke()

      // 控制点
      ctx.beginPath()
      ctx.arc(cx - 100, cy - 100, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#333'
      ctx.fill()

      // 三次贝塞尔曲线
      ctx.beginPath()
      ctx.moveTo(cx + 50, cy)
      ctx.bezierCurveTo(cx + 80, cy - 80, cx + 150, cy + 80, cx + 200, cy)
      ctx.strokeStyle = '#4ecdc4'
      ctx.lineWidth = 3
      ctx.stroke()

      // 控制点
      ctx.beginPath()
      ctx.arc(cx + 80, cy - 80, 5, 0, Math.PI * 2)
      ctx.arc(cx + 150, cy + 80, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#333'
      ctx.fill()

      // 绘制标签
      ctx.font = '14px Arial'
      ctx.fillStyle = '#333'
      ctx.fillText('二次贝塞尔曲线', cx - 100, cy + 80)
      ctx.fillText('三次贝塞尔曲线', cx + 100, cy + 80)
    },

    // 3. 烟花特效
    drawFireworks() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight

      let particles = []
      let rockets = []

      class Rocket {
        constructor() {
          this.x = Math.random() * w
          this.y = h
          this.vx = (Math.random() - 0.5) * 2
          this.vy = -Math.random() * 5 - 8
          this.color = `hsl(${Math.random() * 360}, 70%, 50%)`
          this.exploded = false
        }
        update() {
          this.x += this.vx
          this.y += this.vy
          this.vy += 0.2
          if (this.vy >= 0) {
            this.explode()
          }
        }
        draw() {
          ctx.beginPath()
          ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = this.color
          ctx.fill()
        }
        explode() {
          this.exploded = true
          for (let i = 0; i < 50; i++) {
            particles.push(new Particle(this.x, this.y, this.color))
          }
        }
      }

      class Particle {
        constructor(x, y, color) {
          this.x = x
          this.y = y
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 3 + 1
          this.vx = Math.cos(angle) * speed
          this.vy = Math.sin(angle) * speed
          this.alpha = 1
          this.color = color
          this.decay = Math.random() * 0.02 + 0.01
        }
        update() {
          this.x += this.vx
          this.y += this.vy
          this.vy += 0.1
          this.alpha -= this.decay
        }
        draw() {
          ctx.beginPath()
          ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
          ctx.fillStyle = this.color.replace(')', `, ${this.alpha})`)
          ctx.fill()
        }
      }

      const animate = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.fillRect(0, 0, w, h)

        // 发射新火箭
        if (Math.random() < 0.03) {
          rockets.push(new Rocket())
        }

        // 更新和绘制火箭
        rockets = rockets.filter(r => !r.exploded)
        rockets.forEach(r => {
          r.update()
          r.draw()
        })

        // 更新和绘制粒子
        particles = particles.filter(p => p.alpha > 0)
        particles.forEach(p => {
          p.update()
          p.draw()
        })

        this.animationId = requestAnimationFrame(animate)
      }

      // 初始化黑色背景
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      animate()
    },

    // 4. 五角星
    drawStar() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2

      // 绘制五角星
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const x = cx + Math.cos(angle) * 80
        const y = cy + Math.sin(angle) * 80
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.fillStyle = '#ffd700'
      ctx.fill()
      ctx.strokeStyle = '#ff8c00'
      ctx.lineWidth = 3
      ctx.stroke()

      // 绘制双色风车
      const wheelCx = cx + 200
      const wheelCy = cy
      ctx.beginPath()
      ctx.arc(wheelCx, wheelCy, 60, 0, Math.PI * 2)
      ctx.fillStyle = '#87ceeb'
      ctx.fill()

      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        const angle = (i * Math.PI) / 2 + Math.PI / 4
        ctx.moveTo(wheelCx, wheelCy)
        ctx.lineTo(wheelCx + Math.cos(angle) * 50, wheelCy + Math.sin(angle) * 50)
        ctx.lineTo(wheelCx + Math.cos(angle + Math.PI / 4) * 50, wheelCy + Math.sin(angle + Math.PI / 4) * 50)
        ctx.closePath()
        ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#ff6b6b'
        ctx.fill()
      }

      // 标签
      ctx.font = '14px Arial'
      ctx.fillStyle = '#333'
      ctx.fillText('五角星', cx - 25, cy + 120)
      ctx.fillText('双色风车', wheelCx - 30, cy + 120)
    },

    // 5. 剪纸效果
    drawCutOut() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2

      // 使用非零环绕规则绘制镂空圆环
      ctx.beginPath()
      ctx.arc(cx, cy, 80, 0, Math.PI * 2, false)
      ctx.arc(cx, cy, 50, 0, Math.PI * 2, true)
      ctx.fillStyle = 'rgba(255, 107, 107, 0.7)'
      ctx.fill()

      // 添加阴影效果
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 10
      ctx.shadowOffsetY = 10

      // 绘制边框
      ctx.beginPath()
      ctx.arc(cx, cy, 80, 0, Math.PI * 2)
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.shadowColor = 'transparent'

      // 标签
      ctx.font = '14px Arial'
      ctx.fillStyle = '#333'
      ctx.fillText('剪纸效果 - 非零环绕规则', cx - 80, cy + 120)
    },

    // 6. 仪表盘
    drawDashboard() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      const radius = 150

      // 绘制外圈
      ctx.beginPath()
      ctx.arc(cx, cy, radius, Math.PI * 0.8, Math.PI * 2.2)
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 20
      ctx.stroke()

      // 绘制进度
      const value = 75
      const endAngle = Math.PI * 0.8 + (Math.PI * 1.4) * (value / 100)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, Math.PI * 0.8, endAngle)
      const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
      gradient.addColorStop(0, '#4facfe')
      gradient.addColorStop(1, '#00f2fe')
      ctx.strokeStyle = gradient
      ctx.stroke()

      // 绘制刻度
      for (let i = 0; i <= 10; i++) {
        const angle = Math.PI * 0.8 + (Math.PI * 1.4) * (i / 10)
        const innerR = radius - 25
        const outerR = radius - 15
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // 绘制数值
      ctx.font = 'bold 48px Arial'
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${value}%`, cx, cy + 20)

      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.fillText('CPU 使用率', cx, cy + 60)
    },

    // 7. 直线绘制
    drawLine() {
      const ctx = this.ctx
      const canvas = this.$refs.canvas

      this.showControls = true
      this.currentDemo.hasClear = true

      const startDraw = (e) => {
        this.isDragging = true
        const rect = canvas.getBoundingClientRect()
        this.startX = e.clientX - rect.left
        this.startY = e.clientY - rect.top
        this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }

      const draw = (e) => {
        if (!this.isDragging) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        ctx.putImageData(this.imageData, 0, 0)
        ctx.beginPath()
        ctx.moveTo(this.startX, this.startY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      const stopDraw = () => {
        this.isDragging = false
      }

      canvas.addEventListener('mousedown', startDraw)
      canvas.addEventListener('mousemove', draw)
      canvas.addEventListener('mouseup', stopDraw)
      canvas.addEventListener('mouseleave', stopDraw)

      // 绘制提示文字
      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('拖拽鼠标绘制直线', this.canvasWidth / 2, this.canvasHeight / 2)
    },

    // 8. 圆形拖拽
    drawDragCircle() {
      const ctx = this.ctx
      const canvas = this.$refs.canvas
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2

      let circle = { x: cx, y: cy, radius: 50, color: '#4facfe' }
      let isDragging = false
      let offsetX = 0
      let offsetY = 0

      const drawCircle = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
        ctx.fillStyle = circle.color
        ctx.fill()
        ctx.strokeStyle = '#00f2fe'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      const startDrag = (e) => {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const dist = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2)
        if (dist <= circle.radius) {
          isDragging = true
          offsetX = x - circle.x
          offsetY = y - circle.y
          circle.color = '#ff6b6b'
        }
      }

      const drag = (e) => {
        if (!isDragging) return
        const rect = canvas.getBoundingClientRect()
        circle.x = e.clientX - rect.left - offsetX
        circle.y = e.clientY - rect.top - offsetY
        drawCircle()
      }

      const stopDrag = () => {
        isDragging = false
        circle.color = '#4facfe'
        drawCircle()
      }

      canvas.addEventListener('mousedown', startDrag)
      canvas.addEventListener('mousemove', drag)
      canvas.addEventListener('mouseup', stopDrag)
      canvas.addEventListener('mouseleave', stopDrag)

      drawCircle()

      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('拖拽圆形移动位置', this.canvasWidth / 2, this.canvasHeight - 50)
    },

    // 9. 可编辑贝塞尔曲线
    drawEditableBezier() {
      const ctx = this.ctx
      const canvas = this.$refs.canvas

      let points = [
        { x: 100, y: 300, type: 'anchor' },
        { x: 250, y: 100, type: 'control' },
        { x: 400, y: 100, type: 'control' },
        { x: 550, y: 300, type: 'anchor' }
      ]
      let draggingPoint = null

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 绘制控制线
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(points[3].x, points[3].y)
        ctx.lineTo(points[2].x, points[2].y)
        ctx.stroke()
        ctx.setLineDash([])

        // 绘制贝塞尔曲线
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.bezierCurveTo(
          points[1].x, points[1].y,
          points[2].x, points[2].y,
          points[3].x, points[3].y
        )
        ctx.strokeStyle = '#4facfe'
        ctx.lineWidth = 3
        ctx.stroke()

        // 绘制控制点
        points.forEach((point, index) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2)
          ctx.fillStyle = point.type === 'anchor' ? '#ff6b6b' : '#ffd700'
          ctx.fill()
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 2
          ctx.stroke()
        })
      }

      const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect()
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      }

      const onMouseDown = (e) => {
        const pos = getMousePos(e)
        points.forEach((point, index) => {
          const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2)
          if (dist <= 10) {
            draggingPoint = index
          }
        })
      }

      const onMouseMove = (e) => {
        if (draggingPoint === null) return
        const pos = getMousePos(e)
        points[draggingPoint].x = pos.x
        points[draggingPoint].y = pos.y
        draw()
      }

      const onMouseUp = () => {
        draggingPoint = null
      }

      canvas.addEventListener('mousedown', onMouseDown)
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseup', onMouseUp)
      canvas.addEventListener('mouseleave', onMouseUp)

      draw()

      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('拖拽控制点编辑贝塞尔曲线', this.canvasWidth / 2, this.canvasHeight - 50)
    },

    // 10. 电子印章
    drawSeal() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2

      // 绘制外圈
      ctx.beginPath()
      ctx.arc(cx, cy, 120, 0, Math.PI * 2)
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 5
      ctx.stroke()

      // 绘制五角星
      this.draw5Star(ctx, cx, cy, 25, '#dc2626')

      // 绘制文字
      const text = '演示印章'
      ctx.font = 'bold 20px 宋体'
      ctx.textBaseline = 'middle'
      const angleStep = (Math.PI * 2) / (text.length + 1)
      for (let i = 0; i < text.length; i++) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(-Math.PI / 2 + angleStep * (i + 1))
        ctx.translate(-100, 0)
        ctx.rotate(Math.PI / 2)
        ctx.fillStyle = '#dc2626'
        ctx.fillText(text[i], 0, 0)
        ctx.restore()
      }

      // 绘制底部文字
      ctx.font = '16px 宋体'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#dc2626'
      ctx.fillText('电子印章演示', cx, cy + 60)

      // 绘制编号
      const code = '1234567890'
      ctx.font = '12px 宋体'
      const codeAngleStep = (Math.PI * 0.8) / (code.length - 1)
      for (let i = 0; i < code.length; i++) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(Math.PI / 2 - Math.PI * 0.4 + codeAngleStep * i)
        ctx.translate(100, 0)
        ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = '#dc2626'
        ctx.fillText(code[i], 0, 0)
        ctx.restore()
      }
    },

    draw5Star(ctx, cx, cy, radius, color) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-Math.PI / 2)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    },

    // 11. 图片合成
    drawPictureSynthesis() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight

      // 绘制背景渐变
      const gradient = ctx.createLinearGradient(0, 0, w, h)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      // 绘制装饰圆
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, 150, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fill()

      // 绘制边框
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 10
      ctx.strokeRect(50, 50, w - 100, h - 100)

      // 绘制文字水印
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-Math.PI / 4)
      ctx.font = 'bold 48px Arial'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('水印演示', 0, 0)
      ctx.restore()

      // 绘制说明文字
      ctx.font = '20px Arial'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText('图片合成示例', w / 2, h - 80)
      ctx.fillText('包含渐变背景、装饰图形、边框和水印', w / 2, h - 50)
    },

    // 12. 圆角矩形
    drawRadiusShape() {
      const ctx = this.ctx
      const x = 100
      const y = 150
      const w = 600
      const h = 300
      const radius = 30

      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + w - radius, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
      ctx.lineTo(x + w, y + h - radius)
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
      ctx.lineTo(x + radius, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()

      // 填充渐变
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
      gradient.addColorStop(0, '#4facfe')
      gradient.addColorStop(1, '#00f2fe')
      ctx.fillStyle = gradient
      ctx.fill()

      // 描边
      ctx.strokeStyle = '#0d9488'
      ctx.lineWidth = 3
      ctx.stroke()

      // 文字
      ctx.font = '24px Arial'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('圆角矩形', x + w / 2, y + h / 2)
    },

    // 13. 旋转交互
    drawRotateInteractive() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      let angle = 0

      const draw = () => {
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)

        // 绘制矩形
        ctx.fillStyle = '#4facfe'
        ctx.fillRect(-75, -50, 150, 100)

        ctx.restore()

        // 绘制中心圆
        ctx.beginPath()
        ctx.arc(cx, cy, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#333'
        ctx.fill()

        angle += 0.02
        this.animationId = requestAnimationFrame(draw)
      }

      draw()

      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('旋转动画', this.canvasWidth / 2, this.canvasHeight - 50)
    },

    // 14. 太极图
    drawTaiji() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      const radius = 150

      // 白色半圆
      ctx.beginPath()
      ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // 黑色半圆
      ctx.beginPath()
      ctx.arc(cx, cy, radius, Math.PI / 2, -Math.PI / 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // 上方小圆
      ctx.beginPath()
      ctx.arc(cx, cy - radius / 2, radius / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // 下方小圆
      ctx.beginPath()
      ctx.arc(cx, cy + radius / 2, radius / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // 上方黑点
      ctx.beginPath()
      ctx.arc(cx, cy - radius / 2, radius / 6, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // 下方白点
      ctx.beginPath()
      ctx.arc(cx, cy + radius / 2, radius / 6, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // 外圈
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 3
      ctx.stroke()
    },

    // 15. 三维圆周运动
    drawCircularMotion() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      let t = 0

      const draw = () => {
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

        // 绘制轨道
        ctx.beginPath()
        ctx.ellipse(cx, cy, 200, 100, 0, 0, Math.PI * 2)
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])

        // 计算点的位置
        const x = cx + 200 * Math.cos(t)
        const y = cy + 100 * Math.sin(t)
        const z = Math.sin(t)

        // 根据z值调整大小
        const scale = 0.5 + (z + 1) * 0.25
        const size = 20 * scale

        // 绘制点
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
        gradient.addColorStop(0, '#4facfe')
        gradient.addColorStop(1, '#00f2fe')
        ctx.fillStyle = gradient
        ctx.fill()

        // 绘制中心
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#333'
        ctx.fill()

        t += 0.02
        this.animationId = requestAnimationFrame(draw)
      }

      draw()
    },

    // 16. Sin函数图像
    drawSinCurve() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight
      const cy = h / 2

      // 绘制坐标轴
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()

      // 绘制正弦曲线
      ctx.beginPath()
      ctx.strokeStyle = '#4facfe'
      ctx.lineWidth = 3

      for (let x = 0; x < w; x++) {
        const y = cy + Math.sin(x * 0.02) * 100
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 绘制余弦曲线
      ctx.beginPath()
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 3

      for (let x = 0; x < w; x++) {
        const y = cy + Math.cos(x * 0.02) * 100
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 图例
      ctx.font = '16px Arial'
      ctx.fillStyle = '#4facfe'
      ctx.fillText('sin(x)', 50, 50)
      ctx.fillStyle = '#ff6b6b'
      ctx.fillText('cos(x)', 50, 80)
    },

    // 17. 时钟
    drawClock() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      const radius = 200

      const drawClock = () => {
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

        // 绘制表盘
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 5
        ctx.stroke()

        // 绘制刻度
        for (let i = 0; i < 60; i++) {
          const angle = (i * Math.PI) / 30
          const isHour = i % 5 === 0
          const innerR = isHour ? radius - 20 : radius - 10
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
          ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
          ctx.strokeStyle = isHour ? '#333' : '#999'
          ctx.lineWidth = isHour ? 3 : 1
          ctx.stroke()
        }

        // 绘制数字
        ctx.font = 'bold 24px Arial'
        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let i = 1; i <= 12; i++) {
          const angle = (i * Math.PI) / 6 - Math.PI / 2
          const x = cx + Math.cos(angle) * (radius - 40)
          const y = cy + Math.sin(angle) * (radius - 40)
          ctx.fillText(i.toString(), x, y)
        }

        // 获取时间
        const now = new Date()
        const hours = now.getHours() % 12
        const minutes = now.getMinutes()
        const seconds = now.getSeconds()

        // 绘制时针
        const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(hourAngle) * 80, cy + Math.sin(hourAngle) * 80)
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.stroke()

        // 绘制分针
        const minuteAngle = ((minutes + seconds / 60) * Math.PI) / 30 - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(minuteAngle) * 120, cy + Math.sin(minuteAngle) * 120)
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 5
        ctx.stroke()

        // 绘制秒针
        const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(secondAngle) * 150, cy + Math.sin(secondAngle) * 150)
        ctx.strokeStyle = '#dc2626'
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制中心圆
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#dc2626'
        ctx.fill()

        this.animationId = requestAnimationFrame(drawClock)
      }

      drawClock()
    },

    // 18. 弧形文字
    drawCircularText() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      const radius = 150

      const text = 'Canvas 弧形文字演示'

      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const angleStep = Math.PI / (text.length + 2)
      const startAngle = -Math.PI / 2 - angleStep * (text.length - 1) / 2

      for (let i = 0; i < text.length; i++) {
        const angle = startAngle + angleStep * i
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle + Math.PI / 2)
        ctx.fillStyle = '#4facfe'
        ctx.fillText(text[i], 0, 0)
        ctx.restore()
      }

      // 绘制圆圈作为参考
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
    },

    // 19. 蚂蚁线
    drawDashedLine() {
      const ctx = this.ctx
      const cx = this.canvasWidth / 2
      const cy = this.canvasHeight / 2
      let offset = 0

      const draw = () => {
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

        // 绘制矩形边框
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 10])
        ctx.lineDashOffset = offset

        ctx.strokeRect(cx - 200, cy - 100, 400, 200)

        ctx.setLineDash([])

        offset -= 1
        this.animationId = requestAnimationFrame(draw)
      }

      draw()

      ctx.font = '16px Arial'
      ctx.fillStyle = '#999'
      ctx.textAlign = 'center'
      ctx.fillText('蚂蚁线动画效果', this.canvasWidth / 2, this.canvasHeight - 50)
    },

    // 20. 拓扑图
    drawTopologyMap() {
      const ctx = this.ctx
      const w = this.canvasWidth
      const h = this.canvasHeight

      // 定义节点
      const nodes = [
        { x: w / 2, y: 100, label: '根节点' },
        { x: w / 4, y: 250, label: '子节点1' },
        { x: w * 3 / 4, y: 250, label: '子节点2' },
        { x: w / 6, y: 400, label: '叶子1' },
        { x: w / 3, y: 400, label: '叶子2' },
        { x: w * 2 / 3, y: 400, label: '叶子3' },
        { x: w * 5 / 6, y: 400, label: '叶子4' }
      ]

      // 定义连接关系
      const edges = [
        [0, 1], [0, 2],
        [1, 3], [1, 4],
        [2, 5], [2, 6]
      ]

      // 绘制连线
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 2

      edges.forEach(([from, to]) => {
        ctx.beginPath()
        ctx.moveTo(nodes[from].x, nodes[from].y)
        ctx.lineTo(nodes[to].x, nodes[to].y)
        ctx.stroke()

        // 绘制箭头
        const angle = Math.atan2(nodes[to].y - nodes[from].y, nodes[to].x - nodes[from].x)
        ctx.save()
        ctx.translate(nodes[to].x, nodes[to].y)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(-10, -5)
        ctx.lineTo(0, 0)
        ctx.lineTo(-10, 5)
        ctx.fillStyle = '#999'
        ctx.fill()
        ctx.restore()
      })

      // 绘制节点
      nodes.forEach((node, index) => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, index === 0 ? 35 : 30, 0, Math.PI * 2)

        // 根节点用不同颜色
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 30)
        if (index === 0) {
          gradient.addColorStop(0, '#ffd700')
          gradient.addColorStop(1, '#ff8c00')
        } else {
          gradient.addColorStop(0, '#4facfe')
          gradient.addColorStop(1, '#00f2fe')
        }
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.strokeStyle = '#333'
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制标签
        ctx.font = 'bold 14px Arial'
        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.canvas-demo-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;

  .demo-layout {
    display: flex;
    height: 100%;

    .sidebar {
      width: 280px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);

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

      .menu-list::-webkit-scrollbar {
        width: 6px;
      }

      .menu-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
      }

      .menu-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }
    }

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

      .canvas-wrapper {
        flex: 1;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        position: relative;

        canvas {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          max-width: 100%;
          max-height: 100%;
        }

        .controls {
          position: absolute;
          bottom: 30px;
          display: flex;
          gap: 10px;

          button {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            &:active {
              transform: translateY(0);
            }
          }
        }
      }
    }
  }
}
</style>
