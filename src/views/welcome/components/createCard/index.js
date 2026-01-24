/**
 * CreateCard 插件
 * 提供新建 OKR 卡片的功能
 */

console.log('[CreateCardPlugin] 插件开始加载...');

import { showError, showSuccess } from '/src/utils/message.js';
import { getQuarters } from '/src/utils/timeSelectors.js';

console.log('[CreateCardPlugin] 依赖模块导入完成');

function addPassiveEventListener(element, event, handler, options = {}) {
  const finalOptions = { passive: true, ...options };
  element.addEventListener(event, handler, finalOptions);
}

export async function openCreateCardModal(store) {
  try {
    console.log('[CreateCardPlugin] 开始打开新建 OKR 卡片弹框');
    
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
    modalTitle.innerHTML = `<span>新建 OKR 卡片</span>`;

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

    // 默认时间
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = `Q${Math.ceil(currentMonth / 3)}`;

    const formData = {
      title: '',
      description: '',
      year: store.selectedYear?.value || currentYear,
      quarter: store.selectedQuarter?.value || currentQuarter,
      features: [], // Key Results
      tags: []
    };

    // --- 时间属性 (Year, Quarter) ---
    const timeContainer = document.createElement('div');
    timeContainer.style.cssText = `display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;`;
    
    // Year
    const yearSelect = document.createElement('select');
    yearSelect.style.cssText = `padding: 8px; border-radius: 4px; background: var(--bg-secondary, #2a2a2a); color: var(--text-primary, #fff); border: 1px solid var(--border-primary, #333);`;
    for(let i = currentYear - 2; i <= parseInt(currentYear) + 5; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = `${i}年`;
        if(i.toString() === formData.year) opt.selected = true;
        yearSelect.appendChild(opt);
    }
    yearSelect.onchange = (e) => formData.year = e.target.value;

    // Quarter
    const quarterSelect = document.createElement('select');
    quarterSelect.style.cssText = `padding: 8px; border-radius: 4px; background: var(--bg-secondary, #2a2a2a); color: var(--text-primary, #fff); border: 1px solid var(--border-primary, #333);`;
    getQuarters().forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.value;
        opt.text = q.label;
        if(q.value === formData.quarter) opt.selected = true;
        quarterSelect.appendChild(opt);
    });
    quarterSelect.onchange = (e) => formData.quarter = e.target.value;

    timeContainer.appendChild(yearSelect);
    timeContainer.appendChild(quarterSelect);

    // --- Basic Fields ---
    const basicFields = document.createElement('div');
    basicFields.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

    // Objective (Title)
    const titleGroup = createFieldGroup('Objective (目标)', '输入目标...', 'text', (val) => formData.title = val);
    
    // Description (Rationale)
    const descGroup = createFieldGroup('Rationale (背景/理由)', '输入背景或理由...', 'textarea', (val) => formData.description = val);

    basicFields.appendChild(titleGroup);
    basicFields.appendChild(descGroup);

    // --- Key Results (Features) ---
    const krContainer = document.createElement('div');
    krContainer.style.cssText = `margin-top: 16px; border-top: 1px solid var(--border-primary, #333); padding-top: 16px;`;
    
    const krHeader = document.createElement('div');
    krHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;`;
    krHeader.innerHTML = `<h4 style="margin:0; font-size:14px;">Key Results (关键结果)</h4>`;
    
    const addKrBtn = document.createElement('button');
    addKrBtn.type = 'button';
    addKrBtn.textContent = '+ 添加 KR';
    addKrBtn.className = 'add-btn'; // 复用样式
    addKrBtn.style.cssText = `padding: 4px 8px; font-size: 12px; cursor: pointer; background: var(--primary-color, #007bff); color: white; border: none; border-radius: 4px;`;
    
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
                formData.features[idx].icon = 'fas fa-check-circle'; // Default icon for KR
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

    krHeader.appendChild(addKrBtn);
    krContainer.appendChild(krHeader);
    krContainer.appendChild(krList);

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
    saveBtn.textContent = '创建 OKR';
    saveBtn.className = 'btn-primary';

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            showError('请输入 Objective (目标)');
            return;
        }

        try {
            // Construct card object
            const newCard = {
                title: formData.title,
                description: formData.description,
                year: formData.year,
                quarter: formData.quarter,
                features: formData.features, // Key Results
                tags: formData.tags,
                // Default values for removed fields to maintain compatibility if needed
                icon: 'fas fa-bullseye', // OKR icon
                badge: `${formData.year} ${formData.quarter}`,
                hint: '点击查看详情',
                footerIcon: 'fas fa-arrow-right',
                stats: [],
                input: '',
                output: ''
            };

            console.log('[CreateCardPlugin] 提交卡片数据:', newCard);
            
            if (store && store.addCard) {
                await store.addCard(newCard);
                showSuccess('OKR 卡片创建成功');
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
    form.appendChild(timeContainer);
    form.appendChild(basicFields);
    form.appendChild(krContainer);
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
