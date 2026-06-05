<template>
  <div class="custom-properties-demo">
    <a-row :gutter="16">
      <!-- 左侧：元素列表 -->
      <a-col :span="4">
        <a-card title="元素库" size="small">
          <draggable-list />
        </a-card>
      </a-col>

      <!-- 中间：设计区域 -->
      <a-col :span="14">
        <a-card title="设计区域" size="small">
          <div class="toolbar">
            <a-space>
              <a-button @click="addCustomElement">添加自定义元素</a-button>
              <a-button @click="preview">预览</a-button>
              <a-button type="primary" @click="saveTemplate">保存模板</a-button>
            </a-space>
          </div>
          
          <div id="hiprint-printTemplate" class="print-area"></div>
        </a-card>
      </a-col>

      <!-- 右侧：属性面板 -->
      <a-col :span="6">
        <a-card title="属性设置" size="small">
          <!-- hiprint 自动生成的属性 -->
          <div id="PrintElementOptionSetting"></div>

          <!-- 自定义扩展属性 -->
          <div v-if="selectedElement" class="custom-properties-panel">
            <a-divider>扩展属性</a-divider>

            <!-- 骑缝章配置 -->
            <template v-if="isStampElement">
              <a-form layout="vertical" size="small">
                <a-form-item label="启用骑缝章">
                  <a-switch 
                    v-model:checked="customProps.enableSplit"
                    @change="onPropertyChange('enableSplit')"
                  />
                </a-form-item>

                <a-form-item 
                  v-if="customProps.enableSplit" 
                  label="切割页数"
                >
                  <a-input-number 
                    v-model:value="customProps.splitCount"
                    :min="2"
                    :max="10"
                    style="width: 100%"
                    @change="onPropertyChange('splitCount')"
                  />
                </a-form-item>

                <a-form-item 
                  v-if="customProps.enableSplit" 
                  label="切割方向"
                >
                  <a-radio-group 
                    v-model:value="customProps.splitDirection"
                    @change="onPropertyChange('splitDirection')"
                  >
                    <a-radio value="vertical">垂直</a-radio>
                    <a-radio value="horizontal">水平</a-radio>
                  </a-radio-group>
                </a-form-item>

                <a-form-item 
                  v-if="customProps.enableSplit" 
                  label="重叠宽度"
                >
                  <a-slider 
                    v-model:value="customProps.overlapWidth"
                    :min="0"
                    :max="50"
                    :marks="{ 0: '0px', 25: '25px', 50: '50px' }"
                    @change="onPropertyChange('overlapWidth')"
                  />
                </a-form-item>

                <a-form-item label="跨页显示">
                  <a-switch 
                    v-model:checked="customProps.acrossPages"
                    @change="onPropertyChange('acrossPages')"
                  />
                </a-form-item>

                <a-form-item label="锁定位置">
                  <a-switch 
                    v-model:checked="customProps.lock"
                    @change="onPropertyChange('lock')"
                  />
                </a-form-item>
              </a-form>
            </template>

            <!-- 文本元素配置 -->
            <template v-if="isTextElement">
              <a-form layout="vertical" size="small">
                <a-form-item label="显示模式">
                  <a-select 
                    v-model:value="customProps.displayMode"
                    style="width: 100%"
                    @change="onPropertyChange('displayMode')"
                  >
                    <a-select-option value="normal">普通</a-select-option>
                    <a-select-option value="bold">加粗</a-select-option>
                    <a-select-option value="italic">斜体</a-select-option>
                    <a-select-option value="underline">下划线</a-select-option>
                  </a-select>
                </a-form-item>

                <a-form-item label="前缀">
                  <a-input 
                    v-model:value="customProps.customPrefix"
                    placeholder="输入前缀"
                    @change="onPropertyChange('customPrefix')"
                  />
                </a-form-item>

                <a-form-item label="后缀">
                  <a-input 
                    v-model:value="customProps.customSuffix"
                    placeholder="输入后缀"
                    @change="onPropertyChange('customSuffix')"
                  />
                </a-form-item>

                <a-form-item label="自定义颜色">
                  <a-input 
                    v-model:value="customProps.customColor"
                    type="color"
                    @change="onPropertyChange('customColor')"
                  />
                </a-form-item>

                <a-form-item label="显示边框">
                  <a-switch 
                    v-model:checked="customProps.enableBorder"
                    @change="onPropertyChange('enableBorder')"
                  />
                </a-form-item>
              </a-form>
            </template>

            <!-- 通用属性 -->
            <a-form layout="vertical" size="small">
              <a-form-item label="透明度">
                <a-slider 
                  v-model:value="customProps.opacity"
                  :min="0"
                  :max="100"
                  :marks="{ 0: '0%', 50: '50%', 100: '100%' }"
                  @change="onPropertyChange('opacity')"
                />
              </a-form-item>

              <a-form-item label="Z-Index">
                <a-input-number 
                  v-model:value="customProps.zIndex"
                  :min="0"
                  :max="100"
                  style="width: 100%"
                  @change="onPropertyChange('zIndex')"
                />
              </a-form-item>

              <a-form-item label="条件显示">
                <a-select 
                  v-model:value="customProps.showInPage"
                  style="width: 100%"
                  @change="onPropertyChange('showInPage')"
                >
                  <a-select-option value="all">所有页面</a-select-option>
                  <a-select-option value="first">首页</a-select-option>
                  <a-select-option value="last">尾页</a-select-option>
                  <a-select-option value="odd">奇数页</a-select-option>
                  <a-select-option value="even">偶数页</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>

            <!-- 操作按钮 -->
            <a-space style="width: 100%; margin-top: 16px">
              <a-button 
                size="small" 
                @click="resetProperties"
              >
                重置
              </a-button>
              <a-button 
                size="small" 
                type="primary" 
                @click="applyProperties"
              >
                应用
              </a-button>
            </a-space>
          </div>

          <!-- 未选择元素时的提示 -->
          <a-empty 
            v-else
            description="请选择一个元素"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            style="margin-top: 50px"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 预览对话框 -->
    <a-modal
      v-model:visible="previewVisible"
      title="打印预览"
      width="80%"
      :footer="null"
    >
      <div id="preview-container"></div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { message, Empty } from 'ant-design-vue';
