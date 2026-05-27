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
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        tagCounts: {
            type: Object,
            default: () => ({ counts: {}, noTagsCount: 0 })
        }
    },
    emits: ['tag-select', 'tag-clear', 'tag-filter-no-tags'],
    data() {
        return {
            tagOrderVersion: 0
        };
    },
    computed: sessionListTagsComputed,
    methods: sessionListTagsMethods
};

registerGlobalComponent(componentOptions);
