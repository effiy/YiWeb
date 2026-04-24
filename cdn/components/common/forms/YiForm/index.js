/**
 * YiForm - 表单组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { FormManager } from '/cdn/utils/core/form.js';

registerGlobalComponent({
  name: 'YiForm',
  html: '/cdn/components/common/forms/YiForm/template.html',
  css: '/cdn/components/common/forms/YiForm/index.css',
  props: {
    modelValue: {
      type: Object,
      default: () => ({})
    },
    rules: {
      type: Object,
      default: () => ({})
    },
    labelWidth: {
      type: String,
      default: '100px'
    },
    labelPosition: {
      type: String,
      default: 'right', // right, left, top
      validator: (value) => ['right', 'left', 'top'].includes(value)
    },
    inline: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    showMessage: {
      type: Boolean,
      default: true
    },
    validateOnChange: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'submit', 'reset', 'validate'],
  data() {
    return {
      formManager: null,
      fields: []
    };
  },
  computed: {
    formClass() {
      return [
        'yi-form',
        `yi-form--label-${this.labelPosition}`,
        {
          'yi-form--inline': this.inline,
          'yi-form--disabled': this.disabled
        }
      ];
    },
    formStyle() {
      return {
        '--label-width': this.labelWidth
      };
    }
  },
  watch: {
    modelValue: {
      handler(newVal) {
        if (this.formManager) {
          Object.keys(newVal).forEach(key => {
            this.formManager.setValue(key, newVal[key]);
          });
        }
      },
      deep: true
    }
  },
  mounted() {
    this.formManager = new FormManager(this.modelValue, this.rules);

    // 监听字段变化
    if (this.validateOnChange) {
      this.$watch(() => this.formManager.data, (newVal) => {
        this.$emit('update:modelValue', newVal);
      }, { deep: true });
    }
  },
  methods: {
    /**
     * 注册表单字段
     */
    registerField(field) {
      this.fields.push(field);
    },

    /**
     * 注销表单字段
     */
    unregisterField(field) {
      const index = this.fields.indexOf(field);
      if (index > -1) {
        this.fields.splice(index, 1);
      }
    },

    /**
     * 验证表单
     */
    async validate() {
      const isValid = this.formManager.validate();

      // 更新所有字段的错误状态
      this.fields.forEach(field => {
        const error = this.formManager.getError(field.prop);
        field.setError(error);
      });

      this.$emit('validate', isValid, this.formManager.getErrors());
      return isValid;
    },

    /**
     * 验证指定字段
     */
    async validateField(fieldName) {
      const isValid = this.formManager.validateField(fieldName);

      // 更新字段错误状态
      const field = this.fields.find(f => f.prop === fieldName);
      if (field) {
        const error = this.formManager.getError(fieldName);
        field.setError(error);
      }

      return isValid;
    },

    /**
     * 清除验证
     */
    clearValidate(fieldName) {
      if (fieldName) {
        this.formManager.clearErrors(fieldName);
        const field = this.fields.find(f => f.prop === fieldName);
        if (field) {
          field.setError(null);
        }
      } else {
        this.formManager.clearErrors();
        this.fields.forEach(field => field.setError(null));
      }
    },

    /**
     * 重置表单
     */
    reset() {
      this.formManager.reset();
      this.$emit('update:modelValue', this.formManager.getData());
      this.clearValidate();
      this.$emit('reset');
    },

    /**
     * 提交表单
     */
    async submit() {
      const isValid = await this.validate();
      if (isValid) {
        this.$emit('submit', this.formManager.getData());
      }
      return isValid;
    },

    /**
     * 获取表单数据
     */
    getData() {
      return this.formManager.getData();
    },

    /**
     * 设置表单数据
     */
    setData(data) {
      Object.keys(data).forEach(key => {
        this.formManager.setValue(key, data[key]);
      });
      this.$emit('update:modelValue', this.formManager.getData());
    }
  }
});
