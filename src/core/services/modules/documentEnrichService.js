/**
 * Document Enrich Service
 * 补充文档字段信息（pageDescription 等），完善卡片和图谱节点展示
 */

import { postData } from './crud.js';

const SERVICE_MODULE = 'services.database.data_service';

/**
 * 更新文档的 pageDescription 字段
 * @param {Object} params
 * @param {string} params.cname - MongoDB 集合名（如 'sessions'）
 * @param {string} params.filePath - 文件路径，如 "projectName/docs/故事任务面板/story/场景1.md"
 * @param {string} params.pageDescription - AI 生成的摘要内容
 * @param {Object} [params.extraData] - 其他需要更新的字段
 * @returns {Promise<Object>} API 响应
 */
export async function enrichDocumentPageDescription({ cname, filePath, pageDescription, extraData }) {
    const payload = {
        module_name: SERVICE_MODULE,
        method_name: 'update_document',
        parameters: {
            cname,
            file_path: filePath,
            data: {
                pageDescription,
                ...(extraData || {})
            }
        }
    };

    const url = `${window.API_URL}/`;
    return postData(url, payload);
}

/**
 * 批量补充文档字段
 * @param {Array<{cname: string, filePath: string, pageDescription: string, extraData?: Object}>} items
 * @returns {Promise<Array<{filePath: string, success: boolean, error?: string}>>}
 */
export async function batchEnrichDocuments(items) {
    const results = [];
    for (const item of items) {
        try {
            await enrichDocumentPageDescription(item);
            results.push({ filePath: item.filePath, success: true });
        } catch (err) {
            results.push({ filePath: item.filePath, success: false, error: err.message });
        }
    }
    return results;
}

/**
 * 检查文档是否需要补充 pageDescription
 * @param {Object} session - session 对象
 * @returns {boolean}
 */
export function needsEnrichment(session) {
    if (!session) return false;
    const desc = session.pageDescription || '';
    // 没有描述，或描述太简短（只有默认的 "文件：xxx" 格式）
    if (!desc || desc.trim().length < 10) return true;
    if (desc.startsWith('文件：') && desc.length < 50) return true;
    return false;
}

/**
 * 构建 AI 摘要生成 prompt（用于流式生成）
 * @param {Object} node - 图谱节点对象
 * @returns {string} prompt 文本
 */
export function buildEnrichPrompt(node) {
    const type = node.entityType || 'file';
    const name = node.name || '';
    const extra = node.extra || {};

    const typeLabels = {
        project: '项目',
        story: '故事',
        scenario: '场景',
        skill: '技能',
        template: '模板',
        rule: '规则',
        agent: '智能体',
        file: '文件'
    };
    const typeLabel = typeLabels[type] || type;

    return `请为以下${typeLabel}生成一段简洁的中文描述（50-150字），用于知识图谱卡片展示：

名称：${name}
类型：${typeLabel}
${extra.project ? '所属项目：' + extra.project : ''}
${extra.story ? '所属故事：' + extra.story : ''}
${extra.pageDescription ? '原始内容摘要：' + extra.pageDescription.substring(0, 200) : ''}

请直接输出描述文本，不要包含任何前缀或格式标记。`;
}

export const DocumentEnrichService = {
    enrichDocumentPageDescription,
    batchEnrichDocuments,
    needsEnrichment,
    buildEnrichPrompt
};

export default DocumentEnrichService;
