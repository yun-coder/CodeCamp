/**
 * hiprint 自定义属性配置示例代码
 * 
 * 本文件展示了如何为 hiprint 元素添加自定义属性的多种方法
 */

// ==================== 方法一：全局配置扩展 ====================

/**
 * 在 hiprint 初始化前配置全局属性项
 * 这些属性项可以被任何元素类型引用
 */
window.HIPRINT_CONFIG = {
  // 定义可用的属性项
  optionItems: [
    // 1. 文本输入类型
    {
      name: 'customTitle',
      title: '自定义标题',
      type: 'input',
      defaultValue: '',
      placeholder: '请输入标题',
      onChange: function(value, element) {
        console.log('标题改变为:', value);
        // 这里可以触发自定义逻辑
      }
    },
    
    // 2. 下拉选择类型
    {
      name: 'displayMode',
      title: '显示模式',
      type: 'select',
      options: [
        { value: 'normal', label: '普通模式' },
        { value: 'bold', label: '加粗模式' },
        { value: 'italic', label: '斜体模式' }
      ],
      defaultValue: 'normal',
      onChange: function(value, element) {
        // 根据选择应用不同样式
        if (value === 'bold') {
          element.options.fontWeight = 'bold';
        } else if (value === 'italic') {
          element.options.fontStyle = 'italic';
        }
      }
    },
    
    // 3. 复选框类型
    {
      name: 'enableBorder',
      title: '显示边框',
      type: 'checkbox',
      defaultValue: false,
      onChange: function(value, element) {
        if (value) {
          element.options.borderWidth = 1;
          element.options.borderColor = '#000000';
        } else {
          element.options.borderWidth = 0;
        }
      }
    },
    
    // 4. 颜色选择器类型
    {
      name: 'customColor',
      title: '自定义颜色',
      type: 'color',
      defaultValue: '#1890ff'
    },
    
    // 5. 数字输入类型
    {
      name: 'customOpacity',
      title: '透明度',
      type: 'number',
      defaultValue: 100,
      min: 0,
      max: 100,
      step: 5,
      onChange: function(value, element) {
        element.options.opacity = value / 100;
      }
    },
    
    // 6. 多行文本类型
    {
      name: 'customDescription',
      title: '描述信息',
      type: 'textarea',
      defaultValue: '',
      rows: 4
    },
    
    // 7. 带验证的输入
    {
      name: 'customUrl',
      title: '图片链接',
      type: 'input',
      defaultValue: '',
      validate: function(value) {
        if (value && !value.match(/^https?:\/\/.+/)) {
          alert('请输入有效的 URL 地址');
          return false;
        }
        return true;
      }
    }
  ],
  
  // 为特定元素类型配置支持的属性
  text: {
    supportOptions: [
      { name: 'width' },
      { name: 'height' },
      { name: 'fontSize' },
      { name: 'fontFamily' },
      { name: 'customTitle' },      // 添加自定义属性
      { name: 'displayMode' },      // 添加自定义属性
      { name: 'enableBorder' },     // 添加自定义属性
      { name: 'customColor' }       // 添加自定义属性
    ]
  },
  
  image: {
    supportOptions: [
      { name: 'width' },
      { name: 'height' },
      { name: 'src' },
      { name: 'customUrl' },        // 添加自定义属性
      { name: 'customOpacity' },    // 添加自定义属性
      { name: 'customDescription' } // 添加自定义属性
    ]
  }
};


// ==================== 方法二：在元素定义时配置 ====================

/**
 * 自定义元素类型提供者
 * 在定义元素时直接配置自定义属性
 */
