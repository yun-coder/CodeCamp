// 自定义元素类型提供者
// jQuery 已在 main.js 中全局导入
export const customElementTypeProvider = function () {
  const addElementTypes = function (context) {
    context.addPrintElementTypes(
      "testModule",
      [
        new window.hiprint.PrintElementTypeGroup("常规", [
          { tid: 'testModule.text', text: '文本', data: '', type: 'text' },
          { 
            tid: 'testModule.image', 
            text: '图片', 
            data: '/hiprint/image/hi.png',
            type: 'image' 
          },
          { tid: 'testModule.longText', text: '长文', data: '', type: 'longText' },
          {
            tid: 'testModule.table', 
            field: 'table', 
            text: '表格',
            type: 'table',
            groupFields: ['name'],
            groupFooterFormatter: function (group, option) {
              return '这里自定义统计脚信息'
            },
            columns: [
              [
                { title: '行号', fixed: true, rowspan: 2, field: 'id', width: 70 },
                { title: '人员信息', colspan: 2 },
                { title: '销售统计', colspan: 2 }
              ],
              [
                { title: '姓名', align: 'left', field: 'name', width: 100 },
                { title: '性别', field: 'gender', width: 100 },
                { title: '销售数量', field: 'count', width: 100 },
                { title: '销售金额', field: 'amount', width: 100 }
              ]
            ]
          },
          {
            tid: 'testModule.tableCustom',
            title: '表格',
            type: 'tableCustom'
          },
          {
            tid: 'testModule.html', 
            title: 'html',
            formatter: function (data, options) {
              return window.$('<div style="height:50pt;width:50pt;background:#1890ff;border-radius: 50%;"></div>')
            },
            type: 'html'
          },
          { 
            tid: 'testModule.customText', 
            text: '自定义文本', 
            customText: '自定义文本', 
            custom: true, 
            type: 'text' 
          }
        ]),
        new window.hiprint.PrintElementTypeGroup("辅助", [
          {
            tid: 'testModule.hline',
            text: '横线',
            type: 'hline'
          },
          {
            tid: 'testModule.vline',
            text: '竖线',
            type: 'vline'
          },
          {
            tid: 'testModule.rect',
            text: '矩形',
            type: 'rect'
          },
          {
            tid: 'testModule.oval',
            text: '椭圆',
            type: 'oval'
          }
        ]),
        new window.hiprint.PrintElementTypeGroup("印章", [
          {
            tid: 'stampModule.seamlessStamp',
            text: '骑缝章',
            type: 'image',
            data: '',
            options: {
              // 印章特殊配置
              seamless: true,  // 标识为骑缝章
              acrossPages: true,  // 跨页显示
              lock: false,
              hidden: false
            }
          }
        ])
      ]
    )
  }

  return {
    addElementTypes: addElementTypes
  }
}

// 初始化 hiprint
export const initHiprint = () => {
  // 确保 jQuery 和 hiprint 已加载
  if (!window.$ || !window.jQuery) {
    console.error('jQuery 未加载')
    return false
  }

  if (!window.hiprint) {
    console.error('hiprint 库未加载')
    return false
  }

  try {
    // 初始化打印插件
    window.hiprint.init({
      providers: [new customElementTypeProvider()]
    })
    
    console.log('hiprint 初始化成功')
    return true
  } catch (error) {
    console.error('hiprint 初始化失败:', error)
    return false
  }
}