import DraggableList from '../panel/draggableList.vue';

// ==================== 状态管理 ====================

let hiprintTemplate = null;
const selectedElement = ref(null);
const previewVisible = ref(false);

// 自定义属性
const customProps = reactive({
  // 骑缝章属性
  enableSplit: false,
  splitCount: 3,
  splitDirection: 'vertical',
  overlapWidth: 10,
  acrossPages: false,
  lock: false,
  
  // 文本属性
  displayMode: 'normal',
  customPrefix: '',
  customSuffix: '',
  customColor: '#000000',
  enableBorder: false,
  
  // 通用属性
  opacity: 100,
  zIndex: 1,
  showInPage: 'all'
});

// ==================== 计算属性 ====================

const isStampElement = computed(() => {
  return selectedElement.value?.printElementType?.type === 'image' &&
         selectedElement.value?.options?.seamless === true;
});

const isTextElement = computed(() => {
  return selectedElement.value?.printElementType?.type === 'text';
});

// ==================== 初始化 ====================

onMounted(() => {
  initHiprintConfig();
  initHiprintTemplate();
  setupEventListeners();
});

onBeforeUnmount(() => {
  removeEventListeners();
});

/**
 * 初始化 hiprint 配置
 */
const initHiprintConfig = () => {
  // 配置全局属性项
  window.HIPRINT_CONFIG = {
    optionItems: [
      {
        name: 'displayMode',
        title: '显示模式',
        type: 'select',
        options: [
          { value: 'normal', label: '普通' },
          { value: 'bold', label: '加粗' },
          { value: 'italic', label: '斜体' }
        ],
        defaultValue: 'normal'
      },
      {
        name: 'customPrefix',
        title: '前缀',
        type: 'input',
        defaultValue: ''
      },
      {
        name: 'customSuffix',
        title: '后缀',
        type: 'input',
        defaultValue: ''
      },
      {
        name: 'customColor',
        title: '自定义颜色',
        type: 'color',
        defaultValue: '#000000'
      },
      {
        name: 'enableBorder',
        title: '显示边框',
        type: 'checkbox',
        defaultValue: false
      },
      {
        name: 'enableSplit',
        title: '启用切割',
        type: 'checkbox',
        defaultValue: false
      },
      {
        name: 'splitCount',
        title: '切割页数',
        type: 'number',
        defaultValue: 3,
        min: 2,
        max: 10
      }
    ]
  };
  
  // 初始化 hiprint
  if (window.hiprint) {
    window.hiprint.init({
      providers: [new customElementTypeProvider()]
    });
  }
};

