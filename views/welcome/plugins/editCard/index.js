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

export async function openEditCardModal(card, store) {
  if (!card) {
    showError('无效的卡片数据');
    return;
  }

  try {
    // 记录滚动状态，用于关闭时恢复
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
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
    // 统一关闭与清理
    const unlockScroll = () => {
      try {
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        document.body.style.overflow = prevBodyOverflow || '';
      } catch (_) {}
    };

    const closeModal = () => {
      unlockScroll();
      try { document.removeEventListener('keydown', handleEsc); } catch (_) {}
      try { modal.remove(); } catch (_) {}
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
    formData.year = card.year || card.timeProperties?.year || '';
    formData.quarter = card.quarter || card.timeProperties?.quarter || '';
    formData.month = card.month || card.timeProperties?.month || '';

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

    // 查询结果显示区域
    const queryResultContainer = document.createElement('div');
    queryResultContainer.style.cssText = `
      margin-top: 8px;
      padding: 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-primary, #1a1a1a);
      color: var(--text-secondary, #ccc);
      font-size: 12px;
      min-height: 40px;
      display: none;
    `;

    // API查询函数
    const queryTimeData = async (year, quarter, month) => {
      try {
        queryResultContainer.style.display = 'block';
        queryResultContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid var(--primary, #007bff); border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>正在查询 ${year}年${quarter}季度${month ? month + '月' : ''}相关数据...</span>
          </div>
        `;

        // 添加旋转动画样式
        if (!document.querySelector('#editcard-spin-style')) {
          const style = document.createElement('style');
          style.id = 'editcard-spin-style';
          style.textContent = `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }

        // 调用API查询 - 先获取所有任务，然后在客户端过滤
        let queryUrl = `${window.API_URL}/mongodb/?cname=tasks`;
        console.log('[时间属性查询] 查询URL:', queryUrl);

        const { getData } = await import('/apis/modules/crud.js');
        const response = await getData(queryUrl);
        const allTasks = response?.data?.list || [];
        
        // 客户端过滤任务
        let tasks = allTasks;
        
        // 按时间范围过滤
        if (year || quarter || month) {
          tasks = allTasks.filter(task => {
            // 检查任务的timeRange属性
            const timeRange = task.timeRange;
            if (!timeRange) return false;
            
            // 年度过滤
            if (year && timeRange.year !== year) return false;
            
            // 季度过滤
            if (quarter && timeRange.quarter !== quarter) return false;
            
            // 月度过滤
            if (month && timeRange.month !== month) return false;
            
            return true;
          });
        }
        
        console.log('[时间属性查询] 过滤结果:', {
          allTasksCount: allTasks.length,
          filteredTasksCount: tasks.length,
          filters: { year, quarter, month }
        });

        // 显示查询结果
        const taskCount = tasks.length;
        const completedCount = tasks.filter(task => task.status === 'completed').length;
        const inProgressCount = tasks.filter(task => task.status === 'in-progress').length;
        
        const waitingCount = taskCount - completedCount - inProgressCount;
        
        queryResultContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-weight: 600; color: var(--text-primary, #fff); display: flex; align-items: center; gap: 8px;">
              📊 查询结果：${year}年${quarter}季度${month ? month + '月' : ''}
              <span style="font-size: 11px; color: var(--text-secondary, #999); font-weight: normal;">
                (从 ${allTasks.length} 个任务中筛选)
              </span>
            </div>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <span>总任务：<strong style="color: var(--primary, #007bff);">${taskCount}</strong> 个</span>
              <span>已完成：<strong style="color: var(--success, #28a745);">${completedCount}</strong> 个</span>
              <span>进行中：<strong style="color: var(--warning, #ffc107);">${inProgressCount}</strong> 个</span>
              <span>待处理：<strong style="color: var(--info, #17a2b8);">${waitingCount}</strong> 个</span>
            </div>
            ${taskCount === 0 ? `
              <div style="margin-top: 4px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px; color: var(--warning, #ffc107); font-size: 12px;">
                💡 提示：未找到匹配的任务，可能该时间段暂无相关任务数据
              </div>
            ` : ''}
          </div>
        `;

        console.log('[时间属性查询] 查询结果:', {
          year,
          quarter,
          month,
          taskCount,
          completedCount,
          inProgressCount,
          tasks
        });

      } catch (error) {
        console.error('[时间属性查询] 查询失败:', error);
        queryResultContainer.innerHTML = `
          <div style="color: var(--danger, #dc3545);">
            ❌ 查询失败：${error?.message || '未知错误'}
          </div>
        `;
      }
    };





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
    yearSelect.addEventListener('change', async (e) => {
      formData.year = e.target.value;
      formData.quarter = '';
      formData.month = '';
      
      updateQuarterSelect();
      updateMonthSelect();
      
      if (formData.year) {
        await queryTimeData(formData.year, '', '');
      } else {
        queryResultContainer.style.display = 'none';
      }
    });

    // 季度选择事件
    quarterSelect.addEventListener('change', async (e) => {
      formData.quarter = e.target.value;
      formData.month = '';
      
      updateMonthSelect();
      
      if (formData.year && formData.quarter) {
        await queryTimeData(formData.year, formData.quarter, '');
      }
    });

    // 月度选择事件
    monthSelect.addEventListener('change', async (e) => {
      formData.month = e.target.value;
      
      if (formData.year && formData.quarter && formData.month) {
        await queryTimeData(formData.year, formData.quarter, formData.month);
      }
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
    timePropertiesContainer.appendChild(queryResultContainer);

    // 如果有初始值，触发查询
    if (formData.year && formData.quarter && formData.month) {
      setTimeout(() => {
        queryTimeData(formData.year, formData.quarter, formData.month);
      }, 100);
    }

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

        modal.remove();
        showSuccess(`卡片"${card.title}"已更新`);

        // 刷新数据
        if (store && typeof store.loadFeatureCards === 'function') {
          setTimeout(() => {
            store.loadFeatureCards().catch(() => {});
          }, 300);
        }
      } catch (err) {
        console.error('[EditCardPlugin] 保存失败:', err);
        showError('保存失败，请稍后重试');
      } finally {
        saveButton.disabled = false;
        cancelButton.disabled = false;
        saveButton.classList.remove('updating');
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
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } catch (_) {}

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
  } catch (error) {
    console.error('[EditCardPlugin] 打开编辑器失败:', error);
    showError('创建编辑界面失败，请稍后重试');
  }
}

console.log('[EditCardPlugin] 已加载');






