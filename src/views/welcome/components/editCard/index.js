/**
 * EditCard 插件
 * 参考其他 plugins 的结构，将编辑卡片的 UI 与逻辑从 useMethods 解耦
 * 提供 openEditCardModal(card, store) 方法
 * 
 * Update: 2026-01-24
 * 重构为编辑卡片的功能
 * - 移除 OKR 相关概念
 * - 移除年度和季度选择
 * - 将"Key Results"改为"统计数据"
 * - 支持添加统计项名称和数值
 */

import { showError, showSuccess } from '/src/utils/message.js';

function addPassiveEventListener(element, event, handler, options = {}) {
  const finalOptions = { passive: true, ...options };
  element.addEventListener(event, handler, finalOptions);
}

// 专门恢复卡片列表滚动的函数
function restoreCardsListScroll() {
  try {
    // 恢复页面级滚动
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // 恢复卡片列表容器滚动
    const featureCardsContainer = document.querySelector('.feature-cards-container');
    if (featureCardsContainer) {
      // 移除所有可能影响滚动的样式
      featureCardsContainer.style.overflow = '';
      featureCardsContainer.style.overflowY = '';
      featureCardsContainer.style.position = '';
      featureCardsContainer.style.top = '';
      featureCardsContainer.style.width = '';
      featureCardsContainer.style.height = '';
      
      // 设置正确的滚动样式
      featureCardsContainer.style.overflow = 'visible';
      featureCardsContainer.style.overflowY = 'visible';
    }
    
    // 恢复其他相关容器的滚动
    const containers = [
      '.main-content',
      '.container',
      '.feature-cards-grid',
      '#app'
    ];
    
    containers.forEach(selector => {
      try {
        const element = document.querySelector(selector);
        if (element) {
          element.style.overflow = '';
          element.style.overflowY = '';
          element.style.position = '';
          element.style.top = '';
          element.style.width = '';
          element.style.height = '';
          
          // 设置默认滚动行为
          element.style.overflow = 'visible';
          element.style.overflowY = 'visible';
        }
      } catch (error) {
        console.warn(`[EditCard] 恢复容器 ${selector} 滚动状态时出错:`, error);
      }
    });
    
    // 确保页面可以正常滚动
    window.scrollTo(0, window.pageYOffset || 0);
    
    return true;
    
  } catch (error) {
    console.error('[EditCard] 恢复卡片列表滚动失败:', error);
    return false;
  }
}

// 全局滚动恢复函数
function globalUnlockScroll() {
  try {
    // 方法1：直接设置样式
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // 方法2：移除样式属性
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    
    // 方法3：设置自动滚动
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    
    // 方法4：强制滚动到当前位置
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    window.scrollTo(0, currentScrollY);
    
    // 方法5：特殊处理卡片列表容器
    try {
      const featureCardsContainer = document.querySelector('.feature-cards-container');
      if (featureCardsContainer) {
        // 移除可能影响滚动的样式
        featureCardsContainer.style.overflow = '';
        featureCardsContainer.style.overflowY = '';
        featureCardsContainer.style.position = '';
        featureCardsContainer.style.top = '';
        featureCardsContainer.style.width = '';
        
        // 设置自动滚动
        featureCardsContainer.style.overflow = 'auto';
        featureCardsContainer.style.overflowY = 'auto';
      }
      
      // 检查其他可能影响滚动的容器
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.overflow = '';
        mainContent.style.overflowY = '';
        mainContent.style.overflow = 'auto';
        mainContent.style.overflowY = 'auto';
      }
      
      const container = document.querySelector('.container');
      if (container) {
        container.style.overflow = '';
        container.style.overflowY = '';
        container.style.overflow = 'auto';
        container.style.overflowY = 'auto';
      }
      
    } catch (containerError) {
      console.warn('[EditCard] 处理容器滚动状态时出错:', containerError);
    }
    
    // 验证结果
    const canScroll = document.body.style.overflow !== 'hidden' && 
                     document.body.style.overflowY !== 'hidden' && 
                     document.documentElement.style.overflow !== 'hidden';
    
    return canScroll;
  } catch (error) {
    console.error('[EditCard] 全局滚动解锁失败:', error);
    return false;
  }
}

