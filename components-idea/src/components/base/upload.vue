<!--
 @description 上传组件
 @author yunLiang
 @date 2025/12/23 9:27
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import 'viewerjs/dist/viewer.css'
import { api as viewerApi } from 'v-viewer'
import { message } from 'ant-design-vue'
import mediaPlay from './mediaPlay.vue'
import vueOffice from './vueOffice.vue'
import { zzOpen } from '@/utils/util.js'
import { uploadAndSave } from '@/service/commons.js'

const props = defineProps({
  // 值
  modelValue: {
    type: Array
  },
  // 类型
  scene: {
    type: String
  },
  // 上传的文件类型
  accept: {
    type: String
  },
  // 按钮类型
  listType: {
    type: String,
    default: 'text'
  },
  // 是否支持文件夹
  isDirectory: {
    type: Boolean,
    default: false
  },
  // 是否禁用
  isDisabled: {
    type: Boolean,
    default: false
  },
  // 上次数量限制
  maxCount: {
    type: Number,
    default: 1
  },
  // 是否显示预览
  isPreview: {
    type: Boolean,
    default: true
  },
  // 是否显示下载
  isDownload: {
    type: Boolean,
    default: true
  },
  // 是否显示删除
  isRemove: {
    type: Boolean,
    default: true
  },
  // 上传大小
  fileSize: {
    type: [Number, String],
    default: 50
  },
  // 是否拖拽上传
  isDragger: {
    type: Boolean,
    default: false
  },
  // 是否显示hint
  isHint: {
    type: Boolean,
    default: false
  },
  // 是否显示isNum
  isNum: {
    type: Boolean,
    default: false
  },
  // 是否显示fileList列表
  showUploadList: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: '上传'
  },
  // 文件黑名单
  fileTypeNotAllowed: {
    type: Array
  }
})

// 文件类型
const fileTypeAll = ref({
  media: ['.mp3', '.wav', '.mp4', '.avi', '.rmvb', '.webm', '.ogg'],
  ppt: ['.ppt', '.pptx'],
  pdf: ['.pdf'],
  excel: ['.xls', '.xlsx'],
  word: ['.doc', '.docx'],
  image: ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.bmp', '.webp'],
  txt: ['.txt'],
  rar: ['.rar'],
  zip: ['.zip']
})

const isMultiple = ref(false)
const uploadRef = ref(null)
const internalFileList = ref([])
const isShowUploadList = ref(props.showUploadList)
const imageUrl = ref('')
const loading = ref(false)

const uploadListConfig = computed(() => ({
  showPreviewIcon: props.isPreview,
  showDownloadIcon: props.isDownload,
  showRemoveIcon: props.isRemove
}))

onMounted(() => {
  internalFileList.value = props.modelValue.map(item => ({
    ...item,
    name: item?.originalFileName || item?.name,
    status: 'done'
  }))
  isMultiple.value = props.maxCount !== 1
  if (props.listType === 'picture-card') {
    isShowUploadList.value = false
    imageUrl.value = internalFileList.value[0]?.url
  }
})

watch(
  () => props.modelValue,
  newValue => {
    if (Object.keys(newValue).length !== 0) {
      internalFileList.value = newValue.map(item => ({
        ...item,
        name: item?.originalFileName || item?.name,
        status: 'done'
      }))
      imageUrl.value = newValue[0]?.url
    }
  },
  {
    immediate: true
  }
)

// emit
const emit = defineEmits([
  'update:modelValue',
  'update:fileList',
  'uploadChange',
  'uploadDrop',
  'uploadReject'
])

// 匹配文件类型
const fileAllToFile = t => {
  for (const [type, extensions] of Object.entries(fileTypeAll.value)) {
    if (extensions.includes(t)) {
      return type
    }
  }
  return null
}

// 获取文件扩展名
const getFileName = fileName => {
  if (!fileName) return false
  // 获取文件名称
  const lastIndex = fileName.lastIndexOf('.')
  if (lastIndex !== -1) {
    // 获取文件类型
    return fileName.substring(lastIndex).toLowerCase()
  }
  return ''
}

// 上传进度条样式配置
const progress = {
  strokeColor: {
    '0%': '#5faeff',
    '100%': '#228fff'
  },
  strokeWidth: 3,
  format: percent => `${parseFloat(percent.toFixed(2))}%`
}

const getBase64 = (img, callback) => {
  const reader = new FileReader()
  reader.addEventListener('load', () => callback(reader.result))
  reader.readAsDataURL(img)
}

