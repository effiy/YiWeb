/**
 * 方法函数组合式
 * 提供与featureCards相关的常用操作方法
 * @author liangliang
 * 
 * @param {Object} store - 状态存储对象（包含featureCards, loading, error等）
 * @returns {Object} 方法集合
 * @description 提供与featureCards相关的常用操作方法
 */

import { getData, postData } from '/apis/index.js';
import { showError, showSuccess } from '/utils/message.js';

  /**
   * 字符串模板替换函数（支持嵌套属性、健壮性更强）
   * @param {string} template - 含有 {{ key }} 占位符的字符串
   * @param {Object} data - 替换用的键值对对象
   * @returns {string} 替换后的字符串
   *
   * 示例：
   *   templateReplace('你好，{{ name }}！', { name: '小明' }) // '你好，小明！'
   *   templateReplace('城市：{{ user.city }}', { user: { city: '北京' } }) // '城市：北京'
   */
  function templateReplace(template, data) {
    if (typeof template !== 'string' || typeof data !== 'object' || data === null) return template;
    return template.replace(/\{\{\s*([\w$.]+)\s*\}\}/g, (match, key) => {
        // 支持嵌套属性，如 user.name.first
        const value = key.split('.').reduce((obj, prop) => (obj && obj[prop] !== undefined ? obj[prop] : undefined), data);
        return value !== undefined && value !== null ? value : match;
    });
  }

