<!--
  文件描述：fabric 仿照微信截屏
  创建时间：2023/3/31 15:06
  创建人：yunliang
-->
<template>
  <div class="canBox">
    <div class="top-row">
      <div>
        <div class="left-border">
          <div class="left-p">
            <p>
              1.点击“开始绘画”裁剪票据<br>
              2.长按鼠标左键并移动鼠标绘制票据框<br>
              3.双击票据框编辑票据字段并退出绘画模式<br>
              4.点击“退出绘画”按钮退出绘画模式<br>
            </p>
          </div>
          <div class="right-p">
            <button
              :type="currentType == 'free' ? 'primary' : 'success'"
              class="icon"
              :class="currentType == 'free' ? 'el-icon-edit' : 'el-icon-s-release'"
              @click="addRect"
            >
              {{ currentType == 'free' ? '开始绘画' : '退出绘画' }}
            </button>
            <button
              v-show="painting"
              type="info"
              class="icon el-icon-back"
              @click="backBefore"
            >
              撤销
            </button>
            <button
              type="danger"
              class="icon el-icon-delete"
              @click="clearAll"
            >
              全部清除
            </button>
            <button type="primary" class="icon el-icon-finished" @click="saveAll"> 保存</button>
          </div>
        </div>
      </div>
    </div>
    <canvas id="canvasDemo" width="1400" height="800"/>
  </div>
</template>

