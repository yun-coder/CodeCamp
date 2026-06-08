/**
 @description 公共接口
 @author yunLiang
 @date 2025/12/23 10:23
  版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 **/

import {httpPost} from '@/utils/request.js';
import {interfaceApi} from './api.js';


/**
 * @description 上传保存
 * @param data
 * @returns {Promise<AxiosResponse<*>>}
 * @constructor
 */
export function uploadAndSave(data) {
    return httpPost(interfaceApi.uploadAndSave, data);
}

/**
 * @default 根据页面code获取所有页面人员并形成分组
 * @param data
 * @returns {Promise<AxiosResponse<*>>}
 * @constructor
 */
export function staffGroupPageCode(data) {
    return httpPost(interfaceApi.staffGroupPageCode, data);
}

/**
 * @description 查询企业下所有人员
 * @param data
 * @returns {Promise<AxiosResponse<*>>}
 * @constructor
 */
export function staffAllPageCode(data) {
    return httpPost(interfaceApi.staffAllPageCode, data);
}

/**
 * @description 根据页面code查询部门下人员数据
 * @param data
 * @returns {Promise<AxiosResponse<*>>}
 * @constructor
 */
export function staffByPageCode(data){
    return httpPost(interfaceApi.staffByPageCode, data);
}

export default {
    uploadAndSave,
    staffGroupPageCode,
    staffAllPageCode,
    staffByPageCode
}