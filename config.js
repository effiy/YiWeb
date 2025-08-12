const ENV = 'prod';

// 基础端点（保持原有行为）
window.DATA_URL = {
    local: 'http://localhost:9000',
    prod: 'https://data.effiy.cn',
}[ENV];

window.API_URL = {
    local: 'http://localhost:8000',
    prod: 'https://api.effiy.cn',
}[ENV];

// 轻量环境信息（供日志与调试使用）
(function exposeEnv() {
    try {
        const params = new URLSearchParams(window.location.search);
        const debugQuery = params.get('debug');
        const debug = debugQuery != null ? debugQuery === 'true' : (function() {
            const stored = localStorage.getItem('debug');
            if (stored != null) return stored === 'true';
            const host = location.hostname;
            return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
        })();
        window.__ENV__ = {
            name: ENV,
            isLocal: ENV === 'local',
            isProd: ENV === 'prod',
            DEBUG: debug,
            DATA_URL: window.DATA_URL,
            API_URL: window.API_URL,
        };
        // 控制台提示一次
        if (window.__ENV__ && window.__ENV__.DEBUG) {
            console.info('[ENV] DEBUG 已开启');
        }
    } catch (e) {
        // 静默失败，不影响功能
    }
})();
