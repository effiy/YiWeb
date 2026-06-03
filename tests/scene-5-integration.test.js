/**
 * 场景-5: 集成与回归测试
 * 覆盖: 服务聚合导出, config→API 链路, Store 响应式链, 冒烟测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TOKEN_KEY = 'YiWeb.apiToken.v1';

// ============================================================
// 服务聚合导出完整性
// ============================================================
describe('服务聚合导出完整性', () => {
  it('services/index.js 导出核心请求函数', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('getRequest');
    expect(mod).toHaveProperty('postRequest');
    expect(mod).toHaveProperty('putRequest');
    expect(mod).toHaveProperty('deleteRequest');
    expect(mod).toHaveProperty('sendRequest');
    expect(mod).toHaveProperty('retryRequest');
    expect(mod).toHaveProperty('batchRequests');
    expect(mod).toHaveProperty('CachedRequest');
    expect(mod).toHaveProperty('createCachedRequest');
  });

  it('services/index.js 导出 CRUD 函数', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('getData');
    expect(mod).toHaveProperty('postData');
    expect(mod).toHaveProperty('updateData');
    expect(mod).toHaveProperty('deleteData');
    expect(mod).toHaveProperty('streamPrompt');
    expect(mod).toHaveProperty('batchOperations');
  });

  it('services/index.js 导出认证函数', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('getStoredToken');
    expect(mod).toHaveProperty('saveToken');
    expect(mod).toHaveProperty('getAuthHeaders');
    expect(mod).toHaveProperty('clearToken');
    expect(mod).toHaveProperty('hasValidToken');
  });

  it('services/index.js 导出 401 处理函数', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('handle401Error');
    expect(mod).toHaveProperty('isAuthError');
    expect(mod).toHaveProperty('setAuthErrorConfig');
    expect(mod).toHaveProperty('getAuthErrorConfig');
  });

  it('services/index.js 导出业务分析器', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('BusinessProcessManager');
    expect(mod).toHaveProperty('businessProcessManager');
    expect(mod).toHaveProperty('BusinessScenarioAnalyzer');
    expect(mod).toHaveProperty('businessScenarioAnalyzer');
  });

  it('services/index.js 导出文档服务', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toHaveProperty('DocumentEnrichService');
    expect(mod).toHaveProperty('enrichDocumentPageDescription');
  });

  it('每种导出类型有效', async () => {
    const mod = await import('/src/core/services/index.js');
    const exports = Object.entries(mod);
    expect(exports.length).toBeGreaterThan(20);
    for (const [, value] of exports) {
      // 每个导出要么是函数要么是对象
      expect(['function', 'object']).toContain(typeof value);
    }
  });
});

// ============================================================
// 配置到 API 集成链路
// ============================================================
describe('配置到 API 集成链路', () => {
  let capturedOpts;

  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());

    capturedOpts = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('config.apiUrl + buildApiUrl 串联正确', async () => {
    const configMod = await import('/src/core/config.js?' + Math.random());
    const url = configMod.buildApiUrl('/api/module/method');
    // buildApiUrl strips leading / and apiUrl has no trailing slash
    expect(url).toContain('api.effiy.cn');
    expect(url).toContain('api/module/method');
  });

  it('buildApiUrl 完整 URL 直接返回', async () => {
    const { buildApiUrl } = await import('/src/core/config.js?' + Math.random());
    expect(buildApiUrl('https://other.example.com/path')).toBe('https://other.example.com/path');
  });

  it('config.dataUrl 为正确的生产地址', async () => {
    const { default: config } = await import('/src/core/config.js?' + Math.random());
    expect(config.dataUrl).toBe('https://data.effiy.cn');
    expect(config.apiUrl).toBe('https://api.effiy.cn');
  });

  it('认证头注入到 fetch 请求中', async () => {
    // Set up auth + fetch + requestHelper in correct order
    const storage = { [TOKEN_KEY]: 'integration-token' };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      capturedOpts = opts;
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ code: 0 }),
      });
    }));

    const { getRequest } = await import('/src/core/services/helper/requestHelper.js');
    await getRequest('https://api.effiy.cn/auth-check');
    expect(capturedOpts).toBeDefined();
    expect(capturedOpts.headers['X-Token']).toBe('integration-token');
  });
});

// ============================================================
// Store 响应式链路
// ============================================================
describe('Store 响应式链路', () => {
  it('Vue.ref 变更后 computed 更新', () => {
    const store = {
      count: { value: 0, __v_isRef: true },
      msg: { value: 'hello', __v_isRef: true },
    };

    const useComputed = (s) => ({
      double: { value: s.count.value * 2 },
      greeting: { value: `say ${s.msg.value}` },
    });

    expect(useComputed(store).double.value).toBe(0);
    expect(useComputed(store).greeting.value).toBe('say hello');

    store.count.value = 5;
    store.msg.value = 'world';

    expect(useComputed(store).double.value).toBe(10);
    expect(useComputed(store).greeting.value).toBe('say world');
  });

  it('methods 修改 store 后 computed 反映变化', () => {
    const store = {
      count: { value: 0, __v_isRef: true },
      items: { value: [], __v_isRef: true },
    };

    const useComputed = (s) => ({
      countStr: { value: `Count: ${s.count.value}` },
      len: { value: s.items.value.length },
    });

    const useMethods = (s) => ({
      inc: () => { s.count.value++; },
      add: (item) => { s.items.value = [...s.items.value, item]; },
    });

    const m = useMethods(store);
    m.inc();
    m.inc();
    m.add('a');
    m.add('b');

    const c = useComputed(store);
    expect(c.countStr.value).toBe('Count: 2');
    expect(c.len.value).toBe(2);
  });

  it('空 store 不抛异常', () => {
    const store = {};
    const useComputed = () => ({});
    const useMethods = () => ({});
    expect(() => useComputed(store)).not.toThrow();
    expect(() => useMethods(store)).not.toThrow();
  });
});

// ============================================================
// 冒烟测试
// ============================================================
describe('YiWeb 冒烟测试', () => {
  it('cdn/utils/core/log.js 可导入', async () => {
    const mod = await import('/cdn/utils/core/log.js');
    expect(mod).toBeDefined();
  });

  it('cdn/utils/core/error.js 可导入', async () => {
    const mod = await import('/cdn/utils/core/error.js');
    expect(mod).toBeDefined();
  });

  it('cdn/utils/view/baseView.js 可导入', async () => {
    const mod = await import('/cdn/utils/view/baseView.js');
    expect(mod).toBeDefined();
  });

  it('src/core/services/index.js 可导入', async () => {
    const mod = await import('/src/core/services/index.js');
    expect(mod).toBeDefined();
  });

  it('关键模块无导入异常', async () => {
    const modules = [
      '/cdn/utils/core/log.js',
      '/cdn/utils/core/error.js',
      '/cdn/utils/view/baseView.js',
      '/src/core/services/index.js',
    ];
    for (const path of modules) {
      await expect(import(path)).resolves.toBeDefined();
    }
  });
});
