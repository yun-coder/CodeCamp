# 照片文件夹说明

请将您的照片放到这个文件夹中，然后修改 `src/components/ProposalPage.vue` 文件。

## 修改照片的方法

1. **将照片放到此文件夹**
   - 将您的照片重命名为 `photo1.jpg`, `photo2.jpg`, `photo3.jpg` 等
   - 或者使用您自己的命名方式

2. **修改代码中的照片链接**
   在 `src/components/ProposalPage.vue` 文件中，找到 `photos` 数组：
   ```javascript
   photos: [
     '/images/photo1.jpg',      // 替换为您的照片
     '/images/photo2.jpg',      // 替换为您的照片
     '/images/photo3.jpg',      // 替换为您的照片
     // ... 添加更多照片
   ],
   ```

3. **支持的图片格式**
   - JPG
   - JPEG
   - PNG
   - GIF
   - WebP

4. **建议的照片尺寸**
   - 宽度：1200px 或更大
   - 高度：800px 或更大
   - 宽高比：3:2 或 16:9

5. **调整轮播速度**
   修改 `autoPlayDelay` 值（单位：毫秒）
   ```javascript
   autoPlayDelay: 3000  // 3秒切换一次
   ```

## 示例

```javascript
photos: [
  '/images/我们的第一次约会.jpg',
  '/images/生日派对.jpg',
  '/images/旅行纪念.jpg',
  '/images/生活点滴.jpg',
  '/images/最美好的回忆.jpg'
]
```

完成修改后，刷新页面即可看到您的照片！
