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
    
    // 长按删除相关变量
    let longPressTimer = null;
    let longPressCard = null;
    let longPressStartTime = 0;
    let longPressStartPosition = null;
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
    
    // 显示复制模态框
    const showCopyModal = (content, title) => {
        // 创建模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: modalFadeIn 0.3s ease-out;
        `;
        
        // 创建模态框内容
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 90%;
            max-height: 85%;
            overflow: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.3s ease-out;
        `;
        
        modalContent.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333; font-size: 18px;">📋 复制卡片信息</h3>
                <button onclick="this.closest('.copy-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">请手动复制以下内容：</p>
            <textarea 
                style="width: 100%; height: 250px; padding: 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.4; resize: none; outline: none;"
                readonly
                placeholder="卡片信息将显示在这里..."
            >${content}</textarea>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="copyModalContent()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">复制内容</button>
                <button onclick="this.closest('.copy-modal').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s;">关闭</button>
            </div>
        `;
        
        modalContent.className = 'copy-modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // 添加复制功能
        window.copyModalContent = () => {
            const textarea = modalContent.querySelector('textarea');
            textarea.select();
            try {
                document.execCommand('copy');
                showSuccess('内容已复制到剪贴板');
                playCopySuccessSound();
            } catch (error) {
                showError('复制失败，请手动选择文本');
            }
        };
        
        // 自动选择文本
        const textarea = modalContent.querySelector('textarea');
        textarea.select();
        
        // 点击背景关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESC键关闭模态框
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 模态框关闭时清理
        modal.addEventListener('remove', () => {
            document.removeEventListener('keydown', handleEsc);
            delete window.copyModalContent;
        });
        
        console.log('[复制模态框] 显示复制内容:', title);
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
     * 播放复制开始声音效果
     */
    const playCopyStartSound = () => {
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
            
            // 设置音频参数 - 复制开始音调
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.log('[声音效果] 无法播放复制开始声音:', error);
        }
    };
    
    /**
     * 播放复制成功声音效果
     */
    const playCopySuccessSound = () => {
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
            
            // 设置音频参数 - 复制成功音调
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.05);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
            
            // 播放声音
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.12);
            
        } catch (error) {
            console.log('[声音效果] 无法播放复制成功声音:', error);
        }
    };
    
    /**
     * 记录复制统计
     * @param {string} cardTitle - 卡片标题
     */
    const recordCopyStats = (cardTitle) => {
        try {
            // 获取现有统计
            const stats = JSON.parse(localStorage.getItem('copyStats') || '{}');
            
            // 更新统计
            if (stats[cardTitle]) {
                stats[cardTitle]++;
            } else {
                stats[cardTitle] = 1;
            }
            
            // 保存统计
            localStorage.setItem('copyStats', JSON.stringify(stats));
            
            console.log('[复制统计] 记录复制:', cardTitle, '总计:', stats[cardTitle]);
        } catch (error) {
            console.log('[复制统计] 记录失败:', error);
        }
    };
    
    /**
     * 打开链接的统一方法
     * @param {string} link - 链接地址
     */
    const openLink = (link, event) => {
        // 阻止事件冒泡，防止触发长按
        if (event) {
            event.preventDefault();
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
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        // 检查是否点击在可交互元素上
        const target = event.target;
        const isInteractiveElement = target.closest('button, a, [role="button"], .feature-tag, .stat-item');
        
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
            // 阻止事件冒泡，避免触发其他点击事件
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // 检查是否点击在可交互元素上
            const target = event.target;
            const isInteractiveElement = target.closest('button, a, [role="button"], .feature-tag, .stat-item');
            
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
            
            // 记录长按开始时间和位置
            longPressStartTime = Date.now();
            longPressStartPosition = {
                x: event.clientX || event.touches?.[0]?.clientX || 0,
                y: event.clientY || event.touches?.[0]?.clientY || 0
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
                x: event.clientX || event.touches?.[0]?.clientX || 0,
                y: event.clientY || event.touches?.[0]?.clientY || 0
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
            
            // 保存当前card的引用，避免异步操作中的问题
            const currentCard = longPressCard;
            
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
                            }
                        }
                    }, 600); // 增加一点时间确保动画完成
                } else {
                    // 再次检查card是否仍然有效
                    if (currentCard && currentCard.key) {
                        deleteCard(currentCard);
                    } else {
                        console.warn('[长按删除] 卡片数据已失效，取消删除');
                    }
                }
            } else {
                // 移除长按样式
                if (cardElement) {
                    cardElement.classList.remove('long-pressing');
                }
                console.log('[长按删除] longPressCard无效，取消删除');
            }
        }, LONG_PRESS_DURATION);
        
        console.log('[长按删除] 开始计时，3秒后将删除卡片:', card.title);
        } catch (error) {
            handleError(error, 'startLongPress');
        }
    };
    
    /**
     * 结束长按计时
     */
    const endLongPress = (event) => {
        // 阻止事件冒泡，避免触发其他点击事件
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            longPressCard = null;
            longPressStartTime = 0;
            longPressStartPosition = null;
            
            // 移除所有卡片的长按样式
            const longPressingCards = document.querySelectorAll('.feature-card.long-pressing');
            longPressingCards.forEach(card => {
                card.classList.remove('long-pressing');
            });
            
            // 添加取消反馈
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            console.log('[长按删除] 取消删除操作');
        }
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
                return;
            }
            
            // 验证卡片数据完整性
            if (!validateCard(card)) {
                console.error('[删除卡片] 卡片数据验证失败');
                showError('删除失败：卡片数据不完整');
                return;
            }
            
            // 检查是否为MongoDB数据（有key字段）
            if (!card.key) {
                console.warn('[删除卡片] 卡片没有key字段:', card.title);
                showError('只能删除来自数据库的卡片');
                return;
            }
            
            // 确认删除
            if (!confirm(`确定要删除卡片"${card.title}"吗？此操作不可撤销。`)) {
                return;
            }
            
            // 显示删除中提示
            showSuccess('正在删除卡片...');
            
            // 添加删除成功反馈
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
            
            // 调用store的删除方法
            const result = await store.deleteCard(card.key);
            
            if (result.success) {
                showSuccess(`已删除卡片"${card.title}"`);
                console.log('[删除卡片] 删除成功:', card.title);
                
                // 播放删除成功声音
                playDeleteSuccessSound();
                
                // 强制触发Vue响应式更新
                if (store.featureCards && store.featureCards.value) {
                    // 确保Vue检测到数组变化
                    const currentCards = [...store.featureCards.value];
                    
                    // 验证数据完整性
                    const validCards = currentCards.filter(card => card && card.title && card.key);
                    console.log('[删除卡片] 验证后的卡片数量:', validCards.length);
                    
                    store.featureCards.value = validCards;
                    
                    // 强制重新渲染
                    if (Vue && Vue.nextTick) {
                        Vue.nextTick(() => {
                            console.log('[删除卡片] Vue响应式更新完成');
                            
                            // 使用更简单的方法触发重排
                            setTimeout(() => {
                                const gridElement = document.querySelector('.feature-cards-grid');
                                if (gridElement) {
                                    // 添加重排动画
                                    gridElement.classList.add('reflowing');
                                    
                                    // 触发CSS Grid重排
                                    gridElement.style.gridTemplateColumns = gridElement.style.gridTemplateColumns;
                                    
                                    // 移除重排动画类
                                    setTimeout(() => {
                                        gridElement.classList.remove('reflowing');
                                    }, 300);
                                    
                                    console.log('[删除卡片] CSS Grid重排完成');
                                }
                            }, 100);
                        });
                    }
                }
            } else {
                throw result.error || new Error('删除失败');
            }
        } catch (error) {
            handleError(error, 'deleteCard');
            console.error('[删除卡片] 删除失败:', error);
            showError('删除卡片失败，请稍后重试');
        }
    };

    /**
     * 复制卡片对象到剪贴板
     * @param {Object} card - 卡片对象
     * @param {Event} event - 点击事件对象
     */
    const copyCardToClipboard = async (card, event) => {
        try {
            // 阻止事件冒泡，防止触发长按
            event.preventDefault();
            event.stopPropagation();
            
            // 详细记录卡片数据
            console.log('[复制卡片] 接收到的卡片数据:', {
                card: card,
                hasTitle: !!card?.title,
                hasKey: card?.hasOwnProperty('key'),
                keyValue: card?.key,
                hasIcon: !!card?.icon,
                hasDescription: !!card?.description,
                cardType: card?.hasOwnProperty('key') ? 'MongoDB' : 'Local'
            });
            
            // 调试：显示所有卡片数据
            if (store && store.featureCards && store.featureCards.value) {
                console.log('[复制卡片] 当前所有卡片数据:', store.featureCards.value.map(c => ({
                    title: c?.title,
                    hasKey: c?.hasOwnProperty('key'),
                    key: c?.key,
                    type: c?.hasOwnProperty('key') ? 'MongoDB' : 'Local'
                })));
            }
            
            // 验证card参数
            if (!validateCard(card)) {
                console.error('[复制卡片] 卡片数据无效');
                
                // 提供更详细的错误信息
                let errorMessage = '复制失败：卡片数据无效';
                if (!card) {
                    errorMessage = '复制失败：卡片对象为空';
                } else if (!card.title) {
                    errorMessage = '复制失败：卡片标题为空';
                } else if (card.hasOwnProperty('key') && !card.key) {
                    errorMessage = '复制失败：MongoDB卡片缺少有效ID';
                }
                
                showError(errorMessage);
                return;
            }
            
            // 获取按钮元素
            const button = event.target;
            
            // 防重复点击
            if (button.classList.contains('copying')) {
                console.log('[复制卡片] 正在复制中，忽略重复点击');
                return;
            }
            
            // 添加加载状态
            button.classList.add('copying');
            
            // 添加触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // 播放复制开始声音
            playCopyStartSound();
            
            // 显示复制进度提示
            const originalText = button.textContent;
            button.textContent = '复制中...';
            button.style.pointerEvents = 'none';
            
            console.log('[复制卡片] 开始复制卡片:', {
                title: card.title,
                key: card.key,
                hasIcon: !!card.icon,
                hasDescription: !!card.description
            });
            
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
                try {
                    // 检查剪贴板权限
                    const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' });
                    
                    if (permissionStatus.state === 'denied') {
                        throw new Error('剪贴板权限被拒绝');
                    }
                    
                    await navigator.clipboard.writeText(cardJson);
                    
                    // 移除加载状态
                    button.classList.remove('copying');
                    
                    // 恢复按钮文本和状态
                    button.textContent = originalText;
                    button.style.pointerEvents = '';
                    
                    // 添加复制成功动画
                    button.classList.add('copy-success');
                    setTimeout(() => {
                        button.classList.remove('copy-success');
                    }, 600);
                    
                    // 播放复制成功声音
                    playCopySuccessSound();
                    
                    // 添加成功触觉反馈
                    if (navigator.vibrate) {
                        navigator.vibrate([50, 50, 50]);
                    }
                    
                    showSuccess(`已复制"${card.title}"卡片信息到剪贴板`);
                    console.log('[剪贴板] 成功复制卡片信息:', cardInfo);
                    
                    // 记录复制统计
                    recordCopyStats(card.title);
                } catch (clipboardError) {
                    console.warn('[剪贴板] 现代API失败，使用降级方案:', clipboardError);
                    throw clipboardError; // 抛出错误，让降级方案处理
                }
            } else {
                // 降级方案：使用传统的document.execCommand
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = cardJson;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    textArea.style.opacity = '0';
                    textArea.style.pointerEvents = 'none';
                    textArea.setAttribute('readonly', '');
                    
                    document.body.appendChild(textArea);
                    
                    // 确保元素可见且可聚焦
                    textArea.style.display = 'block';
                    textArea.focus();
                    textArea.select();
                    
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                        // 移除加载状态
                        button.classList.remove('copying');
                        
                        // 恢复按钮文本和状态
                        button.textContent = originalText;
                        button.style.pointerEvents = '';
                        
                        // 添加复制成功动画
                        button.classList.add('copy-success');
                        setTimeout(() => {
                            button.classList.remove('copy-success');
                        }, 600);
                        
                        // 播放复制成功声音
                        playCopySuccessSound();
                        
                        // 添加成功触觉反馈
                        if (navigator.vibrate) {
                            navigator.vibrate([50, 50, 50]);
                        }
                        
                        showSuccess(`已复制"${card.title}"卡片信息到剪贴板`);
                        console.log('[剪贴板] 成功复制卡片信息(降级方案):', cardInfo);
                        
                        // 记录复制统计
                        recordCopyStats(card.title);
                    } else {
                        throw new Error('document.execCommand复制失败');
                    }
                } catch (execCommandError) {
                    console.warn('[剪贴板] 降级方案也失败:', execCommandError);
                    throw execCommandError;
                }
            }
        } catch (error) {
            // 移除加载状态
            if (button) {
                button.classList.remove('copying');
                button.textContent = originalText;
                button.style.pointerEvents = '';
            }
            
            handleError(error, 'copyCardToClipboard');
            console.error('[剪贴板] 复制卡片信息失败:', error);
            
            // 备用方案：显示卡片信息供用户手动复制
            try {
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
                
                // 创建模态框显示复制内容
                showCopyModal(cardJson, card.title);
                
            } catch (modalError) {
                console.error('[剪贴板] 备用方案也失败:', modalError);
                showError('复制失败，请稍后重试');
            }
        }
    };

    const generateTask = async (card, feature, event) => {
        // 阻止事件冒泡，防止触发长按
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
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
        deleteCard,
        startLongPress,
        endLongPress,
        generateTask,
        handleMessageInput,
        handleCompositionStart,
        handleCompositionEnd
    };
};


