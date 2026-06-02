/**
 * YiWeb 自主测试框架
 * 零依赖，浏览器原生 ESM。结果同步输出 console + DOM。
 *
 * API:
 *   describe(name, fn)          — 测试组
 *   describe.skip(name, fn)     — 跳过此组
 *   describe.only(name, fn)     — 仅运行此组
 *   it(name, fn)                — 测试用例 (支持 async)
 *   it.skip(name, fn)           — 跳过此用例
 *   it.only(name, fn)           — 仅运行此用例
 *   beforeEach(fn)              — 每个 it 前执行
 *   afterEach(fn)               — 每个 it 后执行
 *   expect(actual) → matchers   — 断言
 *   run(containerId)            — 输出结果
 */

const results = [];
const _suites = [];
let _currentSuite = null;
let _onlyMode = false;
let _onlySuites = new Set();

/* ── 内部: Suite 对象 ── */
function _makeSuite(name) {
    return {
        name,
        tests: [],
        befores: [],
        afters: [],
        skip: false,
        only: false,
    };
}

/* ── describe ── */
function describe(name, fn) {
    const suite = _makeSuite(name);
    _suites.push(suite);
    const prev = _currentSuite;
    _currentSuite = suite;
    try { fn(); } catch (e) {
        suite.tests.push({ name: 'describe 异常', fn: () => { throw e; }, skip: false });
    }
    _currentSuite = prev;
}
describe.skip = function (name, fn) {
    const suite = _makeSuite(name);
    suite.skip = true;
    _suites.push(suite);
};
describe.only = function (name, fn) {
    _onlyMode = true;
    const suite = _makeSuite(name);
    suite.only = true;
    _onlySuites.add(suite);
    _suites.push(suite);
    const prev = _currentSuite;
    _currentSuite = suite;
    try { fn(); } catch (e) {
        suite.tests.push({ name: 'describe 异常', fn: () => { throw e; }, skip: false });
    }
    _currentSuite = prev;
};

/* ── it ── */
function it(name, fn) {
    if (!_currentSuite) return;
    _currentSuite.tests.push({ name, fn, skip: false, only: false });
}
it.skip = function (name, _fn) {
    if (!_currentSuite) return;
    _currentSuite.tests.push({ name, fn: () => {}, skip: true, only: false });
};
it.only = function (name, fn) {
    if (!_currentSuite) return;
    _onlyMode = true;
    _currentSuite.tests.push({ name, fn, skip: false, only: true });
    if (!_onlySuites.has(_currentSuite)) _onlySuites.add(_currentSuite);
};

/* ── before/after hooks ── */
function beforeEach(fn) {
    if (_currentSuite) _currentSuite.befores.push(fn);
}
function afterEach(fn) {
    if (_currentSuite) _currentSuite.afters.push(fn);
}

