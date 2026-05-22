import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { clearCacheAndRefresh } from '/src/views/story/hooks/clearCacheMethods.js';

registerGlobalComponent({
    name: 'StoryPanelPage',
    html: '/src/views/story/components/storyPanelPage/template.html',
    css: '/src/views/story/components/storyPanelPage/index.css',
    props: {
        loading: { type: Boolean, default: false },
        error: { type: String, default: null },
        stories: { type: Array, default: () => [] },
        statusCounts: { type: Object, default: () => ({}) },
        totalStories: { type: Number, default: 0 },
        selectedStory: { type: Object, default: null },
        storiesByStatus: { type: Object, default: () => ({}) },
    },
    emits: ['select-story', 'back'],
    data() {
        return {
            localSearchQuery: '',
            viewMode: 'board',
            panelStory: null,
        };
    },
    computed: {
        hasSelectedStory() {
            return !!this.selectedStory;
        },
        panelVisible() {
            return !!this.panelStory;
        },
        filteredStories() {
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            if (!q) return this.stories;
            return this.stories.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.status.toLowerCase().includes(q) ||
                s.type.toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q) ||
                (s.nextStep || '').toLowerCase().includes(q)
            );
        },
        filteredStoriesByStatus() {
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            if (!q) return this.storiesByStatus;
            const groups = {
                not_started: [],
                docs_in_progress: [],
                docs_done: [],
                code_in_progress: [],
                self_improve: [],
                code_done: []
            };
            for (const story of this.stories) {
                if (groups[story.status] && this._matchSearch(story, q)) {
                    groups[story.status].push(story);
                }
            }
            return groups;
        },
        viewModes() {
            return [
                { value: 'board', label: '看板', icon: 'columns' },
                { value: 'cards', label: '卡片', icon: 'grid' },
                { value: 'list', label: '列表', icon: 'list' },
            ];
        },
        kanbanColumns() {
            const order = ['not_started', 'docs_in_progress', 'docs_done', 'code_in_progress', 'code_done', 'self_improve'];
            const groups = this.filteredStoriesByStatus;
            return order.map(status => ({ status, stories: groups[status] || [] }));
        }
    },
    methods: {
        _matchSearch(story, q) {
            if (!q) return true;
            return story.name.toLowerCase().includes(q) ||
                story.status.toLowerCase().includes(q) ||
                story.type.toLowerCase().includes(q) ||
                (story.description || '').toLowerCase().includes(q) ||
                (story.nextStep || '').toLowerCase().includes(q);
        },
        openDetail(story) {
            if (typeof story === 'string') {
                story = this.stories.find(s => s.name === story);
                if (!story) return;
            }
            this.panelStory = story;
            this.$emit('select-story', story.name);
        },
        closePanel() {
            this.panelStory = null;
        },
        setView(view) {
            this.viewMode = view;
        },
        onBackdropClick(e) {
            if (e.target === e.currentTarget) {
                this.closePanel();
            }
        },
        onKeydown(e) {
            if (e.key === 'Escape' && this.panelVisible) {
                this.closePanel();
            }
        },
        statusLabel(status) {
            const map = {
                not_started: '任务', docs_in_progress: '设计', docs_done: '实施',
                code_in_progress: '测试', self_improve: '改进', code_done: '报告'
            };
            return map[status] || status;
        },
        typeLabel(type) {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[type] || type;
        },
        clearCache() {
            clearCacheAndRefresh();
        },
        formatDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return '—';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onKeydown);
    }
});
