import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'YiTooltip',
    html: '/cdn/components/common/data-display/YiTooltip/template.html',
    css: '/cdn/components/common/data-display/YiTooltip/index.css',
    props: {
        content: {
            type: String,
            default: ''
        },
        placement: {
            type: String,
            default: 'top'
        },
        trigger: {
            type: String,
            default: 'hover'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        showArrow: {
            type: Boolean,
            default: true
        },
        offset: {
            type: Number,
            default: 8
        },
        delay: {
            type: Number,
            default: 100
        },
        wrapperClass: {
            type: String,
            default: 'tooltip-wrapper'
        },
        triggerClass: {
            type: String,
            default: 'tooltip-trigger'
        },
        tooltipClass: {
            type: String,
            default: 'tooltip'
        },
        contentClass: {
            type: String,
            default: 'tooltip-content'
        },
        arrowClass: {
            type: String,
            default: 'tooltip-arrow'
        }
    },
    data() {
        return {
            isVisible: false,
            tooltipStyle: {},
            arrowStyle: {},
            showTimer: null,
            hideTimer: null
        };
    },
    methods: {
        onMouseEnter() {
            if (this.disabled || this.trigger !== 'hover') return;
            this.show();
        },
        onMouseLeave() {
            if (this.disabled || this.trigger !== 'hover') return;
            this.hide();
        },
        onFocus() {
            if (this.disabled || this.trigger !== 'focus') return;
            this.show();
        },
        onBlur() {
            if (this.disabled || this.trigger !== 'focus') return;
            this.hide();
        },
        show() {
            clearTimeout(this.hideTimer);

            this.showTimer = setTimeout(() => {
                this.isVisible = true;
                this.$nextTick(() => {
                    this.updatePosition();
                });
            }, this.delay);
        },
        hide() {
            clearTimeout(this.showTimer);

            this.hideTimer = setTimeout(() => {
                this.isVisible = false;
            }, this.delay);
        },
        updatePosition() {
            if (!this.$refs.trigger || !this.$refs.tooltip) return;

            const triggerRect = this.$refs.trigger.getBoundingClientRect();
            const tooltipRect = this.$refs.tooltip.getBoundingClientRect();

            let top = 0;
            let left = 0;

            switch (this.placement) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - this.offset;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = triggerRect.bottom + this.offset;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.left - tooltipRect.width - this.offset;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.right + this.offset;
                    break;
            }

            this.tooltipStyle = {
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 10000
            };

            this.updateArrowPosition();
        },
        updateArrowPosition() {
            const arrowSize = 6;

            switch (this.placement) {
                case 'top':
                    this.arrowStyle = {
                        bottom: `-${arrowSize}px`,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)'
                    };
                    break;
                case 'bottom':
                    this.arrowStyle = {
                        top: `-${arrowSize}px`,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)'
                    };
                    break;
                case 'left':
                    this.arrowStyle = {
                        right: `-${arrowSize}px`,
                        top: '50%',
                        transform: 'translateY(-50%) rotate(45deg)'
                    };
                    break;
                case 'right':
                    this.arrowStyle = {
                        left: `-${arrowSize}px`,
                        top: '50%',
                        transform: 'translateY(-50%) rotate(45deg)'
                    };
                    break;
            }
        }
    },
    beforeUnmount() {
        clearTimeout(this.showTimer);
        clearTimeout(this.hideTimer);
    }
});
