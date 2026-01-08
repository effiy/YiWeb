/**
 * Goals Service
 * 处理所有与 Goals (mongodb cname=goals) 相关的 API 请求
 * 遵循 YiAi 最佳实践：使用通用服务接口 services.database.data_service
 */

import { getData, postData } from './crud.js';

// 常量定义
const CNAME = 'goals';
const SERVICE_MODULE = 'services.database.data_service';

/**
 * 构建通用服务请求 URL (GET)
 * @param {string} methodName 
 * @param {Object} params 
 * @returns {string}
 */
const buildServiceUrl = (methodName, params) => {
    const parameters = JSON.stringify(params);
    return `${window.API_URL}/?module_name=${SERVICE_MODULE}&method_name=${methodName}&parameters=${encodeURIComponent(parameters)}`;
};

/**
 * 目标服务模块
 */
export const GoalsService = {
    /**
     * 获取目标列表
     * @param {Object} params - 查询参数
     * @param {string|number} [params.year] - 年份
     * @param {string} [params.quarter] - 季度 (e.g. "Q1")
     * @param {string|number} [params.month] - 月份
     * @param {string|number} [params.week] - 周
     * @param {string|number} [params.day] - 日
     * @param {Object} [options] - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async getList(params = {}, options = {}) {
        const payload = {
            cname: CNAME,
            ...params
        };

        const url = buildServiceUrl('query_documents', payload);
        return getData(url, options);
    },

    /**
     * 创建目标
     * @param {Object} data - 目标数据
     * @returns {Promise<Object>} 响应数据
     */
    async create(data) {
        const payload = {
            module_name: SERVICE_MODULE,
            method_name: 'create_document',
            parameters: {
                cname: CNAME,
                data: data
            }
        };
        // 使用 POST 请求发送到根路径
        return postData(`${window.API_URL}/`, payload);
    },

    /**
     * 更新目标
     * @param {string} key - 目标 Key
     * @param {Object} data - 更新数据
     * @returns {Promise<Object>} 响应数据
     */
    async update(key, data) {
        if (!key) throw new Error('Update requires a key');
        const payload = {
            module_name: SERVICE_MODULE,
            method_name: 'update_document',
            parameters: {
                cname: CNAME,
                data: { ...data, key }
            }
        };
        return postData(`${window.API_URL}/`, payload);
    },

    /**
     * 删除目标
     * @param {string} key - 目标 Key
     * @returns {Promise<Object>} 响应数据
     */
    async delete(key) {
        if (!key) throw new Error('Delete requires a key');
        const payload = {
            module_name: SERVICE_MODULE,
            method_name: 'delete_document',
            parameters: {
                cname: CNAME,
                id: key
            }
        };
        return postData(`${window.API_URL}/`, payload);
    }
};
