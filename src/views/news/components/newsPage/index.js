import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
    name: 'NewsPage',
    html: '/src/views/news/components/newsPage/index.html',
    setup() {
        if (typeof Vue === 'undefined' || typeof Vue.inject !== 'function') return {};
        return Vue.inject('viewContext', {}) || {};
    }
});
