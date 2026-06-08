<!--
 @description 日期选择器
 @author yunLiang
 @date 2025/12/23 9:26
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

// 强制设置 locale
if (dayjs.locale() !== 'zh-cn') {
  dayjs.locale('zh-cn')
}

const props = defineProps({
  // 是否清除
  allowClear: {
    type: Boolean,
    default: true
  },
  // 占位符
  placeholder: {
    type: String,
    default: '请输入'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 格式化
  format: {
    type: String,
    default: 'YYYY-MM-DD HH:mm'
  }
})

const emit = defineEmits(['change', 'blur'])

const modelValue = defineModel()
</script>

<template>
  <a-config-provider :locale="zhCN">
    <a-date-picker
      v-model:value="modelValue"
      :placeholder="placeholder"
      :allowClear="allowClear"
      :disabled="disabled"
      :format="format"
      :value-format="format"
      style="width: 100%"
      @change="$emit('change', $event)"
      @blur="$emit('blur', $event)"
    />
  </a-config-provider>
</template>

<style scoped></style>
