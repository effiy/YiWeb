import { createFileTreeNode } from './fileTreeNode.js';
import { fileTreeComputed } from './fileTreeComputed.js';
import { fileTreeMethods } from './fileTreeMethods.js';

const componentOptions = {
    name: 'FileTree',
    css: '/src/views/aicr/components/fileTree/index.css',
    html: '/src/views/aicr/components/fileTree/index.html',
    components: {
        'file-tree-node': createFileTreeNode()
    },
    props: {
        tree: {
            type: Array,
            default: () => []
        },
        selectedKey: {
            type: [String, null],
            default: null
        },
        expandedFolders: {
            type: Set,
            default: () => new Set()
        },
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        collapsed: {
            type: Boolean,
            default: false
        },
        searchQuery: {
            type: String,
            default: ''
        },
        batchMode: {
            type: Boolean,
            default: false
        },
        selectedKeys: {
            type: [Set, Array],
            default: () => new Set()
        },
        viewMode: {
            type: String,
            default: 'tree',
            validator: (value) => ['tree', 'tags'].includes(value)
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        selectedPrefixTags: {
            type: Array,
            default: () => []
        },
        selectedSuffixTags: {
            type: Array,
            default: () => []
        },
        sessionSearchQuery: {
            type: String,
            default: ''
        }
    },
    computed: fileTreeComputed,
    emits: ['file-select', 'folder-toggle', 'toggle-collapse', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'search-change', 'toggle-batch-mode', 'batch-select-file', 'download-project', 'upload-project', 'view-mode-change', 'tag-select', 'tag-clear', 'tag-filter-no-tags', 'folder-import', 'folder-export', 'session-search-change'],
    data() {
        return {
            tagOrderVersion: 0
        };
    },
    methods: fileTreeMethods
};

export { componentOptions };