/**
 * 初始化打印模板
 */
const initHiprintTemplate = () => {
  if (!window.hiprint) {
    message.error('hiprint 库未加载');
    return;
  }

  try {
    hiprintTemplate = new window.hiprint.PrintTemplate({
      template: {},
      settingContainer: '#PrintElementOptionSetting',
    });
    
    hiprintTemplate.design('#hiprint-printTemplate');
    message.success('打印设计器初始化成功');
  } catch (error) {
    console.error('初始化失败:', error);
    message.error('初始化失败: ' + error.message);
  }
};

// ==================== 事件处理 ====================

/**
 * 设置事件监听
 */
const setupEventListeners = () => {
  // 监听元素选择事件
  $(document).on('PrintElementSelectEvent.customProps', (event, element) => {
    handleElementSelect(element);
  });

  // 监听元素取消选择事件
  $(document).on('PrintElementUnselectEvent.customProps', () => {
    selectedElement.value = null;
  });
};

/**
 * 移除事件监听
 */
const removeEventListeners = () => {
  $(document).off('.customProps');
};

/**
 * 处理元素选择
 */
const handleElementSelect = (element) => {
  selectedElement.value = element;
  
  // 加载元素的自定义属性到表单
  if (element && element.options) {
    const opts = element.options;
    
    // 骑缝章属性
    customProps.enableSplit = opts.enableSplit || false;
    customProps.splitCount = opts.splitCount || 3;
    customProps.splitDirection = opts.splitDirection || 'vertical';
    customProps.overlapWidth = opts.overlapWidth || 10;
    customProps.acrossPages = opts.acrossPages || false;
    customProps.lock = opts.lock || false;
    
    // 文本属性
    customProps.displayMode = opts.displayMode || 'normal';
    customProps.customPrefix = opts.customPrefix || '';
    customProps.customSuffix = opts.customSuffix || '';
    customProps.customColor = opts.customColor || '#000000';
    customProps.enableBorder = opts.enableBorder || false;
    
    // 通用属性
    customProps.opacity = opts.opacity !== undefined ? opts.opacity * 100 : 100;
    customProps.zIndex = opts.zIndex || 1;
    customProps.showInPage = opts.showInPage || 'all';
  }
};

/**
 * 属性变化处理
 */
const onPropertyChange = (propertyName) => {
  if (!selectedElement.value) return;

  const element = selectedElement.value;
  const value = customProps[propertyName];

  // 更新元素属性
  if (propertyName === 'opacity') {
    element.options[propertyName] = value / 100;
  } else {
    element.options[propertyName] = value;
  }

  // 特殊处理
  if (propertyName === 'enableSplit' && value) {
    // 启用切割时，自动设置相关属性
    element.options.acrossPages = true;
    customProps.acrossPages = true;
  }

  if (propertyName === 'splitDirection') {
    // 根据方向调整尺寸
    if (value === 'vertical') {
      element.options.width = 50;
      element.options.height = 150;
    } else {
      element.options.width = 150;
      element.options.height = 50;
    }
  }

  if (propertyName === 'enableBorder' && value) {
    element.options.borderWidth = 1;
    element.options.borderColor = customProps.customColor;
  }

  // 刷新元素显示
  element.refresh?.();
  
  message.success('属性已更新');
};

