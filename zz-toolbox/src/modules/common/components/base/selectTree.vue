<!--
 @description 树形下拉
 @author yunLiang
 @date 2025/12/23 9:26
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  // 数据源
  options: {
    type: Array,
    default: () => []
  },
  // 选择框默认文字
  placeholder: {
    type: String,
    default: '请选择'
  },
  // 是否支持清除
  allowClear: {
    type: Boolean,
    default: true
  },
  // 是否禁用
  isDisabled: {
    type: Boolean,
    default: false
  },
  // 下拉菜单样式
  dropdownStyle: {
    type: Object,
    default: () => {}
  },
  // getPopupContainer 定位
  getPopupContainer: {
    type: Function,
    default: triggerNode => triggerNode.parentNode
  },
  // 是否把label 包装到 value
  isLabelInValue: {
    type: Boolean,
    default: false
  },
  // 设置弹窗滚动高度
  listHeight: {
    type: Number,
    default: 256
  },
  // 是否多选
  isMultiSelect: {
    type: Boolean,
    default: false
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
  // 是否显示搜索框
  isShowSearch: {
    type: Boolean,
    default: false
  },
  // 是否显示线条
  isTreeLine: {
    type: Boolean,
    default: false
  },
  // 是否默认全部展开
  isTreeDefaultExpandAll: {
    type: Boolean,
    default: false
  },
  // 替换对应字段
  replaceFields: {
    type: Object,
    default: {
      children: 'children',
      label: 'title',
      key: 'key',
      value: 'value'
    }
  },
  // 作为显示的 prop 设置
  treeNodeLabelProp: {
    type: String,
    default: 'label'
  },
  // 默认展开的树节点
  treeDefaultExpandedKeys: {
    type: Array
  },
  // 是否显示checkbox
  treeCheckable: {
    type: Boolean,
    default: false
  },
  // 最多显示多少个 tag
  maxTagCount: {
    type: Number,
    default: 2
  }
})

// 设置值
const modelValue = defineModel()
const optionsData = ref(props.options)

watch(
  () => props.options,
  newValue => {
    optionsData.value = newValue
  },
  {
    immediate: true
  }
)

// 筛选
const filterTreeNode = (inputValue, node) => {
  return node[props.replaceFields.label].toLowerCase().includes(inputValue.toLowerCase())
}

// emit
const emit = defineEmits([
  'update:modelValue',
  'change',
  'search',
  'select',
  'dropDownVisible',
  'expand'
])
</script>

<template>
  <a-tree-select
    class="zz-selectTree"
    v-bind="$attrs"
    v-model:value="modelValue"
    :placeholder="placeholder"
    :allowClear="allowClear"
    :tree-data="optionsData"
    :dropdownStyle="dropdownStyle"
    :getPopupContainer="getPopupContainer"
    :labelInValue="isLabelInValue"
    :listHeight="listHeight"
    :multiple="isMultiSelect"
    :disabled="isDisabled"
    :placement="placement"
    :size="size"
    :status="status"
    :showSearch="isShowSearch"
    :treeDefaultExpandAll="isTreeDefaultExpandAll"
    :treeDefaultExpandedKeys="treeDefaultExpandedKeys"
    :treeLine="isTreeLine"
    :treeNodeLabelProp="treeNodeLabelProp"
    :fieldNames="replaceFields"
    :treeCheckable="treeCheckable"
    :maxTagCount="maxTagCount"
    :filterTreeNode="filterTreeNode"
    @search="$emit('search', $event)"
    @select="$emit('select', $event)"
    @change="$emit('change', $event)"
    @dropdownVisibleChange="$emit('dropDownVisible', $event)"
    @treeExpand="$emit('expand', $event)"
  >
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-tree-select>
</template>

<style scoped>
.zz-selectTree {
  width: 100%;
}

:where(.ant-select-tree-title) {
  white-space: nowrap; /* 不换行 */
  overflow: hidden; /* 隐藏超出部分 */
  text-overflow: ellipsis; /* 超出显示省略号 */
}
</style>
