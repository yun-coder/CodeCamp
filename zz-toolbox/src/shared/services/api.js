/**
 @description
 @author yunLiang
 @date 2025/12/23 10:24
  版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 **/

export const interfaceApi = {
    uploadAndSave: '/file/upload/uploadAndSave', // 上传文件
    staffAllPageCode: '/basic/table/staff/get/name/all ', // 查询企业下所有人
    staffGroupPageCode: '/basic/table/staff/getUserDepartmentGroupList', // 根据页面code获取所有页面人员并形成分组
    staffByPageCode: '/basic/table/staff/getStaffNameByPageCode', // 根据页面code查询部门下人员数据
}

export default {
    interfaceApi: interfaceApi
};