export const useMethods = (store) => {
    // 输入法状态标记
    let isComposing = false;
    
    // 延迟处理标记，避免快速连续触发
    let isProcessing = false;

    /**
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link) => {
        window.location.href = link;
    };

    /**
     * 复制卡片对象到剪贴板
     * @param {Object} card - 卡片对象
     * @param {Event} event - 点击事件对象
     */
    const copyCardToClipboard = async (card, event) => {
        // 阻止事件冒泡
        event.preventDefault();
        event.stopPropagation();
        
        // 获取按钮元素
        const button = event.target;
        
        try {
            // 创建要复制的卡片信息对象
            const cardInfo = {
                title: card.title,
                description: card.description,
                icon: card.icon,
                badge: card.badge,
                link: card.link,
                features: card.features || [],
                stats: card.stats || [],
                hint: card.hint,
                footerIcon: card.footerIcon,
                timestamp: new Date().toISOString(),
                source: 'YiWeb功能卡片'
            };
            
            // 转换为格式化的JSON字符串
            const cardJson = JSON.stringify(cardInfo, null, 2);
            
            // 使用现代Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(cardJson);
                
                // 添加复制成功动画
                button.classList.add('copy-success');
                setTimeout(() => {
                    button.classList.remove('copy-success');
                }, 600);
                
                showSuccess(`已复制"${card.title}"卡片信息到剪贴板`);
                console.log('[剪贴板] 成功复制卡片信息:', cardInfo);
            } else {
                // 降级方案：使用传统的document.execCommand
                const textArea = document.createElement('textarea');
                textArea.value = cardJson;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    // 添加复制成功动画
                    button.classList.add('copy-success');
                    setTimeout(() => {
                        button.classList.remove('copy-success');
                    }, 600);
                    
                    showSuccess(`已复制"${card.title}"卡片信息到剪贴板`);
                    console.log('[剪贴板] 成功复制卡片信息(降级方案):', cardInfo);
                } else {
                    throw new Error('复制失败');
                }
            }
        } catch (error) {
            console.error('[剪贴板] 复制卡片信息失败:', error);
            showError('复制失败，请手动复制');
            
            // 备用方案：显示卡片信息供用户手动复制
            const cardInfo = {
                title: card.title,
                description: card.description,
                icon: card.icon,
                badge: card.badge,
                link: card.link,
                features: card.features || [],
                stats: card.stats || [],
                hint: card.hint,
                footerIcon: card.footerIcon
            };
            
            const cardJson = JSON.stringify(cardInfo, null, 2);
            alert(`卡片信息（请手动复制）：\n\n${cardJson}`);
        }
    };

    const generateTask = async (card, feature) => {
        console.log('[生成任务] 生成任务:', card, feature);

        const target = feature.name + '-' + feature.desc;
        const description = card.title + '-' + card.description;

        const systemPromptData = await getData(`${window.DATA_URL}/prompts/tasks/tasks.txt`);

        const fromSystem = templateReplace(systemPromptData, {
            target: target,
            description: description
        });

        console.log('[生成任务] 生成任务:', fromSystem);

        // 发送消息请求到API
        const response = await postData(`${window.API_URL}/prompt`, {
          fromSystem,
          fromUser: '必须返回 json 格式，不要返回其他内容'
        });

        console.log('[API响应] 收到服务器响应:', response.data);

        // 等待所有 postData 完成后再跳转页面
        if (Array.isArray(response.data) && response.data.length > 0) {
            await Promise.all(
                response.data.map(item =>
                    postData(`${window.API_URL}/mongodb/?cname=tasks`, { ...item, featureName: feature.name, cardTitle: card.title })
                )
            );
        }

        window.open(`/views/tasks/index.html?featureName=${feature.name}&cardTitle=${card.title}`, '_blank');
    };

    /**
     * 处理输入法开始事件
     * @param {Event} event - 输入法事件对象
     */
    const handleCompositionStart = (event) => {
        isComposing = true;
        console.log('[输入法检测] 输入法开始');
    };

    /**
     * 处理输入法结束事件
     * @param {Event} event - 输入法事件对象
     */
    const handleCompositionEnd = (event) => {
        isComposing = false;
        console.log('[输入法检测] 输入法结束');
    };

    /**
     * 处理消息输入框的回车事件
     * @param {Event} event - 键盘事件对象
     */
    const handleMessageInput = async (event) => {
        // 检查是否按下回车键
        if (event.key !== 'Enter') return;
        
        // 检查是否正在输入法输入过程中
        // 多重检测确保兼容性：
        // 1. isComposing: 现代浏览器标准
        // 2. keyCode === 229: 兼容旧版浏览器
        // 3. event.target.composing: 某些框架的检测
        // 4. 自定义状态标记: 作为备用方案
        if (event.isComposing || event.keyCode === 229 || event.target.composing || isComposing) {
            console.log('[输入法检测] 检测到输入法输入，忽略回车事件');
            return;
        }
        
        // 阻止默认行为
        event.preventDefault();
        
        const messageInput = event.target;
        const message = messageInput.value.trim();
        
        // 检查消息是否为空
        if (!message) {
            showError('请输入消息内容');
            return;
        }
        
        // 检查消息长度
        if (message.length > 2000) {
            showError('消息内容过长，请控制在2000字符以内');
            return;
        }
        
        // 检查系统提示是否已加载
        if (!store.fromSystem.value) {
            showError('系统正在初始化，请稍后再试');
            return;
        }
        
        // 防止重复提交
        if (isProcessing) {
            console.log('[防重复] 正在处理中，忽略重复请求');
            return;
        }
        
        try {
            // 设置处理状态
            isProcessing = true;
            
            // 设置加载状态
            store.loading.value = true;
            store.error.value = null;
            
            // 显示加载提示
            showSuccess('正在处理您的请求...');
            
            console.log('[API请求] 发送消息到服务器:', {
                fromSystem: store.fromSystem.value,
                fromUser: message
            });
            
            // 发送消息请求到API
            const response = await postData(`${window.API_URL}/prompt`, {
                fromSystem: store.fromSystem.value,
                fromUser: message
            });
            
            console.log('[API响应] 收到服务器响应:', response);
            
            // 处理响应结果
            if (response) {
                console.log('[数据赋值] 准备赋值的新数据:', response.data);

                response.data.forEach(async (item) => {
                  postData(`${window.API_URL}/mongodb/?cname=goals`, item);
                });
                store.featureCards.value = response.data.concat(store.featureCards.value);
                showSuccess('消息发送成功');
            } else {
                console.error('[API错误] 服务器返回错误:', response);
            }
        } catch (error) {
            console.error('[消息处理错误]', error);
            showError('消息发送失败，请稍后重试');
        } finally {
            // 清除处理状态
            isProcessing = false;
            
            // 清除加载状态
            store.loading.value = false;
        }
    };

    return {
        openLink,
        copyCardToClipboard,
        generateTask,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd
    };
};


