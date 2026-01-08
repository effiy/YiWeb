// API 模块入口文件 - 全局变量版本
// 作者：liangliang

// 注意：此文件已转换为全局变量方式，避免ES6模块语法错误
// API函数将通过其他API文件以全局变量方式暴露
console.log('[APIs] API模块聚合文件已加载');

// ES6模块导出（用于模块环境）
// 重新导出所有API函数，确保模块导入正常工作

// 从checkStatus.js导出
export { checkStatus, isJsonResponse } from './helper/checkStatus.js';

// 从requestHelper.js导出
export {
    getRequest,
    postRequest,
    putRequest,
    patchRequest,
    deleteRequest,
    sendRequest,
    batchRequests,
    retryRequest,
    CachedRequest,
    createCachedRequest
} from './helper/requestHelper.js';

// 从crud.js导出
export {
    getData,
    postData,
    updateData,
    patchData,
    deleteData,
    streamPrompt,
    batchOperations,
    CacheManager
} from './modules/crud.js';

// 从authUtils.js导出
export {
    getStoredToken,
    saveToken,
    getAuthHeaders,
    clearToken,
    hasValidToken
} from './helper/authUtils.js';

// 从authErrorHandler.js导出
export {
    handle401Error,
    isAuthError,
    clearToken as clearTokenFromHandler,
    setAuthErrorConfig,
    getAuthErrorConfig,
    reset401Handler
} from './helper/authErrorHandler.js';

// 从business/businessProcessManager.js导出
export {
    BusinessProcessManager,
    businessProcessManager
} from './business/businessProcessManager.js';

// 从business/businessScenarioAnalyzer.js导出
export {
    BusinessScenarioAnalyzer,
    businessScenarioAnalyzer
} from './business/businessScenarioAnalyzer.js';