<script>
  import { fabric } from 'fabric'

  export default {
    name: "fabricPage",
    props: {
      imgUrl: {
        type: String
      },
    },
    data() {
      return {
        // 画图参数
        temp: {
          id: '',
          billId: '',
          drawName: '',
          billFieldId: '',
          xAxis: '',
          yAxis: '',
          height: '',
          width: ''
        },
        drawer: false,
        bg: false,
        CA: null,
        bigCA: null,
        fieldList: [],
        operate_data: [],
        selectObj: {},
        // TODO 画图
        mouseFrom: {},
        mouseTo: {},
        drawingObject: null,
        currentType: 'free',
        infos: {},
        moving: false,
        painting: false,
      }
    },
    mounted() {
      this.startDraw();
    },
    methods: {
      startDraw() {
        this.selectObj = {}
        this.operate_data = []
        this.drawer = false
        this.$nextTick(() => {
          this.canvasInit()
          // this.getDrawList()
          this.initEvent()
        })
      },
      canvasInit() {
        let _that = this
        this.CA = new fabric.Canvas('canvasDemo', {
          width: 1400,
          height: 800
        })
        this.CA.getObjects().map(item => {
          this.CA.remove(item)
        })
        fabric.Object.prototype.objectCaching = false
        fabric.Object.prototype.statefullCache = true
        fabric.Object.prototype.toObject = (function (toObject) {
          return function () {
            return fabric.util.object.extend(toObject.call(this), {
              drawName: '',
              billFieldId: '',
              bid: ''
            })
          }
        })(fabric.Object.prototype.toObject)
        new fabric.Image.fromURL(
          _that.imgUrl,
          (img) => {
            // const fullscreenLoading = loading()
            if (img.width > img.height) {
              let imgHeight = this.CA.width * img.height / this.CA.height
              img.set({
                scaleX: this.CA.width / imgHeight,
                scaleY: this.CA.height / img.height,
                left: this.CA.width / 2,
                originX: 'center'
              })
            }
            if (img.width == img.height) {
              img.set({
                scaleY: this.CA.height / img.width,
                scaleX: this.CA.height / img.width,
                left: this.CA.width / 2,
                originX: 'center'
              })
            }
            if (img.width < img.height) {
              let imgWidth = this.CA.width * img.height / this.CA.height
              img.set({
                scaleX: this.CA.width / imgWidth,
                scaleY: this.CA.height / img.height,
                left: this.CA.width / 2,
                originX: 'center'
              })
            }
            // 设置背景
            this.CA.isDrawingMode = false
            this.CA.setBackgroundImage(img, (() => {
              this.CA.renderAll()
              // closeLoading(fullscreenLoading)
            }).bind(this.CA))
          }
        )
      },
      initEvent() {
        this.CA.on('mouse:down', (options) => {
          if (options.target === null) {
            if (!this.painting) {
              this.moving = true
              this.CA.selection = false
            } else {
              this.moving = false
              this.mouseFrom.x = options.absolutePointer.x
              this.mouseFrom.y = options.absolutePointer.y
              this.painting = true
              this.addRect()
            }
          } else {
            this.CA.selection = true
            this.currentType = 'free'
            options.target.selectable = true
            this.CA.setActiveObject(options.target)
          }
        })
        this.CA.on('mouse:move', (options) => {
          if (options.target === null && !this.painting) {
            if (this.moving && options.e) {
              let delta = new fabric.Point(options.e.movementX, options.e.movementY)
              this.CA.relativePan(delta)
            }
          } else {
            this.mouseTo.x = options.absolutePointer.x
            this.mouseTo.y = options.absolutePointer.y
            if (this.currentType === 'rect') {
              this.initRect()
            }
          }
        })
        this.CA.on('mouse:up', (options) => {
          if (options.target === null) {
            this.moving = false
          } else {
            this.mouseTo.x = options.absolutePointer.x
            this.mouseTo.y = options.absolutePointer.y
            if (this.drawingObject != null) {
              this.operate_data.push(this.drawingObject)
            }
            this.drawingObject = null
            this.resetMove()
          }
        })
        this.CA.on('mouse:out', (e) => {
          this.moving = false
        })
        this.CA.on('mouse:wheel', (e) => {
          let zoom = (e.e.deltaY > 0 ? -0.1 : 0.1) + this.CA.getZoom()
          zoom = Math.max(0.5, zoom)
          zoom = Math.min(3, zoom)
          const zoomPoint = new fabric.Point(e.pointer.x, e.pointer.y)
          this.CA.zoomToPoint(zoomPoint, zoom)
        })
        this.CA.on('mouse:dblclick', (e) => {
          if (e.target === null) return
          this.resetTemp()
          if (e.target.drawName) this.temp.drawName = e.target.drawName
          if (e.target.billFieldId) this.temp.billFieldId = e.target.billFieldId
          this.selectObj = e.target
          this.drawer = true
        })
        this.CA.on('selection:updated', (e) => {
          this.selectObj = e.target
          this.resetTemp()
          if (e.target.drawName) this.temp.drawName = e.target.drawName
          if (e.target.billFieldId) this.temp.billFieldId = e.target.billFieldId
        })
        this.CA.on('object:modified', (e) => {
          this.selectObj = e.target
          this.resetTemp()
          if (e.target.drawName) this.temp.drawName = e.target.drawName
          if (e.target.billFieldId) this.temp.billFieldId = e.target.billFieldId
        })
        this.CA.on('selection:cleared', (e) => {
          this.drawer = false
        })
      },
      addRect(e) {
        if (this.painting && e) {
          this.painting = false
          this.currentType = 'free'
          this.resetTemp()
          this.resetMove()
        } else {
          this.currentType = 'rect'
          this.painting = true
          this.moving = false
          this.CA.selection = false
          this.initRect()
        }
      },
      resetMove() {
        this.mouseFrom = {}
        this.mouseTo = {}
      },
      initRect() {
        let left = this.mouseFrom.x
        let top = this.mouseFrom.y
        let width = this.mouseTo.x - this.mouseFrom.x
        let height = this.mouseTo.y - this.mouseFrom.y
        if (width > 0 && height > 0) {
          let canvasObject = new fabric.Rect({
            left: left,
            top: top,
            width: width,
            height: height,
            stroke: 'red',
            fill: 'rgba(255, 255, 255, 0)',
            hasRotatingPoint: false,
            strokeWidth: 3,
            strokeUniform: true,
            drawName: '',
            billFieldId: '',
            bid: ''
          })
          canvasObject.setControlsVisibility({mtr: false})
          this.toggleDrawingObject(canvasObject)
          this.CA.setActiveObject(canvasObject)
        }
      },
      toggleDrawingObject(canvasObject) {
        this.CA.isDrawingMode = false
        this.CA.selection = false
        canvasObject.selectable = true
        if (this.drawingObject) {
          this.CA.remove(this.drawingObject)
        }
        this.CA.add(canvasObject)
        this.drawingObject = canvasObject
      },
      // todo 撤销
      backBefore() {
        if (this.operate_data.length > 1) {
          this.CA.remove(this.operate_data[this.operate_data.length - 1])
          this.operate_data.splice(this.operate_data.length - 1, 1)
        } else {
          this.CA.remove(this.operate_data[0])
          this.operate_data = []
        }
        this.CA.renderAll()
      },
      // todo 单个删除
      deleteBillFiled() {
        if (this.selectObj.bid !== '') {
          this.drawer = false
          this.CA.remove(this.selectObj)
          this.CA.renderAll()
        } else {
          this.CA.remove(this.selectObj)
          this.CA.renderAll()
        }
      },
      // todo 全部清除
      clearAll() {
        let objLen = this.CA.getObjects().length
        if (objLen > 0) {
          this.operate_data.forEach((v, k) => {
            this.operate_data.splice(k - 1, 1)
          })
          this.CA.getObjects().forEach((v) => {
            this.CA.remove(v)
          })
        }
      },
      // todo 全部保存
      saveAll() {
        this.painting = false
        this.currentType = 'free'
        this.resetMove()
        let flag = true
        let CAObj = this.CA.getObjects()
        CAObj.forEach((v) => {
          if (v.drawName == '' && v.billFieldId == '') {
            // 选中/聚焦绘制矩形
            v.selectable = true
            this.CA.selection = true
            this.CA.setActiveObject(v).renderAll()

            // 显示编辑
            this.resetTemp()
            if (v.drawName) this.temp.drawName = v.drawName
            if (v.billFieldId) this.temp.billFieldId = v.billFieldId
            this.selectObj = v
            this.drawer = true
            flag = false
            return
          }
        })

        if (flag == false) {
          // this.$message({
          //   message: '请将需要的信息填写完整',
          //   type: 'warning'
          // })
        } else {
          const arr = []
          CAObj.forEach((v, k) => {
            if (v.hasOwnProperty('billFieldId')) {
              arr.push({
                id: v.bid ? v.bid : '',
                billId: this.infos.id,
                drawName: v.drawName,
                billFieldId: v.billFieldId,
                xAxis: parseFloat(v.left).toFixed(2),
                yAxis: parseFloat(v.top).toFixed(2),
                height: parseFloat(v.aCoords.bl.y - v.aCoords.tl.y - 3).toFixed(2),
                width: parseFloat(v.aCoords.tr.x - v.aCoords.tl.x - 3).toFixed(2)
              })
            }
          })
          // const params = {
          //   billId: this.infos.id,
          //   billDrawList: arr
          // }
          CAObj.forEach((v) => {
            this.CA.remove(v)
          })
          this.operate_data = []
        }
      },
      resetTemp() {
        this.temp = {
          id: '',
          billId: '',
          drawName: '',
          billFieldId: '',
          xAxis: '',
          yAxis: '',
          height: '',
          width: ''
        }
      },
      // todo 获取数据源
      getDrawList() {
        let that = this
        fabric.Object.prototype.toObject = (function (toObject) {
          return function () {
            return fabric.util.object.extend(toObject.call(this), {
              drawName: '',
              billFieldId: '',
              bid: ''
            })
          }
        })(fabric.Object.prototype.toObject)
        const data = [];
        // data 项目实际使用时为接口数据
        data.forEach((v) => {
          let canvasObject = new fabric.Rect({
            left: parseFloat(v.xAxis),
            top: parseFloat(v.yAxis),
            width: parseFloat(v.width),
            height: parseFloat(v.height),
            stroke: 'red',
            fill: 'rgba(255, 255, 255, 0)',
            strokeWidth: 3,
            drawName: v.drawName,
            billFieldId: v.billFieldId,
            bid: v.id,
            strokeUniform: true
          })
          // 隐藏旋转点
          canvasObject.setControlsVisibility({mtr: false})
          that.CA.add(canvasObject)
        })
        this.CA.renderAll()
      },
    }
  }
</script>

<style scoped>
  .canBox {
    width: 1400px;
    height: 800px;
  }

  .top-row {
    text-align: left;
  }
</style>
