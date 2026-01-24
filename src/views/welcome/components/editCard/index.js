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
    closeButton.style.cssText = `
      margin-left: auto;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-primary, #fff);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      transition: all 0.2s ease;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255,255,255,0.06)';
    }, { passive: true });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'transparent';
    }, { passive: true });

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
    form.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 0 20px 20px;
      gap: 16px;
    `;

    // 数据准备
    const formData = {
      ...card,
      icon: card.icon || 'fas fa-cube',
      hint: card.hint || '点击查看详情',
      features: Array.isArray(card.features) ? [...card.features] : [],
      stats: Array.isArray(card.stats) ? [...card.stats] : []
    };

    const basicInfoGroup = document.createElement('div');
    basicInfoGroup.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = formData.title || '';
    titleInput.placeholder = 'Card Title (卡片标题)';
    titleInput.required = true;
    titleInput.style.cssText = `
      padding: 10px;
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-secondary, #444);
      color: white;
      border-radius: 6px;
      font-size: 16px;
    `;
    titleInput.oninput = (e) => formData.title = e.target.value;

    const descInput = document.createElement('textarea');
    descInput.value = formData.description || '';
    descInput.placeholder = 'Description (描述)';
    descInput.rows = 3;
    descInput.style.cssText = `
      padding: 10px;
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-secondary, #444);
      color: white;
      border-radius: 6px;
      resize: vertical;
      font-family: inherit;
    `;
    descInput.oninput = (e) => formData.description = e.target.value;

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = formData.icon || '';
    iconInput.placeholder = 'Icon Class (图标类名，如: fas fa-cube)';
    iconInput.style.cssText = `
      padding: 10px;
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-secondary, #444);
      color: white;
      border-radius: 6px;
      font-size: 14px;
    `;
    iconInput.oninput = (e) => formData.icon = e.target.value;

    const hintInput = document.createElement('input');
    hintInput.type = 'text';
    hintInput.value = formData.hint || '';
    hintInput.placeholder = 'Hint (提示文案，如: 点击查看详情)';
    hintInput.style.cssText = `
      padding: 10px;
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-secondary, #444);
      color: white;
      border-radius: 6px;
      font-size: 14px;
    `;
    hintInput.oninput = (e) => formData.hint = e.target.value;

    basicInfoGroup.appendChild(titleInput);
    basicInfoGroup.appendChild(descInput);
    basicInfoGroup.appendChild(iconInput);
    basicInfoGroup.appendChild(hintInput);
    form.appendChild(basicInfoGroup);

    const featuresContainer = document.createElement('div');
    featuresContainer.style.cssText = `margin-top: 8px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;

    const featuresHeader = document.createElement('div');
    featuresHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    featuresHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Features (功能特性)</h4>`;

    const addFeatureBtn = document.createElement('button');
    addFeatureBtn.type = 'button';
    addFeatureBtn.textContent = '+ 添加特性';
    addFeatureBtn.style.cssText = `padding: 4px 8px; background: var(--accent-color, #1890ff); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;`;

    const featuresList = document.createElement('div');
    featuresList.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;

    const renderFeatures = () => {
      featuresList.innerHTML = '';
      formData.features.forEach((feature, idx) => {
        const item = document.createElement('div');
        item.style.cssText = `display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--border-primary, #333); border-radius: 8px; background: rgba(255,255,255,0.02);`;

        const row1 = document.createElement('div');
        row1.style.cssText = `display: flex; gap: 8px; align-items: center;`;

        const iconInput = document.createElement('input');
        iconInput.type = 'text';
        iconInput.value = feature.icon || '';
        iconInput.placeholder = 'icon (fas fa-...)';
        iconInput.style.cssText = `flex: 1.2; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
        iconInput.oninput = (e) => {
          formData.features[idx].icon = e.target.value;
        };

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = feature.name || '';
        nameInput.placeholder = '名称 (如: 需求拆解)';
        nameInput.style.cssText = `flex: 1.6; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
        nameInput.oninput = (e) => {
          formData.features[idx].name = e.target.value;
          if (!formData.features[idx].icon) formData.features[idx].icon = 'fas fa-bolt';
        };

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.value = feature.value || '';
        valueInput.placeholder = 'value (可选)';
        valueInput.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
        valueInput.oninput = (e) => {
          formData.features[idx].value = e.target.value;
        };

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.style.cssText = `width: 28px; height: 28px; color: #ff4d4f; background: none; border: none; font-size: 20px; cursor: pointer; line-height: 1;`;
        delBtn.onclick = () => {
          formData.features.splice(idx, 1);
          renderFeatures();
        };

        row1.appendChild(iconInput);
        row1.appendChild(nameInput);
        row1.appendChild(valueInput);
        row1.appendChild(delBtn);

        const descInput = document.createElement('textarea');
        descInput.rows = 2;
        descInput.value = feature.desc || '';
        descInput.placeholder = '描述 (如: 本特性会生成对应的任务列表)';
        descInput.style.cssText = `padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px; resize: vertical; font-family: inherit;`;
        descInput.oninput = (e) => {
          formData.features[idx].desc = e.target.value;
        };

        item.appendChild(row1);
        item.appendChild(descInput);
        featuresList.appendChild(item);
      });
    };

    addFeatureBtn.onclick = () => {
      formData.features.push({ name: '', icon: 'fas fa-bolt', desc: '', value: '' });
      renderFeatures();
    };

    featuresHeader.appendChild(addFeatureBtn);
    featuresContainer.appendChild(featuresHeader);
    featuresContainer.appendChild(featuresList);
    form.appendChild(featuresContainer);

    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `margin-top: 8px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;

    const statsHeader = document.createElement('div');
    statsHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    statsHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Statistics (统计数据)</h4>`;

    const addStatBtn = document.createElement('button');
    addStatBtn.type = 'button';
    addStatBtn.textContent = '+ 添加统计';
    addStatBtn.style.cssText = `padding: 4px 8px; background: var(--accent-color, #1890ff); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;`;

    const statsList = document.createElement('div');
    statsList.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;

    const renderStats = () => {
      statsList.innerHTML = '';
      formData.stats.forEach((stat, idx) => {
        const row = document.createElement('div');
        row.style.cssText = `display: flex; gap: 8px; align-items: center;`;

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = stat.label || '';
        labelInput.placeholder = 'label (如: 完成率)';
        labelInput.style.cssText = `flex: 2; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
        labelInput.oninput = (e) => {
          formData.stats[idx].label = e.target.value;
        };

        const numberInput = document.createElement('input');
        numberInput.type = 'text';
        numberInput.value = stat.number || '';
        numberInput.placeholder = 'number (如: 85%)';
        numberInput.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
        numberInput.oninput = (e) => {
          formData.stats[idx].number = e.target.value;
        };

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.style.cssText = `width: 28px; height: 28px; color: #ff4d4f; background: none; border: none; font-size: 20px; cursor: pointer; line-height: 1;`;
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

    statsHeader.appendChild(addStatBtn);
    statsContainer.appendChild(statsHeader);
    statsContainer.appendChild(statsList);
    form.appendChild(statsContainer);

    // ==================== 底部按钮 ====================
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-primary, #333);
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'edit-card-btn-cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary, #ccc);
      cursor: pointer;
    `;
    addPassiveEventListener(cancelBtn, 'click', closeModal);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = '保存更改';
    submitBtn.className = 'edit-card-btn-submit';
    submitBtn.style.cssText = `
      padding: 8px 24px;
      border: none;
      border-radius: 4px;
      background: var(--accent-color, #3b82f6);
      color: white;
      cursor: pointer;
      font-weight: 500;
    `;

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

      const cleanFeatures = (formData.features || [])
        .filter(f => f && f.name && f.name.trim())
        .map(f => ({
          name: f.name.trim(),
          icon: (f.icon || 'fas fa-bolt').trim(),
          desc: (f.desc || '').trim(),
          value: (f.value || '').trim()
        }));

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
            features: cleanFeatures,
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
    header.style.cssText = `
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-primary, #333);
    `;
    header.appendChild(modalTitle);
    header.appendChild(closeButton);

    modalContent.appendChild(header);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    lockScroll();
    renderFeatures();
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
