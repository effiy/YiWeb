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
    
    // 记录滚动状态
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'edit-card-modal'; // 复用样式
    
    // 模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'edit-card-content';
    modalContent.setAttribute('role', 'dialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('tabindex', '-1');

    // 标题
    const modalTitle = document.createElement('h3');
    modalTitle.innerHTML = `<span>新建卡片</span>`;

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'edit-card-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = closeModal;

    // 关闭逻辑
    function closeModal() {
        document.body.removeChild(modal);
        // 恢复滚动... (简化处理)
        document.body.style.overflow = '';
    }

    // 表单
    const form = document.createElement('form');
    form.style.cssText = `display: flex; flex-direction: column; gap: 16px;`;

    const formData = {
      title: '',
      description: '',
      features: [], // Statistics
      tags: []
    };

    // --- Basic Fields ---
    const basicFields = document.createElement('div');
    basicFields.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    // Title
    const titleGroup = createFieldGroup('Card Title (卡片标题)', '输入标题...', 'text', (val) => formData.title = val);
    
    // Description
    const descGroup = createFieldGroup('Description (描述)', '输入描述...', 'textarea', (val) => formData.description = val);

    basicFields.appendChild(titleGroup);
    basicFields.appendChild(descGroup);

    // --- Statistics (Features) ---
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `margin-top: 16px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;
    
    const statsHeader = document.createElement('div');
    statsHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    statsHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Statistics (统计数据)</h4>`;
    
    const addStatBtn = document.createElement('button');
    addStatBtn.type = 'button';
    addStatBtn.textContent = '+ 添加统计';
    addStatBtn.className = 'add-btn'; // 复用样式
    addStatBtn.style.cssText = `padding: 4px 8px; font-size: 12px; cursor: pointer; background: var(--primary-color, #007bff); color: white; border: none; border-radius: 4px;`;
    
    const statsList = document.createElement('div');
    statsList.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;

    const renderStats = () => {
        statsList.innerHTML = '';
        formData.features.forEach((stat, idx) => {
            const row = document.createElement('div');
            row.style.cssText = `display: flex; gap: 8px; align-items: center;`;
            
            // Name
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = stat.name || '';
            nameInput.placeholder = '名称 (如: 完成率)';
            nameInput.style.cssText = `flex: 2; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 4px;`;
            nameInput.oninput = (e) => {
                formData.features[idx].name = e.target.value;
                if (!formData.features[idx].icon) {
                    formData.features[idx].icon = 'fas fa-chart-bar';
                }
            };

            // Value
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.value = stat.value || '';
            valueInput.placeholder = '数值 (如: 85%)';
            valueInput.style.cssText = `flex: 1; padding: 8px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-secondary, #444); color: white; border-radius: 4px;`;
            valueInput.oninput = (e) => {
                formData.features[idx].value = e.target.value;
            };

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.innerHTML = '&times;';
            delBtn.style.cssText = `color: #ff4d4f; background: none; border: none; font-size: 18px; cursor: pointer;`;
            delBtn.onclick = () => {
                formData.features.splice(idx, 1);
                renderStats();
            };

            row.appendChild(nameInput);
            row.appendChild(valueInput);
            row.appendChild(delBtn);
            statsList.appendChild(row);
        });
    };

    addStatBtn.onclick = () => {
        formData.features.push({ name: '', value: '', icon: 'fas fa-chart-bar' });
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
            // Construct card object
            const newCard = {
                title: formData.title,
                description: formData.description,
                features: formData.features, // Statistics
                tags: formData.tags,
                icon: 'fas fa-cube',
                badge: '',
                hint: '点击查看详情',
                footerIcon: 'fas fa-arrow-right',
                stats: [],
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
    form.appendChild(statsContainer);
    form.appendChild(footer);

    modalContent.appendChild(modalTitle);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

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
