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
    },
    emits: ['refresh', 'select-story', 'back', 'sync-story'],
    data() {
        return {
            localSearchQuery: ''
        };
    },
    computed: {
        hasSelectedStory() {
            return !!this.selectedStory;
        },
        filteredStories() {
            const q = (this.localSearchQuery || '').trim().toLowerCase();
            if (!q) return this.stories;
            return this.stories.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.status.toLowerCase().includes(q) ||
                s.type.toLowerCase().includes(q)
            );
        }
    }
});
