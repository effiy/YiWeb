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

    const modalTitle = document.createElement('h3');
    modalTitle.innerHTML = `<span>新建卡片</span>`;
    modalTitle.setAttribute('title', '新建卡片');

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'edit-card-close';
    closeButton.setAttribute('aria-label', '关闭');
    closeButton.title = '关闭';
    closeButton.innerHTML = '&times;';
    addPassiveEventListener(closeButton, 'click', closeModal);

    header.appendChild(modalTitle);
    header.appendChild(closeButton);

    // 表单
    const form = document.createElement('form');
    form.className = 'edit-card-form';

    const formData = {
      title: '',
      description: '',
      icon: 'fas fa-cube',
      hint: '点击查看详情',
      stats: [],
      tags: []
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

    // --- Footer Buttons ---
    const footer = document.createElement('div');
    footer.className = 'edit-card-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn btn-secondary';
    addPassiveEventListener(cancelBtn, 'click', closeModal);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = '创建';
    saveBtn.className = 'btn btn-primary';

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            showError('请输入标题');
            return;
        }

        try {
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
                features: [],
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
    form.appendChild(footer);

    modalContent.appendChild(header);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    lockScroll();

    renderStats();

    setTimeout(() => {
      titleInput.focus();
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
