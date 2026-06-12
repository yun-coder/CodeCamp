# Vision FX

一个干净的本地 Web 视觉识别特效 demo，只保留两个核心页面：

- **手势识别 · Reality Curtain**：使用 MediaPipe Gesture Recognizer 识别捏合手势，驱动 p5.js 物理幕布，把摄像头画面像现实表皮一样拉开，露出隐藏的图片或视频。
- **面部识别 · Lip FX**：使用 MediaPipe Face Landmarker 输出人脸网格和 blendshape，识别张嘴、微笑、嘟嘴、漏斗嘴等嘴唇动作，并渲染声波、唇线、粒子、旋涡等特效。

## 运行

推荐使用项目自带服务，服务会补上 MediaPipe WASM 需要的跨源隔离响应头：

```powershell
python -B server.py
```

然后打开：

```text
http://127.0.0.1:8765
```

如果缺少本地依赖或资源，可重新下载：

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

## 项目结构

```text
.
├─ index.html
├─ styles.css
├─ app.js
├─ server.py
├─ setup.ps1
├─ assets/
│  ├─ p5.min.js
│  └─ lootai/
│     ├─ curtain-cover.jpg
│     └─ curtain-showcase.mp4
├─ models/
│  ├─ gesture_recognizer.task
│  └─ face_landmarker.task
└─ wasm/
   └─ MediaPipe Tasks Vision runtime files
```

## 技术支撑

- **MediaPipe Tasks Vision 0.10.x**  
  负责端侧视觉推理，项目使用 `GestureRecognizer` 和 `FaceLandmarker` 两个任务。

- **Gesture Recognizer model**  
  本地模型文件：`models/gesture_recognizer.task`。用于识别手势类别和手部关键点，当前主要使用拇指/食指捏合位置控制幕布。

- **Face Landmarker model**  
  本地模型文件：`models/face_landmarker.task`。用于输出人脸 landmarks 与 blendshape。Lip FX 使用 `jawOpen`、`mouthSmileLeft/Right`、`mouthPucker`、`mouthFunnel` 等表情系数。

- **p5.js 1.9.0**  
  本地文件：`assets/p5.min.js`。用于 Reality Curtain 的持续动画循环、画布管理和交互绘制。

- **Verlet cloth physics**  
  手势页使用点和约束边组成布料网格，通过惯性、约束迭代、固定顶边、捏合拖拽和上甩释放模拟幕布。

- **Canvas 2D**  
  面部页使用原生 Canvas 2D 绘制实时视频层、面部网格、唇线、粒子、声波、旋涡和渐变光带。

- **本地静态服务 + COOP/COEP**  
  `server.py` 基于 Python `http.server`，额外添加 `Cross-Origin-Opener-Policy` 和 `Cross-Origin-Embedder-Policy`，保证 MediaPipe WASM 更稳定地加载。

## 设计参考

- LootAI 作品：`hide the ocean inside reality`  
  参考地址：`https://www.lootai.net/work/c3emubelct5znyp5`  
  已保留运行所需参考素材：`assets/lootai/curtain-cover.jpg`、`assets/lootai/curtain-showcase.mp4`。

- UI/UX Pro Max 设计方向  
  采用深色高对比 AI 工具界面、清晰的双 tab 导航、紧凑的信息面板、明确的状态反馈和不依赖说明文字的直接操作控件。

## 清理说明

当前项目已移除：

- 多余 MediaPipe 模型
- `node_modules`
- npm/pnpm lock 文件
- IDE/Claude 本地配置目录
- 临时抓取 HTML 和服务日志

保留内容均为运行两个页面所需的源码、模型、WASM 运行时、本地素材和下载脚本。
