/**
 * YiFormItem - 表单项组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiFormItem',
  html: '/cdn/components/common/forms/YiFormItem/template.html',
  css: '/cdn/components/common/forms/YiFormItem/index.css',
  props: {
    label: {
      type: String,
      default: ''
    },
    prop: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    showMessage: {
      type: Boolean,
      default: true
    },
    labelWidth: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      errorMessage: this.error,
      form: null
    };
  },
  computed: {
    formItemClass() {
      return [
        'yi-form-item',
        {
          'yi-form-item--required': this.required,
          'yi-form-item--error': this.hasError
        }
      ];
    },
    hasError() {
      return !!this.errorMessage;
    },
    labelStyle() {
      if (this.labelWidth) {
        return { width: this.labelWidth };
      }
      return {};
    }
  },
  watch: {
    error(newVal) {
      this.errorMessage = newVal;
    }
  },
  mounted() {
    // 查找父表单组件
    let parent = this.$parent;
    while (parent) {
      if (parent.$options.name === 'YiForm') {
        this.form = parent;
        this.form.registerField(this);
        break;
      }
      parent = parent.$parent;
    }
  },
  beforeUnmount() {
    if (this.form) {
      this.form.unregisterField(this);
    }
  },
  methods: {
    /**
     * 设置错误信息
     */
    setError(error) {
      this.errorMessage = error || '';
    },

    /**
     * 清除错误
     */
    clearError() {
      this.errorMessage = '';
    },

    /**
     * 验证字段
     */
    validate() {
      if (this.form && this.prop) {
        return this.form.validateField(this.prop);
      }
      return true;
    }
  }
});