export async function openEditCardModal(card, store) {
  if (!card) {
    showError('无效的卡片数据');
    return;
  }

  try {
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
    let prevBodyOverflowY = '';
    let prevBodyPosition = '';
    let prevBodyTop = '';
    let prevBodyWidth = '';
    let scrollPosition = { x: 0, y: 0 };
    // 创建模态框容器
    const modal = document.createElement('div');
    modal.className = 'edit-card-modal';
    modal.style.cssText = ``; // 样式使用全局CSS，避免内联覆盖导致偏移

    // 创建模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'edit-card-content';
    modalContent.style.cssText = ``; // 交由全局样式控制
    modalContent.setAttribute('role', 'dialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('tabindex', '-1');

    // 标题
    const modalTitle = document.createElement('h3');
    modalTitle.innerHTML = `
      <span>编辑卡片</span>
      <span class="card-name">${card.title || ''}</span>
    `;
    modalTitle.style.cssText = ``;
    modalTitle.setAttribute('title', '编辑卡片');

    // 关闭按钮（右上角）
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'edit-card-close';
    closeButton.setAttribute('aria-label', '关闭');
    closeButton.title = '关闭';
    closeButton.innerHTML = '&times;';

    // 统一关闭与清理
    const lockScroll = () => {
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      prevBodyOverflowY = document.body.style.overflowY;
      prevBodyPosition = document.body.style.position;
      prevBodyTop = document.body.style.top;
      prevBodyWidth = document.body.style.width;
      scrollPosition = {
        x: window.scrollX || document.documentElement.scrollLeft || 0,
        y: window.scrollY || document.documentElement.scrollTop || 0
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.y}px`;
      document.body.style.width = '100%';
    };

    const unlockScroll = () => {
      document.documentElement.style.overflow = prevHtmlOverflow || '';
      document.body.style.overflow = prevBodyOverflow || '';
      document.body.style.overflowY = prevBodyOverflowY || '';
      document.body.style.position = prevBodyPosition || '';
      document.body.style.top = prevBodyTop || '';
      document.body.style.width = prevBodyWidth || '';
      window.scrollTo(scrollPosition.x, scrollPosition.y);
    };

    let closeModal = () => {
      try {
        // 移除事件监听器
        try { 
          document.removeEventListener('keydown', handleEsc); 
        } catch (e) { 
          console.warn('[EditCard] 移除ESC事件监听器失败:', e);
        }
        
        // 移除弹框元素
        try { 
          modal.remove(); 
        } catch (e) { 
          console.warn('[EditCard] 移除弹框元素失败:', e);
        }
        unlockScroll();
        
      } catch (error) {
        console.error('[EditCard] 关闭弹框时出错:', error);
        // 强制清理
        try {
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
          unlockScroll();
        } catch (forceError) {
          console.error('[EditCard] 强制清理失败:', forceError);
        }
      }
    };

    addPassiveEventListener(closeButton, 'click', () => {
      closeModal();
    });

    // 表单
    const form = document.createElement('form');
    form.className = 'edit-card-form';

    // 数据准备
    const formData = {
      ...card,
      icon: card.icon || 'fas fa-cube',
      hint: card.hint || '点击查看详情',
      features: Array.isArray(card.features) ? [...card.features] : [],
      stats: Array.isArray(card.stats) ? [...card.stats] : []
    };

    const createField = (labelText, inputEl, options = {}) => {
      const field = document.createElement('div');
      field.className = options.full ? 'edit-card-field full' : 'edit-card-field';
      const label = document.createElement('label');
      label.className = 'edit-card-label';
      label.textContent = labelText;
      field.appendChild(label);
      field.appendChild(inputEl);
      return field;
    };

    const basicSection = document.createElement('section');
    basicSection.className = 'edit-card-section';

    const basicHeader = document.createElement('div');
    basicHeader.className = 'edit-card-section-header';

    const basicTitle = document.createElement('h4');
    basicTitle.className = 'edit-card-section-title';
    basicTitle.textContent = '基础信息';

    basicHeader.appendChild(basicTitle);
    basicSection.appendChild(basicHeader);

    const basicFields = document.createElement('div');
    basicFields.className = 'edit-card-fields';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = formData.title || '';
    titleInput.placeholder = '卡片标题';
    titleInput.required = true;
    titleInput.className = 'edit-card-input';
    titleInput.oninput = (e) => formData.title = e.target.value;

    const descInput = document.createElement('textarea');
    descInput.value = formData.description || '';
    descInput.placeholder = '描述';
    descInput.rows = 3;
    descInput.className = 'edit-card-textarea';
    descInput.oninput = (e) => formData.description = e.target.value;

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = formData.icon || '';
    iconInput.placeholder = '图标类名（如：fas fa-cube）';
    iconInput.className = 'edit-card-input';
    iconInput.oninput = (e) => formData.icon = e.target.value;

    const hintInput = document.createElement('input');
    hintInput.type = 'text';
    hintInput.value = formData.hint || '';
    hintInput.placeholder = '提示文案（如：点击查看详情）';
    hintInput.className = 'edit-card-input';
    hintInput.oninput = (e) => formData.hint = e.target.value;

    basicFields.appendChild(createField('卡片标题', titleInput, { full: true }));
    basicFields.appendChild(createField('描述', descInput, { full: true }));
    basicFields.appendChild(createField('图标类名', iconInput));
    basicFields.appendChild(createField('提示文案', hintInput));

    basicSection.appendChild(basicFields);
    form.appendChild(basicSection);

    const statsContainer = document.createElement('section');
    statsContainer.className = 'edit-card-section';

    const statsHeader = document.createElement('div');
    statsHeader.className = 'edit-card-section-header';

    const statsTitle = document.createElement('h4');
    statsTitle.className = 'edit-card-section-title';
    statsTitle.textContent = '统计数据';

    const addStatBtn = document.createElement('button');
    addStatBtn.type = 'button';
    addStatBtn.textContent = '+ 添加';
    addStatBtn.className = 'btn btn-small btn-secondary';

    const statsList = document.createElement('div');
    statsList.className = 'edit-card-list';

    const renderStats = () => {
      statsList.innerHTML = '';
      formData.stats.forEach((stat, idx) => {
        const row = document.createElement('div');
        row.className = 'edit-card-row';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = stat.label || '';
        labelInput.placeholder = '名称（如：完成率）';
        labelInput.className = 'edit-card-input';
        labelInput.oninput = (e) => {
          formData.stats[idx].label = e.target.value;
        };

        const numberInput = document.createElement('input');
        numberInput.type = 'text';
        numberInput.value = stat.number || '';
        numberInput.placeholder = '数值（如：85%）';
        numberInput.className = 'edit-card-input';
        numberInput.oninput = (e) => {
          formData.stats[idx].number = e.target.value;
        };

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.className = 'edit-card-row-delete';
        delBtn.onclick = () => {
          formData.stats.splice(idx, 1);
          renderStats();
        };

        row.appendChild(labelInput);
        row.appendChild(numberInput);
        row.appendChild(delBtn);
        statsList.appendChild(row);
      });
    };

    addStatBtn.onclick = () => {
      formData.stats.push({ label: '', number: '' });
      renderStats();
    };

    statsHeader.appendChild(statsTitle);
    statsHeader.appendChild(addStatBtn);
    statsContainer.appendChild(statsHeader);
    statsContainer.appendChild(statsList);
    form.appendChild(statsContainer);

    // ==================== 底部按钮 ====================
    const footer = document.createElement('div');
    footer.className = 'edit-card-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn btn-secondary';
    addPassiveEventListener(cancelBtn, 'click', closeModal);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = '保存';
    submitBtn.className = 'btn btn-primary';

    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    form.appendChild(footer);

    // 表单提交处理
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      if (!formData.title.trim()) {
        showError('请输入标题');
        return;
      }

      const cleanStats = (formData.stats || [])
        .filter(s => s && ((s.label && s.label.trim()) || (s.number && s.number.trim())))
        .map(s => ({
          label: (s.label || '').trim(),
          number: (s.number || '').trim()
        }));

      try {
        // 更新卡片数据
        await store.updateCard(card.key || card.id, {
            ...formData,
            icon: (formData.icon || 'fas fa-cube').trim(),
            // 移除 badge
            badge: '',
            hint: (formData.hint || '点击查看详情').trim(),
            features: formData.features,
            stats: cleanStats
        });
        
        showSuccess('卡片已更新');
        closeModal();
        
        // 刷新列表
        if (store.loadFeatureCards) {
            await store.loadFeatureCards();
        }
      } catch (error) {
        console.error('更新卡片失败:', error);
        showError('更新失败: ' + error.message);
      }
    };

    // 组装模态框
    const header = document.createElement('header');
    header.className = 'edit-card-header';
    header.appendChild(modalTitle);
    header.appendChild(closeButton);

    modalContent.appendChild(header);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    lockScroll();
    renderStats();
    setTimeout(() => {
      titleInput.focus();
    }, 0);

    // ESC 关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEsc);

    // 点击外部关闭
    addPassiveEventListener(modal, 'click', (e) => {
      if (e.target === modal) closeModal();
    });

  } catch (error) {
    console.error('[EditCard] 打开编辑模态框失败:', error);
    showError('无法打开编辑窗口');
  }
}
