/**
 * Markdown View Component
 * Wrapper for the new markdown renderer with backward compatibility
 */

import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { renderMarkdownHtml, renderStreamingHtml } from '/cdn/markdown/index.js';

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
        }
    },
    computed: {
        rawContent() {
            const content = this.content == null ? '' : String(this.content);
            return content;
        },
        renderedHtml() {
            const raw = this.rawContent;
            if (!raw) {
                return '';
            }
            if (String(this.mode || '').toLowerCase() === 'streaming') {
                return renderStreamingHtml(raw);
            }
            const rendered = renderMarkdownHtml(raw, { breaks: this.breaks, gfm: this.gfm });
            return rendered;
        }
    },
    template: `
        <div class="md-view">
            <div v-html="renderedHtml"></div>
        </div>
    `
};

registerGlobalComponent(componentOptions);