/**
 * 应用所有属性
 */
const applyProperties = () => {
  if (!selectedElement.value) {
    message.warning('请先选择一个元素');
    return;
  }

  const element = selectedElement.value;
  
  // 批量更新属性
  Object.keys(customProps).forEach(key => {
    if (key === 'opacity') {
      element.options[key] = customProps[key] / 100;
    } else {
      element.options[key] = customProps[key];
    }
  });

  // 刷新显示
  element.refresh?.();
  hiprintTemplate?.update();
  
  message.success('所有属性已应用');
};

/**
 * 重置属性
 */
const resetProperties = () => {
  if (!selectedElement.value) {
    message.warning('请先选择一个元素');
    return;
  }

  // 重置为默认值
  Object.assign(customProps, {
    enableSplit: false,
    splitCount: 3,
    splitDirection: 'vertical',
    overlapWidth: 10,
    acrossPages: false,
    lock: false,
    displayMode: 'normal',
    customPrefix: '',
    customSuffix: '',
    customColor: '#000000',
    enableBorder: false,
    opacity: 100,
    zIndex: 1,
    showInPage: 'all'
  });

  applyProperties();
  message.info('属性已重置');
};

// ==================== 操作方法 ====================

/**
 * 添加自定义元素
 */
const addCustomElement = () => {
  if (!hiprintTemplate) {
    message.error('模板未初始化');
    return;
  }

  // 添加一个自定义文本元素
  const element = {
    options: {
      left: 50,
      top: 50,
      width: 120,
      height: 30,
      fontSize: 14,
      text: '自定义元素',
      
      // 自定义属性
      displayMode: 'normal',
      customPrefix: '[',
      customSuffix: ']',
      customColor: '#1890ff'
    },
    printElementType: { type: 'text' }
  };

  hiprintTemplate.addPrintElement(element);
  message.success('已添加自定义元素');
};

/**
 * 预览
 */
const preview = () => {
  if (!hiprintTemplate) {
    message.error('模板未初始化');
    return;
  }

  previewVisible.value = true;
  
  setTimeout(() => {
    const html = hiprintTemplate.getHtml();
    document.getElementById('preview-container').innerHTML = html;
  }, 100);
};

/**
 * 保存模板
 */
const saveTemplate = () => {
  if (!hiprintTemplate) {
    message.error('模板未初始化');
    return;
  }

  const json = hiprintTemplate.getJson();
  console.log('模板 JSON:', json);
  
  // 保存到本地存储或发送到服务器
  localStorage.setItem('customTemplate', JSON.stringify(json));
  
  message.success('模板已保存');
};

/**
 * 自定义元素类型提供者
 */
const customElementTypeProvider = function () {
  const addElementTypes = function (context) {
    context.addPrintElementTypes(
      "customModule",
      [
        new window.hiprint.PrintElementTypeGroup("自定义元素", [
          {
            tid: 'customModule.text',
            text: '自定义文本',
            type: 'text',
            data: '示例文本',
            options: {
              width: 120,
              height: 30,
              fontSize: 14,
              displayMode: 'normal',
              customPrefix: '',
              customSuffix: '',
              formatter: function(data, options) {
                let result = data;
                if (options.customPrefix) result = options.customPrefix + result;
                if (options.customSuffix) result = result + options.customSuffix;
                return result;
              }
            }
          },
          {
            tid: 'customModule.stamp',
            text: '骑缝章',
            type: 'image',
            data: '',
            options: {
              width: 50,
              height: 150,
              seamless: true,
              enableSplit: true,
              splitCount: 3,
              splitDirection: 'vertical',
              overlapWidth: 10,
              acrossPages: true
            }
          }
        ])
      ]
    );
  };

  return {
    addElementTypes: addElementTypes
  };
};
</script>

<style scoped>
.custom-properties-demo {
  padding: 16px;
}

.toolbar {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.print-area {
  min-height: 600px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.custom-properties-panel {
  margin-top: 16px;
  padding-top: 16px;
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-divider) {
  margin: 12px 0;
}
</style>


