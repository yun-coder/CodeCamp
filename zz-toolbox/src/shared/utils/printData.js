// 打印数据
export const getPrintData = () => {
  return { table: generateTableData(100) };
};

// 默认打印模板 JSON
export const getCustomPrintJson = () => {
  return {
    "panels": [
      {
        "index": 0,
        "height": 297,
        "width": 210,
        "paperHeader": 49.5,
        "paperFooter": 780,
        "printElements": [
          {
            "options": {
              "left": 28.5,
              "top": 66,
              "height": 40,
              "width": 550,
              "field": "table",
              "columns": [
                [
                  {
                    "title": "序号",
                    "field": "id",
                    "width": 80,
                    "align": "center",
                    "colspan": 1,
                    "rowspan": 1,
                    "checked": true
                  },
                  {
                    "title": "姓名",
                    "field": "name",
                    "width": 120,
                    "align": "center",
                    "colspan": 1,
                    "rowspan": 1,
                    "checked": true
                  },
                  {
                    "title": "性别",
                    "field": "gender",
                    "width": 80,
                    "align": "center",
                    "colspan": 1,
                    "rowspan": 1,
                    "checked": true
                  },
                  {
                    "title": "数量",
                    "field": "count",
                    "width": 100,
                    "align": "center",
                    "colspan": 1,
                    "rowspan": 1,
                    "checked": true
                  },
                  {
                    "title": "金额",
                    "field": "amount",
                    "width": 170,
                    "align": "center",
                    "colspan": 1,
                    "rowspan": 1,
                    "checked": true
                  }
                ]
              ]
            },
            "printElementType": {
              "title": "表格",
              "type": "tableCustom"
            }
          }
        ],
        "paperNumberLeft": 565.5,
        "paperNumberTop": 819
      }
    ]
  }
};

export const generateTableData = (count) => {
  const surnames = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '梁', '郑', '罗', '宋', '谢', '唐', '韩', '曹', '许', '邓', '萧'];
  const maleNames = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超', '刚', '建华', '文', '辉', '波', '建国', '浩', '宇', '鹏', '斌'];
  const femaleNames = ['芳', '娜', '秀英', '敏', '静', '丽', '艳', '霞', '桂英', '玉兰', '慧', '秀兰', '婷', '雪', '梅', '玲', '红', '燕', '莉', '云'];

  const data = [];
  const usedNames = new Set();

  for (let i = 1; i <= count; i++) {
    let name, gender;

    // 随机选择性别
    gender = Math.random() > 0.5 ? '男' : '女';

    // 根据性别生成姓名
    do {
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const nameList = gender === '男' ? maleNames : femaleNames;
      const givenName = nameList[Math.floor(Math.random() * nameList.length)];
      name = surname + givenName;
    } while (usedNames.has(name));

    usedNames.add(name);

    // 生成更真实的数据
    const count = Math.floor(Math.random() * 500) + 1;
    const amount = Math.floor(Math.random() * 50000) + 1000; // 1000-51000

    data.push({
      id: i,
      name: name,
      gender: gender,
      count: count,
      amount: amount,
    });
  }

  return data;
};