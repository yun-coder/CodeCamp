### ✅ `src/utils/stampSplitter.js`
- 独立的骑缝章切割工具类
- 包含4个静态方法：
  - `calculateSplitParams()` - 计算切割参数
  - `createSVGElement()` - 创建SVG DOM元素
  - `createSVGString()` - 创建SVG HTML字符串
  - `createPreviewImage()` - 生成预览图片（Canvas转base64）

## 使用示例

### 在打印设计器中使用（自动）
```javascript
// 用户在骑缝章配置面板中：
// 1. 上传印章图片
// 2. 设置参数（位置、尺寸、切割页数）
// 3. 点击"应用骑缝章"
// → 自动生成并显示切割预览
```

### 在其他地方使用 StampSplitter（手动）
```javascript
import { StampSplitter } from '@utils/stampSplitter.js';

// 计算切割参数
const params = StampSplitter.calculateSplitParams({
  stampWidth: 40,
  stampHeight: 40,
  pageIndex: 0,
  totalPages: 2,
  paperWidth: 210,
  paperHeight: 297,
  position: 'middle'
});

// 生成预览图片
const preview = await StampSplitter.createPreviewImage(
  imageUrl, 
  params, 
  { width: 40, height: 40 }
);
```

