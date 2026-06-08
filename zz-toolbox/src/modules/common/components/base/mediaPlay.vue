<!--
 @description 
 @author yunLiang
 @date 2025/12/23 9:52
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
const props = defineProps({
  // 文件数据
  paramsData: {
    type: [Object, Array]
  }
})
</script>

<template>
  <div class="zz-medioPlay">
    <video controls height="100%" width="100%">
      <source :src="paramsData.fileList.url" />
      您的浏览器不支持视频播放
    </video>
  </div>
</template>

<style scoped>
.zz-medioPlay {
  width: 100%;
  height: calc(100% - 20px);
}
</style>
