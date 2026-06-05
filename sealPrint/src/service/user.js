import { httpPost, httpGet } from '@/utils/request.js';
import { user } from './api.js';

export function staffGET(data) {
    return httpGet(user.staffGET, data);
}
export function staffAllPageCode(data) {
    return httpPost(user.staffAllPageCode, data);
}
export function staffByPageCode(data) {
    return httpPost(user.staffByPageCode, data);
}
export function staffGroupPageCode(data) {
    return httpPost(user.staffGroupPageCode, data);
}

export default {
    staffGET,
    staffAllPageCode,
    staffByPageCode,
    staffGroupPageCode,
};
