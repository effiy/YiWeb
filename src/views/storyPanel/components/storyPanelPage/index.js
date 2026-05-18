import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'StoryPanelPage',
    html: '/src/views/storyPanel/components/storyPanelPage/template.html',
    css: '/src/views/storyPanel/components/storyPanelPage/index.css',
    props: {
        loading: { type: Boolean, default: false },
        error: { type: String, default: null },
        stories: { type: Array, default: () => [] },
        statusCounts: { type: Object, default: () => ({}) },
        totalStories: { type: Number, default: 0 },
        selectedStory: { type: Object, default: null },
        syncing: { type: Boolean, default: false },
        storiesByStatus: { type: Object, default: () => ({}) },
    },
    emits: ['refresh', 'select-story', 'back', 'sync-story'],
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
                s.type.toLowerCase().includes(q)
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
                code_done: [],
                blocked: []
            };
            for (const story of this.stories) {
                if (groups[story.status] && this._matchSearch(story, q)) {
                    groups[story.status].push(story);
                }
            }
            return groups;
        },
        kanbanColumns() {
            const order = ['not_started', 'docs_in_progress', 'docs_done', 'code_in_progress', 'code_done', 'blocked'];
            const groups = this.filteredStoriesByStatus;
            return order.map(status => ({ status, stories: groups[status] || [] }));
        }
    },
    methods: {
        _matchSearch(story, q) {
            if (!q) return true;
            return story.name.toLowerCase().includes(q) ||
                story.status.toLowerCase().includes(q) ||
                story.type.toLowerCase().includes(q);
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
        toggleView() {
            this.viewMode = this.viewMode === 'board' ? 'list' : 'board';
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
                not_started: '未开始', docs_in_progress: '文档进行中', docs_done: '文档完成',
                code_in_progress: '编码进行中', code_done: '编码完成', blocked: '已阻断'
            };
            return map[status] || status;
        },
        typeLabel(type) {
            const map = { backend: '后端', frontend: '前端', fullstack: '全栈', meta: '元数据' };
            return map[type] || type;
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
