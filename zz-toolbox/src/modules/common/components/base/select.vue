<!--
 @description 下拉选择器
 @author yunLiang
 @date 2025/12/23 9:26
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref, computed, watchEffect } from 'vue'
import XEUtils from 'xe-utils'

const props = defineProps({
  // 数据源
  options: {
    type: Array,
    default: () => []
  },
  // 是否支持清除
  allowClear: {
    type: Boolean,
    default: true
  },
  // 是否默认获取焦点
  isAutofocus: {
    type: Boolean,
    default: false
  },
  // 是否有边框
  isBordered: {
    type: Boolean,
    default: true
  },
  // 是否默认高亮第一个选项
  isDefaultActiveFirstOption: {
    type: Boolean,
    default: true
  },
  // 是否禁用
  isDisabled: {
    type: Boolean,
    default: false
  },
  // 是否多选或标签
  isMultiSelect: {
    type: Boolean,
    default: false
  },
  // 是否显示下拉小箭头
  isShowArrow: {
    type: Boolean,
    default: true
  },
  // 是否可搜索
  isShowSearch: {
    type: Boolean,
    default: true
  },
  // 是否把label 包装到 value
  isLabelInValue: {
    type: Boolean,
    default: false
  },
  // 自定义节点 label、value、options 的字段
  fieldNames: {
    type: Object,
    default: { label: 'label', value: 'value', options: 'options' }
  },
  // getPopupContainer 定位
  getPopupContainer: {
    type: Function,
    default: triggerNode => triggerNode.parentNode
  },
  // 设置弹窗滚动高度
  listHeight: {
    type: Number,
    default: 256
  },
  // 最多显示多少个tag
  maxTagCount: {
    type: Number,
    default: 10
  },
  // 选择框默认文字
  placeholder: {
    type: String,
    default: '请选择'
  },
  // 选择框弹出的位置
  placement: {
    type: String,
    default: 'bottomLeft'
  },
  // 选择框大小
  size: {
    type: String,
    default: 'default'
  },
  // 设置校验状态
  status: {
    type: String,
    default: ''
  },
  // 指定回显属性
  optionLabelProp: {
    type: String,
    default: ''
  },
  // 是否隐藏已选择项
  isChooseOption: {
    type: Boolean,
    default: false
  },
  // 是否滚动分页
  isScroll: {
    type: Boolean,
    default: false
  },
  // 滚动分页total
  total: {
    type: Number,
    default: 0
  }
})

const optionList = ref([])
const selectPage = ref(1)
const modelValue = defineModel()

// 处理定义字段
watchEffect(() => {
  if (props.options && props.options.length > 0) {
    optionList.value = props.options.map(item => ({
      label: item[props.fieldNames.label],
      value: item[props.fieldNames.value],
      ...item
    }))

    if (modelValue.value !== undefined) {
      const validVal = isValidOption(modelValue.value, optionList.value)
      if (validVal === undefined) {
        modelValue.value = undefined
      }
    }
  }
})

// 判断回填数据在集合中是否存在
function isValidOption(modelValue, optionList) {
  if (Object.prototype.toString.call(modelValue) === '[object Object]') {
    return optionList.some(item => item.value === modelValue.value) ? modelValue : undefined
  }

  if (Array.isArray(modelValue)) {
    const validValues = modelValue.filter(val => optionList.some(item => item.value === val))
    return validValues.length > 0 ? validValues : undefined
  }

  return optionList.some(item => item.value === modelValue) ? modelValue : undefined
}

// 是否隐藏已选择项
const filteredOptions = computed(() => {
  if (props.isMultiSelect && props.isChooseOption && Array.isArray(modelValue.value)) {
    const modelValues = modelValue.value.map(v => v.value ?? v) // 兼容对象和字符串/数字
    return optionList.value.filter(option => !modelValues.includes(option.value))
  }
  return optionList.value
})
// emit
const emit = defineEmits([
  'update:modelValue',
  'change',
  'blur',
  'dropDownVisible',
  'mouseenter',
  'mouseleave',
  'search',
  'selPopupScroll'
])
// 搜索
const filterOption = (input, option) => {
  return option[props.fieldNames.label].toLowerCase().includes(input.toLowerCase())
}

// 下拉列表滚动时的回调
const handlePopupScroll = value => {
  if (props.isScroll && isScrollAtBottom(value.target)) {
    selectPage.value += 1
    if (selectPage.value <= props.total) {
      emit('selPopupScroll', selectPage.value)
    }
  }
}

// 搜索
const search = XEUtils.throttle(event => {
  emit('search', event)
}, 800)

// 判断是否滚动到底部
const isScrollAtBottom = ({ scrollHeight, scrollTop, clientHeight }) =>
  scrollHeight - scrollTop === clientHeight
</script>

<template>
  <a-select
    class="zz-select"
    v-bind="$attrs"
    v-model:value="modelValue"
    :placeholder="placeholder"
    :allowClear="allowClear"
    :size="size"
    :autofocus="isAutofocus"
    :bordered="isBordered"
    :disabled="isDisabled"
    :defaultActiveFirstOption="isDefaultActiveFirstOption"
    :mode="isMultiSelect ? 'multiple' : 'default'"
    :showArrow="isShowArrow"
    :showSearch="isShowSearch"
    :labelInValue="isLabelInValue"
    :fieldNames="fieldNames"
    :getPopupContainer="getPopupContainer"
    :listHeight="listHeight"
    :maxTagCount="maxTagCount"
    :placement="placement"
    :status="status"
    :filter-option="filterOption"
    :options="filteredOptions"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
    @dropdownVisibleChange="$emit('dropDownVisible', $event)"
    @mouseenter="$emit('mouseenter', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @search="search"
    @popupScroll="handlePopupScroll"
  >
    <template v-if="optionLabelProp" #option="{ value: val, label, other }">
      {{ label }}
      <span v-if="other" role="img" :aria-label="label"> - {{ other }}</span>
    </template>
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-select>
</template>

<style scoped>
.zz-select {
  width: 100%;
}
</style>
