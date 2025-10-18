/**
 * CreateCard 插件
 * 提供新建卡片的功能
 */

console.log('[CreateCardPlugin] 插件开始加载...');

import { showError, showSuccess } from '/utils/message.js';
import { getWeeksByMonth, getDaysByWeek, getMonthsByQuarter, getQuarters } from '/utils/timeSelectors.js';

console.log('[CreateCardPlugin] 依赖模块导入完成');

function addPassiveEventListener(element, event, handler, options = {}) {
  const finalOptions = { passive: true, ...options };
  element.addEventListener(event, handler, finalOptions);
}

export async function openCreateCardModal(store) {
  try {
    console.log('[CreateCardPlugin] 开始打开新建卡片弹框');
    console.log('[CreateCardPlugin] 传入的store:', store);
    
    // 记录滚动状态
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'edit-card-modal'; // 使用与编辑卡片一致的类名
    modal.style.cssText = ''; // 样式使用全局CSS，避免内联覆盖导致偏移

    console.log('[CreateCardPlugin] 模态框元素已创建:', modal);

    // 模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'edit-card-content'; // 使用与编辑卡片一致的类名
    modalContent.style.cssText = ''; // 交由全局样式控制
    modalContent.setAttribute('role', 'dialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('tabindex', '-1');

    console.log('[CreateCardPlugin] 模态框内容元素已创建:', modalContent);

    // 标题
    const modalTitle = document.createElement('h3');
    modalTitle.innerHTML = `
      <span>新建卡片</span>
    `;
    modalTitle.style.cssText = ''; // 使用全局样式

    console.log('[CreateCardPlugin] 标题元素已创建:', modalTitle);

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'edit-card-close'; // 使用与编辑卡片一致的类名
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

    // 关闭逻辑
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
      gap: 16px;
    `;

    console.log('[CreateCardPlugin] 表单元素已创建:', form);

    // 获取当前选择的时间作为默认值，如果没有选择则使用当前时间
    const getDefaultTime = () => {
      const now = new Date();
      const currentYear = now.getFullYear().toString();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = `Q${Math.ceil(currentMonth / 3)}`;
      
      return {
        year: store.selectedYear.value || currentYear,
        quarter: store.selectedQuarter.value || currentQuarter,
        month: store.selectedMonth.value || currentMonth.toString().padStart(2, '0')
      };
    };
    
    const defaultTime = getDefaultTime();
    
    const formData = {
      title: '',
      description: '',
      icon: 'fas fa-plus',
      badge: '新建',
      hint: '点击进入功能',
      footerIcon: 'fas fa-arrow-right',
      features: [],
      stats: [],
      tags: [],
      year: defaultTime.year,
      quarter: defaultTime.quarter,
      month: defaultTime.month,
      week: '',
      day: '',
      input: '',
      output: ''
    };

    // ==================== 时间属性选择器（移到最前面，与编辑卡片一致）====================
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

    // 周度选择器
    const weekContainer = document.createElement('div');
    weekContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    `;

    const weekLabel = document.createElement('label');
    weekLabel.textContent = '周度';
    weekLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-secondary, #ccc);
      font-weight: 500;
    `;

    const weekSelect = document.createElement('select');
    weekSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      font-size: 12px;
      cursor: pointer;
    `;
    weekSelect.disabled = !formData.month;

    // 日度选择器
    const dayContainer = document.createElement('div');
    dayContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    `;

    const dayLabel = document.createElement('label');
    dayLabel.textContent = '日度';
    dayLabel.style.cssText = `
      font-size: 12px;
      color: var(--text-secondary, #ccc);
      font-weight: 500;
    `;

    const daySelect = document.createElement('select');
    daySelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--border-primary, #333);
      border-radius: 4px;
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
      font-size: 12px;
      cursor: pointer;
    `;
    daySelect.disabled = !formData.week;

    // 使用共享的时间选择器函数
    const quarters = getQuarters();
    const monthsByQuarter = {
      'Q1': getMonthsByQuarter('Q1'),
      'Q2': getMonthsByQuarter('Q2'),
      'Q3': getMonthsByQuarter('Q3'),
      'Q4': getMonthsByQuarter('Q4')
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

    // 更新周度选择器
    const updateWeekSelect = () => {
      weekSelect.innerHTML = '';
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = formData.month ? '选择周度' : '请先选择月度';
      weekSelect.appendChild(emptyOption);

      if (formData.month && formData.year) {
        const weeks = getWeeksByMonth(formData.year, formData.month);
        weeks.forEach(week => {
          const option = document.createElement('option');
          option.value = week.value;
          option.textContent = week.label;
          if (formData.week === week.value) {
            option.selected = true;
          }
          weekSelect.appendChild(option);
        });
        weekSelect.disabled = false;
      } else {
        weekSelect.disabled = true;
      }
    };

    // 更新日度选择器
    const updateDaySelect = () => {
      daySelect.innerHTML = '';
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = formData.week ? '选择日度' : '请先选择周度';
      daySelect.appendChild(emptyOption);

      if (formData.week && formData.year) {
        const days = getDaysByWeek(formData.year, formData.week);
        days.forEach(day => {
          const option = document.createElement('option');
          option.value = day.value;
          option.textContent = day.label;
          if (formData.day === day.value) {
            option.selected = true;
          }
          daySelect.appendChild(option);
        });
        daySelect.disabled = false;
      } else {
        daySelect.disabled = true;
      }
    };

    // 年度选择事件
    yearSelect.addEventListener('change', (e) => {
      formData.year = e.target.value;
      formData.quarter = '';
      formData.month = '';
      formData.week = '';
      formData.day = '';
      
      updateQuarterSelect();
      updateMonthSelect();
      updateWeekSelect();
      updateDaySelect();
    });

    // 季度选择事件
    quarterSelect.addEventListener('change', (e) => {
      formData.quarter = e.target.value;
      formData.month = '';
      formData.week = '';
      formData.day = '';
      
      updateMonthSelect();
      updateWeekSelect();
      updateDaySelect();
    });

    // 月度选择事件
    monthSelect.addEventListener('change', (e) => {
      formData.month = e.target.value;
      formData.week = '';
      formData.day = '';
      
      updateWeekSelect();
      updateDaySelect();
    });

    // 周度选择事件
    weekSelect.addEventListener('change', (e) => {
      formData.week = e.target.value;
      formData.day = '';
      
      updateDaySelect();
    });

    // 日度选择事件
    daySelect.addEventListener('change', (e) => {
      formData.day = e.target.value;
    });

    // 初始化选择器状态
    updateQuarterSelect();
    updateMonthSelect();
    updateWeekSelect();
    updateDaySelect();

    // 组装时间选择器
    yearContainer.appendChild(yearLabel);
    yearContainer.appendChild(yearSelect);
    quarterContainer.appendChild(quarterLabel);
    quarterContainer.appendChild(quarterSelect);
    monthContainer.appendChild(monthLabel);
    monthContainer.appendChild(monthSelect);
    weekContainer.appendChild(weekLabel);
    weekContainer.appendChild(weekSelect);
    dayContainer.appendChild(dayLabel);
    dayContainer.appendChild(daySelect);

    timeSelectorsContainer.appendChild(yearContainer);
    timeSelectorsContainer.appendChild(quarterContainer);
    timeSelectorsContainer.appendChild(monthContainer);
    timeSelectorsContainer.appendChild(weekContainer);
    timeSelectorsContainer.appendChild(dayContainer);

    timePropertiesContainer.appendChild(timeTitle);
    timePropertiesContainer.appendChild(timeSelectorsContainer);

    // 基础字段容器
    const basicFieldsContainer = document.createElement('div');
    basicFieldsContainer.className = 'basic-fields-container';
    basicFieldsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 0 20px 20px;
      gap: 16px;
    `;

    // 将时间属性添加到基础字段容器的第一位
    basicFieldsContainer.appendChild(timePropertiesContainer);

    // 基础字段
    const fields = [
      { key: 'title', label: '标题', type: 'text', required: true },
      { key: 'description', label: '描述', type: 'textarea', required: true },
      { key: 'icon', label: '图标类名', type: 'text', required: false },
      { key: 'badge', label: '徽章文本', type: 'text', required: false },
      { key: 'hint', label: '提示文本', type: 'text', required: false },
      { key: 'footerIcon', label: '底部图标', type: 'text', required: false },
      { key: 'input', label: '输入要求', type: 'textarea', required: false },
      { key: 'output', label: '输出要求', type: 'textarea', required: false }
    ];

    console.log('[CreateCardPlugin] 开始创建表单字段，字段数量:', fields.length);

    fields.forEach((field, index) => {
      console.log(`[CreateCardPlugin] 创建字段 ${index + 1}:`, field);
      
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
        font-size: 14px;
        margin-bottom: 4px;
        display: block;
      `;

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        
        // 为input和output字段添加特殊样式
        const isInputOutputField = field.key === 'input' || field.key === 'output';
        const baseStyle = `
          padding: 12px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 6px;
          background: var(--bg-secondary, #2a2a2a);
          color: var(--text-primary, #fff);
          font-size: 14px;
          resize: vertical;
          font-family: inherit;
          min-height: 80px;
          box-sizing: border-box;
          width: 100%;
        `;
        
        const inputOutputStyle = `
          padding: 12px;
          border: 1px solid ${field.key === 'input' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
          border-radius: 8px;
          background: ${field.key === 'input' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)'};
          color: var(--text-primary, #fff);
          font-size: 14px;
          resize: vertical;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          min-height: 100px;
          box-sizing: border-box;
          width: 100%;
          transition: all 0.3s ease;
          line-height: 1.6;
        `;
        
        input.style.cssText = isInputOutputField ? inputOutputStyle : baseStyle;
        
        // 为input和output字段添加特殊属性
        if (isInputOutputField) {
          input.placeholder = field.key === 'input' 
            ? '请描述输入要求，每行一个要求...\n例如：\n- 用户ID\n- 数据格式\n- 参数说明'
            : '请描述输出要求，每行一个要求...\n例如：\n- 返回数据格式\n- 状态码\n- 错误处理';
          input.maxLength = 1000;
          
          // 添加字符计数
          const charCounter = document.createElement('div');
          charCounter.style.cssText = `
            position: absolute;
            bottom: 8px;
            right: 12px;
            font-size: 12px;
            color: var(--text-secondary, #888);
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 6px;
            border-radius: 4px;
            pointer-events: none;
          `;
          
          const updateCharCount = () => {
            charCounter.textContent = `${input.value.length}/1000`;
            charCounter.style.color = input.value.length > 900 ? '#f59e0b' : 'var(--text-secondary, #888)';
          };
          
          input.addEventListener('input', updateCharCount);
          updateCharCount();
          
          // 添加焦点效果
          input.addEventListener('focus', () => {
            input.style.borderColor = field.key === 'input' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)';
            input.style.boxShadow = `0 0 0 3px ${field.key === 'input' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`;
          });
          
          input.addEventListener('blur', () => {
            input.style.borderColor = field.key === 'input' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)';
            input.style.boxShadow = 'none';
          });
          
          // 将字符计数添加到容器
          fieldContainer.style.position = 'relative';
          fieldContainer.appendChild(charCounter);
        }
      } else {
        input = document.createElement('input');
        input.type = field.type;
        input.style.cssText = `
          padding: 12px;
          border: 1px solid var(--border-primary, #333);
          border-radius: 6px;
          background: var(--bg-secondary, #2a2a2a);
          color: var(--text-primary, #fff);
          font-size: 14px;
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
      
      console.log(`[CreateCardPlugin] 字段 ${index + 1} 创建完成:`, fieldContainer);
    });

    console.log('[CreateCardPlugin] 所有表单字段创建完成');
    
    // 添加数组格式兼容性处理函数
    const processArrayFormat = (data) => {
      if (!data || typeof data !== 'object') {
        return data;
      }
      
      const processed = { ...data };
      
      // 处理input字段
      if (processed.input) {
        if (Array.isArray(processed.input)) {
          // 数组格式转换为字符串
          processed.input = processed.input.join('\n');
        } else if (typeof processed.input === 'object') {
          // 对象格式转换为字符串
          processed.input = Object.values(processed.input).join('\n');
        }
      }
      
      // 处理output字段
      if (processed.output) {
        if (Array.isArray(processed.output)) {
          // 数组格式转换为字符串
          processed.output = processed.output.join('\n');
        } else if (typeof processed.output === 'object') {
          // 对象格式转换为字符串
          processed.output = Object.values(processed.output).join('\n');
        }
      }
      
      return processed;
    };
    
    // 添加字符串转数组格式处理函数
    const processStringToArray = (data) => {
      if (!data || typeof data !== 'object') {
        return data;
      }
      
      const processed = { ...data };
      
      // 处理input字段 - 字符串转数组
      if (processed.input && typeof processed.input === 'string') {
        if (processed.input.trim()) {
          processed.input = processed.input.split('\n').filter(line => line.trim());
        } else {
          processed.input = [];
        }
      }
      
      // 处理output字段 - 字符串转数组
      if (processed.output && typeof processed.output === 'string') {
        if (processed.output.trim()) {
          processed.output = processed.output.split('\n').filter(line => line.trim());
        } else {
          processed.output = [];
        }
      }
      
      return processed;
    };
    
    // 添加数据验证函数
    const validateCardData = (data) => {
      const errors = [];
      
      // 验证基本字段
      if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
        errors.push('卡片标题不能为空');
      }
      
      if (!data.description || typeof data.description !== 'string' || data.description.trim() === '') {
        errors.push('卡片描述不能为空');
      }
      
      // 验证input字段
      if (data.input) {
        if (Array.isArray(data.input)) {
          // 验证数组格式
          data.input.forEach((item, index) => {
            if (typeof item !== 'string') {
              errors.push(`输入要求第${index + 1}项格式不正确`);
            }
          });
        } else if (typeof data.input !== 'string') {
          errors.push('输入要求格式不正确');
        }
      }
      
      // 验证output字段
      if (data.output) {
        if (Array.isArray(data.output)) {
          // 验证数组格式
          data.output.forEach((item, index) => {
            if (typeof item !== 'string') {
              errors.push(`输出要求第${index + 1}项格式不正确`);
            }
          });
        } else if (typeof data.output !== 'string') {
          errors.push('输出要求格式不正确');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    };

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

        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          formData.features.splice(index, 1);
          renderFeatures();
        });

        featureItem.appendChild(iconInput);
        featureItem.appendChild(nameInput);
        featureItem.appendChild(descInput);
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

    // 初始化功能特性渲染
    renderFeatures();

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

    // 初始化统计数据渲染
    renderStats();

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
        tagInput.value = tag.name || tag || '';
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
          if (typeof tag === 'string') {
            formData.tags[index] = { name: e.target.value };
          } else {
            formData.tags[index].name = e.target.value;
          }
        });

        tagInput.addEventListener('blur', (e) => {
          const tagName = (e.target.value || '').trim();
          if (!tagName) {
            formData.tags.splice(index, 1);
            renderTags();
            return;
          }
          const duplicateIndex = formData.tags.findIndex((t, i) => i !== index && (t.name || t || '').trim().toLowerCase() === tagName.toLowerCase());
          if (duplicateIndex !== -1) {
            showError(`标签 "${tagName}" 已存在`);
            formData.tags.splice(index, 1);
            renderTags();
            return;
          }
          if (typeof tag === 'string') {
            formData.tags[index] = { name: tagName };
          } else {
            formData.tags[index].name = tagName;
          }
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
      formData.tags.push({ name: '' });
      renderTags();
    });

    tagsContainer.appendChild(tagsTitle);
    tagsContainer.appendChild(tagsList);
    tagsContainer.appendChild(addTagBtn);

    // 操作按钮
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      align-items: center;
      margin-top: 32px;
      padding: 20px 24px;
      border-top: 2px solid var(--border-primary, #333);
      position: sticky;
      bottom: 0;
      background: linear-gradient(180deg, 
        rgba(26, 26, 26, 0.95) 0%, 
        rgba(26, 26, 26, 0.98) 50%, 
        rgba(26, 26, 26, 1) 100%);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      z-index: 20;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    `;

    const createButton = document.createElement('button');
    createButton.textContent = '创建卡片';
    createButton.type = 'button';
    createButton.style.cssText = `
      background: var(--success, #28a745);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
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
      padding: 14px 28px;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    `;

    console.log('[CreateCardPlugin] 按钮元素已创建:', { createButton, cancelButton });

    createButton.addEventListener('click', async () => {
      try {
        console.log('[CreateCardPlugin] 点击创建按钮');
        
        if (!formData.title || !formData.description) {
          showError('标题和描述为必填字段');
          return;
        }

        createButton.disabled = true;
        cancelButton.disabled = true;

        // 创建新卡片对象
        const newCard = {
          ...formData,
          key: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 处理数组格式兼容性
        const processedCard = processStringToArray(newCard);
        console.log('[CreateCardPlugin] 准备创建卡片:', processedCard);
        
        // 验证数据格式
        const validation = validateCardData(processedCard);
        if (!validation.isValid) {
          console.error('[CreateCardPlugin] 数据验证失败:', validation.errors);
          showError(`数据格式错误: ${validation.errors.join(', ')}`);
          return;
        }

        // 保存到数据库
        try {
          const { postData } = await import('/apis/index.js');
          const url = `${window.API_URL}/mongodb/?cname=goals`;
          const payload = {
            key: processedCard.key,
            title: processedCard.title,
            description: processedCard.description,
            icon: processedCard.icon || 'fas fa-plus',
            badge: processedCard.badge || '新建',
            hint: processedCard.hint || '点击进入功能',
            input: processedCard.input || [],
            output: processedCard.output || [],
            footerIcon: newCard.footerIcon || 'fas fa-arrow-right',
            features: newCard.features || [],
            stats: newCard.stats || [],
            tags: newCard.tags || [],
            year: newCard.year || '',
            quarter: newCard.quarter || '',
            month: newCard.month || '',
            week: newCard.week || '',
            day: newCard.day || '',
            createdAt: newCard.createdAt,
            updatedAt: newCard.updatedAt
          };
          
          console.log('[CreateCardPlugin] 发送到数据库:', payload);
          await postData(url, payload);
          
          modal.remove();
          showSuccess(`卡片"${newCard.title}"已创建`);

          // 刷新数据
          if (store && typeof store.loadFeatureCards === 'function') {
            setTimeout(() => {
              store.loadFeatureCards().catch(() => {});
            }, 300);
          }
        } catch (dbError) {
          console.error('[CreateCardPlugin] 数据库保存失败:', dbError);
          showError('数据库保存失败，请稍后重试');
        }
      } catch (err) {
        console.error('[CreateCardPlugin] 创建失败:', err);
        showError('创建失败，请稍后重试');
      } finally {
        createButton.disabled = false;
        cancelButton.disabled = false;
      }
    });

    cancelButton.addEventListener('click', closeModal);

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(createButton);

    console.log('[CreateCardPlugin] 按钮已添加到按钮容器');

    // 组装 - 时间属性在基础字段容器内的第一位，与编辑卡片一致
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

    // 初始渲染
    renderFeatures();
    renderStats();
    renderTags();

    console.log('[CreateCardPlugin] 弹框已添加到DOM');
    console.log('[CreateCardPlugin] 弹框元素:', modal);
    console.log('[CreateCardPlugin] 弹框内容:', modalContent);

    // 锁定滚动
    try {
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } catch (_) {}

    // 聚焦第一个输入框
    const firstInput = form.querySelector('input, textarea');
    if (firstInput) {
      firstInput.focus();
      console.log('[CreateCardPlugin] 已聚焦到第一个输入框:', firstInput);
    } else {
      console.warn('[CreateCardPlugin] 未找到第一个输入框');
    }

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

    console.log('[CreateCardPlugin] 弹框设置完成');
    console.log('[CreateCardPlugin] 弹框应该现在可见');

  } catch (error) {
    console.error('[CreateCardPlugin] 打开创建界面失败:', error);
    showError('创建创建界面失败，请稍后重试');
  }
}

console.log('[CreateCardPlugin] 插件加载完成，openCreateCardModal函数已导出');