export const customElementTypeProvider = function () {
  const addElementTypes = function (context) {
    context.addPrintElementTypes(
      "customModule",
      [
        // 定义一个元素组
        new window.hiprint.PrintElementTypeGroup("自定义元素", [
          // 1. 带自定义属性的文本元素
          {
            tid: 'customModule.richText',
            text: '富文本',
            type: 'text',
            data: '示例文本',
            options: {
              // 基础属性
              width: 120,
              height: 30,
              fontSize: 14,
              fontFamily: 'Microsoft YaHei',
              textAlign: 'left',
              
              // 自定义属性
              customTitle: '标题',
              displayMode: 'normal',
              enableBorder: false,
              customColor: '#333333',
              
              // 格式化函数
              formatter: function(data, options) {
                // 根据 displayMode 应用不同格式
                let result = data;
                if (options.displayMode === 'bold') {
                  result = `<b>${data}</b>`;
                } else if (options.displayMode === 'italic') {
                  result = `<i>${data}</i>`;
                }
                return result;
              }
            }
          },
          
          // 2. 带切割功能的图片元素（骑缝章）
          {
            tid: 'customModule.splitImage',
            text: '切割图片',
            type: 'image',
            data: '',
            options: {
              width: 50,
              height: 150,
              
              // 切割相关属性
              enableSplit: true,
              splitCount: 3,
              splitDirection: 'vertical',
              overlapWidth: 10,
              
              // 位置控制
              acrossPages: true,
              lock: false,
              
              // 自定义渲染逻辑
              formatter: function(data, options) {
                if (options.enableSplit && data) {
                  // 返回切割后的图片
                  const params = new URLSearchParams({
                    image: data,
                    count: options.splitCount,
                    direction: options.splitDirection,
                    overlap: options.overlapWidth
                  });
                  return `/api/image/split?${params.toString()}`;
                }
                return data;
              },
              
              // 样式生成器
              styler: function(data, options, $target) {
                const styles = {};
                
                if (options.customOpacity) {
                  styles.opacity = options.customOpacity / 100;
                }
                
                if (options.enableBorder) {
                  styles.border = `1px solid ${options.customColor || '#000'}`;
                }
                
                return styles;
              }
            }
          },
          
          // 3. 自定义 HTML 元素
          {
            tid: 'customModule.customHtml',
            text: '自定义 HTML',
            type: 'html',
            options: {
              width: 100,
              height: 50,
              
              // 自定义属性
              htmlContent: '<div>自定义内容</div>',
              backgroundColor: '#f0f0f0',
              
              formatter: function(data, options) {
                // 返回 jQuery 对象
                return $(`<div style="
                  background-color: ${options.backgroundColor};
                  padding: 10px;
                  border-radius: 4px;
                ">${options.htmlContent}</div>`);
              }
            }
          },
          
          // 4. 条件显示元素
          {
            tid: 'customModule.conditionalText',
            text: '条件文本',
            type: 'text',
            data: '',
            options: {
              width: 100,
              height: 30,
              
              // 条件属性
              showCondition: 'always',  // always, firstPage, lastPage, odd, even
              customCondition: '',      // 自定义条件表达式
              
              // 根据页面条件显示
              showInPage: 'all',  // all, first, last, odd, even
              
              formatter: function(data, options, currentPage, totalPages) {
                // 根据条件决定是否显示
                if (options.showCondition === 'firstPage' && currentPage !== 0) {
                  return '';
                }
                if (options.showCondition === 'lastPage' && currentPage !== totalPages - 1) {
                  return '';
                }
                return data;
              }
            }
          },
          
          // 5. 数据绑定元素
          {
            tid: 'customModule.dataBinding',
            text: '数据绑定',
            field: 'bindingField',
            type: 'text',
            options: {
              width: 120,
              height: 30,
              
              // 数据绑定配置
              dataSource: 'json',  // json, api, custom
              apiUrl: '',
              dataPath: '',        // 数据路径，如 'user.name'
              
              // 数据转换
              dataTransform: function(value, allData) {
                // 可以访问完整的数据对象
                if (this.dataPath) {
                  const paths = this.dataPath.split('.');
                  let result = allData;
                  for (let path of paths) {
                    result = result?.[path];
                  }
                  return result;
                }
                return value;
              },
              
              formatter: function(data, options) {
                // 数据格式化
                if (options.dataTransform) {
                  return options.dataTransform.call(options, data);
                }
                return data;
              }
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


// ==================== 方法三：动态扩展现有元素 ====================

/**
 * 动态为现有元素添加属性
 * 在 hiprint 初始化后执行
 */
export const extendExistingElements = function() {
  // 确保 hiprint 已初始化
  if (!window.hiprint) {
    console.error('hiprint 未初始化');
    return;
  }
  
  // 获取元素类型
  const textElementType = window.hiprint.PrintElementTypeManager.getByName('text');
  
  if (textElementType) {
    // 扩展默认选项
    const originalOptions = textElementType.defaultOptions || {};
    textElementType.defaultOptions = {
      ...originalOptions,
      // 添加新的默认属性
      customPrefix: '',
      customSuffix: '',
      enableAnimation: false
    };
    
    // 扩展格式化函数
    const originalFormatter = textElementType.formatter;
    textElementType.formatter = function(data, options) {
      // 调用原始格式化
      let result = originalFormatter ? originalFormatter.call(this, data, options) : data;
      
      // 添加前缀后缀
      if (options.customPrefix) {
        result = options.customPrefix + result;
      }
      if (options.customSuffix) {
        result = result + options.customSuffix;
      }
      
      return result;
    };
  }
};


// ==================== 方法四：监听和处理属性变化 ====================

/**
 * 监听元素属性变化并执行自定义逻辑
 */
export const setupPropertyListeners = function() {
  // 监听元素选择事件
  $(document).on('PrintElementSelectEvent', function(event, element) {
    console.log('元素被选中:', element);
    
    // 可以在这里根据元素类型显示/隐藏某些属性
    if (element.printElementType.type === 'image') {
      // 为图片元素显示特殊属性
      $('#customImageOptions').show();
    } else {
      $('#customImageOptions').hide();
    }
  });
  
  // 监听属性变化事件
  $(document).on('PrintElementOptionChangeEvent', function(event, element, optionName, newValue) {
    console.log('属性变化:', optionName, '新值:', newValue);
    
    // 根据属性变化执行特定逻辑
    if (optionName === 'enableSplit' && newValue) {
      // 启用切割时，自动设置其他相关属性
      element.options.acrossPages = true;
      element.options.lock = true;
    }
    
    // 属性联动
    if (optionName === 'splitDirection') {
      if (newValue === 'vertical') {
        element.options.width = 50;
        element.options.height = 150;
      } else {
        element.options.width = 150;
        element.options.height = 50;
      }
    }
  });
  
  // 监听模板更新事件
  $(document).on('PrintTemplateUpdateEvent', function(event, template) {
    console.log('模板已更新');
    
    // 可以在这里处理模板级别的自定义逻辑
  });
};


// ==================== 方法五：程序化设置属性 ====================

/**
 * 通过代码动态设置元素属性
 */
export const setElementPropertiesProgrammatically = function(hiprintTemplate) {
  // 获取所有元素
  const elements = hiprintTemplate.getPrintElements();
  
  elements.forEach(element => {
    // 根据元素类型设置不同属性
    if (element.printElementType.type === 'text') {
      // 批量设置文本元素属性
      element.options.fontSize = 14;
      element.options.fontFamily = 'Microsoft YaHei';
      element.options.customColor = '#333333';
    }
    
    if (element.printElementType.type === 'image') {
      // 批量设置图片元素属性
      element.options.width = 100;
      element.options.height = 100;
      element.options.customOpacity = 80;
    }
    
    // 设置特定元素的属性
    if (element.options.field === 'stampImage') {
      element.options.enableSplit = true;
      element.options.splitCount = 3;
      element.options.splitDirection = 'vertical';
    }
  });
  
  // 更新模板显示
  hiprintTemplate.update();
};


// ==================== 方法六：创建属性组 ====================

/**
 * 将相关属性组织成组，便于管理
 */
export const createPropertyGroups = function() {
  return {
    // 位置和尺寸组
    positionGroup: {
      name: 'position',
      title: '位置和尺寸',
      options: ['left', 'top', 'width', 'height']
    },
    
    // 样式组
    styleGroup: {
      name: 'style',
      title: '样式设置',
      options: ['fontSize', 'fontFamily', 'fontWeight', 'color', 'backgroundColor']
    },
    
    // 边框组
    borderGroup: {
      name: 'border',
      title: '边框设置',
      options: ['borderWidth', 'borderColor', 'borderStyle', 'borderRadius']
    },
    
    // 自定义组
    customGroup: {
      name: 'custom',
      title: '自定义设置',
      options: ['customTitle', 'displayMode', 'enableBorder', 'customColor']
    }
  };
};


// ==================== 使用示例 ====================

/**
 * 完整的初始化流程
 */
export const initializeWithCustomProperties = function() {
  // 1. 配置全局属性（在 hiprint.init 之前）
  window.HIPRINT_CONFIG = {
    optionItems: [
      // ... 属性项定义
    ]
  };
  
  // 2. 初始化 hiprint
  window.hiprint.init({
    providers: [
      new customElementTypeProvider()
    ]
  });
  
  // 3. 扩展现有元素（可选）
  extendExistingElements();
  
  // 4. 设置事件监听
  setupPropertyListeners();
  
  // 5. 创建模板
  const hiprintTemplate = new window.hiprint.PrintTemplate({
    template: {},
    settingContainer: '#PrintElementOptionSetting',
    paginationContainer: '.hiprint-printPagination'
  });
  
  // 6. 启动设计器
  hiprintTemplate.design('#hiprint-printTemplate');
  
  // 7. 程序化设置属性（可选）
  // setElementPropertiesProgrammatically(hiprintTemplate);
  
  return hiprintTemplate;
};


// ==================== 导出 ====================

export default {
  customElementTypeProvider,
  extendExistingElements,
  setupPropertyListeners,
  setElementPropertiesProgrammatically,
  createPropertyGroups,
  initializeWithCustomProperties
};


