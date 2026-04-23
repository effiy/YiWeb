/**
 * 表单验证和处理工具
 * @author liangliang
 */

/**
 * 表单验证规则
 */
export const validators = {
  required: (message = '此字段为必填项') => (value) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return true;
  },

  minLength: (min, message) => (value) => {
    if (!value) return true;
    if (value.length < min) {
      return message || `最少需要 ${min} 个字符`;
    }
    return true;
  },

  maxLength: (max, message) => (value) => {
    if (!value) return true;
    if (value.length > max) {
      return message || `最多允许 ${max} 个字符`;
    }
    return true;
  },

  min: (min, message) => (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (Number(value) < min) {
      return message || `最小值为 ${min}`;
    }
    return true;
  },

  max: (max, message) => (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (Number(value) > max) {
      return message || `最大值为 ${max}`;
    }
    return true;
  },

  email: (message = '请输入有效的邮箱地址') => (value) => {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || message;
  },

  phone: (message = '请输入有效的手机号码') => (value) => {
    if (!value) return true;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value) || message;
  },

  url: (message = '请输入有效的URL') => (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return message;
    }
  },

  pattern: (regex, message = '格式不正确') => (value) => {
    if (!value) return true;
    return regex.test(value) || message;
  },

  custom: (fn, message = '验证失败') => (value) => {
    return fn(value) || message;
  },

  match: (fieldName, message) => (value, formData) => {
    if (!value) return true;
    if (value !== formData[fieldName]) {
      return message || `必须与 ${fieldName} 匹配`;
    }
    return true;
  }
};

/**
 * 表单验证器类
 */
export class FormValidator {
  constructor(rules = {}) {
    this.rules = rules;
    this.errors = {};
  }

  /**
   * 验证单个字段
   */
  validateField(fieldName, value, formData = {}) {
    const fieldRules = this.rules[fieldName];
    if (!fieldRules) return true;

    const rules = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

    for (const rule of rules) {
      const result = rule(value, formData);
      if (result !== true) {
        this.errors[fieldName] = result;
        return false;
      }
    }

    delete this.errors[fieldName];
    return true;
  }

  /**
   * 验证整个表单
   */
  validate(formData) {
    this.errors = {};
    let isValid = true;

    for (const fieldName in this.rules) {
      const fieldValid = this.validateField(fieldName, formData[fieldName], formData);
      if (!fieldValid) {
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * 获取字段错误
   */
  getError(fieldName) {
    return this.errors[fieldName];
  }

  /**
   * 获取所有错误
   */
  getErrors() {
    return { ...this.errors };
  }

  /**
   * 清除错误
   */
  clearErrors(fieldName) {
    if (fieldName) {
      delete this.errors[fieldName];
    } else {
      this.errors = {};
    }
  }

  /**
   * 是否有错误
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
}

/**
 * 表单状态管理器
 */
export class FormManager {
  constructor(initialData = {}, rules = {}) {
    this.data = { ...initialData };
    this.initialData = { ...initialData };
    this.validator = new FormValidator(rules);
    this.touched = {};
    this.dirty = {};
  }

  /**
   * 设置字段值
   */
  setValue(fieldName, value) {
    this.data[fieldName] = value;
    this.dirty[fieldName] = true;
  }

  /**
   * 获取字段值
   */
  getValue(fieldName) {
    return this.data[fieldName];
  }

  /**
   * 获取所有数据
   */
  getData() {
    return { ...this.data };
  }

  /**
   * 标记字段为已触摸
   */
  setTouched(fieldName, touched = true) {
    this.touched[fieldName] = touched;
  }

  /**
   * 字段是否已触摸
   */
  isTouched(fieldName) {
    return !!this.touched[fieldName];
  }

  /**
   * 字段是否已修改
   */
  isDirty(fieldName) {
    return !!this.dirty[fieldName];
  }

  /**
   * 表单是否已修改
   */
  isFormDirty() {
    return Object.keys(this.dirty).length > 0;
  }

  /**
   * 验证字段
   */
  validateField(fieldName) {
    return this.validator.validateField(fieldName, this.data[fieldName], this.data);
  }

  /**
   * 验证表单
   */
  validate() {
    return this.validator.validate(this.data);
  }

  /**
   * 获取字段错误
   */
  getError(fieldName) {
    return this.validator.getError(fieldName);
  }

  /**
   * 重置表单
   */
  reset() {
    this.data = { ...this.initialData };
    this.touched = {};
    this.dirty = {};
    this.validator.clearErrors();
  }

  /**
   * 重置字段
   */
  resetField(fieldName) {
    this.data[fieldName] = this.initialData[fieldName];
    delete this.touched[fieldName];
    delete this.dirty[fieldName];
    this.validator.clearErrors(fieldName);
  }

  /**
   * 提交表单
   */
  async submit(onSubmit) {
    // 标记所有字段为已触摸
    Object.keys(this.data).forEach(key => {
      this.touched[key] = true;
    });

    // 验证表单
    if (!this.validate()) {
      return { success: false, errors: this.validator.getErrors() };
    }

    try {
      const result = await onSubmit(this.getData());
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error };
    }
  }
}

/**
 * 创建表单管理器
 */
export function createForm(initialData = {}, rules = {}) {
  return new FormManager(initialData, rules);
}

/**
 * 表单字段组合器
 */
export function useFormField(form, fieldName) {
  return {
    value: form.getValue(fieldName),
    error: form.getError(fieldName),
    touched: form.isTouched(fieldName),
    dirty: form.isDirty(fieldName),
    setValue: (value) => form.setValue(fieldName, value),
    setTouched: () => form.setTouched(fieldName),
    validate: () => form.validateField(fieldName),
    reset: () => form.resetField(fieldName)
  };
}

/**
 * 表单数据序列化
 */
export function serializeForm(formElement) {
  const formData = new FormData(formElement);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // 处理多选
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }

  return data;
}

/**
 * 表单数据反序列化
 */
export function deserializeForm(data, formElement) {
  for (const [key, value] of Object.entries(data)) {
    const element = formElement.elements[key];
    if (!element) continue;

    if (element.type === 'checkbox') {
      element.checked = !!value;
    } else if (element.type === 'radio') {
      const radio = formElement.querySelector(`input[name="${key}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      element.value = value;
    }
  }
}