/* ── expect ── */
function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) throw new Error(`期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
        },
        toEqual(expected) {
            const a = JSON.stringify(actual), b = JSON.stringify(expected);
            if (a !== b) throw new Error(`期望 ${b}\n实际 ${a}`);
        },
        toMatch(pattern) {
            if (!pattern.test(actual)) throw new Error(`期望匹配 ${pattern}，实际 ${JSON.stringify(actual)}`);
        },
        toBeTruthy() { if (!actual) throw new Error(`期望 truthy，实际 ${actual}`); },
        toBeFalsy() { if (actual) throw new Error(`期望 falsy，实际 ${actual}`); },
        toBeNull() { if (actual !== null) throw new Error(`期望 null，实际 ${actual}`); },
        toBeUndefined() { if (actual !== undefined) throw new Error(`期望 undefined，实际 ${actual}`); },
        toContain(item) {
            if (!actual || !actual.includes(item)) throw new Error(`期望包含 ${JSON.stringify(item)}，实际 ${JSON.stringify(actual)}`);
        },
        toHaveLength(len) {
            if (!actual || actual.length !== len) throw new Error(`期望长度 ${len}，实际 ${actual ? actual.length : '无 length'}`);
        },
        toBeGreaterThan(n) { if (!(actual > n)) throw new Error(`期望 > ${n}，实际 ${actual}`); },
        toBeGreaterThanOrEqual(n) { if (!(actual >= n)) throw new Error(`期望 >= ${n}，实际 ${actual}`); },
        toBeLessThan(n) { if (!(actual < n)) throw new Error(`期望 < ${n}，实际 ${actual}`); },
        toBeLessThanOrEqual(n) { if (!(actual <= n)) throw new Error(`期望 <= ${n}，实际 ${actual}`); },
        toBeInstanceOf(cls) {
            if (!(actual instanceof cls)) throw new Error(`期望 instance of ${cls.name}，实际 ${typeof actual}`);
        },
        toBeTypeOf(type) {
            if (typeof actual !== type) throw new Error(`期望 typeof ${type}，实际 ${typeof actual}`);
        },
    };
}

/* ── run ── */
function run(containerId) {
    // 如果处于 only 模式，过滤掉非 only 的 suites
    let suitesToRun = _suites;
    if (_onlyMode) {
        suitesToRun = _suites.filter(s => s.only || _onlySuites.has(s));
    }

    // 收集并运行所有测试
    const suiteStart = performance.now();
    let total = 0, passed = 0, failed = 0, skipped = 0;

    for (const suite of suitesToRun) {
        if (suite.skip && !suite.only) { skipped += suite.tests.length; continue; }
        for (const test of suite.tests) {
            if (test.skip) { skipped++; results.push({ suite: suite.name, name: test.name, passed: true, skipped: true, duration: 0, error: null }); continue; }
            total++;
            const t0 = performance.now();
            try {
                // 运行 beforeEach hooks
                for (const b of suite.befores) b();
                // 运行测试
                const ret = test.fn();
                // 支持 async
                if (ret && typeof ret.then === 'function') {
                    const t1 = performance.now();
                    const dur = +(t1 - t0).toFixed(1);
                    ret.then(() => {
                        for (const a of suite.afters) a();
                        results.push({ suite: suite.name, name: test.name, passed: true, skipped: false, duration: dur, error: null });
                        console.log(`%c[TEST] %c✓%c ${suite.name} › ${test.name} %c${dur}ms`,
                            'color:#64748b', 'color:#22c55e', 'color:#94a3b8', 'color:#64748b;font-size:11px');
                    }).catch(err => {
                        failed++; passed--;
                        for (const a of suite.afters) { try { a(); } catch (_) {} }
                        const t2 = performance.now();
                        const dur2 = +(t2 - t0).toFixed(1);
                        results.push({ suite: suite.name, name: test.name, passed: false, skipped: false, duration: dur2, error: err.message || String(err) });
                        console.error(`%c[TEST] %c✗%c ${suite.name} › ${test.name} %c${dur2}ms`,
                            'color:#64748b', 'color:#ef4444', 'color:#94a3b8', 'color:#64748b;font-size:11px', err);
                    });
                    continue;
                }
                for (const a of suite.afters) a();
                const t1 = performance.now();
                const dur = +(t1 - t0).toFixed(1);
                passed++;
                results.push({ suite: suite.name, name: test.name, passed: true, skipped: false, duration: dur, error: null });
                console.log(`%c[TEST] %c✓%c ${suite.name} › ${test.name} %c${dur}ms`,
                    'color:#64748b', 'color:#22c55e', 'color:#94a3b8', 'color:#64748b;font-size:11px');
            } catch (err) {
                failed++;
                for (const a of suite.afters) { try { a(); } catch (_) {} }
                const t1 = performance.now();
                const dur2 = +(t1 - t0).toFixed(1);
                results.push({ suite: suite.name, name: test.name, passed: false, skipped: false, duration: dur2, error: err.message || String(err) });
                console.error(`%c[TEST] %c✗%c ${suite.name} › ${test.name} %c${dur2}ms`,
                    'color:#64748b', 'color:#ef4444', 'color:#94a3b8', 'color:#64748b;font-size:11px', err);
            }
        }
    }

    const suiteDur = +(performance.now() - suiteStart).toFixed(1);
    const nonSkipped = results.filter(r => !r.skipped);
    const finalPassed = nonSkipped.filter(r => r.passed).length;
    const finalFailed = nonSkipped.filter(r => !r.passed).length;
    const slowest = [...nonSkipped].sort((a, b) => b.duration - a.duration).slice(0, 5);

    console.log(`\n%c[TEST] ════════ ${finalPassed}/${nonSkipped.length} 通过 · ${suiteDur}ms · ${skipped} 跳过 ════════`,
        `color:${finalFailed ? '#ef4444' : '#22c55e'};font-weight:700`);
    if (slowest.length) {
        console.log(`%c[TEST] 最慢测试:`, 'color:#64748b',
            slowest.map(s => `\n  ${s.suite} › ${s.name} (${s.duration}ms)`).join(''));
    }

    /* ── DOM 输出 ── */
    if (containerId && typeof document !== 'undefined') {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `<div style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.5;padding:16px;max-width:900px;margin:0 auto;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                    <div style="width:48px;height:48px;border-radius:50%;background:${finalFailed ? '#ef444420' : '#22c55e20'};display:flex;align-items:center;justify-content:center;font-size:24px;">${finalFailed ? '✗' : '✓'}</div>
                    <div>
                        <h2 style="margin:0;font-size:16px;">${finalPassed}/${nonSkipped.length} 通过</h2>
                        <div style="color:#64748b;font-size:11px;">${suiteDur}ms · ${skipped} 跳过</div>
                    </div>
                </div>
                ${results.map(r => `
                    <div style="padding:5px 0;border-bottom:1px solid #1e293b;display:flex;align-items:flex-start;gap:8px;color:${r.skipped ? '#64748b' : r.passed ? '#94a3b8' : '#ef4444'};">
                        <span style="flex-shrink:0;">${r.skipped ? '○' : r.passed ? '✓' : '✗'}</span>
                        <div style="flex:1;">
                            <div>${r.suite} › ${r.name} <span style="color:#64748b;font-size:11px;">${r.duration}ms</span></div>
                            ${r.error ? `<pre style="margin:2px 0 0 0;color:#f87171;white-space:pre-wrap;font-size:11px;">${r.error}</pre>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }
    }
    return { total: nonSkipped.length, passed: finalPassed, failed: finalFailed, skipped, duration: suiteDur, results };
}

export { describe, it, beforeEach, afterEach, expect, run, results };
