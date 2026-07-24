<script setup lang='ts'>
import { onMounted, ref } from 'vue'

const url = ref<string>()

onMounted(() => {
  url.value = '/example/word.docx'
})
</script>
<template>
  <div class='simple-view'>
    <file-viewer :url="url" />
  </div>
</template>

<style scoped>
.simple-view {
  height: 100vh;
}
</style>
