<!--
 @description tableSearch组件使用示例
 @author yunLiang
 @date 2025/12/22 16:52
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref } from 'vue'
import TableSearch from '@/components/tableSearch.vue'

// 基础搜索表单配置
const basicSearchForm = ref([
  {
    prop: 'name',
    label: '姓名',
    type: 'input',
    props: {
      placeholder: '请输入姓名'
    }
  },
  {
    prop: 'age',
    label: '年龄',
    type: 'inputNum',
    props: {
      placeholder: '请输入年龄',
      min: 0,
      max: 120
    }
  },
  {
    prop: 'gender',
    label: '性别',
    type: 'select',
    props: {
      placeholder: '请选择性别',
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
      ]
    }
  }
])

// 复杂搜索表单配置
const complexSearchForm = ref([
  {
    prop: 'name',
    label: '姓名',
    type: 'input',
    props: {
      placeholder: '请输入姓名'
    }
  },
  {
    prop: 'age',
    label: '年龄',
    type: 'inputNum',
    props: {
      placeholder: '请输入年龄',
      min: 0,
      max: 120
    }
  },
  {
    prop: 'salary',
    label: '薪资',
    type: 'inputFloat',
    props: {
      placeholder: '请输入薪资',
      min: 0
    }
  },
  {
    prop: 'gender',
    label: '性别',
    type: 'select',
    props: {
      placeholder: '请选择性别',
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
      ]
    }
  },
  {
    prop: 'hobbies',
    label: '爱好',
    type: 'selectCheckbox',
    props: {
      placeholder: '请选择爱好',
      options: [
        { label: '阅读', value: 'reading' },
        { label: '音乐', value: 'music' },
        { label: '运动', value: 'sports' },
        { label: '旅行', value: 'travel' }
      ]
    }
  },
  {
    prop: 'birthday',
    label: '出生日期',
    type: 'datePicker',
    props: {
      placeholder: '请选择出生日期'
    }
  },
  {
    prop: 'workYears',
    label: '工作年限',
    type: 'rangePicker',
    props: {
      placeholder: ['开始日期', '结束日期']
    }
  },
  {
    prop: 'joinTime',
    label: '入职时间',
    type: 'bothTimePicker',
    props: {
      placeholder: ['时间', '时间']
    }
  },
  {
    prop: 'department',
    label: '部门',
    type: 'selectTree',
    props: {
      placeholder: '请选择部门',
      options: [
        {
          title: '技术部',
          value: 'tech',
          children: [
            { title: '前端组', value: 'frontend' },
            { title: '后端组', value: 'backend' }
          ]
        },
        {
          title: '产品部',
          value: 'product',
          children: [
            { title: '产品设计', value: 'design' },
            { title: '产品运营', value: 'operation' }
          ]
        }
      ]
    }
  }
])

// 默认值
const defaultValues = {
  name: '张三',
  gender: 'male'
}

// 搜索事件处理
const handleSearch = values => {
  console.log('搜索条件:', values)
}

// 重置事件处理
const handleReset = () => {
  console.log('表单已重置')
}
</script>

<template>
  <div class="table-search-demo">
    <h1>TableSearch 组件使用示例</h1>

    <div class="demo-section">
      <h2>基础示例</h2>
      <p>展示基本的输入框、数字输入框和选择框</p>
      <TableSearch
        :searchForm="basicSearchForm"
        @searchClick="handleSearch"
        @resetForm="handleReset"
      />
    </div>

    <div class="demo-section">
      <h2>复杂示例</h2>
      <p>展示所有支持的表单类型，包括日期选择器、范围选择器、树形选择器、上传组件等</p>
      <TableSearch
        :searchForm="complexSearchForm"
        @searchClick="handleSearch"
        @resetForm="handleReset"
      />
    </div>

    <div class="demo-section">
      <h2>带默认值示例</h2>
      <p>展示如何设置表单默认值</p>
      <TableSearch
        :searchForm="basicSearchForm"
        :setSearchForm="defaultValues"
        @searchClick="handleSearch"
        @resetForm="handleReset"
      />
    </div>
  </div>
</template>

<style scoped>
.table-search-demo {
  padding: 20px;
}

.demo-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 6px;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
}

h2 {
  font-size: 18px;
  margin-bottom: 10px;
}

p {
  color: #666;
  margin-bottom: 20px;
}
</style>
