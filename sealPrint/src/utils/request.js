import axios from 'axios';
import smCrypto from '@utils/smCryptoService.js';

const pendingMap = new Map();

const baseUrl = import.meta.env.VITE_BASE_API_URL;
const service = axios.create({
  baseURL: baseUrl,
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

// 请求拦截器
service.interceptors.request.use((config) => {
  // 删除重复的请求
  removePending(config);

  // 设置相关token
  const token = localStorage.getItem('Authorization');
  const localCode = localStorage.getItem('localCode');
  const secretCode = localStorage.getItem('secretCode');
  const sKey = localStorage.getItem('s_key');

  if (localCode) {
    // 解密token
    const jieToken = smCrypto.decrypt(JSON.parse(localCode).prCode, token);
    if (jieToken) {
      const jiaToken = smCrypto.encrypt(
          JSON.parse(sKey).publicKey,
          Date.now() + '_' + jieToken
      );
      config.headers['Authorization'] = `Bearer ${jiaToken}`;
    }
    if (secretCode) {
      config.headers['key-code'] = secretCode;
    }
  }

  // 文件上传流处理
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

// 响应拦截器
service.interceptors.response.use(
    (response) => {
      // 删除重复的请求
      removePending(response.config);

      // 业务状态码
      if (response.status !== 200) {
        return Promise.reject(response.data);
      }

      // 如果请求类型是blob，直接返回
      if (response.config.responseType === 'blob') {
        return response;
      }

      return response.data;
    },
    (error) => {
      // 删除重复的请求
      removePending(error.config);

      const originalRequest = error.config;
      // originalRequest._retry 当_retry设置为true时，表示当前请求将被重试
      // code === 401 && !originalRequest._retry  判断是否刷新token

      // Http状态码处理
      const statusMap = {
        400: '参数错误',
        401: '身份验证失败，请重新登录',
        403: '权限不足，请联系管理员',
        404: '请求地址不存在',
        408: '请求超时',
        500: '服务器内部错误',
        502: '网关错误',
        503: '服务不可用',
        504: '服务暂时无法访问，请稍后再试',
      };
      error.message = statusMap[error.response?.status] || error.message;

      return Promise.reject(error);
    }
);

// 删除重复的请求
function removePending(config) {
  const pendingKey = getPendingKey(config);
  if (pendingMap.has(pendingKey)) {
    const cancelToken = pendingMap.get(pendingKey);
    cancelToken(pendingKey);
    pendingMap.delete(pendingKey);
  }
}

// 生成唯一请求key
function getPendingKey(config) {
  let { url, method, params, data } = config;
  if (typeof data === 'string') data = JSON.stringify(data);
  return [url, method, JSON.stringify(params), JSON.stringify(data)].join('&');
}

/**
 * 通用请求方法
 * @param options
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
function request(options) {
  return service({
    method: options.method,
    url: options.url,
    data: options.data,
    params: options.params,
    ...options,
  });
}

// post
export function httpPost(url, data, options = {}) {
  return request({
    url,
    data,
    method: 'POST',
    ...options,
  });
}

// get
export function httpGet(url, params, options = {}) {
  return request({
    url,
    params,
    method: 'GET',
    ...options,
  });
}
