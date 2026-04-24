/**
 * YiPagination - 分页组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiPagination',
  html: '/cdn/components/common/navigation/YiPagination/template.html',
  css: '/cdn/components/common/navigation/YiPagination/index.css',
  props: {
    total: {
      type: Number,
      required: true,
      default: 0
    },
    pageSize: {
      type: Number,
      default: 10
    },
    currentPage: {
      type: Number,
      default: 1
    },
    pageSizes: {
      type: Array,
      default: () => [10, 20, 50, 100]
    },
    layout: {
      type: String,
      default: 'total, sizes, prev, pager, next, jumper'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    hideOnSinglePage: {
      type: Boolean,
      default: false
    },
    pagerCount: {
      type: Number,
      default: 7,
      validator: (value) => value >= 5 && value <= 21 && value % 2 === 1
    },
    prevText: {
      type: String,
      default: ''
    },
    nextText: {
      type: String,
      default: ''
    },
    small: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:currentPage', 'update:pageSize', 'change', 'size-change', 'current-change'],
  data() {
    return {
      internalCurrentPage: this.currentPage,
      internalPageSize: this.pageSize,
      jumperValue: ''
    };
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.internalPageSize);
    },
    paginationClass() {
      return [
        'yi-pagination',
        {
          'yi-pagination--small': this.small,
          'yi-pagination--disabled': this.disabled
        }
      ];
    },
    layoutComponents() {
      return this.layout.split(',').map(item => item.trim());
    },
    showPagination() {
      if (this.hideOnSinglePage && this.totalPages <= 1) {
        return false;
      }
      return true;
    },
    pagers() {
      const pagerCount = this.pagerCount;
      const halfPagerCount = (pagerCount - 1) / 2;
      const currentPage = this.internalCurrentPage;
      const totalPages = this.totalPages;

      let showPrevMore = false;
      let showNextMore = false;
      let array = [];

      if (totalPages > pagerCount) {
        if (currentPage > pagerCount - halfPagerCount) {
          showPrevMore = true;
        }
        if (currentPage < totalPages - halfPagerCount) {
          showNextMore = true;
        }
      }

      if (showPrevMore && !showNextMore) {
        const startPage = totalPages - (pagerCount - 2);
        for (let i = startPage; i < totalPages; i++) {
          array.push(i);
        }
      } else if (!showPrevMore && showNextMore) {
        for (let i = 2; i < pagerCount; i++) {
          array.push(i);
        }
      } else if (showPrevMore && showNextMore) {
        const offset = Math.floor(pagerCount / 2) - 1;
        for (let i = currentPage - offset; i <= currentPage + offset; i++) {
          array.push(i);
        }
      } else {
        for (let i = 2; i < totalPages; i++) {
          array.push(i);
        }
      }

      return {
        showPrevMore,
        showNextMore,
        pagers: array
      };
    },
    prevDisabled() {
      return this.disabled || this.internalCurrentPage <= 1;
    },
    nextDisabled() {
      return this.disabled || this.internalCurrentPage >= this.totalPages;
    }
  },
  watch: {
    currentPage(val) {
      this.internalCurrentPage = val;
    },
    pageSize(val) {
      this.internalPageSize = val;
    },
    internalCurrentPage(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('update:currentPage', newVal);
        this.$emit('current-change', newVal);
        this.$emit('change', newVal, this.internalPageSize);
      }
    },
    internalPageSize(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('update:pageSize', newVal);
        this.$emit('size-change', newVal);

        // 调整当前页码
        const newTotalPages = Math.ceil(this.total / newVal);
        if (this.internalCurrentPage > newTotalPages) {
          this.internalCurrentPage = newTotalPages || 1;
        }

        this.$emit('change', this.internalCurrentPage, newVal);
      }
    }
  },
  methods: {
    handlePrev() {
      if (this.prevDisabled) return;
      this.internalCurrentPage = Math.max(1, this.internalCurrentPage - 1);
    },
    handleNext() {
      if (this.nextDisabled) return;
      this.internalCurrentPage = Math.min(this.totalPages, this.internalCurrentPage + 1);
    },
    handlePagerClick(page) {
      if (this.disabled || page === this.internalCurrentPage) return;
      this.internalCurrentPage = page;
    },
    handlePrevMore() {
      if (this.disabled) return;
      this.internalCurrentPage = Math.max(1, this.internalCurrentPage - (this.pagerCount - 2));
    },
    handleNextMore() {
      if (this.disabled) return;
      this.internalCurrentPage = Math.min(this.totalPages, this.internalCurrentPage + (this.pagerCount - 2));
    },
    handleSizeChange(event) {
      if (this.disabled) return;
      this.internalPageSize = Number(event.target.value);
    },
    handleJumperInput(event) {
      this.jumperValue = event.target.value.replace(/\D/g, '');
    },
    handleJumperEnter() {
      if (this.disabled || !this.jumperValue) return;

      let page = Number(this.jumperValue);
      page = Math.max(1, Math.min(this.totalPages, page));

      this.internalCurrentPage = page;
      this.jumperValue = '';
    }
  }
});
