<!--
 @description 表格搜索组件
 @author yunLiang
 @date 2025/12/22 16:13
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import formItemRender from './base/formItemRender.vue'

const props = defineProps({
  // search结构
  searchForm: {
    type: Array,
    default: () => []
  },
  // 默认赋值
  setSearchForm: {
    type: Object,
    default: () => {}
  }
})

const formState = ref({})

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

// 展开隐藏
const isExpanded = ref(false)
// 通过宽度判断行展示的数量
const rowSpan = ref(6)
const spaceNum = ref(6)
const formRef = ref()
const searchRef = ref()
const expandIcon = ref(false)

watch(
  () => [props.setSearchForm],
  ([newVal]) => {
    if (newVal) {
      formState.value = newVal
    }
  },
  { immediate: true }
)

// 总共多少个字段
const maxVisiblePerRow = computed(() => {
  return Math.floor(24 / rowSpan.value)
})

// 当前总共多少行
const totalRows = computed(() => {
  return Math.ceil(props.searchForm.length / maxVisiblePerRow.value)
})

// 是否需要显示“显示更多”按钮
const shouldCollapse = computed(() => {
  return maxVisiblePerRow.value === 4
    ? totalRows.value >= 2 && Number(props.searchForm.length) >= 8
    : totalRows.value >= 2 && Number(props.searchForm.length) >= 12
})

// 显示的字段列表
const visibleFields = computed(() => {
  // 控制date默认格式
  const formList = props.searchForm
  const dataV = formList.filter(item => item.type === 'datePicker').map(item => item.prop)
  if (dataV.length > 0) {
    formList.forEach(item => {
      if (dataV.includes(item.prop)) {
        item.props.format = 'YYYY-MM-DD'
      }
    })
  }
  const form = formList || []
  if (isExpanded.value) {
    return form
  }
  const maxVisible = maxVisiblePerRow.value * 2 // 前两行
  return form.slice(0, maxVisible - 1)
})

const toggleMore = () => {
  isExpanded.value = !isExpanded.value
}

// 判断宽度
const handleResize = () => {
  const width = window.innerWidth
  if (width > 2000) {
    rowSpan.value = 4
    spaceNum.value = 10
  } else if (width <= 1250) {
    rowSpan.value = 6
    spaceNum.value = 4
  }
  // 判断宽度
  if (searchRef.value.offsetWidth <= 876) {
    expandIcon.value = true
  }
}

// 查询
const onFinish = () => {
  emit('searchClick', formState)
}

// 重置
const resetForm = () => {
  for (let key in formState.value) {
    formState.value[key] = undefined
  }
  onFinish() // 重置调用查询
  emit('resetForm')
}

// emit
const emit = defineEmits([
  'inputChange',
  'inputNumBlur',
  'inputNumChange',
  'selectChange',
  'selectDropdown',
  'selectCheckChange',
  'selectCheckDropdown',
  'selectCheckScroll',
  'selectTreeChange',
  'selectTreeDropdown',
  'searchClick',
  'resetForm'
])

defineExpose({ resetForm })
</script>

<template>
  <div class="ZzTableSearch" ref="searchRef">
    <a-form
      ref="formRef"
      name="table_search"
      class="search-form"
      :model="formState"
      @finish="onFinish"
    >
      <a-row :gutter="24" class="search-row">
        <form-item-render
          v-for="item in visibleFields"
          :key="item.prop"
          :item="item"
          :formState="formState"
          :rowSpan="rowSpan"
        ></form-item-render>
        <a-col class="action-col">
          <a-space :size="spaceNum">
            <div
              class="expand-icon"
              @click="toggleMore"
              v-if="shouldCollapse && expandIcon"
              :title="isExpanded ? '收起' : '展开'"
            >
              <UpOutlined v-if="isExpanded" />
              <DownOutlined v-else />
            </div>
            <a-button @click="toggleMore" v-if="shouldCollapse && !expandIcon">
              {{ isExpanded ? '收起' : '展开' }}
              <UpOutlined v-if="isExpanded" />
              <DownOutlined v-else />
            </a-button>
            <a-button @click="resetForm">重置</a-button>
            <a-button type="primary" html-type="submit">检索</a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<style scoped>
.ZzTableSearch {
  width: 100%;
  background-color: #fff;
  border-radius: 6px;

  .search-form {
    padding: 10px 10px 0 10px;

    .search-row {
      width: 100%;
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .action-col {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 10px;

      .expand-icon {
        margin-right: 10px;
        cursor: pointer;
        color: #666;
      }
    }
  }

  .ant-btn {
    padding: 4px 10px;
  }

  .ant-btn-default {
    color: #666;
  }

  :deep(.ant-form-item) {
    margin-bottom: 10px;
  }
}
</style>
