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
import { showGlobalLoading, hideGlobalLoading } from '/utils/loading.js';

export const useMethods = (store) => {
    // 辅助函数：添加被动事件监听器
    const addPassiveEventListener = (element, event, handler, options = {}) => {
        const finalOptions = { passive: true, ...options };
        element.addEventListener(event, handler, finalOptions);
    };
    
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
    let longPressAudio = null;
    
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
        const tasksUrl = `/views/tasks/index.html?featureName=${encodeURIComponent(feature.name)}&cardTitle=${encodeURIComponent(card.title)}`;

        try {
            const target = feature.name + '-' + feature.desc;
            const description = card.title + '-' + card.description;

            const fromSystem = await getData(`${window.DATA_URL}/prompts/tasks/tasks.txt`);

            console.log('[生成任务] 生成任务:', fromSystem);

            // 发送消息请求到API
            const response = await postData(`${window.API_URL}/prompt`, {
                fromSystem,
                fromUser: `目标是:${target}, 描述:${description}`
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
        
        // 保存原始输入框状态
        const originalPlaceholder = messageInput.placeholder;
        const originalValue = messageInput.value;
        const originalDisabled = messageInput.disabled;
        
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
            
            // 显示全局加载提示
            // showGlobalLoading('正在处理您的请求，请稍候...');
            
            // 添加触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
            
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

                // 显示保存进度提示
                // showGlobalLoading('正在保存数据，请稍候...');
                
                // 等待所有数据保存完成
                await Promise.all(
                    response.data.map(async (item) => {
                        try {
                            await postData(`${window.API_URL}/mongodb/?cname=goals`, item);
                        } catch (saveError) {
                            console.warn('[数据保存] 单个项目保存失败:', saveError);
                        }
                    })
                );
                
                // 更新卡片数据
                store.featureCards.value = response.data.concat(store.featureCards.value);
                
                // 清空输入框
                messageInput.value = '';
                
                // 显示成功提示
                showSuccess('消息处理成功，已生成新的功能卡片');
                
                // 添加成功触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 50]);
                }
                
                console.log('[消息处理] 处理完成，新增卡片数量:', response.data.length);
            } else {
                console.error('[API错误] 服务器返回错误:', response);
                showError('服务器返回错误，请稍后重试');
            }
        } catch (error) {
            console.error('[消息处理错误]', error);
            showError('消息发送失败，请稍后重试');
            
            // 恢复输入框内容
            messageInput.value = originalValue;
        } finally {
            // 清除处理状态
            isProcessing = false;
            
            // 清除加载状态
            store.loading.value = false;
            
            // 隐藏全局加载提示
            // hideGlobalLoading();
            
            // 恢复输入框状态
            messageInput.disabled = originalDisabled;
            messageInput.placeholder = originalPlaceholder;
            messageInput.style.opacity = '';
            messageInput.style.cursor = '';
            messageInput.classList.remove('loading-input');
            
            // 重新聚焦输入框
            setTimeout(() => {
                messageInput.focus();
            }, 100);
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
            // 构建跳转URL，参考 window.open 格式
            const tasksUrl = `/views/tasks/index.html?featureName=${encodeURIComponent(feature.name)}&cardTitle=${encodeURIComponent(card.title)}`;
            
            console.log('[导航] 跳转到任务列表:', {
                card: card.title,
                feature: feature.name,
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
     * 从标签跳转到AICR页面
     * 标签格式：projectId/versionId
     */
    const openAicrFromTag = (tagName, event) => {
        if (event) event.stopPropagation();
        try {
            const raw = (tagName || '').trim();
            if (!raw) {
                showError('无效的标签');
                return;
            }
            const parts = raw.split('/').map(s => s.trim()).filter(Boolean);
            if (parts.length < 2) {
                showError('标签格式应为 项目ID/版本ID');
                return;
            }
            const projectId = encodeURIComponent(parts[0]);
            const versionId = encodeURIComponent(parts[1]);
            const url = `/views/aicr/index.html?projectId=${projectId}&versionId=${versionId}`;
            window.open(url, '_blank');
        } catch (e) {
            console.error('[openAicrFromTag] 失败:', e);
            showError('打开AICR失败');
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
            const { openEditCardModal } = await import('/views/welcome/plugins/editCard/index.js');
            return openEditCardModal(card, store);
        } catch (error) {
            console.error('[编辑卡片] 打开编辑插件失败:', error);
            showError('打开编辑器失败，请稍后重试');
            return;
        }
    };



    // 返回方法集合
    return {
        openLink,
        deleteCard,
        startLongPress,
        endLongPress,
        generateTask,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd,
        handleCardClick,
        handleSearchInput,
        handleSearchKeydown,
        clearSearch,
        addNewTag,
        editTag,
        saveTag,
        cancelEditTag,
        deleteTag,
        searchTags,
        getTagStats,
        navigateToTasks,
        openAicrFromTag,
        editCard,
        loadFeatureCards: store.loadFeatureCards  // 暴露重新加载数据的方法
    };
};








