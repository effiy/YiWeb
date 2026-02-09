import { registerGlobalComponent } from '/src/utils/componentLoader.js';

const findScrollContainer = (startEl) => {
    try {
        if (!startEl || typeof window === 'undefined') return window;
        let el = startEl;
        for (let i = 0; i < 12 && el; i += 1) {
            const parent = el.parentElement;
            if (!parent) break;
            const style = window.getComputedStyle(parent);
            const overflowY = String(style.overflowY || style.overflow || '').toLowerCase();
            const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
            if (isScrollable && parent.scrollHeight > parent.clientHeight + 2) return parent;
            el = parent;
        }
        return window;
    } catch (_) {
        return window;
    }
};

registerGlobalComponent({
    name: 'MarkdownToc',
    props: {
        items: {
            type: Array,
            default: () => []
        },
        title: {
            type: String,
            default: '目录'
        },
        offset: {
            type: Number,
            default: 12
        },
        containerSelector: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            activeId: '',
            _scrollEl: null,
            _raf: 0,
            _onScroll: null
        };
    },
    computed: {
        safeItems() {
            const raw = Array.isArray(this.items) ? this.items : [];
            return raw
                .map((it) => ({
                    id: it && it.id ? String(it.id) : '',
                    level: Math.max(1, Math.min(6, Number(it && it.level ? it.level : 0) || 1)),
                    text: it && it.text != null ? String(it.text) : ''
                }))
                .filter((it) => it.id && it.text);
        }
    },
    methods: {
        resolveScrollContainer() {
            if (this.containerSelector) {
                const el = document.querySelector(this.containerSelector);
                if (el) return el;
            }
            return findScrollContainer(this.$el);
        },
        scrollToHeading(id) {
            try {
                const target = document.getElementById(id);
                if (!target) return;

                const container = this._scrollEl || this.resolveScrollContainer();
                const offset = Number(this.offset) || 0;

                if (container === window) {
                    const y = window.scrollY + target.getBoundingClientRect().top - offset;
                    window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
                    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
                    return;
                }

                const containerRect = container.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const y = container.scrollTop + (targetRect.top - containerRect.top) - offset;
                window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
                container.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            } catch (_) { }
        },
        updateActive() {
            try {
                const items = this.safeItems;
                if (!items.length) {
                    this.activeId = '';
                    return;
                }

                const container = this._scrollEl || this.resolveScrollContainer();
                const offset = Number(this.offset) || 0;
                let scrollTop = 0;
                let containerTop = 0;

                if (container === window) {
                    scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
                    containerTop = 0;
                } else {
                    scrollTop = container.scrollTop || 0;
                    containerTop = container.getBoundingClientRect().top;
                }

                let active = '';
                for (const it of items) {
                    const el = document.getElementById(it.id);
                    if (!el) continue;
                    const top = container === window
                        ? (window.scrollY + el.getBoundingClientRect().top)
                        : (scrollTop + (el.getBoundingClientRect().top - containerTop));

                    if (top - offset <= scrollTop + 1) active = it.id;
                    else break;
                }
                this.activeId = active || (items[0] && items[0].id) || '';
            } catch (_) { }
        }
    },
    mounted() {
        try {
            this._scrollEl = this.resolveScrollContainer();
            const handler = () => {
                if (this._raf) return;
                this._raf = window.requestAnimationFrame(() => {
                    this._raf = 0;
                    this.updateActive();
                });
            };
            this._onScroll = handler;

            if (this._scrollEl && this._scrollEl !== window) {
                this._scrollEl.addEventListener('scroll', handler, { passive: true });
            } else {
                window.addEventListener('scroll', handler, { passive: true });
            }
            setTimeout(() => this.updateActive(), 0);
        } catch (_) { }
    },
    beforeUnmount() {
        try {
            if (this._raf) window.cancelAnimationFrame(this._raf);
            if (this._scrollEl && this._scrollEl !== window && this._onScroll) {
                this._scrollEl.removeEventListener('scroll', this._onScroll);
            }
            if (this._scrollEl === window && this._onScroll) {
                window.removeEventListener('scroll', this._onScroll);
            }
        } catch (_) { }
    },
    template: `
        <nav class="md-toc" v-if="safeItems.length" aria-label="目录导航">
            <div class="md-toc__title" v-if="title">{{ title }}</div>
            <ul class="md-toc__list">
                <li v-for="it in safeItems" :key="it.id"
                    class="md-toc__item"
                    :class="[('level-' + it.level), { 'is-active': it.id === activeId }]">
                    <a href="javascript:void(0)" class="md-toc__link" @click="scrollToHeading(it.id)">{{ it.text }}</a>
                </li>
            </ul>
        </nav>
    `
});

