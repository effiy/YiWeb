/**
 * API接口管理页面脚本
 * 展示接口等待交互功能的使用方法
 * author: liangliang
 */

import { apiLoading, withApiLoading } from '/utils/apiLoading.js';
import { sendRequest, getRequest, postRequest } from '/apis/helper/requestHelper.js';

// Vue应用
const { createApp } = Vue;

createApp({
    data() {
        return {
            // API列表
            apiList: [
                {
                    id: 1,
                    name: '用户信息接口',
                    url: 'https://jsonplaceholder.typicode.com/users/1',
                    method: 'GET',
                    description: '获取用户基本信息'
                },
                {
                    id: 2,
                    name: '创建用户接口',
                    url: 'https://jsonplaceholder.typicode.com/users',
                    method: 'POST',
                    description: '创建新用户'
                },
                {
                    id: 3,
                    name: '更新用户接口',
                    url: 'https://jsonplaceholder.typicode.com/users/1',
                    method: 'PUT',
                    description: '更新用户信息'
                },
                {
                    id: 4,
                    name: '删除用户接口',
                    url: 'https://jsonplaceholder.typicode.com/users/1',
                    method: 'DELETE',
                    description: '删除指定用户'
                }
            ],
            
            // 模态框状态
            showModal: false,
            editingApi: null,
            
            // 表单数据
            apiForm: {
                name: '',
                url: '',
                method: 'GET',
                description: ''
            }
        };
    },
    
    methods: {
        /**
         * 测试基础请求
         */
        async testBasicRequest() {
            try {
                const result = await withApiLoading(async () => {
                    // 模拟网络延迟
                    await this.delay(2000);
                    return await getRequest('https://jsonplaceholder.typicode.com/users/1');
                }, {
                    message: '正在获取用户信息...',
                    timeout: 10000,
                    showProgress: true,
                    showCancel: true,
                    details: '请求地址: https://jsonplaceholder.typicode.com/users/1\n请求方法: GET'
                });
                
                this.showSuccess('基础请求测试成功！', result);
            } catch (error) {
                this.showError('基础请求测试失败', error.message);
            }
        },
        
        /**
         * 测试进度请求
         */
        async testProgressRequest() {
            try {
                const requestId = apiLoading.generateRequestId();
                
                apiLoading.show(requestId, {
                    message: '正在处理数据...',
                    timeout: 15000,
                    showProgress: true,
                    showCancel: true,
                    details: '模拟数据处理进度'
                });
                
                // 模拟进度更新
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(progressInterval);
                    }
                    
                    apiLoading.updateProgress(requestId, progress, `处理进度: ${Math.round(progress)}%`);
                    apiLoading.updateDetails(requestId, `已处理 ${Math.round(progress)}% 的数据...`);
                }, 200);
                
                // 模拟异步操作
                await this.delay(3000);
                
                clearInterval(progressInterval);
                apiLoading.hide(requestId);
                
                this.showSuccess('进度请求测试成功！', { progress: 100 });
            } catch (error) {
                this.showError('进度请求测试失败', error.message);
            }
        },
        
        /**
         * 测试超时请求
         */
        async testTimeoutRequest() {
            try {
                await withApiLoading(async () => {
                    // 模拟长时间请求
                    await this.delay(35000);
                    return { success: true };
                }, {
                    message: '正在处理超时请求...',
                    timeout: 5000, // 5秒超时
                    showProgress: true,
                    showCancel: true,
                    details: '这个请求会在5秒后超时'
                });
            } catch (error) {
                this.showError('超时请求测试', error.message);
            }
        },
        
        /**
         * 测试重试请求
         */
        async testRetryRequest() {
            try {
                let attemptCount = 0;
                
                const result = await withApiLoading(async () => {
                    attemptCount++;
                    
                    // 模拟前两次失败，第三次成功
                    if (attemptCount < 3) {
                        throw new Error(`模拟失败，第${attemptCount}次尝试`);
                    }
                    
                    await this.delay(1000);
                    return { success: true, attempts: attemptCount };
                }, {
                    message: '正在重试请求...',
                    timeout: 30000,
                    showProgress: true,
                    showCancel: true,
                    retries: 3,
                    details: '模拟网络不稳定情况下的重试机制'
                });
                
                this.showSuccess('重试请求测试成功！', result);
            } catch (error) {
                this.showError('重试请求测试失败', error.message);
            }
        },
        
        /**
         * 测试API接口
         */
        async testApi(api) {
            try {
                const options = {
                    message: `正在测试 ${api.name}...`,
                    timeout: 15000,
                    showProgress: true,
                    showCancel: true,
                    details: `请求地址: ${api.url}\n请求方法: ${api.method}`
                };
                
                let result;
                
                switch (api.method) {
                    case 'GET':
                        result = await withApiLoading(() => getRequest(api.url), options);
                        break;
                    case 'POST':
                        result = await withApiLoading(() => postRequest(api.url, { test: true }), options);
                        break;
                    default:
                        result = await withApiLoading(() => sendRequest(api.url, { method: api.method }), options);
                }
                
                this.showSuccess(`${api.name} 测试成功！`, result);
            } catch (error) {
                this.showError(`${api.name} 测试失败`, error.message);
            }
        },
        
        /**
         * 显示添加API模态框
         */
        showAddApiModal() {
            this.editingApi = null;
            this.resetApiForm();
            this.showModal = true;
        },
        
        /**
         * 编辑API
         */
        editApi(api) {
            this.editingApi = api;
            this.apiForm = { ...api };
            this.showModal = true;
        },
        
        /**
         * 删除API
         */
        async deleteApi(api) {
            if (!confirm(`确定要删除 "${api.name}" 吗？`)) {
                return;
            }
            
            try {
                await withApiLoading(async () => {
                    await this.delay(1000); // 模拟删除操作
                    this.apiList = this.apiList.filter(item => item.id !== api.id);
                }, {
                    message: '正在删除接口...',
                    timeout: 10000,
                    showProgress: true,
                    showCancel: false
                });
                
                this.showSuccess('接口删除成功！');
            } catch (error) {
                this.showError('删除失败', error.message);
            }
        },
        
        /**
         * 保存API
         */
        async saveApi() {
            try {
                await withApiLoading(async () => {
                    await this.delay(1000); // 模拟保存操作
                    
                    if (this.editingApi) {
                        // 编辑模式
                        const index = this.apiList.findIndex(item => item.id === this.editingApi.id);
                        if (index !== -1) {
                            this.apiList[index] = { ...this.editingApi, ...this.apiForm };
                        }
                    } else {
                        // 新增模式
                        const newApi = {
                            id: Date.now(),
                            ...this.apiForm
                        };
                        this.apiList.push(newApi);
                    }
                }, {
                    message: '正在保存接口...',
                    timeout: 10000,
                    showProgress: true,
                    showCancel: false
                });
                
                this.hideModal();
                this.showSuccess(this.editingApi ? '接口更新成功！' : '接口添加成功！');
            } catch (error) {
                this.showError('保存失败', error.message);
            }
        },
        
        /**
         * 刷新API列表
         */
        async refreshApiList() {
            try {
                await withApiLoading(async () => {
                    await this.delay(1500); // 模拟刷新操作
                    // 这里可以添加实际的刷新逻辑
                }, {
                    message: '正在刷新接口列表...',
                    timeout: 10000,
                    showProgress: true,
                    showCancel: false
                });
                
                this.showSuccess('接口列表刷新成功！');
            } catch (error) {
                this.showError('刷新失败', error.message);
            }
        },
        
        /**
         * 隐藏模态框
         */
        hideModal() {
            this.showModal = false;
            this.editingApi = null;
            this.resetApiForm();
        },
        
        /**
         * 重置表单
         */
        resetApiForm() {
            this.apiForm = {
                name: '',
                url: '',
                method: 'GET',
                description: ''
            };
        },
        
        /**
         * 延迟函数
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        /**
         * 显示成功消息
         */
        showSuccess(title, data = null) {
            console.log(`✅ ${title}`, data);
            // 这里可以集成消息提示组件
            alert(`${title}\n${data ? JSON.stringify(data, null, 2) : ''}`);
        },
        
        /**
         * 显示错误消息
         */
        showError(title, message) {
            console.error(`❌ ${title}:`, message);
            // 这里可以集成消息提示组件
            alert(`${title}\n${message}`);
        }
    },
    
    mounted() {
        console.log('API接口管理页面已加载');
        
        // 监听取消请求事件
        document.addEventListener('apiLoading:requestsCancelled', () => {
            console.log('用户取消了所有请求');
            this.showError('请求已取消', '用户主动取消了请求');
        });
    }
}).mount('#app');
