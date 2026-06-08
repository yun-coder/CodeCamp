<!--
 @description 可以多选的下拉框
 @author yunLiang
 @date 2025/12/23 9:26
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref, watchEffect } from 'vue'
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
  // 是否显示下拉小箭头
  isShowArrow: {
    type: Boolean,
    default: true
  },
  // 是否多选
  isMultiSelect: {
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
    default: 2
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
    default: 1
  }
})

const optionList = ref([])
const selectPage = ref(1)
// 设置值
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

// emit
const emit = defineEmits([
  'update:modelValue',
  'change',
  'blur',
  'dropDownVisible',
  'mouseenter',
  'mouseleave',
  'selCheckPopupScroll',
  'search'
])
// 搜索
const filterOption = (input, option) =>
  option[props.fieldNames.label].toLowerCase().includes(input.toLowerCase())

// 下拉列表滚动时的回调
const handlePopupScroll = value => {
  if (props.isScroll && isScrollAtBottom(value.target)) {
    selectPage.value += 1
    if (selectPage.value <= props.total) {
      emit('selPopupScroll', selectPage.value)
    }
  }
}
// 判断是否滚动到底部
const isScrollAtBottom = ({ scrollHeight, scrollTop, clientHeight }) =>
  scrollHeight - scrollTop === clientHeight

// 判断是否已选中
const isChecked = value => {
  if (!modelValue.value) return false
  if (Array.isArray(modelValue.value)) {
    return modelValue.value.includes(value)
  }
  return false
}

// 处理复选框 change 事件
const handleCheck = (e, value) => {
  const checked = e.target.checked
  let newValue = [...(modelValue.value || [])]

  if (checked) {
    if (!newValue.includes(value)) {
      newValue.push(value)
    }
  } else {
    newValue = newValue.filter(v => v !== value)
  }

  emit('update:modelValue', newValue)
}

const handleLabelClick = value => {
  let newValue = [...(modelValue.value || [])]
  const isCheck = !isChecked(value)
  if (isCheck) {
    if (!newValue.includes(value)) {
      newValue.push(value)
    }
  } else {
    newValue = newValue.filter(v => v !== value)
  }

  emit('update:modelValue', newValue)
}

// 搜索
const search = XEUtils.throttle(event => {
  emit('search', event)
}, 500)
</script>

<template>
  <a-select
    class="zz-select-check"
    v-bind="$attrs"
    v-model:value="modelValue"
    :placeholder="placeholder"
    :allowClear="allowClear"
    :size="size"
    :autofocus="isAutofocus"
    :bordered="isBordered"
    :disabled="isDisabled"
    :defaultActiveFirstOption="isDefaultActiveFirstOption"
    :mode="isMultiSelect ? 'multiple' : 'combobox'"
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
    :options="optionList"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
    @dropdownVisibleChange="$emit('dropDownVisible', $event)"
    @mouseenter="$emit('mouseenter', $event)"
    @mouseleave="$emit('mouseleave', $event)"
    @search="search"
    @popupScroll="handlePopupScroll"
  >
    <template v-if="isMultiSelect" #option="{ value: value, label, other, disabled, enableFlag }">
      <a-checkbox
        :checked="isChecked(value)"
        :disabled="disabled"
        @click.stop
        @change="e => handleCheck(e, value)"
      >
        <div class="select-label" @click.stop @click.prevent.stop="handleLabelClick(value)">
          <template v-if="(enableFlag ?? true) === false">
            <div class="status" title="已离职">
              {{ enableFlag ? '' : '离职' }}
            </div></template
          >
          {{ label }}
        </div>
      </a-checkbox>
      <span v-if="other" role="img" :aria-label="label"> - {{ other }}</span>
    </template>
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-select>
</template>

<style scoped>
.zz-select-check {
  width: 100%;
}
.select-label {
  display: flex;
}
.status {
  width: 40px;
  height: 24px;
  background: #e8f3ff;
  color: #7691bc;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 6px;
}
</style>
