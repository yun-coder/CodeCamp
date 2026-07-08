<!--
 @description 人员分组下拉
 @author yunLiang
 @date 2025/12/23 9:27
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import selectTree from './selectTree.vue'
import { onMounted, ref } from 'vue'
import { staffGroupPageCode } from '@/service/commons.js'

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
  // 是否清楚
  allowClear: {
    type: Boolean,
    default: false
  },
  // 最大标签数量
  maxTagCount: {
    type: Number
  },
  // 占位符
  placeholder: {
    type: String,
    default: '请选择'
  },
  // 是否多选
  isMultiSelect: {
    type: Boolean,
    default: true
  },
  // 是否显示checkbox
  treeCheckable: {
    type: Boolean,
    default: true
  },
  // getPopupContainer 定位
  getPopupContainer: {
    type: Function,
    default: triggerNode => triggerNode.parentNode
  },
  // 是否显示停用人员
  isEnableFlag: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['change', 'total'])

const modelValue = defineModel()
const optionsData = ref([])

onMounted(() => {
  userData()
})

const userData = () => {
  const params = {
    pageCode: props.pageCode,
    staffCodes: props.staffCodes
  }
  staffGroupPageCode(params).then(res => {
    if (res?.resCode === '200') {
      const newData = res.data.map(item => ({
        ...item,
        staffCode: item.departmentCode,
        staffName: item.departmentName,
        disabled: item.enableFlag
      }))
      optionsData.value = filterTreeData(newData, props.isEnableFlag)
      const optionListLen = res.data.reduce((sum, dept) => {
        const staffList = dept.staffNameList || []
        const activeStaffCount = staffList.filter(staff => staff.enableFlag === true).length
        return sum + activeStaffCount
      }, 0)
      emit('total', optionListLen)
    }
  })
}

// 过滤树形数据中enableFlag为false的节点
const filterTreeData = (treeData, filter) => {
  // 工具函数：深拷贝（避免修改原始数据）
  const deepClone = obj => {
    if (typeof obj !== 'object' || obj === null) return obj
    const cloneObj = Array.isArray(obj) ? [] : {}
    for (const key in obj) {
      cloneObj[key] = deepClone(obj[key])
    }
    return cloneObj
  }

  // 递归处理单个部门节点
  const processNode = node => {
    const clonedNode = deepClone(node) // 先深拷贝当前节点

    if (filter) {
      return clonedNode
    }

    if (Array.isArray(clonedNode.staffNameList)) {
      // 过滤掉 staffNameList 中 enableFlag 为 false 的子项
      clonedNode.staffNameList = clonedNode.staffNameList.filter(staff => staff.enableFlag === true)
    }

    // 3. 如果节点有嵌套的子部门（如children数组，树形结构可能存在的层级），递归处理子部门
    if (Array.isArray(clonedNode.children)) {
      clonedNode.children = clonedNode.children.map(childNode => processNode(childNode))
    }

    return clonedNode
  }

  // 处理整个树形数组（每个元素是一个部门节点）
  return treeData.map(node => processNode(node))
}
</script>

<template>
  <div class="userGroupSelect">
    <select-tree
      v-model="modelValue"
      :placeholder="placeholder"
      :options="optionsData"
      :isMultiSelect="isMultiSelect"
      :isShowSearch="true"
      :treeCheckable="treeCheckable"
      :isTreeDefaultExpandAll="true"
      :allowClear="allowClear"
      :maxTagCount="maxTagCount"
      :replaceFields="{
        children: 'staffNameList',
        label: 'staffName',
        key: 'staffCode',
        value: 'staffCode'
      }"
      treeNodeLabelProp="staffName"
      :getPopupContainer="getPopupContainer"
      @change="$emit('change', $event)"
    ></select-tree>
  </div>
</template>

<style scoped>
.userGroupSelect {
  width: 100%;
  height: 100%;
}
</style>
