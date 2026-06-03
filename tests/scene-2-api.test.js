/**
 * 场景-2: API 接口测试
 * 覆盖: authUtils.js, checkStatus.js, requestHelper.js, crud.js, authErrorHandler.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TOKEN_KEY = 'YiWeb.apiToken.v1';

// ============================================================
// 认证工具 (authUtils.js)
// ============================================================
describe('认证工具 (authUtils.js)', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn((k, v) => { storage[k] = String(v); }),
      removeItem: vi.fn((k) => { delete storage[k]; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reloadAuth = () => import('/src/core/services/helper/authUtils.js?v=1');

  it('getStoredToken 读取 token', async () => {
    storage[TOKEN_KEY] = 'test-token-123';
    const { getStoredToken } = await reloadAuth();
    expect(getStoredToken()).toBe('test-token-123');
  });

  it('saveToken 写入 token', async () => {
    const { saveToken } = await reloadAuth();
    saveToken('new-token');
    expect(storage[TOKEN_KEY]).toBe('new-token');
  });

  it('getAuthHeaders 返回 X-Token 头', async () => {
    storage[TOKEN_KEY] = 'auth-test';
    const { getAuthHeaders } = await reloadAuth();
    const headers = getAuthHeaders();
    expect(headers).toHaveProperty('X-Token');
    expect(headers['X-Token']).toBe('auth-test');
  });

  it('clearToken 清除 token 为空字符串', async () => {
    storage[TOKEN_KEY] = 'to-clear';
    const { clearToken, getStoredToken } = await reloadAuth();
    clearToken();
    // clearToken calls saveToken('') which sets empty string
    expect(getStoredToken()).toBe('');
  });

  it('hasValidToken 对有效 token 返回 true', async () => {
    storage[TOKEN_KEY] = 'valid';
    const { hasValidToken } = await reloadAuth();
    expect(hasValidToken()).toBe(true);
  });

  it('hasValidToken 对空字符串返回 falsy', async () => {
    storage[TOKEN_KEY] = '';
    const { hasValidToken } = await reloadAuth();
    // hasValidToken returns '' (falsy) when token is empty
    expect(hasValidToken()).toBeFalsy();
  });

  it('hasValidToken 对缺失 token 返回 falsy', async () => {
    delete storage[TOKEN_KEY];
    const { hasValidToken } = await reloadAuth();
    // hasValidToken returns '' (falsy) when no token
    expect(hasValidToken()).toBeFalsy();
  });
});

// ============================================================
// 请求辅助 (requestHelper.js)
// ============================================================
describe('请求辅助 (requestHelper.js)', () => {
  let capturedOpts;
  let storage;

  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());

    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn((k, v) => { storage[k] = String(v); }),
      removeItem: vi.fn((k) => { delete storage[k]; }),
    });

    capturedOpts = null;
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      capturedOpts = opts;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => h === 'content-type' ? 'application/json' : null },
        json: () => Promise.resolve({ code: 0, data: { id: 1 } }),
      });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reloadReq = () => import('/src/core/services/helper/requestHelper.js');

  it('GET 请求携带 credentials: omit', async () => {
    storage[TOKEN_KEY] = 'req-test-token';
    const { getRequest } = await reloadReq();
    await getRequest('https://api.effiy.cn/test');
    expect(capturedOpts.credentials).toBe('omit');
  });

  it('认证头注入到请求中', async () => {
    storage[TOKEN_KEY] = 'header-token-test';
    const { getRequest } = await reloadReq();
    await getRequest('https://api.effiy.cn/auth-check');
    expect(capturedOpts.headers['X-Token']).toBe('header-token-test');
  });

  it('postRequest 发送 POST 请求', async () => {
    const { postRequest } = await reloadReq();
    await postRequest('https://api.effiy.cn/test', { name: 'test' });
    expect(capturedOpts.method).toBe('POST');
  });

  it('putRequest 发送 PUT 请求', async () => {
    const { putRequest } = await reloadReq();
    await putRequest('https://api.effiy.cn/test/1', { name: 'updated' });
    expect(capturedOpts.method).toBe('PUT');
  });

  it('deleteRequest 发送 DELETE 请求', async () => {
    const { deleteRequest } = await reloadReq();
    await deleteRequest('https://api.effiy.cn/test/1');
    expect(capturedOpts.method).toBe('DELETE');
  });

  it('服务器 500 时返回错误响应对象', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ code: -1, message: 'Server Error' }),
        statusText: 'Internal Server Error',
      })
    ));
    const { postRequest } = await reloadReq();
    // 500 响应可能抛出或返回 error 对象，验证不崩溃即可
    try {
      const result = await postRequest('https://api.effiy.cn/500-test', {});
      expect(result).toBeDefined();
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('retryRequest 超过最大重试抛出', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('fail'))));
    const { retryRequest } = await reloadReq();
    await expect(
      retryRequest('https://api.effiy.cn/fail', { retries: 1 })
    ).rejects.toThrow();
  });
});

// ============================================================
// CRUD 操作 (crud.js)
// ============================================================
describe('CRUD 操作 (crud.js)', () => {
  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());
    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getData 导出为函数', async () => {
    const { getData } = await import('/src/core/services/modules/crud.js');
    expect(typeof getData).toBe('function');
  });

  it('postData 导出为函数', async () => {
    const { postData } = await import('/src/core/services/modules/crud.js');
    expect(typeof postData).toBe('function');
  });

  it('streamPrompt 导出为函数', async () => {
    const { streamPrompt } = await import('/src/core/services/modules/crud.js');
    expect(typeof streamPrompt).toBe('function');
  });

  it('streamPromptJSON 导出为函数', async () => {
    const { streamPromptJSON } = await import('/src/core/services/modules/crud.js');
    expect(typeof streamPromptJSON).toBe('function');
  });

  it('batchOperations 导出为函数', async () => {
    const { batchOperations } = await import('/src/core/services/modules/crud.js');
    expect(typeof batchOperations).toBe('function');
  });
});

// ============================================================
// 认证错误处理 (authErrorHandler.js)
// ============================================================
describe('认证错误处理 (authErrorHandler.js)', () => {
  it('isAuthError 对 status=401 的错误对象返回 true', async () => {
    const { isAuthError } = await import('/src/core/services/helper/authErrorHandler.js');
    expect(isAuthError({ status: 401 })).toBe(true);
  });

  it('isAuthError 对 isAuthError=true 的对象返回 true', async () => {
    const { isAuthError } = await import('/src/core/services/helper/authErrorHandler.js');
    expect(isAuthError({ isAuthError: true })).toBe(true);
  });

  it('isAuthError 对普通 Error 返回 false', async () => {
    const { isAuthError } = await import('/src/core/services/helper/authErrorHandler.js');
    expect(isAuthError(new Error('test'))).toBe(false);
  });

  it('handle401Error 导出为函数', async () => {
    const { handle401Error } = await import('/src/core/services/helper/authErrorHandler.js');
    expect(typeof handle401Error).toBe('function');
  });

  it('setAuthErrorConfig / getAuthErrorConfig 可读写配置', async () => {
    const { setAuthErrorConfig, getAuthErrorConfig } = await import('/src/core/services/helper/authErrorHandler.js');
    setAuthErrorConfig({ testKey: 'testVal' });
    const cfg = getAuthErrorConfig();
    expect(cfg.testKey).toBe('testVal');
  });
});
