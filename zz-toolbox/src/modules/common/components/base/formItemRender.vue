<!--
 @description 表单搜索渲染器
 @author yunLiang
 @date 2025/12/22 16:55
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { computed } from 'vue'
import Input from './input.vue'
import InputNum from './inputNum.vue'
import InputNeg from './inputNeg.vue'
import InputFloat from './inputFloat.vue'
import RangePicker from './rangePicker.vue'
import YearPicker from './yearPicker.vue'
import MonthPicker from './monthPicker.vue'
import TimePicker from './timePicker.vue'
import DatePicker from './datePicker.vue'
import BothTimePicker from './bothTimePicker.vue'
import Select from './select.vue'
import SelectCheck from './selectCheck.vue'
import SelectTree from './selectTree.vue'
import Upload from './upload.vue'
import UserSelect from './userSelect.vue'
import UserGroupSelect from './userGroupSelect.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  formState: {
    type: Object,
    required: true
  },
  rowSpan: {
    type: Number
  }
})

const currentComponent = computed(() => {
  switch (props.item.type) {
    case 'input':
      return Input
    case 'inputNum':
      return InputNum
    case 'inputNeg':
      return InputNeg
    case 'inputFloat':
      return InputFloat
    case 'rangePicker':
      return RangePicker
    case 'datePicker':
      return DatePicker
    case 'yearPicker':
      return YearPicker
    case 'monthPicker':
      return MonthPicker
    case 'timePicker':
      return TimePicker
    case 'bothTimePicker':
      return BothTimePicker
    case 'select':
      return Select
    case 'selectCheckbox':
      return SelectCheck
    case 'userSelect':
      return UserSelect
    case 'userGroup':
      return UserGroupSelect
    case 'selectTree':
      return SelectTree
    case 'upload':
      return Upload
    default:
      return ''
  }
})
</script>

<template>
  <a-col :span="rowSpan">
    <a-form-item
      :label="item.label"
      :name="item.prop"
      :rules="item.rules"
      :help="item.help"
      :extra="item.extra"
      :tooltip="item.tooltip"
    >
      <component
        :is="currentComponent"
        v-model="formState[item.prop]"
        v-bind="item.props || {}"
        v-on="item.events || {}"
      ></component>
    </a-form-item>
  </a-col>
</template>

<style scoped></style>