// 选中
const handleChange = info => {
  const filteredList = info.fileList.filter(file => {
    // 如果文件状态为 error，直接过滤掉
    if (file.status === 'error') {
      return false
    }

    const ext = getFileName(file.name)
    const forbidden = props.fileTypeNotAllowed

    // 判断扩展名是否被禁止
    if (forbidden?.includes(ext)) {
      return false
    }

    // 判断文件大小是否超限
    if (file.size / 1024 / 1024 >= Number(props.fileSize)) {
      return false
    }

    return true
  })

  internalFileList.value = filteredList
  if (info.file.status === 'uploading') {
    loading.value = true
    return
  }
  if (info.file.status === 'done') {
    getBase64(info.file.originFileObj, base64Url => {
      imageUrl.value = base64Url
      loading.value = false
    })
  }
  if (info.file.status === 'error') {
    loading.value = false
    // 错误状态的文件已在上面的过滤中移除，这里不需要额外处理
  }
  emit('update:modelValue', filteredList)
  emit('uploadChange', info)
}

// 上传前处理
const beforeUpload = file => {
  const isExistingFile = internalFileList.value.some(f => f.fileId === file.fileId)
  if (!isExistingFile) {
    internalFileList.value = [...internalFileList.value, file]
  }

  return isFileTypeAllow(file)
}

// 上传前验证条件
const isFileTypeAllow = file => {
  const ext = getFileName(file.name)
  if (!ext) {
    message.warning('文件扩展名为空')
    return false
  }

  // 禁止上传文件类型
  if (props.fileTypeNotAllowed?.length > 0 && props.fileTypeNotAllowed?.includes(ext)) {
    message.warning({
      content: `不允许上传${ext}类型的文件`,
      key: 'not'
    })
    return false
  }

  // 上传大小
  if (file.size / 1024 / 1024 >= Number(props.fileSize)) {
    message.warning({
      content: `上传文件大于${props.fileSize}MB`,
      key: 'size'
    })
    return false
  }

  // 上传数量
  if (props.maxCount !== 1 && internalFileList.value.length >= props.maxCount) {
    message.warning({
      content: `超出上传的最大个数${props.maxCount}`,
      key: 'maxCount'
    })
    return false
  }

  return true
}

// 覆盖默认上传
const customRequest = ({ file, onProgress, onSuccess, onError }) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('scene', props.scene)

  const fileSize = file.size
  let loaded = 0
  let percent = 0
  const interval = setInterval(() => {
    loaded += fileSize * 0.02
    percent = Math.floor((loaded / fileSize) * 100)
    if (percent >= 99) percent = 99
    onProgress({ percent }, file) // 更新进度条
  }, 300) // 每300ms更新一次进度

  uploadAndSave(formData)
    .then(res => {
      const data = res.data
      clearInterval(interval)
      onProgress({ percent: 100 }, file)
      setTimeout(() => {
        onSuccess(data, file)
      }, 300)
    })
    .catch(err => {
      clearInterval(interval)
      // 先调用 onError，让文件状态变为 error
      onError(err, file)
      // 使用 nextTick 确保在 handleChange 处理后再移除错误文件
      nextTick(() => {
        handleError(file)
      })
      message.error('上传失败')
    })
}

// 当文件被拖入上传区域时执行的回调功能
const handleDrop = event => {
  emit('uploadDrop', event)
}
// 拖拽文件不符合 accept 类型时的回调
const handleReject = fileList => {
  emit('uploadReject ', fileList)
}

// 预览
const handlePreview = async fileObj => {
  const file = fileObj.response ? fileObj.response : fileObj
  const fileType = getFileName(fileObj.name)
  const specificType = fileAllToFile(fileType)

  if (!specificType) {
    message.warning('不支持的文件类型')
    return
  }

  switch (specificType) {
    case 'image':
      // 图片查看器
      viewerApi({
        options: {
          toolbar: true,
          scalable: false,
          url: 'url'
        },
        images: [file]
      })
      break
    case 'media':
      const config = {
        component: mediaPlay,
        title: '查看视频',
        width: 1300,
        height: 800,
        showClose: true,
        showFooter: false,
        loading: false,
        paramsData: {
          fileList: file
        }
      }
      await zzOpen(config)
      break
    case 'pdf':
      previewFileWithXhr(file, specificType)
      break
    case 'txt':
      previewFileWithXhr(file, specificType)
      break
    case 'excel':
      const configExcel = {
        component: vueOffice,
        title: '查看文档',
        width: '90%',
        height: '90%',
        showClose: true,
        showFooter: false,
        loading: false,
        fileType: 'xlsx',
        fileUrl: fileObj.url
      }
      await zzOpen(configExcel)
      break
    case 'word':
      const configWord = {
        component: vueOffice,
        title: '查看文档',
        width: '90%',
        height: '90%',
        showClose: true,
        showFooter: false,
        loading: false,
        fileType: 'word',
        fileUrl: fileObj.url
      }
      await zzOpen(configWord)
      break
    case 'ppt':
      message.warning('暂不支持PPT预览')
      break
    default:
      message.warning('不支持的文件类型')
  }
}
const previewFileWithXhr = (file, type) => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', file.url)
  xhr.responseType = 'blob'
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const mimeType = type === 'pdf' ? 'application/pdf' : 'application/json;charset=utf-8'
      const url = window.URL.createObjectURL(new Blob([xhr.response], { type: mimeType }))
      window.open(url)
    }
  }
  xhr.send()
}

