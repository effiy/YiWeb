/**
 * CreateCard 插件
 * 提供新建卡片的功能
 */

console.log('[CreateCardPlugin] 插件开始加载...');

import { showError, showSuccess } from '/src/utils/message.js';

console.log('[CreateCardPlugin] 依赖模块导入完成');

function addPassiveEventListener(element, event, handler, options = {}) {
  const finalOptions = { passive: true, ...options };
  element.addEventListener(event, handler, finalOptions);
}

export async function openCreateCardModal(store) {
  try {
    console.log('[CreateCardPlugin] 开始打开新建卡片弹框');
    
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
    let prevBodyOverflowY = '';
    let prevBodyPosition = '';
    let prevBodyTop = '';
    let prevBodyWidth = '';
    let scrollY = 0;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'edit-card-modal'; // 复用样式
    
    // 模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'edit-card-content';
    modalContent.setAttribute('role', 'dialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('tabindex', '-1');

    const lockScroll = () => {
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      prevBodyOverflowY = document.body.style.overflowY;
      prevBodyPosition = document.body.style.position;
      prevBodyTop = document.body.style.top;
      prevBodyWidth = document.body.style.width;
      scrollY = window.scrollY || document.documentElement.scrollTop || 0;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    };

    const unlockScroll = () => {
      document.documentElement.style.overflow = prevHtmlOverflow || '';
      document.body.style.overflow = prevBodyOverflow || '';
      document.body.style.overflowY = prevBodyOverflowY || '';
      document.body.style.position = prevBodyPosition || '';
      document.body.style.top = prevBodyTop || '';
      document.body.style.width = prevBodyWidth || '';
      window.scrollTo(0, scrollY);
    };

    const closeModal = () => {
      try {
        document.removeEventListener('keydown', handleEsc);
      } catch (e) {}
      try {
        modal.remove();
      } catch (e) {
        try {
          document.body.removeChild(modal);
        } catch (e2) {}
      }
      unlockScroll();
    };

    const header = document.createElement('header');
    header.className = 'edit-card-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-primary, #333);
    `;

    const modalTitle = document.createElement('h3');
    modalTitle.innerHTML = `<span>新建卡片</span>`;
    modalTitle.setAttribute('title', '新建卡片');

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
    closeButton.addEventListener('click', closeModal);

    header.appendChild(modalTitle);
    header.appendChild(closeButton);

    // 表单
    const form = document.createElement('form');
    form.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 0 20px 20px;
      gap: 16px;
    `;

    const formData = {
      title: '',
      description: '',
      icon: 'fas fa-cube',
      hint: '点击查看详情',
      features: [],
      stats: [],
      tags: []
    };

    // --- Basic Fields ---
    const basicFields = document.createElement('div');
    basicFields.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    // Title
    const titleGroup = createFieldGroup('Card Title (卡片标题)', '输入标题...', 'text', (val) => formData.title = val);
    
    // Description
    const descGroup = createFieldGroup('Description (描述)', '输入描述...', 'textarea', (val) => formData.description = val);

    const iconGroup = createFieldGroup('Icon Class (图标类名)', '例如：fas fa-cube', 'text', (val) => formData.icon = val);
    const hintGroup = createFieldGroup('Hint (提示文案)', '例如：点击查看详情', 'text', (val) => formData.hint = val);

    basicFields.appendChild(titleGroup);
    basicFields.appendChild(descGroup);
    basicFields.appendChild(iconGroup);
    basicFields.appendChild(hintGroup);

    const featuresContainer = document.createElement('div');
    featuresContainer.style.cssText = `margin-top: 8px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;

    const featuresHeader = document.createElement('div');
    featuresHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    featuresHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Features (功能特性)</h4>`;

    const addFeatureBtn = document.createElement('button');
    addFeatureBtn.type = 'button';
    addFeatureBtn.textContent = '+ 添加特性';
    addFeatureBtn.style.cssText = `padding: 4px 8px; font-size: 12px; cursor: pointer; background: var(--primary-color, #007bff); color: white; border: none; border-radius: 4px;`;

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

    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `margin-top: 8px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;

    const statsHeader = document.createElement('div');
    statsHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    statsHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Statistics (统计数据)</h4>`;

    const addStatBtn = document.createElement('button');
    addStatBtn.type = 'button';
    addStatBtn.textContent = '+ 添加统计';
    addStatBtn.style.cssText = `padding: 4px 8px; font-size: 12px; cursor: pointer; background: var(--primary-color, #007bff); color: white; border: none; border-radius: 4px;`;

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

    // --- Footer Buttons ---
    const footer = document.createElement('div');
    footer.className = 'edit-card-footer';
    footer.style.cssText = `display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-primary, #333);`;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.onclick = closeModal;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = '创建卡片';
    saveBtn.className = 'btn-primary';

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            showError('请输入标题');
            return;
        }

        try {
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

            // Construct card object
            const newCard = {
                title: formData.title,
                description: formData.description,
                features: cleanFeatures,
                tags: formData.tags,
                icon: (formData.icon || 'fas fa-cube').trim(),
                badge: '',
                hint: (formData.hint || '点击查看详情').trim(),
                footerIcon: 'fas fa-arrow-right',
                stats: cleanStats,
                input: '',
                output: ''
            };

            console.log('[CreateCardPlugin] 提交卡片数据:', newCard);
            
            if (store && store.addCard) {
                await store.addCard(newCard);
                showSuccess('卡片创建成功');
                closeModal();
                
                // 刷新页面或列表
                if (store.loadFeatureCards) {
                    store.loadFeatureCards();
                }
            } else {
                console.error('[CreateCardPlugin] store.addCard 方法不存在');
                showError('创建失败：内部错误');
            }
        } catch (error) {
            console.error('[CreateCardPlugin] 创建失败:', error);
            showError('创建失败: ' + error.message);
        }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    // Assembly
    form.appendChild(basicFields);
    form.appendChild(featuresContainer);
    form.appendChild(statsContainer);
    form.appendChild(footer);

    modalContent.appendChild(header);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    lockScroll();

    renderFeatures();
    renderStats();

    setTimeout(() => {
      const input = titleGroup.querySelector('input');
      if (input) input.focus();
    }, 0);

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEsc);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    }, { passive: true });

  } catch (error) {
    console.error('[CreateCardPlugin] 打开弹框失败:', error);
    showError('无法打开新建卡片弹框');
  }
}

function createFieldGroup(label, placeholder, type, onChange) {
    const group = document.createElement('div');
    group.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
    
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = `font-size: 12px; color: var(--text-secondary, #ccc); font-weight: 600;`;
    
    let input;
    if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
    } else {
        input = document.createElement('input');
        input.type = type;
    }
    
    input.placeholder = placeholder;
    input.style.cssText = `padding: 10px; border-radius: 6px; background: var(--bg-secondary, #2a2a2a); color: var(--text-primary, #fff); border: 1px solid var(--border-primary, #333); width: 100%; box-sizing: border-box;`;
    
    input.oninput = (e) => onChange(e.target.value);
    
    group.appendChild(lbl);
    group.appendChild(input);
    return group;
}
