import { getData, postData } from '/src/services/index.js';
import { buildServiceUrl, SERVICE_MODULE } from '/src/services/helper/requestHelper.js';
import { showError, showSuccess } from '/src/utils/message.js';
import { showGlobalLoading, hideGlobalLoading } from '/src/utils/loading.js';
import { formatTimeRangeText, validateTimeParams } from '/src/utils/timeParams.js';
import { getWeeksByMonth, getDaysByWeek, getMonthsByQuarter, getQuarters } from '/src/utils/timeSelectors.js';
import { getStoredToken, saveToken } from '/src/services/helper/authUtils.js';

export const useMethods = (store) => {
    // 辅助函数：添加被动事件监听器
    const addPassiveEventListener = (element, event, handler, options = {}) => {
        const finalOptions = { passive: true, ...options };
        element.addEventListener(event, handler, finalOptions);
    };
    
    // 添加全局ESC按键处理
    const setupGlobalEscHandler = () => {
        // 监听模态框的ESC事件
        window.addEventListener('modalEscPressed', (e) => {
            console.log('[欢迎页面] 检测到模态框ESC事件，跳过其他ESC处理');
        });
        
        // 添加全局ESC按键监听
        const handleGlobalEsc = (e) => {
            if (e.key === 'Escape') {
                // 检查是否有模态框打开，如果有则跳过处理
                if (document.querySelector('.modal, .modal-backdrop')) {
                    console.log('[欢迎页面] 模态框已打开，跳过ESC处理');
                    return;
                }
                
                // 这里可以添加首页特定的ESC处理逻辑
                console.log('[欢迎页面] ESC键被按下');
            }
        };
        
        document.addEventListener('keydown', handleGlobalEsc);
        
        // 返回清理函数
        return () => {
            document.removeEventListener('keydown', handleGlobalEsc);
        };
    };
    
    // 在组件挂载时设置ESC处理
    if (typeof window !== 'undefined') {
        const cleanup = setupGlobalEscHandler();
        // 在页面卸载时清理
        window.addEventListener('beforeunload', cleanup);
    }
    
    // 输入法状态标记
    let isComposing = false;
    
    // 延迟处理标记，避免快速连续触发
    let isProcessing = false;
    
    // 长按删除相关变量
    let longPressTimer = null;
    let longPressCard = null;
    let longPressStartTime = 0;
    let longPressStartPosition = null;
    let isDeleting = false; // 新增：防止重复删除
    const LONG_PRESS_DURATION = 3000; // 3秒
    const LONG_PRESS_MOVE_THRESHOLD = 10; // 移动阈值（像素）
    
    // 声音效果相关
    let audioContext = null;
    
    // 全局错误处理
    const handleError = (error, context) => {
        console.error(`[${context}] 错误:`, error);
        if (error && error.message && error.message.includes('Cannot read properties of null')) {
            console.warn(`[${context}] 检测到null对象访问错误，可能是数据加载问题`);
        }
    };
    
    // 验证卡片数据完整性
    const validateCard = (card) => {
        console.log('[数据验证] 开始验证卡片:', {
            card: card,
            hasTitle: !!card?.title,
            hasKey: card?.hasOwnProperty('key'),
            keyValue: card?.key,
            titleValue: card?.title,
            cardType: card?.hasOwnProperty('key') ? 'MongoDB' : 'Local'
        });
        
        if (!card) {
            console.warn('[数据验证] 卡片对象为空');
            return false;
        }
        
        // 检查必要字段 - 标题是必需的
        if (!card.title) {
            console.warn('[数据验证] 卡片标题为空:', card);
            return false;
        }
        
        // 对于MongoDB数据，需要key字段；对于本地数据，key字段可选
        // 如果卡片有key字段，说明是MongoDB数据，需要验证key不为空
        if (card.hasOwnProperty('key') && !card.key) {
            console.warn('[数据验证] MongoDB卡片key字段为空:', card);
            return false;
        }
        
        console.log('[数据验证] 卡片验证通过:', card.title, '类型:', card.hasOwnProperty('key') ? 'MongoDB' : 'Local');
        return true;
    };
    


    /**
     * 播放长按声音效果
     */
    const playLongPressSound = () => {
        try {
            // 创建音频上下文（如果还没有）
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置音频参数
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.log('[声音效果] 无法播放声音:', error);
        }
    };
    
    /**
     * 播放删除成功声音效果
     */
    const playDeleteSuccessSound = () => {
        try {
            // 创建音频上下文（如果还没有）
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置音频参数 - 成功音调
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            
        } catch (error) {
            console.log('[声音效果] 无法播放删除成功声音:', error);
        }
    };
    
    /**
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link, event) => {
        // 阻止事件冒泡，防止触发长按，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }
        
        window.location.href = link;
    };
    
    /**
     * 打开 API 鉴权对话框
     * 用于设置 X-Token
     */
    const openAuth = () => {
        const curToken = getStoredToken();
        const token = window.prompt("请输入 X-Token（用于访问 api.effiy.cn）", curToken);
        if (token == null) return; // 用户取消
        
        const trimmedToken = String(token || "").trim();
        saveToken(trimmedToken);
        
        // 显示成功提示
        showSuccess('API 鉴权配置已保存');
        
        // 配置完立即尝试刷新数据（如果当前有加载功能卡片）
        if (store && store.loadFeatureCards) {
            store.loadFeatureCards();
        }
    };
    
    /**
     * 处理卡片点击事件
     * @param {Object} card - 卡片对象
     * @param {Event} event - 事件对象
     */
    const handleCardClick = (card, event) => {
        // 检查是否为短按（非长按）
        const pressDuration = Date.now() - longPressStartTime;
        const isShortPress = pressDuration < LONG_PRESS_DURATION && pressDuration > 0;
        
        // 如果正在进行长按，忽略点击
        if (longPressTimer && isShortPress) {
            console.log('[卡片点击] 正在进行长按，忽略点击事件');
            event.stopPropagation();
            return;
        }
        
        // 检查是否点击在可交互元素上
        const target = event.target;
        const isInteractiveElement = target.closest('button, a, [role="button"], .feature-tag, .stat-item, .card-badge');
        
        if (isInteractiveElement) {
            console.log('[卡片点击] 点击在交互元素上，允许正常点击:', target.tagName, target.className);
            return; // 允许正常的点击事件
        }
        
        // 对于卡片本身的点击，可以添加默认行为
        console.log('[卡片点击] 卡片被点击:', card.title);
        // 这里可以添加卡片点击的默认行为，比如显示详情等
    };

    /**
     * 处理统计项点击事件
     * @param {string} label - 统计项标签
     * @param {Event} event - 事件对象
     */
    const handleStatItemClick = (label, event) => {
        if (event) {
            event.stopPropagation();
        }
        
        if (!label) return;
        
        console.log('[统计项点击] 跳转到 AICR 页面，标签:', label);
        
        // 构建目标 URL，包含 tag 参数
        const url = `../../views/aicr/index.html?tag=${encodeURIComponent(label)}`;
        window.open(url, '_blank');
    };

    /**
     * 开始长按计时
     * @param {Object} card - 卡片对象
     * @param {Event} event - 事件对象
     */
    const startLongPress = (card, event) => {
        try {
            // 对于触摸事件，不阻止默认行为以允许滚动
            if (event && event.type === 'touchstart') {
                // 触摸事件不阻止默认行为，允许滚动
                event.stopPropagation();
            } else if (event) {
                // 鼠标事件阻止默认行为
                event.preventDefault();
                event.stopPropagation();
            }
            
            // 检查是否正在删除中
            if (isDeleting) {
                console.log('[长按删除] 正在删除中，忽略新的长按');
                return;
            }
            
            // 检查是否点击在可交互元素上
            const target = event.target;
            const isInteractiveElement = target.closest('button, a, [role="button"], .feature-tag, .stat-item, .card-badge');
            
            if (isInteractiveElement) {
                console.log('[长按删除] 点击在交互元素上，跳过长按:', target.tagName, target.className);
                return;
            }
            
            // 检查card是否存在
            if (!card) {
                console.warn('[长按删除] card参数为空');
                return;
            }
            
            // 验证卡片数据完整性
            if (!validateCard(card)) {
                console.warn('[长按删除] 卡片数据验证失败');
                return;
            }
            
            // 只对MongoDB数据（有key字段）启用长按删除
            if (!card.key) {
                console.log('[长按删除] 卡片没有key字段，跳过删除:', card.title);
                return;
            }
            
            // 检查卡片是否仍然存在于当前数据中
            const cardExists = store.featureCards.value.some(existingCard => 
                existingCard && existingCard.key === card.key
            );
            
            if (!cardExists) {
                console.warn('[长按删除] 卡片已不存在于数据中:', card.title);
                return;
            }
            
            // 记录长按开始时间和位置
            longPressStartTime = Date.now();
            longPressStartPosition = {
                x: event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0),
                y: event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0)
            };
            
            console.log('[长按删除] 开始长按卡片:', {
                title: card.title,
                key: card.key,
                position: longPressStartPosition
            });
        
            // 清除之前的计时器
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
            
            // 深拷贝card对象，避免引用问题
            longPressCard = JSON.parse(JSON.stringify(card));
            
            console.log('[长按删除] 保存卡片引用:', {
                title: longPressCard.title,
                key: longPressCard.key
            });
            
            // 添加长按视觉反馈
            const cardElement = event.target.closest('.feature-card');
            if (cardElement) {
                cardElement.classList.add('long-pressing');
                
                // 添加触觉反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                // 添加声音效果
                playLongPressSound();
            }
            
            // 设置3秒后执行删除
            longPressTimer = setTimeout(() => {
                // 检查是否移动过大
                const currentPosition = {
                    x: event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0),
                    y: event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0)
                };
                
                const moveDistance = Math.sqrt(
                    Math.pow(currentPosition.x - longPressStartPosition.x, 2) +
                    Math.pow(currentPosition.y - longPressStartPosition.y, 2)
                );
                
                if (moveDistance > LONG_PRESS_MOVE_THRESHOLD) {
                    console.log('[长按删除] 移动距离过大，取消删除:', moveDistance);
                    endLongPress();
                    return;
                }
                
                // 再次检查是否正在删除中
                if (isDeleting) {
                    console.log('[长按删除] 正在删除中，取消重复删除');
                    endLongPress();
                    return;
                }
                
                // 再次验证卡片是否仍然存在
                const cardStillExists = store.featureCards.value.some(existingCard => 
                    existingCard && existingCard.key === longPressCard.key
                );
                
                if (!cardStillExists) {
                    console.warn('[长按删除] 卡片已不存在，取消删除');
                    endLongPress();
                    return;
                }
                
                // 设置删除状态
                isDeleting = true;
                
                // 保存当前card的引用，避免异步操作中的问题
                const currentCard = { ...longPressCard };
                
                if (currentCard && currentCard.key) {
                    // 添加删除确认动画
                    if (cardElement) {
                        cardElement.classList.remove('long-pressing');
                        cardElement.classList.add('deleting');
                        
                        // 等待动画完成后执行删除
                        setTimeout(() => {
                            // 再次检查card是否仍然有效
                            if (currentCard && currentCard.key) {
                                deleteCard(currentCard, null, cardElement);
                            } else {
                                console.warn('[长按删除] 卡片数据已失效，取消删除');
                                if (cardElement) {
                                    cardElement.classList.remove('deleting');
                                    // 强制重新计算样式，确保动画状态被重置
                                    cardElement.style.animation = 'none';
                                    cardElement.offsetHeight; // 触发重排
                                    cardElement.style.animation = '';
                                }
                                isDeleting = false;
                            }
                        }, 600); // 增加一点时间确保动画完成
                    } else {
                        // 再次检查card是否仍然有效
                        if (currentCard && currentCard.key) {
                            deleteCard(currentCard);
                        } else {
                            console.warn('[长按删除] 卡片数据已失效，取消删除');
                            isDeleting = false;
                        }
                    }
                } else {
                    // 移除长按样式
                    if (cardElement) {
                        cardElement.classList.remove('long-pressing');
                    }
                    console.log('[长按删除] longPressCard无效，取消删除');
                    isDeleting = false;
                }
            }, LONG_PRESS_DURATION);
            
            console.log('[长按删除] 开始计时，3秒后将删除卡片:', card.title);
        } catch (error) {
            handleError(error, 'startLongPress');
            isDeleting = false;
        }
    };
    
    /**
     * 结束长按计时
     */
    const endLongPress = (event) => {
        // 对于触摸事件，不阻止默认行为以允许滚动
        if (event && event.type === 'touchend') {
            // 触摸事件不阻止默认行为，允许滚动
            event.stopPropagation();
        } else if (event) {
            // 鼠标事件阻止默认行为
            event.preventDefault();
            event.stopPropagation();
        }
        
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressCard = null;
            longPressStartTime = 0;
            longPressStartPosition = null;
            
            // 移除所有卡片的长按样式和删除样式
            const longPressingCards = document.querySelectorAll('.feature-card.long-pressing');
            longPressingCards.forEach(card => {
                card.classList.remove('long-pressing');
            });
            
            // 移除所有卡片的删除样式
            const deletingCards = document.querySelectorAll('.feature-card.deleting');
            deletingCards.forEach(card => {
                card.classList.remove('deleting');
                // 强制重新计算样式，确保动画状态被重置
                card.style.animation = 'none';
                card.offsetHeight; // 触发重排
                card.style.animation = '';
            });
            
            // 添加取消反馈
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            console.log('[长按删除] 取消删除操作');
        }
        
        // 确保删除状态被重置
        isDeleting = false;
    };
    
    /**
     * 删除卡片
     * @param {Object} card - 卡片对象
     * @param {Event} event - 点击事件对象（可选）
     * @param {HTMLElement} cardElement - 卡片DOM元素（可选）
     */
    const deleteCard = async (card, event, cardElement) => {
        try {
            console.log('[删除卡片] 开始删除，参数:', {
                card: card ? { title: card.title, key: card.key } : null,
                hasEvent: !!event,
                hasCardElement: !!cardElement
            });
            
            // 检查card是否存在
            if (!card) {
                console.error('[删除卡片] card参数为空');
                showError('删除失败：卡片数据无效');
                isDeleting = false;
                return;
            }
            
            // 验证卡片数据完整性
            if (!validateCard(card)) {
                console.error('[删除卡片] 卡片数据验证失败');
                showError('删除失败：卡片数据不完整');
                isDeleting = false;
                return;
            }
            
            // 检查是否为MongoDB数据（有key字段）
            if (!card.key) {
                console.warn('[删除卡片] 卡片没有key字段:', card.title);
                showError('只能删除来自数据库的卡片');
                isDeleting = false;
                return;
            }
            
            // 确认删除
            if (!confirm(`确定要删除卡片"${card.title}"吗？此操作不可撤销。`)) {
                // 移除删除动画样式并重置状态
                if (cardElement) {
                    cardElement.classList.remove('deleting');
                    // 强制重新计算样式，确保动画状态被重置
                    cardElement.style.animation = 'none';
                    cardElement.offsetHeight; // 触发重排
                    cardElement.style.animation = '';
                }
                isDeleting = false;
                return;
            }
            
            // 显示删除中提示
            showGlobalLoading('正在删除卡片...');
            
            // 添加删除成功反馈
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
            
            // 调用store的删除方法
            const result = await store.deleteCard(card.key);
            
            console.log('[删除卡片] store删除方法返回结果:', result);
            
            if (result) {
                await store.loadFeatureCards();
                
                showSuccess(`已删除卡片"${card.title}"`);
                console.log('[删除卡片] 删除成功:', card.title);
                
                // 播放删除成功声音
                playDeleteSuccessSound();
            } else {
                throw new Error('删除卡片失败');
            }
        } catch (error) {
            handleError(error, 'deleteCard');
            console.error('[删除卡片] 删除失败:', error);
            showError('删除卡片失败，请稍后重试');
            
            // 删除失败时也要移除删除动画样式
            if (cardElement) {
                cardElement.classList.remove('deleting');
                // 强制重新计算样式，确保动画状态被重置
                cardElement.style.animation = 'none';
                cardElement.offsetHeight; // 触发重排
                cardElement.style.animation = '';
            }
        } finally {
            // 隐藏加载提示
            hideGlobalLoading();
            // 确保删除状态被重置
            isDeleting = false;
        }
    };



    /**
     * 生成任务并跳转到任务页面，修复浏览器拦截新窗口的问题
     */
    const generateTask = async (card, feature, event) => {
        // 阻止事件冒泡，防止触发长按，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }

        console.log('[生成任务] 生成任务:', card, feature);

        // 显示加载状态
        showGlobalLoading('正在生成任务，请稍候...');
        const tasksUrl = `/src/views/tasks/index.html?cardTitle=${encodeURIComponent(card.title)}&featureName=${encodeURIComponent(feature.name)}`;

        try {
            const target = feature.name + '-' + feature.desc;
            const description = card.title + '-' + card.description;

            const fromSystem = await getData(`/src/assets/prompts/tasks/tasks.txt`);

            console.log('[生成任务] 生成任务:', fromSystem);

            // 发送消息请求到API，拼接详细的指标内容
            let statsText = '';
            if (Array.isArray(card.stats) && card.stats.length > 0) {
                statsText = card.stats.map(stat => `${stat.label}:${stat.number}`).join('，');
            } else if (typeof card.stats === 'string') {
                statsText = card.stats;
            }
            // 使用流式请求处理 prompt 接口（统一 JSON 返回）
            // 兼容服务端旧协议：发送 fromUser 纯文本，同时我们仍使用统一解析器
            const { streamPromptJSON } = await import('/src/services/modules/crud.js');
            const response = await streamPromptJSON(`${window.API_URL}/`, {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: fromSystem,
                    user: `目标:${target}\n描述:${description}\n指标:${statsText}\n功能:${feature.name} - ${feature.desc}\n卡片:${card.title}`,
                    model: 'qwq'
                }
            });

            console.log('[API响应] 收到服务器响应:', response.data);

            // 等待所有 postData 完成后再跳转页面
            if (Array.isArray(response.data) && response.data.length > 0) {
                await Promise.all(
                    response.data.map(rawItem => {
                        let itemObj = null;
                        if (typeof rawItem === 'string') {
                            try {
                                const maybe = JSON.parse(rawItem);
                                itemObj = (maybe && typeof maybe === 'object') ? maybe : { description: String(rawItem) };
                            } catch (_) {
                                itemObj = { description: String(rawItem) };
                            }
                        } else if (rawItem && typeof rawItem === 'object') {
                            itemObj = rawItem;
                        } else {
                            itemObj = { description: String(rawItem ?? '') };
                        }
                        const payload = {
                            module_name: SERVICE_MODULE,
                            method_name: 'create_document',
                            parameters: {
                                cname: 'tasks',
                                data: { 
                                    ...itemObj, 
                                    featureName: feature.name, 
                                    cardTitle: card.title 
                                }
                            }
                        };
                        return postData(`${window.API_URL}/`, payload);
                    })
                );
            }

            // 隐藏加载状态
            hideGlobalLoading();
            // 所有请求完成后再跳转：优先尝试新标签页，若被拦截则回退为当前页跳转
            try {
                const newTab = window.open(tasksUrl, '_blank');
                if (!newTab || newTab.closed) {
                    window.location.href = tasksUrl;
                }
            } catch (_) {
                window.location.href = tasksUrl;
            }

        } catch (err) {
            // 隐藏加载状态
            hideGlobalLoading();
            showError('生成任务失败，请稍后重试');
            console.error('[生成任务] 生成任务失败:', err);
            // 保持在当前页面，用户可重试
        }
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
     * 处理搜索输入
     * @param {Event} event - 输入事件对象
     */
    const handleSearchInput = (event) => {
        const query = event.target.value;
        store.setSearchQuery(query);
        console.log('[搜索过滤] 搜索查询:', query);
    };

    /**
     * 处理搜索键盘事件
     * @param {Event} event - 键盘事件对象
     */
    const handleSearchKeydown = (event) => {
        // 处理回车键等特殊按键
        if (event.key === 'Enter') {
            event.preventDefault();
            // 可以在这里添加搜索确认逻辑
        }
        // 其他按键不阻止默认行为，允许滚动
    };

    /**
     * 清空搜索
     */
    const clearSearch = () => {
        store.clearSearch();
        console.log('[搜索过滤] 清空搜索');
    };

    // 处理全部选择/恢复
    const handleAllSelect = async () => {
        try {
            if (store.isAllSelected.value) {
                // 反选：恢复默认当前月份状态
                console.log('[时间选择] 恢复默认当前月份状态');
                
                // 获取当前日期
                const now = new Date();
                const currentYear = now.getFullYear().toString();
                const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
                
                // 设置当前年月
                store.selectedYear.value = currentYear;
                store.selectedQuarter.value = currentQuarter;
                store.selectedMonth.value = currentMonth;
                store.selectedWeek.value = '';
                store.selectedDay.value = '';
                
                // 更新全部选择状态
                store.isAllSelected.value = false;
                
                // 重新加载数据
                if (store.loadFeatureCards) {
                    console.log('[时间选择] 恢复当前月份，重新加载功能卡片');
                    await store.loadFeatureCards(true);
                }
            } else {
                // 选择全部：查询全部数据
                console.log('[时间选择] 选择查询全部数据');
                
                // 清空所有时间选择
                store.selectedYear.value = '';
                store.selectedQuarter.value = '';
                store.selectedMonth.value = '';
                store.selectedWeek.value = '';
                store.selectedDay.value = '';
                
                // 更新全部选择状态
                store.isAllSelected.value = true;
                
                // 重新加载全部数据
                if (store.loadFeatureCards) {
                    console.log('[时间选择] 查询全部数据，重新加载功能卡片');
                    await store.loadFeatureCards(true);
                }
            }
        } catch (error) {
            handleError(error, '全部选择');
        }
    };

    // 处理年度选择变化
    const handleYearChange = async (year) => {
        try {
            console.log('[时间选择] 年度选择变化:', year);
            store.selectedYear.value = year;
            // 重置季度和月度选择
            store.selectedQuarter.value = '';
            store.selectedMonth.value = '';
            
            // 更新全部选择状态（选择具体时间时，退出全部选择状态）
            store.isAllSelected.value = false;
            
            // 自动重新加载数据
            if (year && store.loadFeatureCards) {
                console.log('[时间选择] 年度变化，重新加载功能卡片数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '年度选择');
        }
    };

    // 处理季度选择变化
    const handleQuarterChange = async () => {
        try {
            console.log('[时间选择] 季度选择变化:', store.selectedQuarter.value);
            // 重置月度选择
            store.selectedMonth.value = '';
            
            // 更新全部选择状态（选择具体时间时，退出全部选择状态）
            store.isAllSelected.value = false;
            
            // 自动重新加载数据
            if (store.selectedQuarter.value && store.selectedYear.value && store.loadFeatureCards) {
                console.log('[时间选择] 季度变化，重新加载功能卡片数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '季度选择');
        }
    };

    // 处理月度选择变化
    const handleMonthChange = async () => {
        try {
            console.log('[时间选择] 月度选择变化:', store.selectedMonth.value);
            console.log('[时间选择] 当前选择:', {
                year: store.selectedYear.value,
                quarter: store.selectedQuarter.value,
                month: store.selectedMonth.value
            });
            
            // 重置周和日选择
            store.selectedWeek.value = '';
            store.selectedDay.value = '';
            
            // 更新全部选择状态（选择具体时间时，退出全部选择状态）
            store.isAllSelected.value = false;
            
            // 自动重新加载数据
            if (store.selectedMonth.value && store.selectedQuarter.value && store.selectedYear.value && store.loadFeatureCards) {
                console.log('[时间选择] 月度变化，重新加载功能卡片数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '月度选择');
        }
    };

    // 处理周选择变化
    const handleWeekChange = async () => {
        try {
            console.log('[时间选择] 周选择变化:', store.selectedWeek.value);
            console.log('[时间选择] 当前选择:', {
                year: store.selectedYear.value,
                quarter: store.selectedQuarter.value,
                month: store.selectedMonth.value,
                week: store.selectedWeek.value
            });
            
            // 重置日选择
            store.selectedDay.value = '';
            
            // 更新全部选择状态（选择具体时间时，退出全部选择状态）
            store.isAllSelected.value = false;
            
            // 自动重新加载数据
            if (store.selectedWeek.value && store.selectedMonth.value && store.selectedQuarter.value && store.selectedYear.value && store.loadFeatureCards) {
                console.log('[时间选择] 周变化，重新加载功能卡片数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '周选择');
        }
    };

    // 处理日选择变化
    const handleDayChange = async () => {
        try {
            console.log('[时间选择] 日选择变化:', store.selectedDay.value);
            console.log('[时间选择] 当前选择:', {
                year: store.selectedYear.value,
                quarter: store.selectedQuarter.value,
                month: store.selectedMonth.value,
                week: store.selectedWeek.value,
                day: store.selectedDay.value
            });
            
            // 更新全部选择状态（选择具体时间时，退出全部选择状态）
            store.isAllSelected.value = false;
            
            // 自动重新加载数据
            if (store.selectedDay.value && store.selectedWeek.value && store.selectedMonth.value && store.selectedQuarter.value && store.selectedYear.value && store.loadFeatureCards) {
                console.log('[时间选择] 日变化，重新加载功能卡片数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '日选择');
        }
    };


    // 清空年度选择
    const clearYear = async () => {
        try {
            console.log('[清空选择] 清空年度选择');
            
            // 清空所有时间选择
            store.selectedYear.value = '';
            store.selectedQuarter.value = '';
            store.selectedMonth.value = '';
            store.selectedWeek.value = '';
            store.selectedDay.value = '';
            
            // 更新全部选择状态
            store.isAllSelected.value = false;
            
            // 重新加载全部数据
            if (store.loadFeatureCards) {
                console.log('[清空选择] 清空年度后，重新加载全部数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '清空年度选择');
        }
    };

    // 清空季度选择
    const clearQuarter = async () => {
        try {
            console.log('[清空选择] 清空季度选择');
            
            // 清空季度及以下选择
            store.selectedQuarter.value = '';
            store.selectedMonth.value = '';
            store.selectedWeek.value = '';
            store.selectedDay.value = '';
            
            // 更新全部选择状态
            store.isAllSelected.value = false;
            
            // 重新加载年度数据
            if (store.selectedYear.value && store.loadFeatureCards) {
                console.log('[清空选择] 清空季度后，重新加载年度数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '清空季度选择');
        }
    };

    // 清空月度选择
    const clearMonth = async () => {
        try {
            console.log('[清空选择] 清空月度选择');
            
            // 清空月度及以下选择
            store.selectedMonth.value = '';
            store.selectedWeek.value = '';
            store.selectedDay.value = '';
            
            // 更新全部选择状态
            store.isAllSelected.value = false;
            
            // 重新加载季度数据
            if (store.selectedYear.value && store.selectedQuarter.value && store.loadFeatureCards) {
                console.log('[清空选择] 清空月度后，重新加载季度数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '清空月度选择');
        }
    };

    // 清空周选择
    const clearWeek = async () => {
        try {
            console.log('[清空选择] 清空周选择');
            
            // 清空周及以下选择
            store.selectedWeek.value = '';
            store.selectedDay.value = '';
            
            // 更新全部选择状态
            store.isAllSelected.value = false;
            
            // 重新加载月度数据
            if (store.selectedYear.value && store.selectedQuarter.value && store.selectedMonth.value && store.loadFeatureCards) {
                console.log('[清空选择] 清空周后，重新加载月度数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '清空周选择');
        }
    };

    // 清空日选择
    const clearDay = async () => {
        try {
            console.log('[清空选择] 清空日选择');
            
            // 清空日选择
            store.selectedDay.value = '';
            
            // 更新全部选择状态
            store.isAllSelected.value = false;
            
            // 重新加载周数据
            if (store.selectedYear.value && store.selectedQuarter.value && store.selectedMonth.value && store.selectedWeek.value && store.loadFeatureCards) {
                console.log('[清空选择] 清空日后，重新加载周数据');
                await store.loadFeatureCards(true);
            }
        } catch (error) {
            handleError(error, '清空日选择');
        }
    };

    // 处理下载数据
    const handleDownloadData = async () => {
        try {
            const { year, quarter, month } = {
                year: store.selectedYear.value,
                quarter: store.selectedQuarter.value,
                month: store.selectedMonth.value
            };
            
            // 使用时间工具函数验证参数
            const timeValidation = validateTimeParams(year, quarter, month);
            if (!timeValidation.isValid) {
                showError('时间参数无效：' + timeValidation.errors.join(', '));
                return;
            }
            
            if (!year || !quarter || !month) {
                showError('请先完成时间选择');
                return;
            }

            const timeRangeText = formatTimeRangeText(year, quarter, month);
            showGlobalLoading(`正在查询${timeRangeText}功能特征任务列表...`);
            console.log('[下载] 开始下载数据:', { 
                year, quarter, month,
                timeRange: timeRangeText
            });

            // 1. 获取功能卡片数据
            const featureCards = store.featureCards.value || [];
            
            // 2. 为每个功能卡片查询对应的任务列表
            const { getData } = await import('/src/services/modules/crud.js');
            const taskPromises = [];
            
            for (const card of featureCards) {
                if (!card.title) continue;
                
                // 为每个功能特征查询任务
                if (card.features && Array.isArray(card.features)) {
                    for (const feature of card.features) {
                        if (!feature.name) continue;
                        
                        const queryUrl = buildServiceUrl('query_documents', {
                            cname: 'tasks',
                            featureName: feature.name,
                            cardTitle: card.title
                        });
                        const taskPromise = getData(queryUrl).then(response => ({
                            cardTitle: card.title,
                            featureName: feature.name,
                            tasks: response?.data?.list || []
                        })).catch(error => {
                            console.warn(`[下载] 查询任务失败 - ${card.title}/${feature.name}:`, error);
                            return {
                                cardTitle: card.title,
                                featureName: feature.name,
                                tasks: []
                            };
                        });
                        
                        taskPromises.push(taskPromise);
                    }
                }
            }

            showGlobalLoading('正在查询任务数据...');
            const taskResults = await Promise.all(taskPromises);
            
            // 3. 构建tree.json数据结构
            const treeData = {
                name: `${year}年${quarter}季度${month}月`,
                type: 'root',
                children: []
            };

            const cardNodes = {};
            
            // 为每个功能卡片创建节点
            for (const card of featureCards) {
                if (!card.title) continue;
                
                const cardNode = {
                    name: card.title,
                    type: 'card',
                    description: card.description || '',
                    badge: card.badge || '',
                    children: []
                };
                
                cardNodes[card.title] = cardNode;
                treeData.children.push(cardNode);
            }
            
            // 添加功能特征和任务
            for (const result of taskResults) {
                const cardNode = cardNodes[result.cardTitle];
                if (!cardNode) continue;
                
                const featureNode = {
                    name: result.featureName,
                    type: 'feature',
                    taskCount: result.tasks.length,
                    children: result.tasks.map(task => ({
                        name: task.title || 'Untitled Task',
                        type: 'task',
                        key: task.key || task.id,
                        status: task.status || 'pending',
                        priority: task.priority || 'medium',
                        createTime: task.createTime || new Date().toISOString(),
                        // 新增：关键特征信息在树结构中显示
                        hasWeeklyReport: task.weeklyReport?.enabled || false,
                        hasDailyReport: task.dailyReport?.enabled || false,
                        difficulty: task.features?.difficulty || 'medium',
                        type: task.features?.type || 'development',
                        estimatedHours: task.features?.estimatedHours || 0,
                        actualHours: task.features?.actualHours || 0,
                        progress: task.progress?.percentage || 0,
                        assignee: task.features?.assignee || '',
                        deadline: task.timeTracking?.deadline || null,
                        businessValue: task.features?.businessValue || 'medium'
                    }))
                };
                
                cardNode.children.push(featureNode);
            }

            // 4. 构建file.json数据结构
            const fileData = {};
            let fileIndex = 1;
            
            for (const result of taskResults) {
                const pathPrefix = `${result.cardTitle}/${result.featureName}`;
                
                for (const task of result.tasks) {
                    const fileName = `task_${fileIndex.toString().padStart(3, '0')}.json`;
                    const filePath = `${pathPrefix}/${fileName}`;
                    
                    fileData[filePath] = {
                        // 基础属性
                        id: task.key || task.id,
                        title: task.title || 'Untitled Task',
                        description: task.description || '',
                        content: task.content || '',
                        status: task.status || 'pending',
                        priority: task.priority || 'medium',
                        category: task.category || '',
                        tags: task.tags || [],
                        steps: task.steps || [],
                        createTime: task.createTime || new Date().toISOString(),
                        updateTime: task.updateTime || new Date().toISOString(),
                        featureName: result.featureName,
                        cardTitle: result.cardTitle,
                        timeRange: { year, quarter, month },
                        
                        // 周报属性
                        weeklyReport: task.weeklyReport || {
                            enabled: false,
                            frequency: 'weekly',
                            dayOfWeek: 1,
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            history: []
                        },
                        
                        // 日报属性
                        dailyReport: task.dailyReport || {
                            enabled: false,
                            frequency: 'daily',
                            timeOfDay: '18:00',
                            reportTemplate: '',
                            lastSubmitted: null,
                            nextDue: null,
                            history: [],
                            weekends: false
                        },
                        
                        // 任务特征属性
                        features: task.features || {
                            estimatedHours: 0,
                            actualHours: 0,
                            difficulty: 'medium',
                            type: 'development',
                            dependencies: [],
                            milestone: '',
                            assignee: '',
                            reviewer: '',
                            labels: [],
                            businessValue: 'medium',
                            urgency: 'medium',
                            complexity: 'medium'
                        },
                        
                        // 进度跟踪
                        progress: task.progress || {
                            percentage: 0,
                            milestones: [],
                            blockers: [],
                            notes: []
                        },
                        
                        // 时间跟踪
                        timeTracking: task.timeTracking || {
                            startDate: null,
                            endDate: null,
                            deadline: null,
                            estimatedDuration: 0,
                            actualDuration: 0,
                            timeEntries: []
                        }
                    };
                    
                    fileIndex++;
                }
            }

            // 5. 使用JSZip创建压缩包（参考aicr实现）
            showGlobalLoading('正在生成下载包...');
            const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
            const zip = new JSZip();

            // 添加tree.json
            zip.file('tree.json', JSON.stringify(treeData, null, 2));
            
            // 添加files.json
            zip.file('files.json', JSON.stringify(fileData, null, 2));
            
            // 计算统计信息（用于下载成功提示）
            const stats = {
                totalTasks: Object.keys(fileData).length,
                weeklyReportTasks: Object.values(fileData).filter(task => task.weeklyReport?.enabled).length,
                dailyReportTasks: Object.values(fileData).filter(task => task.dailyReport?.enabled).length,
                completedTasks: Object.values(fileData).filter(task => task.status === 'completed').length,
                avgProgress: Object.values(fileData).reduce((sum, task) => sum + (task.progress?.percentage || 0), 0) / Object.keys(fileData).length,
                urgentTasks: Object.values(fileData).filter(task => task.features?.urgency === 'high').length,
                totalEstimatedHours: Object.values(fileData).reduce((sum, task) => sum + (task.features?.estimatedHours || 0), 0),
                totalActualHours: Object.values(fileData).reduce((sum, task) => sum + (task.features?.actualHours || 0), 0)
            };

            // 生成并下载ZIP文件
            const blob = await zip.generateAsync({ type: 'blob' });
            const fileName = `${year}-${quarter}-${month}.zip`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            hideGlobalLoading();
        } catch (error) {
            hideGlobalLoading();
            handleError(error, '下载数据');
            showError('下载失败: ' + (error?.message || '未知错误'));
        }
    };

    // 触发上传文件选择
    const triggerUploadData = () => {
        try {
            const uploadInput = document.getElementById('dataUploadInput');
            if (uploadInput) {
                uploadInput.click();
            }
        } catch (error) {
            handleError(error, '触发上传');
        }
    };

    // 处理上传数据
    const handleUploadData = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            showGlobalLoading('正在处理上传文件...');
            console.log('[上传] 开始处理文件:', file.name, '类型:', file.type);

            // 判断文件类型并处理
            if (file.name.toLowerCase().endsWith('.zip')) {
                await handleZipUpload(file);
            } else if (file.name.toLowerCase().endsWith('.json')) {
                await handleJsonUpload(file);
            } else {
                throw new Error('不支持的文件格式，请上传 ZIP 或 JSON 文件');
            }

            // 清除文件输入
            event.target.value = '';

        } catch (error) {
            hideGlobalLoading();
            handleError(error, '上传数据');
            showError('上传失败: ' + (error?.message || '未知错误'));
            // 清除文件输入
            event.target.value = '';
        }
    };

    // 处理ZIP文件上传（参考aicr实现）
    const handleZipUpload = async (zipFile) => {
        try {
            showGlobalLoading('正在解析ZIP文件...');
            
            // 动态加载JSZip
            const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default || window.JSZip;
            const zip = new JSZip();
            
            // 读取ZIP文件
            const zipContent = await zip.loadAsync(zipFile);
            
            let treeData = null;
            let filesData = null;
            
            // 查找并读取tree.json和files.json
            const treeFile = zipContent.file('tree.json');
            const filesFile = zipContent.file('files.json');
            
            if (!treeFile && !filesFile) {
                throw new Error('ZIP文件中未找到 tree.json 或 files.json');
            }
            
            if (treeFile) {
                const treeContent = await treeFile.async('text');
                treeData = JSON.parse(treeContent);
                console.log('[上传] 解析tree.json成功:', treeData);
            }
            
            if (filesFile) {
                const filesContent = await filesFile.async('text');
                filesData = JSON.parse(filesContent);
                console.log('[上传] 解析files.json成功，文件数量:', Object.keys(filesData).length);
            }
            
            showGlobalLoading('正在导入任务数据...');
            
            // 导入任务数据到数据库
            if (filesData) {
                const { postData } = await import('/src/services/modules/crud.js');
                let importedCount = 0;
                let skippedCount = 0;
                
                for (const [filePath, taskData] of Object.entries(filesData)) {
                    try {
                        // 构建要保存的任务对象（新增周报日报属性）
                        const taskToSave = {
                            // 基础属性
                            title: taskData.title,
                            description: taskData.description,
                            content: taskData.content,
                            status: taskData.status,
                            priority: taskData.priority,
                            category: taskData.category,
                            tags: taskData.tags,
                            steps: taskData.steps,
                            featureName: taskData.featureName,
                            cardTitle: taskData.cardTitle,
                            createTime: taskData.createTime,
                            updateTime: new Date().toISOString(),
                            
                            // 新增：周报属性
                            weeklyReport: taskData.weeklyReport || {
                                enabled: false,          // 是否启用周报
                                frequency: 'weekly',     // 频率：weekly
                                dayOfWeek: 1,           // 周几提交（1=周一，7=周日）
                                reportTemplate: '',      // 周报模板
                                lastSubmitted: null,     // 最后提交时间
                                nextDue: null,          // 下次到期时间
                                history: []             // 历史周报记录
                            },
                            
                            // 新增：日报属性
                            dailyReport: taskData.dailyReport || {
                                enabled: false,          // 是否启用日报
                                frequency: 'daily',      // 频率：daily
                                timeOfDay: '18:00',     // 每日提交时间
                                reportTemplate: '',      // 日报模板
                                lastSubmitted: null,     // 最后提交时间
                                nextDue: null,          // 下次到期时间
                                history: [],            // 历史日报记录
                                weekends: false         // 是否包含周末
                            },
                            
                            // 新增：任务特征属性
                            features: taskData.features || {
                                estimatedHours: 0,       // 预估工时
                                actualHours: 0,          // 实际工时
                                difficulty: 'medium',    // 难度：easy, medium, hard
                                type: 'development',     // 类型：development, research, meeting, review
                                dependencies: [],        // 依赖的其他任务ID
                                milestone: '',           // 所属里程碑
                                assignee: '',           // 负责人
                                reviewer: '',           // 审核人
                                labels: [],             // 自定义标签
                                businessValue: 'medium', // 业务价值：low, medium, high
                                urgency: 'medium',      // 紧急程度：low, medium, high
                                complexity: 'medium'    // 复杂度：low, medium, high
                            },
                            
                            // 新增：进度跟踪
                            progress: taskData.progress || {
                                percentage: 0,           // 完成百分比
                                milestones: [],         // 进度里程碑
                                blockers: [],           // 阻塞因素
                                notes: []               // 进度备注
                            },
                            
                            // 新增：时间跟踪
                            timeTracking: taskData.timeTracking || {
                                startDate: null,        // 开始日期
                                endDate: null,          // 结束日期
                                deadline: null,         // 截止日期
                                estimatedDuration: 0,   // 预估时长（小时）
                                actualDuration: 0,      // 实际时长（小时）
                                timeEntries: []         // 时间记录条目
                            }
                        };
                        
                        // 保存到tasks集合
                        const savePayload = {
                            module_name: SERVICE_MODULE,
                            method_name: 'create_document',
                            parameters: {
                                cname: 'tasks',
                                data: taskToSave
                            }
                        };
                        const saveResult = await postData(`${window.API_URL}/`, savePayload);
                        
                        if (saveResult && saveResult.success !== false) {
                            importedCount++;
                        } else {
                            console.warn('[上传] 任务保存失败:', filePath, saveResult);
                            skippedCount++;
                        }
                        
                    } catch (taskError) {
                        console.warn('[上传] 任务导入失败:', filePath, taskError);
                        skippedCount++;
                    }
                }
                
                hideGlobalLoading();
                
                if (importedCount > 0) {
                    showSuccess(`ZIP导入成功！导入 ${importedCount} 个任务${skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ''}`);
                    
                    // 刷新功能卡片数据
                    if (store.loadFeatureCards) {
                        store.loadFeatureCards(true);
                    }
                } else {
                    showError('没有成功导入任何任务');
                }
                
                console.log('[上传] ZIP导入完成:', {
                    imported: importedCount,
                    skipped: skippedCount,
                    total: Object.keys(filesData).length
                });
                
            } else {
                hideGlobalLoading();
                showError('ZIP文件中缺少有效的files.json数据');
            }
            
        } catch (error) {
            hideGlobalLoading();
            console.error('[上传] ZIP处理失败:', error);
            throw new Error('ZIP文件处理失败: ' + (error?.message || '未知错误'));
        }
    };

    // 处理JSON文件上传（兼容原有功能）
    const handleJsonUpload = async (jsonFile) => {
        try {
            showGlobalLoading('正在处理JSON文件...');
            
            const fileContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(jsonFile);
            });

            let uploadData;
            try {
                uploadData = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('JSON文件格式不正确，请检查文件内容');
            }

            // 验证数据格式
            if (uploadData.featureCards && Array.isArray(uploadData.featureCards)) {
                // 原有的功能卡片数据格式
                store.updateFeatureCards(uploadData.featureCards);
                hideGlobalLoading();
                showSuccess(`成功上传 ${uploadData.featureCards.length} 个功能卡片`);
                console.log('[上传] 功能卡片数据上传完成:', uploadData.featureCards.length);
                
            } else if (uploadData.name && uploadData.type === 'root' && uploadData.children) {
                // tree.json格式
                hideGlobalLoading();
                showSuccess('tree.json格式文件上传成功，但建议使用完整的ZIP包');
                console.log('[上传] tree.json数据上传完成:', uploadData);
                
            } else {
                throw new Error('JSON文件格式不正确，请上传包含featureCards数组的数据或完整的ZIP包');
            }
            
        } catch (error) {
            hideGlobalLoading();
            console.error('[上传] JSON处理失败:', error);
            throw error;
        }
    };

    // ===================== 任务对象工具函数 =====================

    /**
     * 创建标准任务对象
     * @param {Object} baseTask - 基础任务信息
     * @returns {Object} 完整的任务对象
     */
    const createStandardTask = (baseTask = {}) => {
        const now = new Date().toISOString();
        
        return {
            // 基础属性
            title: baseTask.title || '',
            description: baseTask.description || '',
            content: baseTask.content || '',
            status: baseTask.status || 'pending',
            priority: baseTask.priority || 'medium',
            category: baseTask.category || '',
            tags: baseTask.tags || [],
            steps: baseTask.steps || [],
            featureName: baseTask.featureName || '',
            cardTitle: baseTask.cardTitle || '',
            createTime: baseTask.createTime || now,
            updateTime: now,
            
            // 周报属性
            weeklyReport: {
                enabled: false,
                frequency: 'weekly',
                dayOfWeek: 1, // 默认周一
                reportTemplate: '本周工作总结：\n\n1. 已完成工作：\n   - \n\n2. 遇到的问题：\n   - \n\n3. 下周计划：\n   - ',
                lastSubmitted: null,
                nextDue: null,
                history: [],
                ...baseTask.weeklyReport
            },
            
            // 日报属性
            dailyReport: {
                enabled: false,
                frequency: 'daily',
                timeOfDay: '18:00',
                reportTemplate: '今日工作总结：\n\n1. 已完成：\n   - \n\n2. 进行中：\n   - \n\n3. 遇到问题：\n   - \n\n4. 明日计划：\n   - ',
                lastSubmitted: null,
                nextDue: null,
                history: [],
                weekends: false,
                ...baseTask.dailyReport
            },
            
            // 任务特征属性
            features: {
                estimatedHours: 0,
                actualHours: 0,
                difficulty: 'medium',
                type: 'development',
                dependencies: [],
                milestone: '',
                assignee: '',
                reviewer: '',
                labels: [],
                businessValue: 'medium',
                urgency: 'medium',
                complexity: 'medium',
                ...baseTask.features
            },
            
            // 进度跟踪
            progress: {
                percentage: 0,
                milestones: [],
                blockers: [],
                notes: [],
                ...baseTask.progress
            },
            
            // 时间跟踪
            timeTracking: {
                startDate: null,
                endDate: null,
                deadline: null,
                estimatedDuration: 0,
                actualDuration: 0,
                timeEntries: [],
                ...baseTask.timeTracking
            }
        };
    };

    /**
     * 启用任务周报
     * @param {Object} task - 任务对象
     * @param {Object} options - 周报配置选项
     * @returns {Object} 更新后的任务对象
     */
    const enableWeeklyReport = (task, options = {}) => {
        const updatedTask = { ...task };
        updatedTask.weeklyReport = {
            ...updatedTask.weeklyReport,
            enabled: true,
            dayOfWeek: options.dayOfWeek || 1,
            reportTemplate: options.reportTemplate || updatedTask.weeklyReport.reportTemplate,
            nextDue: calculateNextWeeklyDue(options.dayOfWeek || 1)
        };
        updatedTask.updateTime = new Date().toISOString();
        return updatedTask;
    };

    /**
     * 启用任务日报
     * @param {Object} task - 任务对象
     * @param {Object} options - 日报配置选项
     * @returns {Object} 更新后的任务对象
     */
    const enableDailyReport = (task, options = {}) => {
        const updatedTask = { ...task };
        updatedTask.dailyReport = {
            ...updatedTask.dailyReport,
            enabled: true,
            timeOfDay: options.timeOfDay || '18:00',
            weekends: options.weekends || false,
            reportTemplate: options.reportTemplate || updatedTask.dailyReport.reportTemplate,
            nextDue: calculateNextDailyDue(options.timeOfDay || '18:00', options.weekends || false)
        };
        updatedTask.updateTime = new Date().toISOString();
        return updatedTask;
    };

    /**
     * 计算下次周报到期时间
     * @param {number} dayOfWeek - 周几（1=周一，7=周日）
     * @returns {string} ISO时间字符串
     */
    const calculateNextWeeklyDue = (dayOfWeek) => {
        const now = new Date();
        const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // 转换为1-7格式
        let daysUntilDue = dayOfWeek - currentDay;
        
        if (daysUntilDue <= 0) {
            daysUntilDue += 7; // 下周的这一天
        }
        
        const dueDate = new Date(now);
        dueDate.setDate(now.getDate() + daysUntilDue);
        dueDate.setHours(18, 0, 0, 0); // 默认下午6点
        
        return dueDate.toISOString();
    };

    /**
     * 计算下次日报到期时间
     * @param {string} timeOfDay - 每日时间，格式如 "18:00"
     * @param {boolean} weekends - 是否包含周末
     * @returns {string} ISO时间字符串
     */
    const calculateNextDailyDue = (timeOfDay, weekends) => {
        const [hours, minutes] = timeOfDay.split(':').map(Number);
        const now = new Date();
        const today = new Date(now);
        today.setHours(hours, minutes, 0, 0);
        
        let nextDue = today;
        
        // 如果今天的时间已过，或者今天是周末且不包含周末，则计算下一个工作日
        if (today <= now || (!weekends && (today.getDay() === 0 || today.getDay() === 6))) {
            do {
                nextDue.setDate(nextDue.getDate() + 1);
            } while (!weekends && (nextDue.getDay() === 0 || nextDue.getDay() === 6));
        }
        
        return nextDue.toISOString();
    };

    /**
     * 更新任务进度
     * @param {Object} task - 任务对象
     * @param {number} percentage - 进度百分比 (0-100)
     * @param {string} note - 进度备注
     * @returns {Object} 更新后的任务对象
     */
    const updateTaskProgress = (task, percentage, note = '') => {
        const updatedTask = { ...task };
        updatedTask.progress = {
            ...updatedTask.progress,
            percentage: Math.max(0, Math.min(100, percentage))
        };
        
        if (note) {
            updatedTask.progress.notes.push({
                content: note,
                timestamp: new Date().toISOString(),
                percentage: percentage
            });
        }
        
        // 如果进度达到100%，自动更新状态为已完成
        if (percentage >= 100) {
            updatedTask.status = 'completed';
            if (!updatedTask.timeTracking.endDate) {
                updatedTask.timeTracking.endDate = new Date().toISOString();
            }
        }
        
        updatedTask.updateTime = new Date().toISOString();
        return updatedTask;
    };

    /**
     * 添加时间记录
     * @param {Object} task - 任务对象
     * @param {number} hours - 工作小时数
     * @param {string} description - 工作描述
     * @returns {Object} 更新后的任务对象
     */
    const addTimeEntry = (task, hours, description = '') => {
        const updatedTask = { ...task };
        const timeEntry = {
            date: new Date().toISOString().split('T')[0],
            hours: hours,
            description: description,
            timestamp: new Date().toISOString()
        };
        
        updatedTask.timeTracking.timeEntries.push(timeEntry);
        updatedTask.features.actualHours += hours;
        updatedTask.updateTime = new Date().toISOString();
        
        return updatedTask;
    };

    /**
     * 获取任务统计信息
     * @param {Array} tasks - 任务数组
     * @returns {Object} 统计信息
     */
    const getTasksStatistics = (tasks) => {
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            pending: tasks.filter(t => t.status === 'pending').length,
            withWeeklyReport: tasks.filter(t => t.weeklyReport?.enabled).length,
            withDailyReport: tasks.filter(t => t.dailyReport?.enabled).length,
            totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.features?.estimatedHours || 0), 0),
            totalActualHours: tasks.reduce((sum, t) => sum + (t.features?.actualHours || 0), 0),
            avgProgress: tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.progress?.percentage || 0), 0) / tasks.length : 0,
            highPriority: tasks.filter(t => t.priority === 'high').length,
            highUrgency: tasks.filter(t => t.features?.urgency === 'high').length,
            overdue: tasks.filter(t => t.timeTracking?.deadline && new Date(t.timeTracking.deadline) < new Date()).length
        };
        
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0;
        stats.efficiency = stats.totalEstimatedHours > 0 ? (stats.totalEstimatedHours / Math.max(stats.totalActualHours, 1) * 100).toFixed(1) : 0;
        
        return stats;
    };



    /**
     * 处理消息输入框的回车事件
     * @param {Event} event - 键盘事件对象
     */
    const handleMessageInput = async (event) => {
        // 检查是否按下回车键
        if (event.key !== 'Enter') return;
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
        
        // 保存原始输入框状态
        const originalPlaceholder = messageInput.placeholder;
        const originalValue = messageInput.value;
        const originalDisabled = messageInput.disabled;
        
        console.log('[输入框] 原始状态:', {
            placeholder: originalPlaceholder,
            value: originalValue,
            disabled: originalDisabled
        });
        
        try {
            // 设置处理状态
            isProcessing = true;
            
            // 设置加载状态
            store.loading.value = true;
            store.error.value = null;
            
            // 禁用输入框并显示加载状态
            messageInput.disabled = true;
            messageInput.placeholder = '正在处理您的请求，请稍候...';
            messageInput.style.opacity = '0.6';
            messageInput.style.cursor = 'not-allowed';
            
            // 添加输入框加载动画
            messageInput.classList.add('loading-input');
            
            // 添加触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
            
            console.log('[API请求] 发送消息到服务器:', {
                fromSystem: store.fromSystem.value,
                fromUser: message
            });

            const fromSystem = await window.getData(`/src/assets/prompts/target/featureCards.txt`);
            
            // 使用流式请求处理 prompt 接口（统一 JSON 返回，兼容旧协议）
            const { streamPromptJSON } = await import('/src/services/modules/crud.js');
            const response = await streamPromptJSON(`${window.API_URL}/`, {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: fromSystem,
                    user: message
                }
            });
            
            // 兼容多种响应格式，提取数据数组
            const normalizeResponseData = (response) => {
                if (!response) return null;
                
                // 格式1: { data: [...] } - 标准格式
                if (Array.isArray(response.data)) {
                    return response.data;
                }
                
                // 格式2: { data: {...} } - data 是单个对象，转换为数组
                if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                    return [response.data];
                }
                
                // 格式3: [...] - 直接返回数组
                if (Array.isArray(response)) {
                    return response;
                }
                
                // 格式4: { result: [...] } - 使用 result 字段
                if (Array.isArray(response.result)) {
                    return response.result;
                }
                
                // 格式5: { result: {...} } - result 是单个对象
                if (response.result && typeof response.result === 'object' && !Array.isArray(response.result)) {
                    return [response.result];
                }
                
                // 格式6: { items: [...] } - 使用 items 字段
                if (Array.isArray(response.items)) {
                    return response.items;
                }
                
                // 格式7: { items: {...} } - items 是单个对象
                if (response.items && typeof response.items === 'object' && !Array.isArray(response.items)) {
                    return [response.items];
                }
                
                // 格式8: { list: [...] } - 使用 list 字段
                if (Array.isArray(response.list)) {
                    return response.list;
                }
                
                // 格式9: { content: [...] } - 使用 content 字段
                if (Array.isArray(response.content)) {
                    return response.content;
                }
                
                // 格式10: 如果 response 本身是对象但没有标准字段，尝试提取所有非元数据属性
                if (typeof response === 'object' && response !== null) {
                    // 排除一些常见的元数据字段
                    const metaFields = ['success', 'code', 'status', 'message', 'error', 'errorMessage', 'msg'];
                    const dataFields = Object.keys(response).filter(key => !metaFields.includes(key));
                    
                    if (dataFields.length > 0) {
                        // 检查第一个字段是否为数组
                        const firstFieldValue = response[dataFields[0]];
                        if (Array.isArray(firstFieldValue)) {
                            return firstFieldValue;
                        }
                        if (firstFieldValue && typeof firstFieldValue === 'object') {
                            return [firstFieldValue];
                        }
                    }
                }
                
                return null;
            };
            
            const normalizedData = normalizeResponseData(response);
            
            // 处理响应结果
            if (normalizedData && Array.isArray(normalizedData) && normalizedData.length > 0) {
                // 将 normalizeResponseData 返回的数据赋值给 response.data，保持后续代码的一致性
                if (!response.data) {
                    response.data = normalizedData;
                }
                // 显示保存进度
                const totalItems = response.data.length;
                let savedCount = 0;
                const savedItems = [];
                
                for (let item of response.data) {
                    // 获取用户选择的时间，如果没有选择则使用当前时间
                    const getSelectedTime = () => {
                        const now = new Date();
                        const currentYear = now.getFullYear().toString();
                        const currentMonth = now.getMonth() + 1;
                        const currentQuarter = `Q${Math.ceil(currentMonth / 3)}`;
                        
                        return {
                            year: store.selectedYear.value || currentYear,
                            quarter: store.selectedQuarter.value || currentQuarter,
                            month: store.selectedMonth.value || currentMonth.toString().padStart(2, '0'),
                            week: store.selectedWeek.value || '',
                            day: store.selectedDay.value || ''
                        };
                    };
                    
                    const selectedTime = getSelectedTime();
                    item.year = selectedTime.year;
                    item.quarter = selectedTime.quarter;
                    item.month = selectedTime.month;
                    item.week = selectedTime.week;
                    item.day = selectedTime.day;
                    item.tags = [];
                    try {
                        // 使用动态导入 GoalsService
                        const { GoalsService } = await import('/src/services/modules/goals.js');
                        const saveResult = await GoalsService.create(item);
                        if (saveResult && saveResult.success !== false) {
                            savedItems.push(item);
                            savedCount++;
                            console.log('[数据保存] 成功保存项目:', item.title, `(${savedCount}/${totalItems})`);
                            
                            // 更新输入框提示，显示保存进度
                            if (messageInput) {
                                messageInput.placeholder = `正在保存数据... ${savedCount}/${totalItems}`;
                            }
                        } else {
                            console.warn('[数据保存] 项目保存失败:', item.title, saveResult);
                        }
                    } catch (saveError) {
                        console.warn('[数据保存] 项目保存异常:', item.title, saveError);
                    }
                }
                
                console.log('[数据保存] 保存完成，成功保存数量:', savedItems.length, '总数量:', totalItems);
                
                // 恢复输入框提示
                if (messageInput) {
                    messageInput.placeholder = '正在刷新列表...';
                }
                
                // 直接更新本地数据，确保新卡片立即显示
                if (savedItems.length > 0) {
                    console.log('[数据更新] 开始更新本地数据');
                    
                    // 获取当前卡片数据
                    const currentCards = store.featureCards.value || [];
                    console.log('[数据更新] 当前卡片数量:', currentCards.length);
                    
                    // 过滤掉重复的卡片（基于title和key）
                    const existingTitles = new Set(currentCards.map(card => card.title?.trim()));
                    const existingKeys = new Set(currentCards.map(card => card.key).filter(Boolean));
                    
                    const uniqueNewCards = savedItems.filter(newCard => {
                        const titleExists = newCard.title && existingTitles.has(newCard.title.trim());
                        const keyExists = newCard.key && existingKeys.has(newCard.key);
                        return !titleExists && !keyExists;
                    });
                    
                    console.log('[数据更新] 过滤后的新卡片数量:', uniqueNewCards.length);
                    
                    if (uniqueNewCards.length > 0) {
                        // 使用store的更新方法，确保Vue响应式更新
                        const updatedCards = uniqueNewCards.concat(currentCards);
                        if (store.updateFeatureCards) {
                            store.updateFeatureCards(updatedCards);
                            console.log('[数据更新] 使用store.updateFeatureCards更新数据，新总数:', updatedCards.length);
                        } else {
                            // 备用方法：直接赋值
                            store.featureCards.value = updatedCards;
                            console.log('[数据更新] 直接赋值更新数据，新总数:', updatedCards.length);
                            
                            // 强制触发Vue响应式更新
                            if (typeof Vue !== 'undefined' && Vue.nextTick) {
                                Vue.nextTick(() => {
                                    console.log('[Vue更新] 使用nextTick触发响应式更新');
                                });
                            }
                        }
                    } else {
                        console.log('[数据更新] 没有新的唯一卡片需要添加');
                    }
                }
                
                // 尝试刷新远程数据（可选，用于同步）
                try {
                    console.log('[远程同步] 开始同步远程数据');
                    await store.loadFeatureCards(true);
                    console.log('[远程同步] 远程数据同步完成，当前卡片数量:', store.featureCards.value.length);
                } catch (syncError) {
                    console.warn('[远程同步] 远程同步失败，但本地数据已更新:', syncError);
                }
                
                // 调试信息：检查数据状态
                console.log('[调试信息] 数据更新完成后的状态检查:', {
                    savedItemsCount: savedItems.length,
                    currentStoreCount: store.featureCards.value?.length || 0,
                    storeHasUpdateMethod: !!store.updateFeatureCards,
                    storeHasFeatureCards: !!store.featureCards,
                    storeFeatureCardsValue: store.featureCards?.value
                });
                
                // 验证数据是否正确显示
                if (store.featureCards.value && store.featureCards.value.length > 0) {
                    const firstCard = store.featureCards.value[0];
                    console.log('[调试信息] 第一张卡片信息:', {
                        title: firstCard.title,
                        key: firstCard.key,
                        hasKey: firstCard.hasOwnProperty('key'),
                        type: firstCard.hasOwnProperty('key') ? 'MongoDB' : 'Local'
                    });
                }
                
                // 清空输入框 - 无论成功还是失败都要清空
                clearInputField(messageInput, '成功处理');
                
                // 清除搜索状态，确保新卡片能够正常显示
                clearSearchState(store, '成功处理');
                
                // 显示成功提示
                let successMessage = '';
                if (savedItems.length > 0) {
                    if (savedItems.length === totalItems) {
                        successMessage = `✅ 消息处理成功！已生成并保存 ${savedItems.length} 个新的功能卡片，列表已刷新`;
                    } else {
                        successMessage = `⚠️ 消息处理部分成功！成功保存 ${savedItems.length}/${totalItems} 个功能卡片，列表已刷新`;
                    }
                } else {
                    successMessage = '❌ 消息处理完成，但未能保存任何新卡片，请检查数据格式';
                }
                showSuccess(successMessage);
                
                // 添加成功触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 50]);
                }
                
                // 为新卡片添加高亮效果
                if (savedItems.length > 0) {
                    // 等待DOM更新完成后再添加高亮效果
                    setTimeout(() => {
                        console.log('[高亮效果] 延迟500ms后开始添加高亮效果');
                        highlightNewCards(savedItems);
                    }, 500);
                    
                    // 额外延迟，确保Vue渲染完成
                    setTimeout(() => {
                        console.log('[高亮效果] 延迟1000ms后再次尝试添加高亮效果');
                        highlightNewCards(savedItems);
                    }, 1000);
                }
                
                console.log('[消息处理] 处理完成，新增卡片数量:', savedItems.length);
            } else {
                // 使用 fullResponse 提取完整的错误信息
                const fullResponse = response;
                
                // 检查是否是格式问题还是真正的错误
                // 如果 normalizedData 为 null 或空数组，说明响应格式无法识别或数据为空
                const isFormatError = normalizedData === null || 
                                     (normalizedData && Array.isArray(normalizedData) && normalizedData.length === 0) ||
                                     (!response || (typeof response === 'object' && Object.keys(response).length === 0));
                
                // 从 fullResponse 和 responseText 中提取所有可能的错误信息字段
                const extractErrorMessage = (fullResponse, responseText) => {
                    // 首先尝试从原始响应文本中提取错误信息
                    if (responseText) {
                        try {
                            // 尝试解析 responseText 为 JSON
                            const parsedText = JSON.parse(responseText);
                            if (parsedText && typeof parsedText === 'object') {
                                // 使用解析后的对象继续查找
                                if (parsedText.message) return parsedText.message;
                                if (parsedText.error) return parsedText.error;
                                if (parsedText.errorMessage) return parsedText.errorMessage;
                                if (parsedText.msg) return parsedText.msg;
                                if (parsedText.err) return parsedText.err;
                                if (parsedText.data?.error) return parsedText.data.error;
                                if (parsedText.data?.message) return parsedText.data.message;
                            }
                        } catch (e) {
                            // 如果不是 JSON，检查是否包含错误关键词
                            const errorKeywords = ['error', 'Error', 'ERROR', '失败', '错误', '异常'];
                            const lines = responseText.split('\n').filter(line => line.trim());
                            for (const line of lines) {
                                for (const keyword of errorKeywords) {
                                    if (line.includes(keyword)) {
                                        // 提取包含关键词的行，限制长度
                                        const extracted = line.trim();
                                        if (extracted.length > 0 && extracted.length < 200) {
                                            return extracted;
                                        }
                                    }
                                }
                            }
                            // 如果找不到关键词，但文本较短，直接使用
                            if (responseText.trim().length > 0 && responseText.trim().length < 200) {
                                return responseText.trim();
                            }
                        }
                    }
                    
                    if (!fullResponse) return '未知错误';
                    
                    // 直接字段
                    if (fullResponse.message) return fullResponse.message;
                    if (fullResponse.error) return fullResponse.error;
                    if (fullResponse.errorMessage) return fullResponse.errorMessage;
                    if (fullResponse.msg) return fullResponse.msg;
                    if (fullResponse.err) return fullResponse.err;
                    
                    // 嵌套字段
                    if (fullResponse.error?.message) return fullResponse.error.message;
                    if (fullResponse.error?.error) return fullResponse.error.error;
                    if (fullResponse.data?.error) return fullResponse.data.error;
                    if (fullResponse.data?.message) return fullResponse.data.message;
                    if (fullResponse.result?.error) return fullResponse.result.error;
                    if (fullResponse.result?.message) return fullResponse.result.message;
                    
                    // 如果是字符串，直接返回（限制长度）
                    if (typeof fullResponse === 'string') {
                        const trimmed = fullResponse.trim();
                        if (trimmed && trimmed.length > 0) {
                            return trimmed.length < 200 ? trimmed : trimmed.substring(0, 197) + '...';
                        }
                        return '未知错误';
                    }
                    
                    // 尝试转换为字符串并提取关键信息
                    try {
                        const stringified = JSON.stringify(fullResponse);
                        if (stringified && stringified !== '{}' && stringified !== '[]') {
                            // 如果响应很长，尝试提取关键信息
                            if (stringified.length >= 200) {
                                // 尝试查找包含 "error" 或 "message" 的部分
                                const errorMatch = stringified.match(/"error"\s*:\s*"([^"]+)"/i) ||
                                                  stringified.match(/"message"\s*:\s*"([^"]+)"/i) ||
                                                  stringified.match(/"errorMessage"\s*:\s*"([^"]+)"/i);
                                if (errorMatch && errorMatch[1]) {
                                    return errorMatch[1].length < 200 ? errorMatch[1] : errorMatch[1].substring(0, 197) + '...';
                                }
                                // 如果没有找到，返回前200字符
                                return stringified.substring(0, 197) + '...';
                            }
                            return stringified;
                        }
                    } catch (e) {
                        // 忽略转换错误
                    }
                    
                    return '未知错误';
                };
                
                const errorMessage = extractErrorMessage(fullResponse, responseText);
                
                // 构建详细的错误信息对象
                const errorDetails = {
                    response: fullResponse,
                    responseText: responseText,
                    responseType: typeof fullResponse,
                    isArray: Array.isArray(fullResponse),
                    hasData: fullResponse?.data !== undefined,
                    dataType: Array.isArray(fullResponse?.data) ? 'array' : typeof fullResponse?.data,
                    extractedErrorMessage: errorMessage,
                    // 提取所有可能的错误相关字段
                    errorFields: {
                        message: fullResponse?.message,
                        error: fullResponse?.error,
                        errorMessage: fullResponse?.errorMessage,
                        msg: fullResponse?.msg,
                        err: fullResponse?.err,
                        nestedError: fullResponse?.error?.message || fullResponse?.error?.error,
                        dataError: fullResponse?.data?.error || fullResponse?.data?.message,
                        resultError: fullResponse?.result?.error || fullResponse?.result?.message
                    }
                };
                
                console.error('[API错误] 服务器返回错误:', {
                    errorMessage,
                    errorDetails,
                    fullResponse: fullResponse,
                    rawResponseText: responseText,
                    responseTextLength: responseText?.length,
                    fullResponseKeys: fullResponse && typeof fullResponse === 'object' ? Object.keys(fullResponse) : []
                });
                
                // 显示更具体的错误信息
                // 如果错误消息有效且长度合适，显示具体错误；否则显示通用提示
                let userMessage = '服务器返回错误，请稍后重试';
                
                // 如果是格式问题，给出更明确的提示
                if (isFormatError) {
                    userMessage = '服务器返回格式不正确，无法解析响应数据';
                    // 如果能够提取到一些信息，尝试显示响应的结构
                    if (fullResponse && typeof fullResponse === 'object') {
                        const keys = Object.keys(fullResponse);
                        if (keys.length > 0) {
                            console.warn('[格式警告] 响应包含以下字段，但未找到标准数据字段:', keys);
                            // 尝试从 responseText 中提取前100字符作为提示
                            if (responseText && responseText.length > 0) {
                                const preview = responseText.length < 100 
                                    ? responseText 
                                    : responseText.substring(0, 97) + '...';
                                console.warn('[格式警告] 原始响应预览:', preview);
                            }
                        }
                    }
                } else if (errorMessage && errorMessage !== '未知错误' && typeof errorMessage === 'string') {
                    // 真正的错误，显示错误消息
                    if (errorMessage.length > 0 && errorMessage.length <= 150) {
                        userMessage = `服务器返回错误: ${errorMessage}`;
                    } else if (errorMessage.length > 150) {
                        // 如果错误信息太长，截取前150字符
                        userMessage = `服务器返回错误: ${errorMessage.substring(0, 147)}...`;
                    }
                }
                
                showError(userMessage);
                
                // 即使API错误也要清空输入框
                clearInputField(messageInput, 'API错误');
                
                // 清除搜索状态
                clearSearchState(store, 'API错误');
            }
        } catch (error) {
            // 统一规范化错误对象
            const normalizeError = (err) => {
                const status = err?.status || err?.response?.status || null;
                const statusText = err?.statusText || err?.response?.statusText || '';
                const isAbort = err?.isAbortError === true || err?.name === 'AbortError';
                const isNetwork = err?.isNetworkError === true || (err?.name === 'TypeError' && (err?.message || '').includes('fetch'));
                const isCors = err?.isCorsError === true || /(CORS|cross-origin)/i.test(err?.message || '');
                const isTimeout = /(timeout|超时)/i.test(err?.message || '');
                const httpCode = typeof status === 'number' ? status : null;
                
                let rawMessage = err?.message || '';
                if (rawMessage && rawMessage.length > 300) rawMessage = rawMessage.substring(0, 297) + '...';
                
                return {
                    name: err?.name || 'Error',
                    message: rawMessage,
                    httpCode,
                    statusText,
                    url: err?.url || err?.response?.url || '',
                    isAbort,
                    isNetwork,
                    isCors,
                    isTimeout,
                    stack: err?.stack,
                };
            };
            
            const nerr = normalizeError(error);
            
            // 根据类型选择更友好的用户提示
            let errorMessage = '消息发送失败，请稍后重试';
            if (nerr.isAbort) {
                errorMessage = '请求已取消或超时';
            } else if (nerr.isTimeout) {
                errorMessage = '请求超时，请稍后重试';
            } else if (nerr.isCors) {
                errorMessage = '跨域请求被阻止，请检查服务器CORS配置';
            } else if (nerr.isNetwork) {
                errorMessage = '网络异常，无法连接到服务器';
            } else if (nerr.httpCode) {
                if (nerr.httpCode === 400) errorMessage = '请求参数有误，请检查输入后重试';
                else if (nerr.httpCode === 401) errorMessage = '未登录或登录已过期，请重新登录';
                else if (nerr.httpCode === 403) errorMessage = '无权限执行该操作';
                else if (nerr.httpCode === 404) errorMessage = '接口不存在或地址错误';
                else if (nerr.httpCode === 429) errorMessage = '请求过于频繁，请稍后再试';
                else if (nerr.httpCode >= 500) errorMessage = '服务器繁忙，请稍后再试';
            } else if (nerr.message) {
                const msg = nerr.message.trim();
                if (msg && msg.length <= 150) errorMessage = msg;
                else if (msg && msg.length > 150) errorMessage = msg.substring(0, 147) + '...';
            }
            
            // 结构化日志
            console.error('[消息处理错误]', {
                hint: '查看 httpCode/isNetwork/isCors/isTimeout 定位问题',
                error: nerr,
                request: {
                    endpoint: `${window.API_URL}/`,
                    payloadMeta: {
                        fromSystemType: typeof store?.fromSystem?.value,
                        fromUserLength: (typeof message === 'string') ? message.length : 0
                    }
                }
            });
            
            showError(errorMessage);
            
            // 清空输入框内容（不恢复原始内容，让用户重新输入）
            clearInputField(messageInput, '异常处理');
            
            // 清除搜索状态
            clearSearchState(store, '异常处理');
        } finally {
            // 清除处理状态
            isProcessing = false;
            
            // 清除加载状态
            store.loading.value = false;
            
            // 恢复输入框状态
            if (messageInput) {
                messageInput.disabled = originalDisabled;
                messageInput.placeholder = originalPlaceholder;
                messageInput.style.opacity = '';
                messageInput.style.cursor = '';
                messageInput.classList.remove('loading-input');
                
                // 确保输入框已清空
                clearInputField(messageInput, 'finally块');
                
                // 确保搜索状态已清除
                clearSearchState(store, 'finally块');
                
                // 重新聚焦输入框
                setTimeout(() => {
                    if (messageInput) {
                        messageInput.focus();
                        console.log('[输入框] 重新聚焦输入框');
                    }
                }, 100);
            }
        }
    };

    /**
     * 清空输入框内容
     * @param {HTMLElement} inputElement - 输入框元素
     * @param {string} context - 清空操作的上下文
     */
    const clearInputField = (inputElement, context = '未知') => {
        if (inputElement && inputElement.value !== '') {
            inputElement.value = '';
            console.log(`[输入框清空] ${context}: 输入框内容已清空`);
            return true;
        }
        return false;
    };

    /**
     * 清除搜索状态
     * @param {Object} store - 状态存储对象
     * @param {string} context - 清除操作的上下文
     */
    const clearSearchState = (store, context = '未知') => {
        if (store && store.clearSearch && typeof store.clearSearch === 'function') {
            store.clearSearch();
            console.log(`[搜索清除] ${context}: 搜索状态已清除`);
            return true;
        } else {
            console.warn(`[搜索清除] ${context}: store.clearSearch不可用`);
            return false;
        }
    };

    /**
     * 为新卡片添加高亮效果
     * @param {Array} newCards - 新添加的卡片数组
     */
    const highlightNewCards = (newCards) => {
        try {
            console.log('[高亮效果] 开始为新卡片添加高亮效果，数量:', newCards.length);
            
            // 多次尝试查找卡片，确保DOM已更新
            const attemptHighlight = (attempt = 1, maxAttempts = 5) => {
                // 获取所有功能卡片元素
                const cardElements = document.querySelectorAll('.feature-card');
                let highlightedCount = 0;
                
                console.log(`[高亮效果] 第${attempt}次尝试，找到卡片元素数量:`, cardElements.length);
                
                if (cardElements.length === 0 && attempt < maxAttempts) {
                    console.log(`[高亮效果] 未找到卡片元素，${500 * attempt}ms后重试...`);
                    setTimeout(() => attemptHighlight(attempt + 1, maxAttempts), 500 * attempt);
                    return;
                }
                
                cardElements.forEach((cardElement, index) => {
                    try {
                        // 检查这个卡片是否是新添加的
                        const cardTitle = cardElement.querySelector('.card-title')?.textContent?.trim();
                        const cardDescription = cardElement.querySelector('.card-description')?.textContent?.trim();
                        
                        if (!cardTitle) {
                            console.warn('[高亮效果] 卡片标题为空，跳过:', index);
                            return;
                        }
                        
                        // 使用多种方式匹配新卡片
                        const isNewCard = newCards.some(newCard => {
                            if (!newCard.title) return false;
                            
                            // 精确匹配标题
                            if (newCard.title.trim() === cardTitle) {
                                return true;
                            }
                            
                            // 如果标题匹配失败，尝试匹配描述
                            if (newCard.description && cardDescription && 
                                newCard.description.trim() === cardDescription) {
                                return true;
                            }
                            
                            // 如果都有key字段，使用key匹配
                            if (newCard.key && cardElement.dataset.key === newCard.key) {
                                return true;
                            }
                            
                            return false;
                        });
                        
                        if (isNewCard) {
                            // 为新卡片添加高亮样式
                            cardElement.classList.add('new-card-highlight');
                            highlightedCount++;
                            
                            console.log('[高亮效果] 为新卡片添加高亮:', {
                                title: cardTitle,
                                index: index,
                                element: cardElement
                            });
                            
                            // 滚动到第一个新卡片
                            if (highlightedCount === 1) {
                                cardElement.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'center',
                                    inline: 'nearest'
                                });
                                
                                // 添加额外的视觉反馈
                                setTimeout(() => {
                                    cardElement.style.animation = 'newCardPulse 1s ease-in-out';
                                }, 100);
                            }
                            
                            // 5秒后移除高亮效果
                            setTimeout(() => {
                                cardElement.classList.remove('new-card-highlight');
                                cardElement.style.animation = '';
                            }, 5000);
                        }
                    } catch (cardError) {
                        console.warn('[高亮效果] 处理单个卡片时出错:', cardError, '卡片索引:', index);
                    }
                });
                
                console.log('[高亮效果] 高亮效果添加完成，高亮数量:', highlightedCount);
                
                // 如果没有找到新卡片，尝试使用其他方法
                if (highlightedCount === 0 && attempt >= maxAttempts) {
                    console.warn('[高亮效果] 多次尝试后仍未找到匹配的新卡片，尝试高亮前几个卡片');
                    // 高亮前几个卡片作为备选方案
                    const firstCards = Array.from(cardElements).slice(0, Math.min(newCards.length, 3));
                    firstCards.forEach((cardElement, index) => {
                        cardElement.classList.add('new-card-highlight');
                        setTimeout(() => {
                            cardElement.classList.remove('new-card-highlight');
                        }, 3000);
                    });
                    console.log('[高亮效果] 备选高亮完成，高亮数量:', firstCards.length);
                }
                
                // 如果还没找到，继续尝试
                if (highlightedCount === 0 && attempt < maxAttempts) {
                    console.log(`[高亮效果] 本次未找到匹配卡片，${500 * (attempt + 1)}ms后重试...`);
                    setTimeout(() => attemptHighlight(attempt + 1, maxAttempts), 500 * (attempt + 1));
                }
            };
            
            // 开始第一次尝试
            attemptHighlight();
            
        } catch (error) {
            console.warn('[高亮效果] 添加高亮效果失败:', error);
        }
    };

    /**
     * 添加新标签
     * @param {Object} card - 卡片对象
     * @param {Event} event - 事件对象
     */
    const addNewTag = (card, event) => {
        // 阻止事件冒泡，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }
        
        // 初始化tags数组
        if (!card.tags) {
            card.tags = [];
        }
        
        // 创建新标签
        const newTag = {
            id: Date.now() + Math.random(),
            name: '',
            editing: true,
            createdAt: new Date().toISOString()
        };
        
        // 添加到卡片
        card.tags.push(newTag);
        
        // 触发Vue响应式更新
        if (store.featureCards && store.featureCards.value) {
            store.featureCards.value = [...store.featureCards.value];
        }
        
        // 自动聚焦到输入框
        setTimeout(() => {
            const tagInputs = document.querySelectorAll('.tag-input');
            const lastInput = tagInputs[tagInputs.length - 1];
            if (lastInput) {
                lastInput.focus();
            }
        }, 100);
        
        console.log('[Tag管理] 添加新标签:', newTag);
    };

    /**
     * 编辑标签
     * @param {Object} card - 卡片对象
     * @param {number} tagIndex - 标签索引
     * @param {Event} event - 事件对象
     */
    const editTag = (card, tagIndex, event) => {
        // 阻止事件冒泡，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }
        
        if (card.tags && card.tags[tagIndex]) {
            card.tags[tagIndex].editing = true;
            
            // 触发Vue响应式更新
            if (store.featureCards && store.featureCards.value) {
                store.featureCards.value = [...store.featureCards.value];
            }
            
            // 自动聚焦到输入框
            setTimeout(() => {
                const tagInputs = document.querySelectorAll('.tag-input');
                const targetInput = tagInputs[tagIndex];
                if (targetInput) {
                    targetInput.focus();
                    targetInput.select();
                }
            }, 100);
            
            console.log('[Tag管理] 开始编辑标签:', card.tags[tagIndex]);
        }
    };

    /**
     * 保存标签
     * @param {Object} card - 卡片对象
     * @param {number} tagIndex - 标签索引
     */
    const saveTag = (card, tagIndex) => {
        if (card.tags && card.tags[tagIndex]) {
            const tag = card.tags[tagIndex];
            
            // 验证标签名称
            if (!tag.name || tag.name.trim() === '') {
                // 如果标签为空，删除它
                deleteTag(card, tagIndex);
                return;
            }
            
            // 去除首尾空格
            tag.name = tag.name.trim();
            
            // 检查重复标签
            const duplicateIndex = card.tags.findIndex((t, index) => 
                index !== tagIndex && t.name.toLowerCase() === tag.name.toLowerCase()
            );
            
            if (duplicateIndex !== -1) {
                showError('标签名称已存在，请使用不同的名称');
                return;
            }
            
            // 保存标签
            tag.editing = false;
            tag.updatedAt = new Date().toISOString();
            
            // 触发Vue响应式更新
            if (store.featureCards && store.featureCards.value) {
                store.featureCards.value = [...store.featureCards.value];
            }
            
            // 标签已保存到内存中
            
            console.log('[Tag管理] 保存标签:', tag);
            showSuccess('标签保存成功');
        }
    };

    /**
     * 取消编辑标签
     * @param {Object} card - 卡片对象
     * @param {number} tagIndex - 标签索引
     */
    const cancelEditTag = (card, tagIndex) => {
        if (card.tags && card.tags[tagIndex]) {
            const tag = card.tags[tagIndex];
            
            // 如果是新标签且名称为空，直接删除
            if (!tag.name || tag.name.trim() === '') {
                deleteTag(card, tagIndex);
                return;
            }
            
            // 取消编辑状态
            tag.editing = false;
            
            // 触发Vue响应式更新
            if (store.featureCards && store.featureCards.value) {
                store.featureCards.value = [...store.featureCards.value];
            }
            
            console.log('[Tag管理] 取消编辑标签:', tag);
        }
    };

    /**
     * 删除标签
     * @param {Object} card - 卡片对象
     * @param {number} tagIndex - 标签索引
     * @param {Event} event - 事件对象
     */
    const deleteTag = (card, tagIndex, event) => {
        // 阻止事件冒泡，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }
        
        if (card.tags && card.tags[tagIndex]) {
            const tag = card.tags[tagIndex];
            
            // 从数组中移除标签
            card.tags.splice(tagIndex, 1);
            
            // 触发Vue响应式更新
            if (store.featureCards && store.featureCards.value) {
                store.featureCards.value = [...store.featureCards.value];
            }
            
            // 标签已保存到内存中
            
            console.log('[Tag管理] 删除标签:', tag);
            showSuccess('标签删除成功');
        }
    };



    /**
     * 搜索标签
     * @param {string} query - 搜索查询
     * @returns {Array} 匹配的标签结果
     */
    const searchTags = (query) => {
        if (!query || !store.featureCards || !store.featureCards.value) {
            return [];
        }
        
        const results = [];
        const searchTerm = query.toLowerCase();
        
        store.featureCards.value.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
                card.tags.forEach(tag => {
                    if (tag.name.toLowerCase().includes(searchTerm)) {
                        results.push({
                            card: card,
                            tag: tag,
                            matchType: 'tag'
                        });
                    }
                });
            }
        });
        
        return results;
    };

    /**
     * 处理卡片标题点击事件（优化版本）
     * @param {Object} card - 卡片对象
     * @param {Object} feature - 功能特性对象
     * @param {Event} event - 事件对象
     */
    const handleCardTitleClick = (card, feature, event) => {
        // 阻止事件冒泡
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // 添加点击视觉反馈
        const titleElement = event?.target?.closest('.card-title');
        if (titleElement) {
            titleElement.classList.add('clicking');
            
            // 移除点击状态类
            setTimeout(() => {
                titleElement.classList.remove('clicking');
            }, 200);
        }
        
        // 调用原有的导航逻辑
        navigateToTasks(card, feature, event);
    };

    /**
     * 处理卡片标题鼠标按下事件
     * @param {Event} event - 事件对象
     */
    const handleCardTitleMouseDown = (event) => {
        const titleElement = event.target.closest('.card-title');
        if (titleElement) {
            titleElement.classList.add('clicking');
        }
    };

    /**
     * 处理卡片标题鼠标释放事件
     * @param {Event} event - 事件对象
     */
    const handleCardTitleMouseUp = (event) => {
        const titleElement = event.target.closest('.card-title');
        if (titleElement) {
            // 延迟移除点击状态，确保用户能看到反馈
            setTimeout(() => {
                titleElement.classList.remove('clicking');
            }, 150);
        }
    };

    /**
     * 处理卡片标题触摸开始事件
     * @param {Event} event - 事件对象
     */
    const handleCardTitleTouchStart = (event) => {
        const titleElement = event.target.closest('.card-title');
        if (titleElement) {
            titleElement.classList.add('clicking');
        }
    };

    /**
     * 处理卡片标题触摸结束事件
     * @param {Event} event - 事件对象
     */
    const handleCardTitleTouchEnd = (event) => {
        const titleElement = event.target.closest('.card-title');
        if (titleElement) {
            // 延迟移除点击状态，确保用户能看到反馈
            setTimeout(() => {
                titleElement.classList.remove('clicking');
            }, 200);
        }
    };

    /**
     * 跳转到任务列表页面
     * @param {Object} card - 卡片对象
     * @param {Object} feature - 功能特性对象
     * @param {Event} event - 事件对象
     */
    const navigateToTasks = (card, feature, event) => {
        // 阻止事件冒泡，但不阻止默认行为以允许滚动
        if (event) {
            event.stopPropagation();
        }
        
        try {
            // 兼容 feature 为空
            const cardTitle = card && card.title ? encodeURIComponent(card.title) : '';
            const featureName = feature && feature.name ? encodeURIComponent(feature.name) : '';
            const tasksUrl = `/src/views/tasks/index.html?cardTitle=${cardTitle}&featureName=${featureName}`;
            
            console.log('[导航] 跳转到任务列表:', {
                card: card?.title,
                feature: feature?.name,
                url: tasksUrl
            });
            
            // 使用window.open在新标签页打开
            window.open(tasksUrl, '_blank');
            
        } catch (error) {
            console.error('[导航] 跳转失败:', error);
            showError('跳转失败，请稍后重试');
        }
    };



    /**
     * 获取标签统计信息
     * @returns {Object} 标签统计信息
     */
    const getTagStats = () => {
        if (!store.featureCards || !store.featureCards.value) {
            return { totalTags: 0, uniqueTags: 0, tagFrequency: {} };
        }
        
        const tagFrequency = {};
        let totalTags = 0;
        
        store.featureCards.value.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
                card.tags.forEach(tag => {
                    const tagName = tag.name.toLowerCase();
                    tagFrequency[tagName] = (tagFrequency[tagName] || 0) + 1;
                    totalTags++;
                });
            }
        });
        
        const uniqueTags = Object.keys(tagFrequency).length;
        
        return {
            totalTags,
            uniqueTags,
            tagFrequency,
            mostUsedTags: Object.entries(tagFrequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }))
        };
    };

    /**
     * 编辑卡片内容
     * @param {Object} card - 卡片对象
     * @param {Event} event - 事件对象
     */
    const editCard = async (card, event) => {
        try {
            if (event) event.stopPropagation();
            const { openEditCardModal } = await import('/src/views/welcome/components/editCard/index.js');
            return openEditCardModal(card, store);
        } catch (error) {
            console.error('[编辑卡片] 打开编辑插件失败:', error);
            showError('打开编辑器失败，请稍后重试');
            return;
        }
    };

    /**
     * 创建新卡片
     * @param {Event} event - 事件对象
     */
    const createCard = async (event) => {
        try {
            if (event) event.stopPropagation();
            console.log('[createCard] 方法被调用');
            const { openCreateCardModal } = await import('/src/views/welcome/components/createCard/index.js');
            return openCreateCardModal(store);
        } catch (error) {
            console.error('[创建卡片] 打开创建插件失败:', error);
            showError('打开创建界面失败，请稍后重试');
            return;
        }
    };
    
        /**
     * 安全地处理创建卡片请求
     * @param {Event} event - 事件对象
     */
    const handleCreateCard = async (event) => {
        try {
            if (event) event.stopPropagation();
            
            if (typeof createCard === 'function') {
                return await createCard(event);
            } else {
                console.error('[handleCreateCard] createCard方法不可用');
                showError('创建卡片功能暂时不可用，请稍后重试');
            }
        } catch (error) {
            console.error('[handleCreateCard] 处理创建卡片请求失败:', error);
            showError('创建卡片失败，请稍后重试');
        }
    };
    // 测试函数：手动添加测试卡片
    const addTestCard = () => {
        try {
            console.log('[测试函数] 开始添加测试卡片');
            
            const testCard = {
                title: `测试卡片 ${Date.now()}`,
                description: '这是一个测试卡片，用于验证数据更新功能',
                icon: 'fas fa-test',
                badge: 'TEST',
                hint: '测试提示',
                footerIcon: 'fas fa-arrow-right',
                features: [
                    { name: '测试功能1', icon: '🚀', desc: '测试功能描述1' },
                    { name: '测试功能2', icon: '⚡', desc: '测试功能描述2' }
                ],
                stats: [
                    { number: '1', label: '测试统计', link: null }
                ],
                tags: [
                    { name: '测试标签', id: Date.now() }
                ],
                key: `test_${Date.now()}` // 添加key字段
            };
            
            // 获取当前卡片数据
            const currentCards = store.featureCards.value || [];
            console.log('[测试函数] 当前卡片数量:', currentCards.length);
            
            // 添加测试卡片到开头
            const updatedCards = [testCard, ...currentCards];
            
            // 使用store的更新方法
            if (store.updateFeatureCards) {
                store.updateFeatureCards(updatedCards);
                console.log('[测试函数] 使用store.updateFeatureCards添加测试卡片');
            } else {
                store.featureCards.value = updatedCards;
                console.log('[测试函数] 直接赋值添加测试卡片');
            }
            
            console.log('[测试函数] 测试卡片添加完成，新总数:', updatedCards.length);
            
            // 添加高亮效果
            setTimeout(() => {
                highlightNewCards([testCard]);
            }, 500);
            
            return testCard;
        } catch (error) {
            console.error('[测试函数] 添加测试卡片失败:', error);
            return null;
        }
    };



    /**
     * 创建 YiPet 会话
     * @param {Object} card - 卡片对象
     * @param {Event} event - 事件对象
     */
    const createYiPetSession = async (card, event) => {
        // 阻止事件冒泡，防止触发卡片点击
        if (event) {
            event.stopPropagation();
        }

        if (!card || !card.title) {
            showError('无效的卡片数据');
            return;
        }

        try {
            // 显示加载状态
            showGlobalLoading('正在生成页面上下文并创建会话...');
            
            // 构建卡片内容数据，用于生成页面上下文
            const cardData = {
                title: card.title,
                description: card.description || '',
                icon: card.icon || '',
                badge: card.badge || '',
                hint: card.hint || '',
                features: card.features || [],
                stats: card.stats || [],
                tags: card.tags || [],
                year: card.year || '',
                quarter: card.quarter || '',
                month: card.month || '',
                week: card.week || '',
                day: card.day || ''
            };

            // 构建用户输入内容，包含卡片的所有信息
            const cardInfoText = `
卡片标题：${cardData.title}
卡片描述：${cardData.description}
卡片图标：${cardData.icon}
卡片徽章：${cardData.badge}
卡片提示：${cardData.hint}

功能特性：
${cardData.features.map(f => `- ${f.icon || ''} ${f.name || ''}：${f.desc || ''}`).join('\n')}

统计数据：
${cardData.stats.map(s => `- ${s.number || ''}：${s.label || ''}`).join('\n')}

项目标签：
${cardData.tags.map(t => `- ${t.name || ''}`).join('\n')}

时间信息：
${cardData.year ? `年度：${cardData.year}` : ''}
${cardData.quarter ? `季度：${cardData.quarter}` : ''}
${cardData.month ? `月份：${cardData.month}` : ''}
${cardData.week ? `周：${cardData.week}` : ''}
${cardData.day ? `日期：${cardData.day}` : ''}
`.trim();

            // 获取系统提示词
            const fromSystem = await window.getData(`/src/assets/prompts/target/pageContext.txt`);
            
            const { streamPromptJSON } = await import('/src/services/modules/crud.js');
            const response = await streamPromptJSON(`${window.API_URL}/`, {
                module_name: 'services.ai.chat_service',
                method_name: 'chat',
                parameters: {
                    system: fromSystem,
                    user: `请根据以下卡片信息生成完整的 Markdown 格式页面上下文内容：\n\n${cardInfoText}`
                }
            });

            // 提取生成的 markdown 内容
            let pageContent = '';
            if (typeof response === 'string') {
                pageContent = response;
            } else if (response && response.data) {
                // streamPromptJSON 返回格式为 { data: [...] }
                if (Array.isArray(response.data) && response.data.length > 0) {
                    // 如果 data 是数组，取第一个元素
                    const firstItem = response.data[0];
                    pageContent = typeof firstItem === 'string' ? firstItem : JSON.stringify(firstItem, null, 2);
                } else if (typeof response.data === 'string') {
                    pageContent = response.data;
                } else {
                    pageContent = JSON.stringify(response.data, null, 2);
                }
            } else if (response && response.content) {
                pageContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2);
            } else {
                pageContent = JSON.stringify(response, null, 2);
            }

            // 如果内容为空，使用卡片信息作为后备
            if (!pageContent || pageContent.trim() === '') {
                pageContent = `# ${cardData.title}\n\n## 描述\n${cardData.description || '暂无描述'}\n\n## 功能特性\n${cardData.features.map(f => `- ${f.icon || ''} ${f.name || ''}：${f.desc || ''}`).join('\n')}\n\n## 统计数据\n${cardData.stats.map(s => `- ${s.number || ''}：${s.label || ''}`).join('\n')}\n\n## 项目标签\n${cardData.tags.map(t => `- ${t.name || ''}`).join('\n')}`;
            }

            // 生成会话 ID（基于卡片标题和当前时间戳）
            const sessionId = `session_${Date.now()}_${cardData.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            // 获取当前时间戳
            const now = Date.now();

            // 生成唯一的随机 URL（借鉴 YiPet 手动创建会话时的 url 字段）
            // 使用自定义协议格式：blank-session://{timestamp}-{random}
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 11); // 9位随机字符串
            const uniqueUrl = `blank-session://${timestamp}-${randomStr}`;

            // 构建会话数据
            const sessionData = {
                id: sessionId,
                url: uniqueUrl,
                title: cardData.title,
                pageTitle: cardData.title,
                pageDescription: cardData.description || '',
                pageContent: pageContent,
                messages: [],
                tags: cardData.tags.map(t => t.name || '').filter(t => t),
                createdAt: now,
                updatedAt: now,
                lastAccessTime: now
            };

            // 调用会话保存接口
            // const { postData } = await import('/src/services/index.js');
            // const saveResult = await postData(`${window.API_URL}/session/save`, sessionData);
            
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'create_document',
                parameters: {
                    cname: 'sessions',
                    data: sessionData
                }
            };
            const saveResult = await postData(`${window.API_URL}/`, payload);

            hideGlobalLoading();
            
            if (saveResult && saveResult.success !== false) {
                showSuccess(`已成功创建 YiPet 会话：${cardData.title}`);
                console.log('[创建会话] 会话创建成功:', saveResult);
            } else {
                throw new Error(saveResult?.message || '创建会话失败');
            }
        } catch (error) {
            hideGlobalLoading();
            console.error('[创建会话] 创建会话失败:', error);
            showError(`创建会话失败：${error.message || '未知错误'}`);
        }
    };

    // 返回方法集合
    const methods = {
        openLink,
        deleteCard,
        startLongPress,
        endLongPress,
        generateTask,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd,
        handleCardClick,
        handleStatItemClick,
        handleSearchInput,
        handleSearchKeydown,
        clearSearch,
        // 时间选择器相关方法
        handleAllSelect,
        handleYearChange,
        handleQuarterChange,
        handleMonthChange,
        handleWeekChange,
        handleDayChange,
        clearYear,
        clearQuarter,
        clearMonth,
        clearWeek,
        clearDay,
        getMonthsByQuarter,
        getWeeksByMonth,
        getDaysByWeek,

        // 上传下载相关方法
        handleDownloadData,
        triggerUploadData,
        handleUploadData,
        handleZipUpload,
        handleJsonUpload,
        // 任务对象工具函数
        createStandardTask,
        enableWeeklyReport,
        enableDailyReport,
        updateTaskProgress,
        addTimeEntry,
        getTasksStatistics,
        calculateNextWeeklyDue,
        calculateNextDailyDue,
        addNewTag,
        editTag,
        saveTag,
        cancelEditTag,
        deleteTag,
        searchTags,
        getTagStats,
        navigateToTasks,
        handleCardTitleClick,
        handleCardTitleMouseDown,
        handleCardTitleMouseUp,
        handleCardTitleTouchStart,
        handleCardTitleTouchEnd,
        editCard,
        createCard,
        handleCreateCard,
        createYiPetSession,  // 创建 YiPet 会话
        highlightNewCards,  // 新卡片高亮效果
        addTestCard,        // 测试函数
        clearInputField,    // 输入框清空函数
        clearSearchState,   // 搜索状态清除函数
        openAuth,            // API 鉴权配置
        loadFeatureCards: store.loadFeatureCards  // 暴露重新加载数据的方法
    };
    
    // 调试信息
    console.log('[useMethods] 返回的方法:', Object.keys(methods));
    
    return methods;
};