// 下载
const handleDownload = file => {
  const link = document.createElement('a')
  link.href = file.url
  link.download = file.url
  link.setAttribute('download', file.name)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 清除上传错误的文件
const handleError = file => {
  const newFileList = internalFileList.value.filter(f => {
    return f.uid !== file.uid && f.name !== file.name
  })
  internalFileList.value = newFileList
  emit('update:modelValue', newFileList)
}

// 删除
const handleRemove = file => {
  const targetFileId = file.response ? file.response.fileId : file.fileId
  const newFileList = internalFileList.value.filter(f => f.fileId !== targetFileId)
  internalFileList.value = newFileList
  emit('update:modelValue', newFileList)
}

// 清除已上传文件
const clearFiles = () => {
  internalFileList.value = []
  emit('update:fileList', [])
  emit('update:modelValue', [])
}

// 获取上传数据
const getUploadUrls = () => {
  return internalFileList.value
    .filter(file => file.status === 'done')
    .map(file => {
      if (file.response) {
        return {
          fileId: file.response.fileId,
          name: file.response.originalFilename,
          status: 'done',
          url: file.response.url
        }
      } else {
        return {
          fileId: file.fileId,
          name: file.name,
          status: 'done',
          url: file.url
        }
      }
    })
}

// 暴露给父组件的方法
defineExpose({
  getUploadUrls,
  clearFiles
})
</script>

<template>
  <a-upload-dragger
    v-if="isDragger"
    v-bind="$attrs"
    ref="uploadRef"
    class="zz-upload"
    v-model:file-list="internalFileList"
    name="file"
    :accept="accept"
    :multiple="isMultiple"
    :maxCount="maxCount"
    :disabled="isDisabled"
    :custom-request="customRequest"
    :showUploadList="showUploadList"
    @change="handleChange"
    @drop="handleDrop"
    @reject="handleReject"
  >
    <div class="dragger-div">
      <div>
        <p class="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p class="ant-upload-text">点击或者拖拽文件到此处上传</p>
        <p v-if="isHint" class="ant-upload-hint">支持单次或批量上传</p>
        <p v-if="isNum" class="ant-upload-hint">
          上传数量≤20份，单份文件大小≤50MB，暂无支持上传exe格式文件
        </p>
      </div>
    </div>
  </a-upload-dragger>
  <a-upload
    v-else
    ref="uploadRef"
    class="zz-upload"
    v-bind="$attrs"
    v-model:file-list="internalFileList"
    name="file"
    :accept="accept"
    :listType="listType"
    :disabled="isDisabled"
    :directory="isDirectory"
    :maxCount="maxCount"
    :multiple="isMultiple"
    :show-upload-list="uploadListConfig"
    :showUploadList="isShowUploadList"
    :before-upload="beforeUpload"
    :custom-request="customRequest"
    :progress="progress"
    @change="handleChange"
    @download="handleDownload"
    @preview="handlePreview"
    @remove="handleRemove"
  >
    <a-button v-if="listType === 'text' || listType === 'picture'" type="primary">
      <UploadOutlined />
      {{ label }}
    </a-button>
    <div
      style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center"
      v-if="listType === 'picture-card'"
    >
      <img v-if="imageUrl" :src="imageUrl" alt="avatar" class="avatar-img" />
      <div v-else>
        <LoadingOutlined v-if="loading" />
        <div v-else>
          <PlusOutlined />
          <div style="margin-top: 8px">{{ label }}</div>
        </div>
      </div>
    </div>
    <template #iconRender></template>
    <template #downloadIcon>
      <UploadOutlined />
    </template>
    <template #removeIcon>
      <DeleteOutlined style="color: #ff4d4f" />
    </template>
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-upload>
</template>

<style scoped>
.zz-upload {
  width: 100%;
}

.avatar-img {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
}

.dragger-div {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-upload-list-picture) {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

:deep(.ant-upload-list-picture-card) {
  width: 102px;
  height: 102px;
}

:deep(.ant-upload-list-item-container) {
  margin-right: 10px;
  height: 40px !important;
}

:deep(.ant-upload-list-item-progress) {
  padding-inline-start: 0 !important;
  padding-inline-end: 22px !important;
  bottom: -8px;
}

:deep(.ant-upload-list-item-name) {
  flex: none !important;
  cursor: pointer;
}

:deep(.ant-upload-list-item-action) {
  opacity: 1 !important;
}
</style>
