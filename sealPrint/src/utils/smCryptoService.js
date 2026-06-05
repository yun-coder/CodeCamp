// sm加解密工具类

import { sm2 } from 'sm-crypto';

const smCryptoService = {
  /**
   * 生成 SM2 密钥对
   */
  generateKeyPair() {
    const keyPair = sm2.generateKeyPairHex();
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  },

  /**
   * 使用公钥加密
   * @param {string} publicKey 公钥
   * @param {string|Object} msg 要加密的数据（支持字符串或对象）
   * @returns {string} 加密后的字符串
   */
  encrypt(publicKey, msg) {
    let data = msg;
    if (typeof msg !== 'string') {
      data = JSON.stringify(msg);
    }
    const cipherMode = 1; // C1C3C2 格式
    const encrypted = sm2.doEncrypt(data, publicKey, cipherMode);
    return '04' + encrypted; // 添加前缀 04（兼容常见格式）
  },

  /**
   * 使用私钥解密
   * @param {string} privateKey 私钥
   * @param {string} cipherText 密文
   * @returns {string} 解密后的明文
   */
  decrypt(privateKey, cipherText) {
    let encrypted = cipherText;
    if (typeof cipherText !== 'string') {
      encrypted = JSON.stringify(cipherText);
    }
    const cipherMode = 1; // C1C3C2 格式
    const cleanedCipher = encrypted.substring(2); // 去掉 04 前缀
    return sm2.doDecrypt(cleanedCipher, privateKey, cipherMode);
  }
};

export default smCryptoService;
