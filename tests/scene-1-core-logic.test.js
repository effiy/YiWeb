/**
 * 场景-1: 核心业务逻辑测试
 * 覆盖: log.js, error.js, config.js, validation.js, createBaseView
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================
// 日志系统 (log.js)
// ============================================================
describe('日志系统 (log.js)', () => {
  let consoleSpy;

  beforeEach(() => {
    window.__ENV__ = { DEBUG: true, name: 'test', isLocal: true };
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logInfo 在 DEBUG 模式下输出 info 日志', async () => {
    const { logInfo } = await import('/cdn/utils/core/log.js');
    logInfo('test message');
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it('logError 始终输出错误日志', async () => {
    window.__ENV__ = { DEBUG: false, name: 'prod', isLocal: false };
    const { logError } = await import('/cdn/utils/core/log.js');
    logError('critical error');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('logWarn 在 DEBUG=false 时不输出', async () => {
    window.__ENV__ = { DEBUG: false, name: 'prod', isLocal: false };
    const { logWarn } = await import('/cdn/utils/core/log.js');
    logWarn('warning');
    expect(consoleSpy.warn).not.toHaveBeenCalled();
  });

  it('空值输入不抛出异常', async () => {
    const { logInfo, logWarn, logError } = await import('/cdn/utils/core/log.js');
    expect(() => logInfo(null)).not.toThrow();
    expect(() => logWarn(undefined)).not.toThrow();
    expect(() => logError(null)).not.toThrow();
  });
});

// ============================================================
// 错误处理 (error.js)
// ============================================================
describe('错误处理 (error.js)', () => {
  let ErrorCodes, ErrorTypes, createError, safeExecute;

  beforeEach(async () => {
    const mod = await import('/cdn/utils/core/error.js');
    ErrorCodes = mod.ErrorCodes;
    ErrorTypes = mod.ErrorTypes;
    createError = mod.createError;
    safeExecute = mod.safeExecute;
  });

  it('ErrorCodes 包含标准错误码', () => {
    expect(ErrorCodes).toHaveProperty('UNKNOWN');
    expect(ErrorCodes).toHaveProperty('COMPONENT_LOAD_TIMEOUT');
    expect(ErrorCodes).toHaveProperty('MODULE_LOAD_FAILED');
  });

  it('ErrorTypes 包含 RUNTIME / NETWORK / VALIDATION / API', () => {
    expect(ErrorTypes).toHaveProperty('RUNTIME');
    expect(ErrorTypes).toHaveProperty('NETWORK');
    expect(ErrorTypes).toHaveProperty('VALIDATION');
    expect(ErrorTypes).toHaveProperty('API');
  });

  it('createError 创建带元数据的错误', () => {
    const err = createError('test msg', ErrorTypes.RUNTIME, 'test-module', ErrorCodes.UNKNOWN);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('test msg');
  });

  it('safeExecute 异常时返回错误对象', () => {
    const result = safeExecute(() => { throw new Error('boom'); }, 'test-op');
    expect(result).toBeDefined();
    expect(result.type || result.code).toBeDefined();
  });

  it('safeExecute 正常时返回函数结果', () => {
    const result = safeExecute(() => 'success', 'test-op');
    expect(result).toBe('success');
  });
});

// ============================================================
// 配置管理 (config.js)
// ============================================================
describe('配置管理 (config.js)', () => {
  let storage;
  const reloadModule = async () => {
    // 使用动态查询参数绕过 ESM 缓存
    return import('/src/core/config.js?' + Date.now() + Math.random());
  };

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => storage[k] ?? null),
      setItem: vi.fn((k, v) => { storage[k] = v; }),
      removeItem: vi.fn((k) => { delete storage[k]; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认环境为 prod', async () => {
    const { default: config } = await reloadModule();
    expect(config.env).toBe('prod');
    expect(config.isProd).toBe(true);
  });

  it('buildApiUrl 拼接 API URL', async () => {
    const { buildApiUrl } = await reloadModule();
    expect(buildApiUrl('/api/test')).toContain('effiy.cn');
  });

  it('buildDataUrl 空路径返回 base URL', async () => {
    const { buildDataUrl } = await reloadModule();
    expect(buildDataUrl('')).toBe('https://data.effiy.cn');
  });

  it('buildApiUrl 完整 HTTP URL 直接返回', async () => {
    const { buildApiUrl } = await reloadModule();
    expect(buildApiUrl('https://other.example.com/path')).toBe('https://other.example.com/path');
  });

  it('buildApiUrl 处理 null 返回 base URL', async () => {
    const { buildApiUrl } = await reloadModule();
    const url = buildApiUrl(null);
    expect(url).toContain('effiy.cn');
  });

  it('buildDataUrl 处理 undefined 返回 base URL', async () => {
    const { buildDataUrl } = await reloadModule();
    expect(buildDataUrl(undefined)).toContain('data.effiy.cn');
  });
});

// ============================================================
// createBaseView 视图工厂
// ============================================================
describe('createBaseView 视图工厂', () => {
  beforeEach(() => {
    vi.stubGlobal('Vue', {
      createApp: vi.fn(() => ({
        config: {},
        mount: vi.fn(() => ({})),
        component: vi.fn(),
        use: vi.fn(),
      })),
      ref: vi.fn((val) => ({ value: val, __v_isRef: true })),
      computed: vi.fn((fn) => ({ value: fn() })),
      isRef: vi.fn(() => false),
      provide: vi.fn(),
    });
    document.body.innerHTML = '<div id="app"><p>hello</p></div>';
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('导出为函数', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    expect(typeof createBaseView).toBe('function');
  });

  it('缺少 createStore 时抛出错误', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    await expect(createBaseView({})).rejects.toThrow();
  });

  it('缺少 useComputed 时抛出错误', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    await expect(createBaseView({
      createStore: () => ({}),
    })).rejects.toThrow();
  });

  it('缺少 useMethods 时抛出错误', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    await expect(createBaseView({
      createStore: () => ({}),
      useComputed: () => ({}),
    })).rejects.toThrow();
  });

  it('挂载到不存在选择器时抛出错误', async () => {
    document.body.innerHTML = '';
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    await expect(createBaseView({
      createStore: () => ({}),
      useComputed: () => ({}),
      useMethods: () => ({}),
      selector: '#nonexistent',
    })).rejects.toThrow();
  });

  it('传入完整参数成功挂载', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    const store = { count: { value: 0, __v_isRef: true } };
    const app = await createBaseView({
      createStore: () => store,
      useComputed: (s) => ({ double: { value: s.count.value * 2 } }),
      useMethods: () => ({ inc() {} }),
    });
    expect(app).toBeDefined();
  });

  it('extraData 注入为响应式数据', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    const store = { count: { value: 0, __v_isRef: true } };
    const app = await createBaseView({
      createStore: () => store,
      useComputed: () => ({}),
      useMethods: () => ({}),
      data: { customProp: 'customValue' },
    });
    expect(app).toBeDefined();
  });

  it('extraComputed 注入计算属性', async () => {
    const { createBaseView } = await import('/cdn/utils/view/baseView.js');
    const store = { count: { value: 5, __v_isRef: true } };
    const app = await createBaseView({
      createStore: () => store,
      useComputed: () => ({}),
      useMethods: () => ({}),
      computed: {
        doubled() { return this.count.value * 2; },
      },
    });
    expect(app).toBeDefined();
  });
});

// ============================================================
// waitForComponents
// ============================================================
describe('waitForComponents', () => {
  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('logError', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('空数组直接 resolve', async () => {
    const { waitForComponents } = await import('/cdn/utils/view/baseView.js');
    await expect(waitForComponents([])).resolves.toBeUndefined();
  });

  it('已就绪组件立即完成', async () => {
    window.TestComp = { name: 'TestComp' };
    const { waitForComponents } = await import('/cdn/utils/view/baseView.js');
    await expect(waitForComponents(['TestComp'])).resolves.toBeUndefined();
    delete window.TestComp;
  });
});
