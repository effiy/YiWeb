/**
 * EditCard 插件
 * 参考其他 plugins 的结构，将编辑卡片的 UI 与逻辑从 useMethods 解耦
 * 提供 openEditCardModal(card, store) 方法
 * 
 * Update: 2026-01-24
 * 重构为编辑 OKR 卡片的功能
 * - 简化时间选择器为年度和季度
 * - 将"功能特性"改为"Key Results (关键结果)"
 * - 移除多余字段（输入/输出、统计数据等）
 * - 保持与 feature-card 的内容对应
 */

import { showError, showSuccess } from '/src/utils/message.js';
import { getQuarters } from '/src/utils/timeSelectors.js';

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
    // 记录滚动状态，用于关闭时恢复
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
      <span>编辑 OKR 卡片</span>
      <span class="card-name">${card.title || ''}</span>
    `;
    modalTitle.style.cssText = ``;
    modalTitle.setAttribute('title', '编辑 OKR 卡片');

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
    const unlockScroll = () => {
      try {
        // 恢复HTML和body的滚动状态
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        document.body.style.overflow = prevBodyOverflow || '';
        document.body.style.overflowY = prevBodyOverflowY || '';
        document.body.style.position = prevBodyPosition || '';
        document.body.style.top = prevBodyTop || '';
        document.body.style.width = prevBodyWidth || '';
        
        // 恢复滚动位置
        if (scrollPosition && (scrollPosition.x !== 0 || scrollPosition.y !== 0)) {
          try {
            window.scrollTo(scrollPosition.x, scrollPosition.y);
          } catch (scrollError) {
            console.warn('[EditCard] 恢复滚动位置失败:', scrollError);
          }
        }
        
        // 验证滚动状态是否已恢复
        const currentHtmlOverflow = document.documentElement.style.overflow;
        const currentBodyOverflow = document.body.style.overflow;
        const currentBodyOverflowY = document.body.style.overflowY;
        
        // 如果滚动状态仍然被锁定，强制恢复
        if (currentBodyOverflow === 'hidden' || currentBodyOverflowY === 'hidden' || currentHtmlOverflow === 'hidden') {
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
          document.body.style.overflowY = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
        }
        
      } catch (error) {
        console.warn('[EditCard] 恢复滚动状态时出错:', error);
        // 强制恢复滚动
        try {
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
          document.body.style.overflowY = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
        } catch (forceError) {
          console.error('[EditCard] 强制恢复滚动状态失败:', forceError);
        }
      }
    };

    let closeModal = () => {
      try {
        // 恢复滚动状态
        unlockScroll();
        
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
        
      } catch (error) {
        console.error('[EditCard] 关闭弹框时出错:', error);
        // 强制清理
        try {
          unlockScroll();
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
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
      year: card.year || store.selectedYear?.value || new Date().getFullYear().toString(),
      quarter: card.quarter || store.selectedQuarter?.value || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      features: Array.isArray(card.features) ? [...card.features] : []
    };

    // ==================== 1. 基本信息 ====================
    const basicInfoGroup = document.createElement('div');
    basicInfoGroup.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    // 标题输入
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = formData.title || '';
    titleInput.placeholder = 'Objective (目标)';
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

    // 描述输入
    const descInput = document.createElement('textarea');
    descInput.value = formData.description || '';
    descInput.placeholder = 'Rationale (基本原理/描述)';
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

    basicInfoGroup.appendChild(titleInput);
    basicInfoGroup.appendChild(descInput);
    form.appendChild(basicInfoGroup);

    // ==================== 2. 时间周期 ====================
    const timeGroup = document.createElement('div');
    timeGroup.style.cssText = `display: flex; gap: 12px;`;

    // 年度选择
    const yearSelect = document.createElement('select');
    yearSelect.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${i}年`;
        if (String(formData.year) === String(i)) opt.selected = true;
        yearSelect.appendChild(opt);
    }
    yearSelect.onchange = (e) => formData.year = e.target.value;

    // 季度选择
    const quarterSelect = document.createElement('select');
    quarterSelect.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 6px;`;
    const quarters = getQuarters();
    quarters.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.value;
        opt.textContent = q.label;
        if (formData.quarter === q.value) opt.selected = true;
        quarterSelect.appendChild(opt);
    });
    quarterSelect.onchange = (e) => formData.quarter = e.target.value;

    timeGroup.appendChild(yearSelect);
    timeGroup.appendChild(quarterSelect);
    form.appendChild(timeGroup);

    // ==================== 3. Key Results (关键结果) ====================
    const krGroup = document.createElement('div');
    krGroup.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;

    const krHeader = document.createElement('div');
    krHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center;`;
    
    const krLabel = document.createElement('label');
    krLabel.textContent = 'Key Results (关键结果)';
    krLabel.style.cssText = `color: var(--text-secondary, #aaa); font-size: 14px;`;
    
    const addKrBtn = document.createElement('button');
    addKrBtn.type = 'button';
    addKrBtn.textContent = '+ 添加 KR';
    addKrBtn.style.cssText = `padding: 4px 8px; background: var(--accent-color, #1890ff); border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;`;
    
    krHeader.appendChild(krLabel);
    krHeader.appendChild(addKrBtn);
    krGroup.appendChild(krHeader);

    const krList = document.createElement('div');
    krList.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;

    const renderKRs = () => {
        krList.innerHTML = '';
        formData.features.forEach((kr, idx) => {
            const row = document.createElement('div');
            row.style.cssText = `display: flex; gap: 8px; align-items: center;`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = kr.name || '';
            input.placeholder = 'Key Result description...';
            input.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 4px;`;
            input.oninput = (e) => {
                formData.features[idx].name = e.target.value;
                // 确保有图标
                if (!formData.features[idx].icon) {
                    formData.features[idx].icon = 'fas fa-check-circle';
                }
            };
            
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.innerHTML = '&times;';
            delBtn.style.cssText = `color: #ff4d4f; background: none; border: none; font-size: 18px; cursor: pointer;`;
            delBtn.onclick = () => {
                formData.features.splice(idx, 1);
                renderKRs();
            };
            
            row.appendChild(input);
            row.appendChild(delBtn);
            krList.appendChild(row);
        });
    };

    addKrBtn.onclick = () => {
        formData.features.push({ name: '', icon: 'fas fa-check-circle' });
        renderKRs();
    };

    renderKRs();
    krGroup.appendChild(krList);
    form.appendChild(krGroup);

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
        showError('请输入 OKR 目标');
        return;
      }

      // 过滤空的 KR
      formData.features = formData.features.filter(kr => kr.name && kr.name.trim());

      try {
        // 更新卡片数据
        await store.updateCard(card.key || card.id, {
            ...formData,
            // 保持 OKR 特定字段
            icon: formData.icon || 'fas fa-bullseye',
            badge: `${formData.year} ${formData.quarter}`,
            hint: formData.hint || '点击查看详情'
        });
        
        showSuccess('OKR 卡片已更新');
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
