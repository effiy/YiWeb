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

            window.open(`/views/tasks/index.html?featureName=${feature.name}&cardTitle=${card.title}`, '_blank');

        } catch (err) {
            // 隐藏加载状态
            hideGlobalLoading();
            showError('生成任务失败，请稍后重试');
            console.error('[生成任务] 生成任务失败:', err);
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
            
            // 保存到本地存储或数据库
            saveTagsToStorage(card);
            
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
            
            // 保存到本地存储或数据库
            saveTagsToStorage(card);
            
            console.log('[Tag管理] 删除标签:', tag);
            showSuccess('标签删除成功');
        }
    };

    /**
     * 保存标签到存储
     * @param {Object} card - 卡片对象
     */
    const saveTagsToStorage = async (card) => {
        try {
            // 如果是MongoDB数据，保存到数据库
            if (card.key) {
                const response = await postData(`${window.API_URL}/mongodb/update`, {
                    cname: 'goals',
                    key: card.key,
                    updateData: { tags: card.tags }
                });
                
                if (response.success) {
                    console.log('[Tag管理] 标签已保存到数据库');
                } else {
                    console.warn('[Tag管理] 数据库保存失败:', response.message);
                }
            } else {
                // 本地数据保存到localStorage
                const localCards = JSON.parse(localStorage.getItem('localFeatureCards') || '[]');
                const cardIndex = localCards.findIndex(c => c.title === card.title);
                
                if (cardIndex !== -1) {
                    localCards[cardIndex].tags = card.tags;
                    localStorage.setItem('localFeatureCards', JSON.stringify(localCards));
                    console.log('[Tag管理] 标签已保存到本地存储');
                }
            }
        } catch (error) {
            console.error('[Tag管理] 保存标签失败:', error);
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
    const editCard = (card, event) => {
        console.log('[编辑卡片] 开始编辑卡片:', card.title);
        
        try {
            // 阻止事件冒泡，但不阻止默认行为以允许滚动
            if (event) {
                event.stopPropagation();
            }
            
            console.log('[编辑卡片] 开始创建编辑模态框');
            
            // 创建模态框容器
            const modal = document.createElement('div');
            modal.className = 'edit-card-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                animation: modalFadeIn 0.3s ease-out;
                overflow: hidden;
            `;
            
            // 创建模态框内容
            const modalContent = document.createElement('div');
            modalContent.className = 'edit-card-content';
            modalContent.style.cssText = `
                background: var(--bg-primary, #1a1a1a);
                border: 1px solid var(--border-primary, #333);
                border-radius: 12px;
                padding: 24px;
                max-width: min(90vw, 800px);
                max-height: min(90vh, 600px);
                width: 100%;
                overflow: auto;
                position: relative;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                color: var(--text-primary, #fff);
                margin: auto;
                box-sizing: border-box;
            `;
            
            // 创建标题
            const modalTitle = document.createElement('h3');
            modalTitle.innerHTML = `
                <span>编辑卡片</span>
                <span class="card-name">${card.title}</span>
            `;
            modalTitle.style.cssText = `
                margin: 0 0 24px 0;
                color: var(--text-primary, #fff);
                font-size: 22px;
                font-weight: 700;
                padding: 20px 24px;
                border-radius: 8px 8px 0 0;
                border: none;
                position: sticky;
                top: 0;
                background: linear-gradient(135deg, var(--bg-primary, #1a1a1a) 0%, var(--bg-secondary, #2a2a2a) 100%);
                z-index: 20;
                overflow: hidden;
                letter-spacing: 0.5px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            
            // 创建表单
            const form = document.createElement('form');
            form.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
            `;
            
            // 创建输入字段
            const fields = [
                { key: 'title', label: '标题', type: 'text', required: true },
                { key: 'description', label: '描述', type: 'textarea', required: true },
                { key: 'icon', label: '图标类名', type: 'text', required: false },
                { key: 'badge', label: '徽章文本', type: 'text', required: false },
                { key: 'link', label: '链接地址', type: 'url', required: false },
                { key: 'hint', label: '提示文本', type: 'text', required: false },
                { key: 'footerIcon', label: '底部图标', type: 'text', required: false }
            ];
            
            const formData = { ...card };
            
            fields.forEach(field => {
                const fieldContainer = document.createElement('div');
                fieldContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                `;
                
                const label = document.createElement('label');
                label.textContent = field.label;
                label.style.cssText = `
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    font-size: 14px;
                    margin-bottom: 4px;
                    display: block;
                `;
                
                let input;
                if (field.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.rows = 3;
                    input.style.cssText = `
                        padding: 12px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 6px;
                        background: var(--bg-secondary, #2a2a2a);
                        color: var(--text-primary, #fff);
                        font-size: 14px;
                        resize: vertical;
                        font-family: inherit;
                        min-height: 80px;
                        box-sizing: border-box;
                        width: 100%;
                        transition: all 0.2s ease;
                    `;
                } else {
                    input = document.createElement('input');
                    input.type = field.type;
                    input.style.cssText = `
                        padding: 12px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 6px;
                        background: var(--bg-secondary, #2a2a2a);
                        color: var(--text-primary, #fff);
                        font-size: 14px;
                        box-sizing: border-box;
                        width: 100%;
                        transition: all 0.2s ease;
                    `;
                }
                
                input.value = formData[field.key] || '';
                input.required = field.required;
                
                // 监听输入变化
                addPassiveEventListener(input, 'input', (e) => {
                    formData[field.key] = e.target.value;
                });
                
                fieldContainer.appendChild(label);
                fieldContainer.appendChild(input);
                form.appendChild(fieldContainer);
            });
            
            // 创建功能特性编辑区域
            const featuresContainer = document.createElement('div');
            featuresContainer.className = 'features-container';
            featuresContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-top: 16px;
                background: var(--bg-secondary, #2a2a2a);
                border: 1px solid var(--border-secondary, #444);
                border-radius: 8px;
                padding: 16px;
            `;
            
            const featuresTitle = document.createElement('h4');
            featuresTitle.textContent = '功能特性';
            featuresTitle.className = 'features-title';
            featuresTitle.style.cssText = `
                margin: 0 0 16px 0;
                color: var(--text-primary, #fff);
                font-size: 16px;
                font-weight: 600;
                border-bottom: 1px solid var(--border-secondary, #444);
                padding-bottom: 8px;
            `;
            
            const featuresList = document.createElement('div');
            featuresList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;
            
            // 初始化功能特性
            if (!formData.features) formData.features = [];
            
            const renderFeatures = () => {
                featuresList.innerHTML = '';
                
                formData.features.forEach((feature, index) => {
                    const featureItem = document.createElement('div');
                    featureItem.className = 'feature-item';
                    featureItem.style.cssText = `
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        padding: 12px;
                        border: 1px solid var(--border-secondary, #444);
                        border-radius: 6px;
                        background: var(--bg-primary, #1a1a1a);
                        margin-bottom: 8px;
                        transition: all 0.2s ease;
                    `;
                    
                    const iconInput = document.createElement('input');
                    iconInput.type = 'text';
                    iconInput.placeholder = '图标';
                    iconInput.value = feature.icon || '';
                    iconInput.style.cssText = `
                        padding: 8px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 4px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 12px;
                        width: 80px;
                    `;
                    
                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.placeholder = '名称';
                    nameInput.value = feature.name || '';
                    nameInput.style.cssText = `
                        padding: 8px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 4px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 12px;
                        flex: 1;
                    `;
                    
                    const descInput = document.createElement('input');
                    descInput.type = 'text';
                    descInput.placeholder = '描述';
                    descInput.value = feature.desc || '';
                    descInput.style.cssText = `
                        padding: 8px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 4px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 12px;
                        flex: 1;
                    `;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '×';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.style.cssText = `
                        background: var(--danger, #dc3545);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        width: 24px;
                        height: 24px;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        transition: all 0.2s ease;
                    `;
                    
                    // 监听输入变化
                    iconInput.addEventListener('input', (e) => {
                        formData.features[index].icon = e.target.value;
                    });
                    nameInput.addEventListener('input', (e) => {
                        formData.features[index].name = e.target.value;
                    });
                    descInput.addEventListener('input', (e) => {
                        formData.features[index].desc = e.target.value;
                    });
                    
                    deleteBtn.addEventListener('click', () => {
                        formData.features.splice(index, 1);
                        renderFeatures();
                    });
                    
                    featureItem.appendChild(iconInput);
                    featureItem.appendChild(nameInput);
                    featureItem.appendChild(descInput);
                    featureItem.appendChild(deleteBtn);
                    featuresList.appendChild(featureItem);
                });
            };
            
            const addFeatureBtn = document.createElement('button');
            addFeatureBtn.textContent = '+ 添加功能特性';
            addFeatureBtn.type = 'button';
            addFeatureBtn.className = 'add-btn';
            addFeatureBtn.style.cssText = `
                background: var(--primary, #007bff);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 12px;
                align-self: flex-start;
                transition: all 0.2s ease;
                margin-top: 8px;
            `;
            
            addFeatureBtn.addEventListener('click', () => {
                formData.features.push({ icon: '', name: '', desc: '' });
                renderFeatures();
            });
            
            featuresContainer.appendChild(featuresTitle);
            featuresContainer.appendChild(featuresList);
            featuresContainer.appendChild(addFeatureBtn);
            
            // 创建统计数据编辑区域
            const statsContainer = document.createElement('div');
            statsContainer.className = 'stats-container';
            statsContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-top: 20px;
                background: linear-gradient(135deg, var(--bg-secondary, #2a2a2a) 0%, var(--bg-tertiary, #3a3a3a) 100%);
                border: 2px solid var(--border-secondary, #444);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            `;
            
            // 添加装饰性背景
            const statsBgDecoration = document.createElement('div');
            statsBgDecoration.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, var(--primary, #007bff) 0%, var(--success, #28a745) 50%, var(--warning, #ffc107) 100%);
                border-radius: 2px;
            `;
            statsContainer.appendChild(statsBgDecoration);
            
            const statsTitle = document.createElement('h4');
            statsTitle.innerHTML = `
                <i class="fas fa-chart-bar" style="margin-right: 8px; color: var(--primary, #007bff);"></i>
                统计数据
            `;
            statsTitle.className = 'stats-title';
            statsTitle.style.cssText = `
                margin: 0 0 20px 0;
                color: var(--text-primary, #fff);
                font-size: 18px;
                font-weight: 700;
                border-bottom: 2px solid var(--border-secondary, #444);
                padding-bottom: 12px;
                display: flex;
                align-items: center;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
            
            const statsList = document.createElement('div');
            statsList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
            `;
            
            // 初始化统计数据
            if (!formData.stats) formData.stats = [];
            
            const renderStats = () => {
                statsList.innerHTML = '';
                
                formData.stats.forEach((stat, index) => {
                    const statItem = document.createElement('div');
                    statItem.className = 'stat-item';
                    statItem.style.cssText = `
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        padding: 12px;
                        border: 2px solid var(--border-secondary, #444);
                        border-radius: 10px;
                        background: linear-gradient(135deg, var(--bg-primary, #1a1a1a) 0%, var(--bg-secondary, #2a2a2a) 100%);
                        margin-bottom: 0;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                        flex-wrap: nowrap;
                        min-width: 0;
                    `;
                    
                                // 添加悬停效果
            statItem.addEventListener('mouseenter', () => {
                statItem.style.transform = 'translateY(-2px)';
                statItem.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
                statItem.style.borderColor = 'var(--primary, #007bff)';
            }, { passive: true });
            
            statItem.addEventListener('mouseleave', () => {
                statItem.style.transform = 'translateY(0)';
                statItem.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
                statItem.style.borderColor = 'var(--border-secondary, #444)';
            }, { passive: true });
                    
                    // 数字输入框
                    const numberInput = document.createElement('input');
                    numberInput.type = 'text';
                    numberInput.placeholder = '数字';
                    numberInput.value = stat.number || '';
                    numberInput.style.cssText = `
                        padding: 8px;
                        border: 2px solid var(--border-primary, #333);
                        border-radius: 8px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                        width: 80px;
                        text-align: center;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        flex-shrink: 0;
                    `;
                    
                    // 数字输入框焦点效果
                    numberInput.addEventListener('focus', () => {
                        numberInput.style.borderColor = 'var(--primary, #007bff)';
                        numberInput.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                        numberInput.style.transform = 'scale(1.02)';
                    });
                    
                    numberInput.addEventListener('blur', () => {
                        numberInput.style.borderColor = 'var(--border-primary, #333)';
                        numberInput.style.boxShadow = 'none';
                        numberInput.style.transform = 'scale(1)';
                    });
                    
                    // 标签输入框
                    const labelInput = document.createElement('input');
                    labelInput.type = 'text';
                    labelInput.placeholder = '标签名称';
                    labelInput.value = stat.label || '';
                    labelInput.style.cssText = `
                        padding: 8px;
                        border: 2px solid var(--border-primary, #333);
                        border-radius: 8px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                        width: 120px;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        flex-shrink: 0;
                    `;
                    
                    // 标签输入框焦点效果
                    labelInput.addEventListener('focus', () => {
                        labelInput.style.borderColor = 'var(--primary, #007bff)';
                        labelInput.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                        labelInput.style.transform = 'scale(1.02)';
                    });
                    
                    labelInput.addEventListener('blur', () => {
                        labelInput.style.borderColor = 'var(--border-primary, #333)';
                        labelInput.style.boxShadow = 'none';
                        labelInput.style.transform = 'scale(1)';
                    });
                    
                    // 链接输入框
                    const linkInput = document.createElement('input');
                    linkInput.type = 'url';
                    linkInput.placeholder = '链接地址 (可选)';
                    linkInput.value = stat.link || '';
                    linkInput.style.cssText = `
                        padding: 8px;
                        border: 2px solid var(--border-primary, #333);
                        border-radius: 8px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 13px;
                        width: 150px;
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        flex-shrink: 0;
                    `;
                    
                    // 链接输入框焦点效果
                    linkInput.addEventListener('focus', () => {
                        linkInput.style.borderColor = 'var(--success, #28a745)';
                        linkInput.style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.1)';
                        linkInput.style.transform = 'scale(1.02)';
                    });
                    
                    linkInput.addEventListener('blur', () => {
                        linkInput.style.borderColor = 'var(--border-primary, #333)';
                        linkInput.style.boxShadow = 'none';
                        linkInput.style.transform = 'scale(1)';
                    });
                    
                    // 删除按钮
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.style.cssText = `
                        background: linear-gradient(135deg, var(--danger, #dc3545) 0%, #c82333 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        width: 32px;
                        height: 32px;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
                    `;
                    
                    // 删除按钮悬停效果
                    deleteBtn.addEventListener('mouseenter', () => {
                        deleteBtn.style.transform = 'scale(1.1) rotate(5deg)';
                        deleteBtn.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.5)';
                    });
                    
                    deleteBtn.addEventListener('mouseleave', () => {
                        deleteBtn.style.transform = 'scale(1) rotate(0deg)';
                        deleteBtn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
                    });
                    
                    // 删除按钮点击效果
                    deleteBtn.addEventListener('mousedown', () => {
                        deleteBtn.style.transform = 'scale(0.95)';
                    });
                    
                    deleteBtn.addEventListener('mouseup', () => {
                        deleteBtn.style.transform = 'scale(1.1) rotate(5deg)';
                    });
                    
                    // 监听输入变化
                    numberInput.addEventListener('input', (e) => {
                        formData.stats[index].number = e.target.value;
                    });
                    labelInput.addEventListener('input', (e) => {
                        formData.stats[index].label = e.target.value;
                    });
                    linkInput.addEventListener('input', (e) => {
                        formData.stats[index].link = e.target.value;
                    });
                    
                    // 删除按钮点击事件
                    deleteBtn.addEventListener('click', () => {
                        // 添加删除确认动画
                        statItem.style.transform = 'translateX(100px)';
                        statItem.style.opacity = '0';
                        
                        setTimeout(() => {
                            formData.stats.splice(index, 1);
                            renderStats();
                        }, 300);
                    });
                    
                    // 键盘导航支持
                    const inputs = [numberInput, labelInput, linkInput];
                    inputs.forEach((input, inputIndex) => {
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                // 下一个输入框或下一个统计项
                                if (inputIndex < inputs.length - 1) {
                                    inputs[inputIndex + 1].focus();
                                } else if (index < formData.stats.length - 1) {
                                    // 聚焦到下一个统计项的第一个输入框
                                    setTimeout(() => {
                                        const nextStatItem = statsList.children[index + 1];
                                        if (nextStatItem) {
                                            const firstInput = nextStatItem.querySelector('input');
                                            if (firstInput) firstInput.focus();
                                        }
                                    }, 100);
                                } else {
                                    // 最后一个输入框，添加新的统计项
                                    addStatBtn.click();
                                }
                            } else if (e.key === 'ArrowUp' && inputIndex === 0) {
                                // 向上导航到上一个统计项
                                if (index > 0) {
                                    setTimeout(() => {
                                        const prevStatItem = statsList.children[index - 1];
                                        if (prevStatItem) {
                                            const lastInput = prevStatItem.querySelector('input:last-of-type');
                                            if (lastInput) lastInput.focus();
                                        }
                                    }, 100);
                                }
                            } else if (e.key === 'ArrowDown' && inputIndex === inputs.length - 1) {
                                // 向下导航到下一个统计项
                                if (index < formData.stats.length - 1) {
                                    setTimeout(() => {
                                        const nextStatItem = statsList.children[index + 1];
                                        if (nextStatItem) {
                                            const firstInput = nextStatItem.querySelector('input');
                                            if (firstInput) firstInput.focus();
                                        }
                                    }, 100);
                                }
                            }
                        });
                    });
                    
                    // 添加拖拽排序指示器
                    const dragHandle = document.createElement('div');
                    dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
                    dragHandle.style.cssText = `
                        color: var(--text-secondary, #888);
                        cursor: grab;
                        padding: 4px;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 20px;
                        height: 20px;
                        flex-shrink: 0;
                    `;
                    
                    dragHandle.addEventListener('mouseenter', () => {
                        dragHandle.style.color = 'var(--primary, #007bff)';
                        dragHandle.style.transform = 'scale(1.1)';
                    });
                    
                    dragHandle.addEventListener('mouseleave', () => {
                        dragHandle.style.color = 'var(--text-secondary, #888)';
                        dragHandle.style.transform = 'scale(1)';
                    });
                    
                    statItem.appendChild(dragHandle);
                    statItem.appendChild(numberInput);
                    statItem.appendChild(labelInput);
                    statItem.appendChild(linkInput);
                    statItem.appendChild(deleteBtn);
                    statsList.appendChild(statItem);
                });
            };
            
            const addStatBtn = document.createElement('button');
            addStatBtn.innerHTML = `
                <i class="fas fa-plus" style="margin-right: 8px;"></i>
                添加统计数据
            `;
            addStatBtn.type = 'button';
            addStatBtn.className = 'add-btn';
            addStatBtn.style.cssText = `
                background: linear-gradient(135deg, var(--primary, #007bff) 0%, var(--primary-dark, #0056b3) 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 20px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                align-self: flex-start;
                transition: all 0.3s ease;
                margin-top: 16px;
                box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
                position: relative;
                overflow: hidden;
            `;
            
            // 添加按钮悬停效果
            addStatBtn.addEventListener('mouseenter', () => {
                addStatBtn.style.transform = 'translateY(-2px)';
                addStatBtn.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
            });
            
            addStatBtn.addEventListener('mouseleave', () => {
                addStatBtn.style.transform = 'translateY(0)';
                addStatBtn.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.3)';
            });
            
            // 添加按钮点击效果
            addStatBtn.addEventListener('mousedown', () => {
                addStatBtn.style.transform = 'scale(0.95)';
            });
            
            addStatBtn.addEventListener('mouseup', () => {
                addStatBtn.style.transform = 'scale(1)';
            });
            
            addStatBtn.addEventListener('click', () => {
                // 添加触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                formData.stats.push({ number: '', label: '', link: '' });
                renderStats();
                
                // 聚焦到新添加的统计项
                setTimeout(() => {
                    const newStatItem = statsList.lastElementChild;
                    if (newStatItem) {
                        const firstInput = newStatItem.querySelector('input');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }
                }, 100);
            });
            
            statsContainer.appendChild(statsTitle);
            statsContainer.appendChild(statsList);
            statsContainer.appendChild(addStatBtn);
            
            // 创建按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            buttonContainer.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid var(--border-primary, #333);
                position: sticky;
                bottom: 0;
                background: var(--bg-primary, #1a1a1a);
                z-index: 10;
            `;
            
            // 创建保存按钮
            const saveButton = document.createElement('button');
            saveButton.textContent = '保存更改';
            saveButton.type = 'submit';
            saveButton.className = 'save-btn';
            saveButton.style.cssText = `
                background: linear-gradient(135deg, var(--success, #28a745) 0%, var(--success-hover, #218838) 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 14px 28px;
                font-size: 15px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                min-width: 120px;
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-family: inherit;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            `;
            
            // 创建取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.type = 'button';
            cancelButton.className = 'cancel-btn';
            cancelButton.style.cssText = `
                background: linear-gradient(135deg, var(--bg-secondary, #2a2a2a) 0%, var(--bg-tertiary, #3a3a3a) 100%);
                color: var(--text-primary, #fff);
                border: 2px solid var(--border-primary, #333);
                border-radius: 8px;
                padding: 14px 28px;
                font-size: 15px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                min-width: 120px;
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-family: inherit;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            `;
            
            // 添加事件监听器
            addPassiveEventListener(form, 'submit', async (e) => {
                e.preventDefault();
                
                try {
                    console.log('[编辑卡片] 保存卡片更改:', formData);
                    
                    // 验证必填字段
                    if (!formData.title || !formData.description) {
                        showError('标题和描述为必填字段');
                        return;
                    }
                    
                    // 添加触觉反馈
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                    
                    // 添加保存按钮加载状态
                    saveButton.classList.add('loading');
                    saveButton.disabled = true;
                    cancelButton.disabled = true;
                    
                    // 更新卡片数据
                    Object.assign(card, formData);
                    
                    // 如果卡片有key字段（MongoDB数据），则更新到数据库
                    if (card.key) {
                        try {
                            await postData(`${window.API_URL}/mongodb/?cname=featureCards&id=${card.key}`, card);
                            console.log('[编辑卡片] 数据库更新成功');
                        } catch (dbError) {
                            console.error('[编辑卡片] 数据库更新失败:', dbError);
                            showError('数据库更新失败，但本地更改已保存');
                        }
                    }
                    
                    // 移除加载状态
                    saveButton.classList.remove('loading');
                    saveButton.disabled = false;
                    cancelButton.disabled = false;
                    
                    // 关闭模态框
                    modal.remove();
                    
                    // 显示成功消息
                    showSuccess(`卡片"${card.title}"已更新`);
                    
                    // 触发数据刷新
                    if (store && store.loadFeatureCards) {
                        await store.loadFeatureCards();
                    }
                    
                } catch (error) {
                    console.error('[编辑卡片] 保存失败:', error);
                    showError('保存失败，请稍后重试');
                    
                    // 移除加载状态
                    saveButton.classList.remove('loading');
                    saveButton.disabled = false;
                    cancelButton.disabled = false;
                }
            });
            
            addPassiveEventListener(cancelButton, 'click', () => {
                // 添加触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
                
                modal.remove();
            });
            
            // 组装模态框
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);
            
            // 创建标签管理区域
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags-container';
            tagsContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-top: 16px;
                background: var(--bg-secondary, #2a2a2a);
                border: 1px solid var(--border-secondary, #444);
                border-radius: 8px;
                padding: 16px;
            `;
            
            const tagsTitle = document.createElement('h4');
            tagsTitle.textContent = '项目标签';
            tagsTitle.className = 'tags-title';
            tagsTitle.style.cssText = `
                margin: 0 0 16px 0;
                color: var(--text-primary, #fff);
                font-size: 16px;
                font-weight: 600;
                border-bottom: 1px solid var(--border-secondary, #444);
                padding-bottom: 8px;
            `;
            
            const tagsList = document.createElement('div');
            tagsList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;
            
            // 初始化标签数据
            if (!formData.tags) formData.tags = [];
            
            const renderTags = () => {
                tagsList.innerHTML = '';
                
                formData.tags.forEach((tag, index) => {
                    const tagItem = document.createElement('div');
                    tagItem.className = 'tag-item';
                    tagItem.style.cssText = `
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        padding: 12px;
                        border: 1px solid var(--border-secondary, #444);
                        border-radius: 6px;
                        background: var(--bg-primary, #1a1a1a);
                        margin-bottom: 8px;
                        transition: all 0.2s ease;
                    `;
                    
                    const tagInput = document.createElement('input');
                    tagInput.type = 'text';
                    tagInput.placeholder = '标签名称';
                    tagInput.value = tag.name || '';
                    tagInput.style.cssText = `
                        padding: 8px;
                        border: 1px solid var(--border-primary, #333);
                        border-radius: 4px;
                        background: var(--bg-primary, #1a1a1a);
                        color: var(--text-primary, #fff);
                        font-size: 12px;
                        flex: 1;
                        transition: all 0.2s ease;
                    `;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '×';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.style.cssText = `
                        background: var(--danger, #dc3545);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        width: 24px;
                        height: 24px;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        transition: all 0.2s ease;
                    `;
                    
                    // 监听输入变化
                    tagInput.addEventListener('input', (e) => {
                        formData.tags[index].name = e.target.value;
                    });
                    
                    // 监听失焦事件，验证标签名称
                    tagInput.addEventListener('blur', (e) => {
                        const tagName = e.target.value.trim();
                        if (!tagName) {
                            // 如果标签名称为空，删除该标签
                            formData.tags.splice(index, 1);
                            renderTags();
                            return;
                        }
                        
                        // 检查是否有重复标签
                        const duplicateIndex = formData.tags.findIndex((tag, i) => 
                            i !== index && tag.name.trim().toLowerCase() === tagName.toLowerCase()
                        );
                        
                        if (duplicateIndex !== -1) {
                            showError(`标签 "${tagName}" 已存在`);
                            formData.tags.splice(index, 1);
                            renderTags();
                            return;
                        }
                        
                        // 更新标签名称
                        formData.tags[index].name = tagName;
                    });
                    
                    // 监听回车键，保存标签
                    tagInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            tagInput.blur();
                        }
                    });
                    
                    deleteBtn.addEventListener('click', () => {
                        formData.tags.splice(index, 1);
                        renderTags();
                    });
                    
                    tagItem.appendChild(tagInput);
                    tagItem.appendChild(deleteBtn);
                    tagsList.appendChild(tagItem);
                });
            };
            
            const addTagBtn = document.createElement('button');
            addTagBtn.textContent = '+ 添加标签';
            addTagBtn.type = 'button';
            addTagBtn.className = 'add-btn';
            addTagBtn.style.cssText = `
                background: var(--primary, #007bff);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 12px;
                align-self: flex-start;
                transition: all 0.2s ease;
                margin-top: 8px;
            `;
            
            addTagBtn.addEventListener('click', () => {
                // 检查是否已有空标签
                const hasEmptyTag = formData.tags.some(tag => !tag.name.trim());
                if (hasEmptyTag) {
                    showError('请先填写现有标签名称');
                    return;
                }
                
                formData.tags.push({ name: '' });
                renderTags();
                
                // 聚焦到新添加的标签输入框
                setTimeout(() => {
                    const newTagInput = tagsList.lastElementChild?.querySelector('input');
                    if (newTagInput) {
                        newTagInput.focus();
                    }
                }, 100);
            });
            
            tagsContainer.appendChild(tagsTitle);
            tagsContainer.appendChild(tagsList);
            tagsContainer.appendChild(addTagBtn);
            
            form.appendChild(featuresContainer);
            form.appendChild(statsContainer);
            form.appendChild(tagsContainer);
            form.appendChild(buttonContainer);
            
            modalContent.appendChild(modalTitle);
            modalContent.appendChild(form);
            modal.appendChild(modalContent);
            
            // 显示模态框
            document.body.appendChild(modal);
            
            // 初始化渲染
            renderFeatures();
            renderStats();
            renderTags();
            
            // 聚焦到第一个输入框
            const firstInput = form.querySelector('input, textarea');
            if (firstInput) {
                firstInput.focus();
            }
            
            // 点击背景关闭模态框
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            }, { passive: true });
            
            // ESC键关闭模态框
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc, { passive: true });
            
            // 模态框关闭时清理
            modal.addEventListener('remove', () => {
                document.removeEventListener('keydown', handleEsc);
            });
            
        } catch (error) {
            console.error('[编辑卡片] 创建编辑模态框失败:', error);
            showError('创建编辑界面失败，请稍后重试');
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
        saveTagsToStorage,
        navigateToTasks,
        editCard
    };
};





