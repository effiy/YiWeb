import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { sessionListTagsComputed } from './sessionListTagsComputed.js';
import { sessionListTagsMethods } from './sessionListTagsMethods.js';

const componentOptions = {
    name: 'SessionListTags',
    css: '/src/views/aicr/components/sessionListTags/index.css',
    html: '/src/views/aicr/components/sessionListTags/index.html',
    props: {
        allTags: {
            type: Array,
            default: () => []
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        tagFilterReverse: {
            type: Boolean,
            default: false
        },
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        tagFilterExpanded: {
            type: Boolean,
            default: false
        },
        tagFilterSearchKeyword: {
            type: String,
            default: ''
        },
        tagCounts: {
            type: Object,
            default: () => ({ counts: {}, noTagsCount: 0 })
        },
        tagFilterVisibleCount: {
            type: Number,
            default: 8
        }
    },
    emits: ['tag-select', 'tag-clear', 'tag-filter-reverse', 'tag-filter-no-tags', 'tag-filter-expand', 'tag-filter-search'],
    data() {
        return {
            tagOrderVersion: 0
        };
    },
    computed: sessionListTagsComputed,
    methods: sessionListTagsMethods
};

registerGlobalComponent(componentOptions);
