/**
 * EditCard 插件
 * 参考其他 plugins 的结构，将编辑卡片的 UI 与逻辑从 useMethods 解耦
 * 提供 openEditCardModal(card, store) 方法
 */

import { showError, showSuccess } from '/utils/message.js';

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
      <span>编辑卡片</span>
      <span class="card-name">${card.title || ''}</span>
    `;
    modalTitle.style.cssText = ``;

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
    // 强制解锁滚动状态
    const forceUnlockScroll = () => {
      try {
        // 强制恢复所有可能的滚动锁定
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.overflowY = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // 移除可能影响滚动的内联样式
        document.documentElement.removeAttribute('style');
        document.body.removeAttribute('style');
        
        // 确保页面可以滚动
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        // 验证滚动状态
        const canScroll = document.body.style.overflow !== 'hidden' && 
                         document.body.style.overflowY !== 'hidden' && 
                         document.documentElement.style.overflow !== 'hidden';
        
        return canScroll;
      } catch (error) {
        console.error('[EditCard] 强制解锁滚动失败:', error);
        return false;
      }
    };

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

<<<<<<< HEAD
    let closeModal = () => {
=======
    const closeModal = () => {
>>>>>>> f6edd1b0fe06f8905bf8836ed98527c1edb901cd
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

    const formData = { ...card };

    // 初始化时间属性 - 将年度、季度、月度提升到顶层
    formData.year = card.year || '';
    formData.quarter = card.quarter || '';
    formData.month = card.month || '';

    // ==================== 时间属性选择器 ====================
    const timePropertiesContainer = document.createElement('div');
    timePropertiesContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    `;

    const timeTitle = document.createElement('h4');
    timeTitle.textContent = '时间属性';
    timeTitle.style.cssText = `
      font-weight: 600;
      color: var(--text-primary, #fff);
      font-size: 14px;
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-primary, #333);
    `;

    // 时间选择器容器
    const timeSelectorsContainer = document.createElement('div');
    timeSelectorsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    `;

    // 年度选择器
    const yearContainer = document.createElement('div');
    yearContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    `;

    const yearLabel = document.createElement('label');
    yearLabel.textContent = '年度';
    yearLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-secondary, #ccc);
      font-weight: 500;
    `;

    const yearSelect = document.createElement('select');
    yearSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      font-size: 12px;
      cursor: pointer;
    `;

    // 初始化年度选项
    const currentYear = new Date().getFullYear();
    const yearOption = document.createElement('option');
    yearOption.value = '';
    yearOption.textContent = '选择年度';
    yearSelect.appendChild(yearOption);
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i}年`;
      if (formData.year === i.toString()) {
        option.selected = true;
      }
      yearSelect.appendChild(option);
    }

    // 季度选择器
    const quarterContainer = document.createElement('div');
    quarterContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    `;

    const quarterLabel = document.createElement('label');
    quarterLabel.textContent = '季度';
    quarterLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-secondary, #ccc);
      font-weight: 500;
    `;

    const quarterSelect = document.createElement('select');
    quarterSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      font-size: 12px;
      cursor: pointer;
    `;
    quarterSelect.disabled = !formData.year;

    // 月度选择器
    const monthContainer = document.createElement('div');
    monthContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    `;

    const monthLabel = document.createElement('label');
    monthLabel.textContent = '月度';
    monthLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-secondary, #ccc);
      font-weight: 500;
    `;

    const monthSelect = document.createElement('select');
    monthSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      font-size: 12px;
      cursor: pointer;
    `;
    monthSelect.disabled = !formData.quarter;

    // 季度选项数据
    const quarters = [
      { value: 'Q1', label: '第一季度' },
      { value: 'Q2', label: '第二季度' },
      { value: 'Q3', label: '第三季度' },
      { value: 'Q4', label: '第四季度' }
    ];

    // 月份映射
    const monthsByQuarter = {
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

    // 更新季度选择器
    const updateQuarterSelect = () => {
      quarterSelect.innerHTML = '';
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = formData.year ? '选择季度' : '请先选择年度';
      quarterSelect.appendChild(emptyOption);

      if (formData.year) {
        quarters.forEach(quarter => {
          const option = document.createElement('option');
          option.value = quarter.value;
          option.textContent = quarter.label;
          if (formData.quarter === quarter.value) {
            option.selected = true;
          }
          quarterSelect.appendChild(option);
        });
        quarterSelect.disabled = false;
      } else {
        quarterSelect.disabled = true;
      }
    };

    // 更新月度选择器
    const updateMonthSelect = () => {
      monthSelect.innerHTML = '';
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = formData.quarter ? '选择月度' : '请先选择季度';
      monthSelect.appendChild(emptyOption);

      if (formData.quarter) {
        const months = monthsByQuarter[formData.quarter] || [];
        months.forEach(month => {
          const option = document.createElement('option');
          option.value = month.value;
          option.textContent = month.label;
          if (formData.month === month.value) {
            option.selected = true;
          }
          monthSelect.appendChild(option);
        });
        monthSelect.disabled = false;
      } else {
        monthSelect.disabled = true;
      }
    };

    // 年度选择事件
    yearSelect.addEventListener('change', (e) => {
      formData.year = e.target.value;
      formData.quarter = '';
      formData.month = '';
      
      updateQuarterSelect();
      updateMonthSelect();
    });

    // 季度选择事件
    quarterSelect.addEventListener('change', (e) => {
      formData.quarter = e.target.value;
      formData.month = '';
      
      updateMonthSelect();
    });

    // 月度选择事件
    monthSelect.addEventListener('change', (e) => {
      formData.month = e.target.value;
    });

    // 初始化选择器状态
    updateQuarterSelect();
    updateMonthSelect();

    // 组装时间选择器
    yearContainer.appendChild(yearLabel);
    yearContainer.appendChild(yearSelect);
    quarterContainer.appendChild(quarterLabel);
    quarterContainer.appendChild(quarterSelect);
    monthContainer.appendChild(monthLabel);
    monthContainer.appendChild(monthSelect);

    timeSelectorsContainer.appendChild(yearContainer);
    timeSelectorsContainer.appendChild(quarterContainer);
    timeSelectorsContainer.appendChild(monthContainer);

    timePropertiesContainer.appendChild(timeTitle);
    timePropertiesContainer.appendChild(timeSelectorsContainer);



    // 时间属性已添加到基础字段容器的第一位

    // 基础字段容器
    const basicFieldsContainer = document.createElement('div');
    basicFieldsContainer.className = 'basic-fields-container';
    basicFieldsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    // 将时间属性添加到基础字段容器的第一位
    basicFieldsContainer.appendChild(timePropertiesContainer);

    // 字段配置
    const fields = [
      { key: 'title', label: '标题', type: 'text', required: true },
      { key: 'description', label: '描述', type: 'textarea', required: true },
      { key: 'icon', label: '图标类名', type: 'text', required: false },
      { key: 'badge', label: '徽章文本', type: 'text', required: false },
      { key: 'hint', label: '提示文本', type: 'text', required: false },
      { key: 'footerIcon', label: '底部图标', type: 'text', required: false }
    ];

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
        font-size: 13px;
        margin-bottom: 4px;
        display: block;
      `;

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        input.style.cssText = `
          padding: 10px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 4px;
          background: var(--bg-secondary, #2a2a2a);
          color: var(--text-primary, #fff);
          font-size: 13px;
          resize: vertical;
          font-family: inherit;
          min-height: 60px;
          box-sizing: border-box;
          width: 100%;
        `;
      } else {
        input = document.createElement('input');
        input.type = field.type;
        input.style.cssText = `
          padding: 10px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 4px;
          background: var(--bg-secondary, #2a2a2a);
          color: var(--text-primary, #fff);
          font-size: 13px;
          box-sizing: border-box;
          width: 100%;
        `;
      }

      input.value = formData[field.key] || '';
      input.required = field.required;
      addPassiveEventListener(input, 'input', (e) => {
        formData[field.key] = e.target.value;
      });

      fieldContainer.appendChild(label);
      fieldContainer.appendChild(input);
      basicFieldsContainer.appendChild(fieldContainer);
    });

    // 功能特性编辑
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

    if (!formData.features) formData.features = [];

    const renderFeatures = () => {
      featuresList.innerHTML = '';
      formData.features.forEach((feature, index) => {
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item';
        featureItem.style.cssText = `
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--border-secondary, #444);
          border-radius: 6px;
          background: var(--bg-primary, #1a1a1a);
          margin-bottom: 8px;
          transition: all 0.2s ease;
          flex-wrap: wrap;
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
          width: 90px;
          flex-shrink: 0;
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
          width: 90px;
          flex-shrink: 0;
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
          min-width: 280px;
        `;

        // 生成任务按钮
        const genTaskBtn = document.createElement('button');
        genTaskBtn.type = 'button';
        genTaskBtn.innerHTML = '<i class="fas fa-list-check" aria-hidden="true"></i>';
        genTaskBtn.setAttribute('aria-label', '生成任务');
        genTaskBtn.title = '根据该功能特性生成任务';
        genTaskBtn.style.cssText = `
          background: var(--primary, #007bff);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
          transition: all 0.2s ease;
          margin-left: 4px;
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

        iconInput.addEventListener('input', (e) => {
          formData.features[index].icon = e.target.value;
        });
        nameInput.addEventListener('input', (e) => {
          formData.features[index].name = e.target.value;
        });
        descInput.addEventListener('input', (e) => {
          formData.features[index].desc = e.target.value;
        });

        genTaskBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const currentFeature = formData.features[index] || {};
          if (!currentFeature.name || !currentFeature.desc) {
            showError('请先填写功能特性的名称和描述');
            return;
          }
          try {
            const { useMethods } = await import('/views/welcome/hooks/useMethods.js');
            const methods = useMethods(store);
            await methods.generateTask(formData, currentFeature, e);
          } catch (err) {
            console.error('[EditCardPlugin] 调用生成任务失败:', err);
            showError('生成任务失败，请稍后重试');
          }
        });

        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          formData.features.splice(index, 1);
          renderFeatures();
        });

        featureItem.appendChild(iconInput);
        featureItem.appendChild(nameInput);
        featureItem.appendChild(descInput);
        featureItem.appendChild(genTaskBtn);
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

    // 统计数据编辑
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    statsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
      background: var(--bg-secondary, #2a2a2a);
      border: 1px solid var(--border-secondary, #444);
      border-radius: 8px;
      padding: 16px;
      position: relative;
      overflow: visible;
      min-width: 0;
      width: 100%;
    `;

    const statsTitle = document.createElement('h4');
    statsTitle.textContent = '统计数据';
    statsTitle.style.cssText = `
      margin: 0 0 16px 0;
      color: var(--text-primary, #fff);
      font-size: 16px;
      font-weight: 600;
      border-bottom: 1px solid var(--border-secondary, #444);
      padding-bottom: 8px;
    `;

    const statsList = document.createElement('div');
    statsList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
      width: 100%;
    `;

    if (!formData.stats) formData.stats = [];

    const renderStats = () => {
      statsList.innerHTML = '';
      formData.stats.forEach((stat, index) => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        statItem.style.cssText = `
          display: flex;
          flex-direction: row;
          gap: 8px;
          align-items: center;
          padding: 8px;
          border: 1px solid var(--border-secondary, #444);
          border-radius: 6px;
          background: var(--bg-primary, #1a1a1a);
          margin-bottom: 8px;
          transition: all 0.2s ease;
          flex-wrap: nowrap;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        `;

        const numberInput = document.createElement('input');
        numberInput.type = 'text';
        numberInput.placeholder = '数字';
        numberInput.value = stat.number || '';
        numberInput.style.cssText = `
          padding: 6px 6px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 4px;
          background: var(--bg-primary, #1a1a1a);
          color: var(--text-primary, #fff);
          font-size: 12px;
          width: 70px;
          text-align: center;
          font-weight: 600;
          flex-shrink: 0;
        `;

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.placeholder = '标签名称';
        labelInput.value = stat.label || '';
        labelInput.style.cssText = `
          padding: 6px 6px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 4px;
          background: var(--bg-primary, #1a1a1a);
          color: var(--text-primary, #fff);
          font-size: 12px;
          width: 100px;
          flex-shrink: 0;
        `;



        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.style.cssText = `
          background: var(--danger, #dc3545);
          color: white;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        `;

        numberInput.addEventListener('input', (e) => {
          formData.stats[index].number = e.target.value;
        });
        labelInput.addEventListener('input', (e) => {
          formData.stats[index].label = e.target.value;
        });

        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          formData.stats.splice(index, 1);
          renderStats();
        });

        statItem.appendChild(numberInput);
        statItem.appendChild(labelInput);
        statItem.appendChild(deleteBtn);
        statsList.appendChild(statItem);
      });
    };

    const addStatBtn = document.createElement('button');
    addStatBtn.textContent = '+ 添加统计数据';
    addStatBtn.type = 'button';
    addStatBtn.className = 'add-btn';
    addStatBtn.style.cssText = `
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
    addStatBtn.addEventListener('click', () => {
      formData.stats.push({ number: '', label: '' });
      renderStats();
    });

    statsContainer.appendChild(statsTitle);
    statsContainer.appendChild(statsList);
    statsContainer.appendChild(addStatBtn);



    // 标签编辑
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

    if (!formData.tags) formData.tags = [];

    // 拖拽排序状态
    let draggingIndex = null;

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

        // 拖拽手柄，仅手柄可拖动，避免影响输入框编辑
        const dragHandle = document.createElement('span');
        dragHandle.textContent = '≡';
        dragHandle.title = '拖拽以排序';
        dragHandle.setAttribute('aria-label', '拖拽以排序');
        dragHandle.draggable = true;
        dragHandle.style.cssText = `
          cursor: grab;
          user-select: none;
          color: var(--text-secondary, #aaa);
          padding: 4px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        `;

        dragHandle.addEventListener('dragstart', (e) => {
          draggingIndex = index;
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', String(index)); } catch (_) {}
          // 视觉反馈
          tagItem.style.opacity = '0.6';
        });

        dragHandle.addEventListener('dragend', () => {
          draggingIndex = null;
          tagItem.style.opacity = '';
          tagItem.style.outline = '';
        });

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

        // 拖拽放置目标（在每个条目容器上）
        tagItem.addEventListener('dragover', (e) => {
          if (draggingIndex === null) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          tagItem.style.outline = '2px dashed var(--primary, #007bff)';
        });

        tagItem.addEventListener('dragleave', () => {
          tagItem.style.outline = '';
        });

        tagItem.addEventListener('drop', (e) => {
          if (draggingIndex === null) return;
          e.preventDefault();
          tagItem.style.outline = '';
          const srcIndex = draggingIndex;
          let dstIndex = index;
          if (srcIndex === dstIndex) return;
          // 重新排序并渲染
          const [moved] = formData.tags.splice(srcIndex, 1);
          const insertIndex = srcIndex < dstIndex ? dstIndex - 1 : dstIndex;
          formData.tags.splice(insertIndex, 0, moved);
          draggingIndex = null;
          renderTags();
        });

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

        tagInput.addEventListener('input', (e) => {
          formData.tags[index].name = e.target.value;
        });
        tagInput.addEventListener('blur', (e) => {
          const tagName = (e.target.value || '').trim();
          if (!tagName) {
            formData.tags.splice(index, 1);
            renderTags();
            return;
          }
          const duplicateIndex = formData.tags.findIndex((t, i) => i !== index && (t.name || '').trim().toLowerCase() === tagName.toLowerCase());
          if (duplicateIndex !== -1) {
            showError(`标签 "${tagName}" 已存在`);
            formData.tags.splice(index, 1);
            renderTags();
            return;
          }
          formData.tags[index].name = tagName;
        });
        tagInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            tagInput.blur();
          }
        });
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          formData.tags.splice(index, 1);
          renderTags();
        });

        tagItem.appendChild(dragHandle);
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
      const hasEmpty = formData.tags.some(t => !(t.name || '').trim());
      if (hasEmpty) {
        showError('请先填写现有标签名称');
        return;
      }
      formData.tags.push({ name: '' });
      renderTags();
      const newTagInput = tagsList.lastElementChild?.querySelector('input');
      if (newTagInput) newTagInput.focus();
    });

    tagsContainer.appendChild(tagsTitle);
    tagsContainer.appendChild(tagsList);
    tagsContainer.appendChild(addTagBtn);

    // 操作按钮
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-primary, #333);
    `;

    const saveButton = document.createElement('button');
    saveButton.textContent = '保存更改';
    saveButton.type = 'button';
    saveButton.style.cssText = `
      background: var(--success, #28a745);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
      min-width: 100px;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.type = 'button';
    cancelButton.style.cssText = `
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      border: 1px solid var(--border-primary, #333);
      border-radius: 6px;
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    `;

    addPassiveEventListener(saveButton, 'click', async () => {
      try {
        if (!formData.title || !formData.description) {
          showError('标题和描述为必填字段');
          return;
        }

        if (navigator.vibrate) navigator.vibrate(30);

        saveButton.disabled = true;
        cancelButton.disabled = true;
        saveButton.classList.add('updating');

        // 更新本地对象
        Object.assign(card, formData);

        // DB 持久化
        if (card.key) {
          try {
            const { updateData } = await import('/apis/modules/crud.js');
            const url = `${window.API_URL}/mongodb/?cname=goals`;
            const payload = {
              key: card.key,
              title: formData.title,
              description: formData.description,
              icon: card.icon || '',
              badge: card.badge || '',
              hint: card.hint || '',
              footerIcon: card.footerIcon || '',
              features: card.features || [],
              stats: card.stats || [],
              tags: formData.tags || card.tags || [],
              year: formData.year || '',
              quarter: formData.quarter || '',
              month: formData.month || '',
              updatedAt: new Date().toISOString()
            };
            await updateData(url, payload);
          } catch (dbError) {
            console.error('[EditCardPlugin] 数据库更新失败:', dbError);
            showError('数据库更新失败，但本地更改已保存');
          }
        }

        // 先关闭弹框
        closeModal();
        showSuccess(`卡片"${card.title}"已更新`);

        // 强制恢复滚动状态
        setTimeout(() => {
          try {
            // 调用全局滚动恢复函数
            const success = globalUnlockScroll();
            
            if (!success) {
              // 备用方案：直接操作DOM
              document.documentElement.removeAttribute('style');
              document.body.removeAttribute('style');
              document.documentElement.style.overflow = 'auto';
              document.body.style.overflow = 'auto';
            }
            
          } catch (error) {
            console.error('[EditCard] 强制恢复滚动状态失败:', error);
            // 最后的强制恢复
            try {
              document.documentElement.removeAttribute('style');
              document.body.removeAttribute('style');
            } catch (finalError) {
              console.error('[EditCard] 最终清理失败:', finalError);
            }
          }
        }, 100);

        // 刷新数据
        if (store && typeof store.loadFeatureCards === 'function') {
          setTimeout(async () => {
            try {
              await store.loadFeatureCards();
              
              // 数据刷新完成后，专门恢复卡片列表滚动
              setTimeout(() => {
                const success = restoreCardsListScroll();
                if (!success) {
                  globalUnlockScroll();
                }
              }, 100);
              
              // 额外延迟检查，确保滚动状态完全恢复
              setTimeout(() => {
                // 检查页面是否可以滚动
                const canPageScroll = document.body.style.overflow !== 'hidden' && 
                                    document.body.style.overflowY !== 'hidden' && 
                                    document.documentElement.style.overflow !== 'hidden';
                
                // 检查卡片列表容器是否可以滚动
                const featureCardsContainer = document.querySelector('.feature-cards-container');
                const canContainerScroll = featureCardsContainer && 
                                         featureCardsContainer.style.overflow !== 'hidden' && 
                                         featureCardsContainer.style.overflowY !== 'hidden';
                
                if (!canPageScroll || !canContainerScroll) {
                  restoreCardsListScroll();
                }
              }, 500);
              
            } catch (error) {
              console.error('[EditCard] 刷新卡片数据失败:', error);
              // 即使刷新失败，也要确保滚动恢复
              setTimeout(() => {
                globalUnlockScroll();
              }, 100);
            }
          }, 300);
        }
      } catch (err) {
        console.error('[EditCardPlugin] 保存失败:', err);
        showError('保存失败，请稍后重试');
      } finally {
        saveButton.disabled = false;
        cancelButton.disabled = false;
        saveButton.classList.remove('updating');
        
        // 在finally块中也确保滚动状态恢复
        setTimeout(() => {
          try {
            // 调用全局滚动恢复函数
            const success = globalUnlockScroll();
            
            if (!success) {
              // 备用方案：直接操作DOM
              document.documentElement.removeAttribute('style');
              document.body.removeAttribute('style');
              document.documentElement.style.overflow = 'auto';
              document.body.style.overflow = 'auto';
            }
            
          } catch (error) {
            console.error('[EditCard] finally块中恢复滚动状态失败:', error);
          }
        }, 200);
      }
    });

    addPassiveEventListener(cancelButton, 'click', () => {
      closeModal();
    });

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);

    // 组装 - 时间属性在基础字段容器内的第一位
    form.appendChild(basicFieldsContainer);
    form.appendChild(featuresContainer);
    form.appendChild(statsContainer);
    form.appendChild(tagsContainer);
    form.appendChild(buttonContainer);

    modalTitle.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 显示时锁定背景滚动，避免交互错位
    try {
      // 记录当前滚动状态
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      prevBodyOverflowY = document.body.style.overflowY;
      prevBodyPosition = document.body.style.position;
      prevBodyTop = document.body.style.top;
      prevBodyWidth = document.body.style.width;
      
      // 记录当前滚动位置
      scrollPosition = {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop
      };
      
      // 锁定滚动
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
    } catch (error) {
      console.warn('[EditCard] 锁定滚动状态时出错:', error);
    }

    // 初始渲染
    renderFeatures();
    renderStats();
    renderTags();

    const firstInput = form.querySelector('input, textarea');
    if (firstInput) firstInput.focus();

    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    }, { passive: true });

    // ESC 关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEsc, { passive: true });

    // 聚焦弹框，提升可达性并避免滚动跳动
    setTimeout(() => { try { modalContent.focus(); } catch (_) {} }, 0);
    
    // 添加页面卸载时的清理逻辑
    const handleBeforeUnload = () => {
      unlockScroll();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 添加滚动状态监控
    const scrollMonitor = setInterval(() => {
      try {
        const isScrollLocked = document.body.style.overflow === 'hidden' || 
                              document.body.style.overflowY === 'hidden' || 
                              document.documentElement.style.overflow === 'hidden';
        
        if (isScrollLocked && !modal.parentNode) {
          forceUnlockScroll();
          clearInterval(scrollMonitor);
        }
      } catch (error) {
        console.warn('[EditCard] 滚动监控出错:', error);
      }
    }, 1000);
    
    // 在closeModal中移除这个事件监听器
    const originalCloseModal = closeModal;
    const enhancedCloseModal = () => {
      try {
        // 清除滚动监控
        clearInterval(scrollMonitor);
        
        // 移除页面卸载事件监听器
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // 执行原始关闭逻辑
        originalCloseModal();
        
        // 额外确保滚动恢复
        setTimeout(() => {
          forceUnlockScroll();
        }, 50);
        
      } catch (error) {
        console.error('[EditCard] 增强关闭逻辑出错:', error);
        // 如果出错，强制清理
        try {
          clearInterval(scrollMonitor);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          unlockScroll();
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
          // 强制解锁滚动
          setTimeout(() => {
            forceUnlockScroll();
          }, 100);
        } catch (forceError) {
          console.error('[EditCard] 强制清理失败:', forceError);
        }
      }
    };
    
    // 替换原来的closeModal引用
    closeModal = enhancedCloseModal;
    
  } catch (error) {
    console.error('[EditCardPlugin] 打开编辑器失败:', error);
  }
}



