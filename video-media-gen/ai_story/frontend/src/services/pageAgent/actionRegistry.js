const handlerMap = new Map();

export const pageAgentActionRegistry = {
  register(scopeKey, handlers = {}) {
    if (!scopeKey) {
      return;
    }
    handlerMap.set(scopeKey, handlers);
  },

  unregister(scopeKey) {
    if (!scopeKey) {
      return;
    }
    handlerMap.delete(scopeKey);
  },

  has(scopeKey, action) {
    return Boolean(handlerMap.get(scopeKey)?.[action]);
  },

  async execute(scopeKey, action, params = {}) {
    const handler = handlerMap.get(scopeKey)?.[action];
    if (!handler) {
      throw new Error('当前页面暂不支持这个操作');
    }
    return handler(params);
  },
};
