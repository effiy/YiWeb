/**
 * YiTable - 表格组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiTable',
  html: '/cdn/components/common/data-display/YiTable/template.html',
  css: '/cdn/components/common/data-display/YiTable/index.css',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      default: () => []
    },
    stripe: {
      type: Boolean,
      default: false
    },
    border: {
      type: Boolean,
      default: false
    },
    hover: {
      type: Boolean,
      default: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    emptyText: {
      type: String,
      default: '暂无数据'
    },
    rowKey: {
      type: String,
      default: 'id'
    },
    height: {
      type: [String, Number],
      default: null
    },
    maxHeight: {
      type: [String, Number],
      default: null
    },
    size: {
      type: String,
      default: 'default', // small, default, large
      validator: (value) => ['small', 'default', 'large'].includes(value)
    },
    showHeader: {
      type: Boolean,
      default: true
    },
    highlightCurrentRow: {
      type: Boolean,
      default: false
    },
    currentRowKey: {
      type: [String, Number],
      default: null
    },
    selectable: {
      type: Boolean,
      default: false
    },
    selectedRows: {
      type: Array,
      default: () => []
    }
  },
  emits: ['row-click', 'row-dblclick', 'selection-change', 'sort-change', 'update:selectedRows'],
  data() {
    return {
      internalSelectedRows: [...this.selectedRows],
      sortColumn: null,
      sortOrder: null, // asc, desc
      currentRow: null
    };
  },
  computed: {
    tableClass() {
      return [
        'yi-table',
        `yi-table--${this.size}`,
        {
          'yi-table--stripe': this.stripe,
          'yi-table--border': this.border,
          'yi-table--hover': this.hover,
          'yi-table--loading': this.loading
        }
      ];
    },
    tableStyle() {
      const style = {};
      if (this.height) {
        style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
      }
      if (this.maxHeight) {
        style.maxHeight = typeof this.maxHeight === 'number' ? `${this.maxHeight}px` : this.maxHeight;
      }
      return style;
    },
    sortedData() {
      if (!this.sortColumn || !this.sortOrder) {
        return this.data;
      }

      const column = this.columns.find(col => col.prop === this.sortColumn);
      if (!column) return this.data;

      return [...this.data].sort((a, b) => {
        let aVal = this.getValueByPath(a, column.prop);
        let bVal = this.getValueByPath(b, column.prop);

        // 自定义排序函数
        if (column.sortMethod) {
          return column.sortMethod(a, b, this.sortOrder);
        }

        // 默认排序
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const result = aVal > bVal ? 1 : -1;
        return this.sortOrder === 'asc' ? result : -result;
      });
    },
    allSelected() {
      return this.data.length > 0 && this.internalSelectedRows.length === this.data.length;
    },
    someSelected() {
      return this.internalSelectedRows.length > 0 && this.internalSelectedRows.length < this.data.length;
    }
  },
  watch: {
    selectedRows(val) {
      this.internalSelectedRows = [...val];
    },
    currentRowKey(val) {
      if (val !== null) {
        this.currentRow = this.data.find(row => row[this.rowKey] === val);
      } else {
        this.currentRow = null;
      }
    }
  },
  methods: {
    getValueByPath(obj, path) {
      const keys = path.split('.');
      let value = obj;
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return undefined;
        }
      }
      return value;
    },
    handleRowClick(row, index) {
      if (this.highlightCurrentRow) {
        this.currentRow = row;
      }
      this.$emit('row-click', row, index);
    },
    handleRowDblClick(row, index) {
      this.$emit('row-dblclick', row, index);
    },
    handleSelectAll() {
      if (this.allSelected) {
        this.internalSelectedRows = [];
      } else {
        this.internalSelectedRows = [...this.data];
      }
      this.$emit('update:selectedRows', this.internalSelectedRows);
      this.$emit('selection-change', this.internalSelectedRows);
    },
    handleSelectRow(row) {
      const index = this.internalSelectedRows.findIndex(r => r[this.rowKey] === row[this.rowKey]);
      if (index > -1) {
        this.internalSelectedRows.splice(index, 1);
      } else {
        this.internalSelectedRows.push(row);
      }
      this.$emit('update:selectedRows', this.internalSelectedRows);
      this.$emit('selection-change', this.internalSelectedRows);
    },
    isRowSelected(row) {
      return this.internalSelectedRows.some(r => r[this.rowKey] === row[this.rowKey]);
    },
    isCurrentRow(row) {
      return this.currentRow && this.currentRow[this.rowKey] === row[this.rowKey];
    },
    handleSort(column) {
      if (!column.sortable) return;

      if (this.sortColumn === column.prop) {
        // 切换排序顺序: asc -> desc -> null
        if (this.sortOrder === 'asc') {
          this.sortOrder = 'desc';
        } else if (this.sortOrder === 'desc') {
          this.sortOrder = null;
          this.sortColumn = null;
        }
      } else {
        this.sortColumn = column.prop;
        this.sortOrder = 'asc';
      }

      this.$emit('sort-change', {
        column: this.sortColumn,
        order: this.sortOrder
      });
    },
    getSortClass(column) {
      if (!column.sortable) return '';
      if (this.sortColumn !== column.prop) return 'sortable';
      return `sortable sorting-${this.sortOrder}`;
    },
    clearSelection() {
      this.internalSelectedRows = [];
      this.$emit('update:selectedRows', this.internalSelectedRows);
      this.$emit('selection-change', this.internalSelectedRows);
    },
    toggleRowSelection(row, selected) {
      const index = this.internalSelectedRows.findIndex(r => r[this.rowKey] === row[this.rowKey]);
      if (selected && index === -1) {
        this.internalSelectedRows.push(row);
      } else if (!selected && index > -1) {
        this.internalSelectedRows.splice(index, 1);
      }
      this.$emit('update:selectedRows', this.internalSelectedRows);
      this.$emit('selection-change', this.internalSelectedRows);
    },
    setCurrentRow(row) {
      this.currentRow = row;
    }
  }
});
