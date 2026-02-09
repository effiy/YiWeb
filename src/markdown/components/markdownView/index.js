import { registerGlobalComponent } from '/src/utils/componentLoader.js';
import { renderMarkdownHtml, renderStreamingHtml } from '/src/markdown/index.js';

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
        }
    },
    computed: {
        rawContent() {
            return this.content == null ? '' : String(this.content);
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
        <div class="md-view">
            <div v-html="renderedHtml"></div>
        </div>
    `
};

registerGlobalComponent(componentOptions);
