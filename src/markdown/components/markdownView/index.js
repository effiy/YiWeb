import { registerGlobalComponent } from '/src/utils/componentLoader.js';
import { getMarkdownToc, renderMarkdownHtml, renderStreamingHtml } from '/src/markdown/index.js';
import '/src/markdown/components/markdownToc/index.js';

const componentOptions = {
    name: 'MarkdownView',
    props: {
        content: {
            type: [String, Number, Object, Array],
            default: ''
        },
        mode: {
            type: String,
            default: 'markdown'
        },
        breaks: {
            type: Boolean,
            default: true
        },
        gfm: {
            type: Boolean,
            default: true
        },
        showToc: {
            type: Boolean,
            default: false
        },
        tocTitle: {
            type: String,
            default: '目录'
        },
        tocMinDepth: {
            type: Number,
            default: 2
        },
        tocMaxDepth: {
            type: Number,
            default: 4
        }
    },
    computed: {
        rawContent() {
            return this.content == null ? '' : String(this.content);
        },
        tocItems() {
            if (!this.showToc) return [];
            const raw = this.rawContent;
            if (!raw) return [];
            return getMarkdownToc(raw, { minDepth: this.tocMinDepth, maxDepth: this.tocMaxDepth });
        },
        renderedHtml() {
            const raw = this.rawContent;
            if (!raw) return '';
            if (String(this.mode || '').toLowerCase() === 'streaming') {
                return renderStreamingHtml(raw);
            }
            return renderMarkdownHtml(raw, { breaks: this.breaks, gfm: this.gfm });
        }
    },
    template: `
        <div class="md-view" :class="{ 'md-view--with-toc': showToc }">
            <markdown-toc v-if="showToc" :items="tocItems" :title="tocTitle"></markdown-toc>
            <div v-html="renderedHtml"></div>
        </div>
    `
};

registerGlobalComponent(componentOptions);
