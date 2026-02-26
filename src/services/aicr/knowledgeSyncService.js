/**
 * YiKnowledge 文档同步服务
 * 将 YiKnowledge 项目的 Markdown 文档同步到数据库
 */

import { postData } from '/src/services/index.js';
import { safeExecuteAsync } from '/src/utils/core/error.js';

class KnowledgeSyncService {
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
        this.syncScriptUrl = 'https://api.effiy.cn/execute/run-script';
    }

    /**
     * 触发同步脚本
     * @returns {Promise<Object>} 同步结果
     */
    async syncKnowledgeToDatabase() {
        return safeExecuteAsync(async () => {
            try {
                console.log('[KnowledgeSync] 开始同步 YiKnowledge 文档到数据库...');

                // 调用后端执行脚本接口
                const payload = {
                    module_name: 'services.execution.executor',
                    method_name: 'run_script',
                    parameters: {
                        script_path: '/var/www/YiKnowledge/scripts/sync_to_database.py',
                        timeout: 300
                    }
                };

                const response = await postData(this.apiUrl, payload);

                if (response && response.success !== false) {
                    console.log('[KnowledgeSync] 同步成功:', response);

                    // 解析输出信息
                    const data = response.data || response;
                    const stdout = data.stdout || '';
                    const stderr = data.stderr || '';

                    return {
                        success: true,
                        message: '文档同步成功',
                        stdout: stdout,
                        stderr: stderr,
                        data: data
                    };
                } else {
                    throw new Error(response?.message || '同步失败');
                }
            } catch (error) {
                console.error('[KnowledgeSync] 同步失败:', error);
                throw error;
            }
        }, 'YiKnowledge 文档同步');
    }

    /**
     * 查询已同步的文档
     * @param {Object} filter - 查询过滤条件
     * @param {number} limit - 返回数量限制
     * @returns {Promise<Array>} 文档列表
     */
    async queryKnowledgeDocs(filter = {}, limit = 100) {
        return safeExecuteAsync(async () => {
            try {
                const payload = {
                    module_name: 'services.database.data_service',
                    method_name: 'query_documents',
                    parameters: {
                        cname: 'knowledge_docs',
                        filter: filter,
                        limit: limit
                    }
                };

                const response = await postData(this.apiUrl, payload);

                if (response && response.success !== false) {
                    const docs = response.data?.list || response.data || [];
                    console.log(`[KnowledgeSync] 查询到 ${docs.length} 个文档`);
                    return docs;
                } else {
                    throw new Error(response?.message || '查询失败');
                }
            } catch (error) {
                console.error('[KnowledgeSync] 查询文档失败:', error);
                return [];
            }
        }, '查询知识库文档');
    }
}

// 创建单例
let knowledgeSyncServiceInstance = null;

export function getKnowledgeSyncService() {
    if (!knowledgeSyncServiceInstance) {
        knowledgeSyncServiceInstance = new KnowledgeSyncService();
    }
    return knowledgeSyncServiceInstance;
}

// 导出类（用于测试）
export { KnowledgeSyncService };