// 页面加载完成后检查滚动状态
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      const isScrollLocked = document.body.style.overflow === 'hidden' || 
                            document.body.style.overflowY === 'hidden' || 
                            document.documentElement.style.overflow === 'hidden';
      
      if (isScrollLocked) {
        globalUnlockScroll();
      }
    } catch (error) {
      console.warn('[EditCard] 页面加载后检查滚动状态失败:', error);
    }
  }, 1000);
});

// 添加全局滚动恢复快捷键（Ctrl+Shift+R）
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    globalUnlockScroll();
  }
});

// 添加卡片列表滚动恢复快捷键（Ctrl+Shift+C）
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    restoreCardsListScroll();
  }
});

// 全局滚动状态监控
let scrollMonitorInterval = null;

function startScrollMonitoring() {
  if (scrollMonitorInterval) {
    clearInterval(scrollMonitorInterval);
  }
  
  scrollMonitorInterval = setInterval(() => {
    try {
      const isScrollLocked = document.body.style.overflow === 'hidden' || 
                            document.body.style.overflowY === 'hidden' || 
                            document.documentElement.style.overflow === 'hidden';
      
      if (isScrollLocked) {
        restoreCardsListScroll();
      }
    } catch (error) {
      console.warn('[EditCard] 全局滚动监控出错:', error);
    }
  }, 2000); // 每2秒检查一次
}

function stopScrollMonitoring() {
  if (scrollMonitorInterval) {
    clearInterval(scrollMonitorInterval);
    scrollMonitorInterval = null;
  }
}

// 启动全局滚动监控
startScrollMonitoring();
<<<<<<< HEAD

=======
>>>>>>> f6edd1b0fe06f8905bf8836ed98527c1edb901cd







