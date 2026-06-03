/**
 * 场景-3: 数据持久化测试
 * 覆盖: Token 持久化, env 配置持久化, 缓存管理
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TOKEN_KEY = 'YiWeb.apiToken.v1';

// ============================================================
// Token 持久化
// ============================================================
describe('Token 持久化', () => {
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

  it('saveToken → getStoredToken 往返一致', async () => {
    const { saveToken, getStoredToken } = await reloadAuth();
    saveToken('round-trip-token');
    expect(getStoredToken()).toBe('round-trip-token');
  });

  it('clearToken 后 token 为空字符串', async () => {
    const { saveToken, clearToken, getStoredToken } = await reloadAuth();
    saveToken('temp');
    clearToken();
    expect(getStoredToken()).toBe('');
  });

  it('saveToken 覆盖旧 token', async () => {
    const { saveToken, getStoredToken } = await reloadAuth();
    saveToken('old');
    saveToken('new');
    expect(getStoredToken()).toBe('new');
  });

  it('多次 clearToken 不抛出异常', async () => {
    const { clearToken } = await reloadAuth();
    expect(() => { clearToken(); clearToken(); }).not.toThrow();
  });
});

// ============================================================
// 环境配置持久化
// ============================================================
describe('环境配置持久化', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn((k, v) => { storage[k] = String(v); }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reloadConfig = () => import('/src/core/config.js?' + Date.now() + Math.random());

  it('env 未设置时默认 prod', async () => {
    delete storage['env'];
    const { default: config } = await reloadConfig();
    expect(config.env).toBe('prod');
  });

  it('config 类型正确', async () => {
    const { default: config } = await reloadConfig();
    expect(typeof config.env).toBe('string');
    expect(typeof config.isProd).toBe('boolean');
    expect(typeof config.debug).toBe('boolean');
    expect(typeof config.dataUrl).toBe('string');
    expect(typeof config.apiUrl).toBe('string');
    expect(typeof config.ollamaUrl).toBe('string');
  });

  it('config 所有 URL 均不含末尾斜杠', async () => {
    const { default: config } = await reloadConfig();
    expect(config.dataUrl).not.toMatch(/\/$/);
    expect(config.apiUrl).not.toMatch(/\/$/);
    expect(config.ollamaUrl).not.toMatch(/\/$/);
  });

  it('isLocal 与 env 一致', async () => {
    const { default: config } = await reloadConfig();
    expect(config.isLocal).toBe(config.env === 'local');
    expect(config.isProd).toBe(config.env === 'prod');
  });
});

// ============================================================
// 缓存管理
// ============================================================
describe('缓存管理', () => {
  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());

    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn((k, v) => { storage[k] = String(v); }),
      removeItem: vi.fn((k) => { delete storage[k]; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CachedRequest 构造函数可用', async () => {
    const { CachedRequest, createCachedRequest } = await import('/src/core/services/helper/requestHelper.js');
    expect(typeof CachedRequest).toBe('function');
    expect(typeof createCachedRequest).toBe('function');
  });

  it('CacheManager 导出为可用类', async () => {
    const { CacheManager } = await import('/src/core/services/modules/crud.js');
    expect(CacheManager).toBeDefined();
    expect(typeof CacheManager).toBe('function');
  });

  it('createCachedRequest 创建实例', async () => {
    const { createCachedRequest } = await import('/src/core/services/helper/requestHelper.js');
    const cache = createCachedRequest({ ttl: 60000 });
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
  });
});
