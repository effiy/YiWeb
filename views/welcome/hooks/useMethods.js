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
import { formatTimeRangeText, validateTimeParams } from '/utils/timeParams.js';

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

    // 根据季度获取月份列表
    const getMonthsByQuarter = (quarter) => {
        const monthsMap = {
            'Q1': [
                { value: '01', label: '1月' },
                { value: '02', label: '2月' },
                { value: '03', label: '3月' }
            ],
            'Q2': [
                { value: '04', label: '4月' },
                { value: '05', label: '5月' },
                { value: '06', label: '6月' }
            ],
            'Q3': [
                { value: '07', label: '7月' },
                { value: '08', label: '8月' },
                { value: '09', label: '9月' }
            ],
            'Q4': [
                { value: '10', label: '10月' },
                { value: '11', label: '11月' },
                { value: '12', label: '12月' }
            ]
        };
        return monthsMap[quarter] || [];
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
            const { getData } = await import('/apis/modules/crud.js');
            const taskPromises = [];
            
            for (const card of featureCards) {
                if (!card.title) continue;
                
                // 为每个功能特征查询任务
                if (card.features && Array.isArray(card.features)) {
                    for (const feature of card.features) {
                        if (!feature.name) continue;
                        
                        const taskPromise = getData(
                            `${window.API_URL}/mongodb/?cname=tasks&featureName=${encodeURIComponent(feature.name)}&cardTitle=${encodeURIComponent(card.title)}`
                        ).then(response => ({
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
            
            // 显示详细的下载成功信息
            const downloadStats = getTasksStatistics(Object.values(fileData));
            const successMessage = `${year}年${quarter}季度${month}月数据包下载成功！
📊 任务统计：
• 总任务数：${downloadStats.total} 个
• 完成率：${downloadStats.completionRate}%
• 启用周报：${downloadStats.withWeeklyReport} 个
• 启用日报：${downloadStats.withDailyReport} 个
• 预估工时：${downloadStats.totalEstimatedHours} 小时
• 实际工时：${downloadStats.totalActualHours} 小时`;
            
            showSuccess(successMessage);
            console.log('[下载] 数据下载完成:', {
                featureCards: featureCards.length,
                tasks: Object.keys(fileData).length,
                statistics: downloadStats,
                structure: treeData
            });

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
                const { postData } = await import('/apis/modules/crud.js');
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
                        const saveResult = await postData(`${window.API_URL}/mongodb/?cname=tasks`, taskToSave);
                        
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
        // 时间选择器相关方法
        handleAllSelect,
        handleYearChange,
        handleQuarterChange,
        handleMonthChange,
        getMonthsByQuarter,
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
        openAicrFromTag,
        editCard,
        loadFeatureCards: store.loadFeatureCards  // 暴露重新加载数据的方法
    };
};









