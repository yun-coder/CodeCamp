<!--
 @description 人员下拉
 @author yunLiang
 @date 2025/12/23 9:27
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref, watch } from 'vue'
import { staffAllPageCode, staffByPageCode } from '@/service/commons.js'
import selectCheck from './selectCheck.vue'

const props = defineProps({
  // pageCode
  pageCode: {
    type: String
  },
  // staffCodes
  staffCodes: {
    type: Array,
    default: () => []
  },
  // selectedCodes
  selectedCodes: {
    type: Array
  },
  // 是否显示清楚
  allowClear: {
    type: Boolean,
    default: false
  },
  // 最大标签数
  maxTagCount: {
    type: Number
  },
  // 是否多选
  isMultiSelect: {
    type: Boolean,
    default: true
  },
  // 占位符
  placeholder: {
    type: String,
    default: '请选择'
  },
  // getPopupContainer 定位
  getPopupContainer: {
    type: Function,
    default: triggerNode => triggerNode.parentNode
  },
  // 是否查所有人员
  isAllUserList: {
    type: Boolean,
    default: false
  },
  // 人员类型
  allUserType: {
    type: String,
    default: '1'
  },
  // 是否显示离职人员
  isResignation: {
    type: Boolean,
    default: true
  },
  // 是否显示停用人员
  isEnableFlag: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['change', 'total', 'search'])

const modelValue = defineModel()
const optionsData = ref([])

// 查询所有人员
const userAllData = () => {
  const params = { type: props.allUserType }
  staffAllPageCode(params).then(res => {
    if (res?.resCode === '200') {
      const newData = res.data.map(item => ({
        ...item,
        disabled: !props.isResignation && !item.enableFlag
      }))
      optionsData.value = filterTreeByEnableFlag(newData, props.isEnableFlag, props.selectedCodes)
      const optionListLen = optionsData.value.length
      emit('total', optionListLen)
    }
  })
}

// 查询code人员
const userData = () => {
  const params = {
    pageCode: props.pageCode,
    staffCodes: props.staffCodes
  }
  staffByPageCode(params).then(res => {
    if (res?.resCode === '200') {
      const newData = res.data.map(item => ({
        ...item,
        disabled: !props.isResignation && !item.enableFlag
      }))
      optionsData.value = filterTreeByEnableFlag(newData, props.isEnableFlag, props.selectedCodes)
      const optionListLen = optionsData.value.length
      emit('total', optionListLen)
    }
  })
}

// 过滤数据中enableFlag为false的节点
const filterTreeByEnableFlag = (treeData, filterFalse, selectedCode) => {
  if (!Array.isArray(treeData)) {
    return []
  }
  // 将selectedCode转为Set（高效查找id），兼容空数组情况
  const selectedIds = Array.isArray(selectedCode) ? new Set(selectedCode) : new Set()

  // 递归处理单个节点：设置disabled并过滤子节点
  const processNode = node => {
    // 复制节点，避免修改原数据
    const processedNode = { ...node }

    // 核心逻辑：如果节点id在selectedIds中，设置disabled为true
    if (selectedIds.has(processedNode.staffCode)) {
      processedNode.disabled = true
    }

    // 递归处理子节点（如果有）
    if (Array.isArray(processedNode.children) && processedNode.children.length > 0) {
      processedNode.children = processedNode.children
        // 先过滤子节点的enableFlag
        .filter(child => (filterFalse ? true : child.enableFlag !== false))
        // 再递归处理每个子节点的disabled
        .map(child => processNode(child))
    }

    return processedNode
  }

  // 先过滤顶层节点的enableFlag，再处理每个节点的disabled
  return treeData
    .filter(item => (filterFalse ? true : item.enableFlag !== false))
    .map(node => processNode(node))
}

watch(
  () => props.pageCode,
  newIsAllUserList => {
    if (newIsAllUserList && !props.isAllUserList) {
      userData()
    } else {
      userAllData()
    }
  },
  {
    immediate: true
  }
)

// 获取集合数据
const getUserList = () => {
  return optionsData.value
}

defineExpose({ getUserList })
</script>

<template>
  <div class="zz-userSelect">
    <select-check
      v-model="modelValue"
      :placeholder="placeholder"
      :options="optionsData"
      :isMultiSelect="isMultiSelect"
      :isShowSearch="true"
      :allowClear="allowClear"
      :maxTagCount="maxTagCount"
      optionLabelProp="label"
      :fieldNames="{ label: 'staffName', value: 'staffCode' }"
      :getPopupContainer="getPopupContainer"
      @change="$emit('change', $event)"
    ></select-check>
  </div>
</template>

<style scoped>
.zz-userSelect {
  width: 100%;
  height: 100%;
}
</style>
