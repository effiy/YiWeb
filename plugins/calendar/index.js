/**
 * 日历插件
 * author: liangliang
 * 
 * 提供日历展示和交互功能
 */

import BasePlugin from '../../js/core/basePlugin.js';

class CalendarPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'calendar',
      version: '1.0.0',
      ...options
    });

    this.currentDate = new Date();
    this.selectedDate = null;
    this.events = new Map();
    this.container = null;
    this.calendarGrid = null;
    this.navigationButtons = [];
  }

  /**
   * 初始化插件
   */
  init() {
    super.init();
    
    try {
      this.loadStyles();
      this.createCalendar();
      this.bindEvents();
      this.log('日历插件初始化完成');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 加载样式文件
   */
  loadStyles() {
    const cssFiles = [
      '/plugins/calendar/index.css'
    ];
    
    cssFiles.forEach(cssFile => {
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
        const link = this.createElement('link', {
          rel: 'stylesheet',
          href: cssFile,
          type: 'text/css'
        });
        document.head.appendChild(link);
      }
    });
  }

  /**
   * 创建日历
   */
  createCalendar() {
    // 查找或创建主容器
    let mainContainer = this.findElement('.main-content');
    
    if (!mainContainer) {
      mainContainer = this.createElement('main', {
        className: 'main-content',
        role: 'main'
      });
      
      // 插入到页面中
      const body = document.body;
      const header = this.findElement('.header-row');
      if (header && header.nextSibling) {
        body.insertBefore(mainContainer, header.nextSibling);
      } else {
        body.appendChild(mainContainer);
      }
    }

    // 创建日历容器
    const calendarContainer = this.createElement('div', { className: 'calendar-container' });
    
    // 创建日历头部
    const calendarHeader = this.createCalendarHeader();
    calendarContainer.appendChild(calendarHeader);
    
    // 创建日历网格
    const calendarGrid = this.createCalendarGrid();
    calendarContainer.appendChild(calendarGrid);
    
    // 清空并添加新内容
    mainContainer.innerHTML = '';
    mainContainer.appendChild(calendarContainer);
    
    this.container = calendarContainer;
    this.calendarGrid = calendarGrid;
  }

  /**
   * 创建日历头部
   */
  createCalendarHeader() {
    const header = this.createElement('div', { className: 'calendar-header' });
    
    // 上一月按钮
    const prevButton = this.createElement('button', {
      className: 'nav-btn prev-btn',
      'aria-label': '上一月'
    });
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    
    // 当前月份显示
    const monthDisplay = this.createElement('div', { className: 'month-display' });
    monthDisplay.textContent = this.getMonthYearString();
    
    // 下一月按钮
    const nextButton = this.createElement('button', {
      className: 'nav-btn next-btn',
      'aria-label': '下一月'
    });
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    
    header.appendChild(prevButton);
    header.appendChild(monthDisplay);
    header.appendChild(nextButton);
    
    this.navigationButtons = [prevButton, nextButton];
    this.monthDisplay = monthDisplay;
    
    return header;
  }

  /**
   * 创建日历网格
   */
  createCalendarGrid() {
    const grid = this.createElement('div', {
      className: 'calendar-grid',
      role: 'grid',
      'aria-label': '日历网格'
    });
    
    // 创建星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekdayHeader = this.createElement('div', { className: 'weekday-header' });
    
    weekdays.forEach(day => {
      const weekdayCell = this.createElement('div', {
        className: 'weekday-cell',
        role: 'columnheader'
      });
      weekdayCell.textContent = day;
      weekdayHeader.appendChild(weekdayCell);
    });
    
    grid.appendChild(weekdayHeader);
    
    // 创建日期网格
    const dateGrid = this.createElement('div', { className: 'date-grid' });
    grid.appendChild(dateGrid);
    
    this.dateGrid = dateGrid;
    
    return grid;
  }

  /**
   * 渲染日历
   */
  renderCalendar() {
    if (!this.dateGrid) return;

    this.dateGrid.innerHTML = '';
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // 获取月份的第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取上个月的最后几天
    const firstDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0);
    
    // 创建日期单元格
    let dayCount = 1;
    const totalCells = 42; // 6行 x 7列
    
    for (let i = 0; i < totalCells; i++) {
      const dateCell = this.createElement('div', {
        className: 'date-cell',
        role: 'gridcell'
      });
      
      let cellDate = null;
      let isCurrentMonth = false;
      let isToday = false;
      let isSelected = false;
      
      // 上个月的日期
      if (i < firstDayOfWeek) {
        const prevMonthDay = prevMonthLastDay.getDate() - (firstDayOfWeek - i - 1);
        cellDate = new Date(year, month - 1, prevMonthDay);
        this.addClass(dateCell, 'prev-month');
      }
      // 当前月的日期
      else if (dayCount <= lastDay.getDate()) {
        cellDate = new Date(year, month, dayCount);
        isCurrentMonth = true;
        this.addClass(dateCell, 'current-month');
        
        // 检查是否是今天
        const today = new Date();
        if (cellDate.toDateString() === today.toDateString()) {
          isToday = true;
          this.addClass(dateCell, 'today');
        }
        
        // 检查是否是选中日期
        if (this.selectedDate && cellDate.toDateString() === this.selectedDate.toDateString()) {
          isSelected = true;
          this.addClass(dateCell, 'selected');
        }
        
        dayCount++;
      }
      // 下个月的日期
      else {
        const nextMonthDay = i - firstDayOfWeek - lastDay.getDate() + 1;
        cellDate = new Date(year, month + 1, nextMonthDay);
        this.addClass(dateCell, 'next-month');
      }
      
      // 设置日期内容
      const dateNumber = this.createElement('span', { className: 'date-number' });
      dateNumber.textContent = cellDate.getDate();
      dateCell.appendChild(dateNumber);
      
      // 添加事件
      if (isCurrentMonth) {
        this.addEvent(dateCell, 'click', () => {
          this.selectDate(cellDate);
        });
        
        // 添加键盘支持
        dateCell.setAttribute('tabindex', '0');
        this.addEvent(dateCell, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectDate(cellDate);
          }
        });
      }
      
      this.dateGrid.appendChild(dateCell);
    }
    
    // 更新月份显示
    if (this.monthDisplay) {
      this.monthDisplay.textContent = this.getMonthYearString();
    }
  }

  /**
   * 获取月份年份字符串
   */
  getMonthYearString() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    return `${monthNames[month]} ${year}`;
  }

  /**
   * 选择日期
   */
  selectDate(date) {
    this.selectedDate = date;
    this.log(`选择日期: ${date.toDateString()}`);
    
    // 更新选中状态
    const dateCells = this.findElements('.date-cell');
    dateCells.forEach(cell => {
      this.removeClass(cell, 'selected');
    });
    
    const selectedCell = this.findElement(`[data-date="${date.toDateString()}"]`);
    if (selectedCell) {
      this.addClass(selectedCell, 'selected');
    }
    
    // 触发事件
    this.emit('date-select', {
      date: date,
      timestamp: Date.now()
    });
  }

  /**
   * 导航到上一月
   */
  goToPreviousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
    this.emit('month-change', {
      direction: 'prev',
      date: new Date(this.currentDate)
    });
  }

  /**
   * 导航到下一月
   */
  goToNextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
    this.emit('month-change', {
      direction: 'next',
      date: new Date(this.currentDate)
    });
  }

  /**
   * 导航到今天
   */
  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.renderCalendar();
    this.emit('go-to-today', {
      date: new Date(this.currentDate)
    });
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 导航按钮事件
    if (this.navigationButtons.length >= 2) {
      const [prevButton, nextButton] = this.navigationButtons;
      
      this.addEvent(prevButton, 'click', () => {
        this.goToPreviousMonth();
      });
      
      this.addEvent(nextButton, 'click', () => {
        this.goToNextMonth();
      });
    }

    // 键盘导航
    this.addEvent(document, 'keydown', (e) => {
      if (e.target.closest('.calendar-container')) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            this.goToPreviousMonth();
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.goToNextMonth();
            break;
          case 'Home':
            e.preventDefault();
            this.goToToday();
            break;
        }
      }
    });
  }

  /**
   * 添加事件
   */
  addEvent(date, eventData) {
    const dateString = date.toDateString();
    if (!this.events.has(dateString)) {
      this.events.set(dateString, []);
    }
    this.events.get(dateString).push(eventData);
    this.renderCalendar();
  }

  /**
   * 移除事件
   */
  removeEvent(date, eventId) {
    const dateString = date.toDateString();
    const events = this.events.get(dateString);
    if (events) {
      const index = events.findIndex(event => event.id === eventId);
      if (index !== -1) {
        events.splice(index, 1);
        this.renderCalendar();
      }
    }
  }

  /**
   * 获取选中日期
   */
  getSelectedDate() {
    return this.selectedDate ? new Date(this.selectedDate) : null;
  }

  /**
   * 设置当前日期
   */
  setCurrentDate(date) {
    this.currentDate = new Date(date);
    this.renderCalendar();
  }

  /**
   * 获取当前日期
   */
  getCurrentDate() {
    return new Date(this.currentDate);
  }

  /**
   * 获取事件
   */
  getEvents(date) {
    const dateString = date.toDateString();
    return this.events.get(dateString) || [];
  }

  /**
   * 获取所有事件
   */
  getAllEvents() {
    return new Map(this.events);
  }

  /**
   * 销毁插件
   */
  destroy() {
    // 清理事件
    this.events.clear();
    
    // 清理导航按钮
    this.navigationButtons = [];
    
    super.destroy();
  }

  /**
   * 触发自定义事件
   */
  emit(eventName, data) {
    const event = new CustomEvent(`calendar:${eventName}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

export default CalendarPlugin; 