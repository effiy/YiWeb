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
            validator: (value) => ['tree', 'cards', 'graph'].includes(value)
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        tagFilterNoTags: {
            type: Boolean,
            default: false
        },
        sessionSearchQuery: {
            type: String,
            default: ''
        },
        claudeFilterAllowedSessionKeys: {
            type: [Set, null],
            default: null
        },
        sessions: {
            type: Array,
            default: () => []
        },
        selectedSkillTags: {
            type: Array,
            default: () => []
        },
        selectedTemplateTags: {
            type: Array,
            default: () => []
        },
        selectedRuleTags: {
            type: Array,
            default: () => []
        },
        selectedAgentTags: {
            type: Array,
            default: () => []
        }
    },
    computed: fileTreeComputed,
    emits: ['file-select', 'folder-toggle', 'toggle-collapse', 'create-folder', 'create-file', 'rename-item', 'delete-item', 'create-session', 'search-change', 'toggle-batch-mode', 'batch-select-file', 'download-project', 'upload-project', 'view-mode-change', 'tag-select', 'tag-clear', 'tag-filter-no-tags', 'folder-import', 'folder-export', 'session-search-change', 'skill-tag-toggle', 'template-tag-toggle', 'rule-tag-toggle', 'agent-tag-toggle', 'batch-select-all-cards', 'batch-deselect-all-cards', 'batch-delete-files'],
    data() {
        return {
            _isDestroyed: false,
            tagOrderVersion: 0,
            editingCardKey: null,
            editingCardDesc: '',
            cardSaving: false,
            _ftGraph: null,
            _ftDrillNodeId: null,
            _ftResizeObserver: null,
            ftFilterType: null,
            ftGraphOverviewOriginal: null,
            ftSelectedNode: null,
            ftGraphOverview: null,
            ftGraphTitle: '文件图谱',
            ftGraphStatsText: '',
            ftBreadcrumb: { drillNodeId: null, drillLabel: '' }
        };
    },
    watch: {
        viewMode(newMode) {
            if (newMode === 'graph') {
                this.$nextTick(() => { if (!this._isDestroyed) this.initFileTreeGraph(); });
            } else {
                this._destroyFtGraph();
            }
        },
        selectedTags(_newTags, _oldTags) {
            if (this.viewMode === 'graph') {
                this.$nextTick(() => { if (!this._isDestroyed) this.initFileTreeGraph(); });
            }
        }
    },
    beforeUnmount() {
        this._isDestroyed = true;
        this._destroyFtGraph();
    },
    methods: fileTreeMethods
};

export { componentOptions };
