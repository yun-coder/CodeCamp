<!--
 @description excel和word预览 后期考虑让后端返回预览地址-金山文档
 @author yunLiang
 @date 2025/12/23 9:52
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->

<script setup>
import VueOfficeExcel from '@vue-office/excel'
import '@vue-office/excel/lib/index.css'
import VueOfficeDocx from '@vue-office/docx'
import '@vue-office/docx/lib/index.css'

const props = defineProps({
  // 文件类型
  fileType: {
    type: String
  },
  // 文件地址
  fileUrl: {
    type: String
  }
})
</script>

<template>
  <div class="zz-vueOffice">
    <vue-office-excel :src="fileUrl" class="office" v-if="fileType === 'xlsx'"></vue-office-excel>
    <vue-office-docx :src="fileUrl" class="office" v-if="fileType === 'word'"></vue-office-docx>
  </div>
</template>

<style scoped>
.zz-vueOffice {
  width: 100%;
  height: 100%;

  .office {
    width: 100%;
    height: 100%;
  }
}
</style>
