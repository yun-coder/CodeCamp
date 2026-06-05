/**
 * 接口地址集合
 * @type {{parse: string}}
 */

// 用户
const user = {
  staffGET: '/staff', // 查询指定员工展示信息
  staffAllPageCode: '/basic/table/staff/get/name/all ', // 查询企业下所有人员
  staffByPageCode: '/basic/table/staff/getStaffNameByPageCode', //查询部门下人员数据-无分页
  staffGroupPageCode: '/basic/table/staff/getUserDepartmentGroupList', // 获取所有页面人员并形成分组
};
// 上传
const upload = {
  uploadAndSave: '/file/upload/uploadAndSave',
};

export { user, upload };