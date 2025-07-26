export const useComputed = (store) => {
    const filteredApis = Vue.computed(() => {
        let apis = store.apis.value;
        if (store.currentCategory.value && store.currentCategory.value !== 'all') {
            apis = apis.filter(api => api.category === store.currentCategory.value);
        }
        if (store.selectedTags.value.length > 0) {
            apis = apis.filter(api => api.tags && api.tags.some(tag => store.selectedTags.value.includes(tag)));
        }
        if (store.searchKeyword.value) {
            const kw = store.searchKeyword.value.toLowerCase();
            apis = apis.filter(api =>
                (api.name && api.name.toLowerCase().includes(kw)) ||
                (api.path && api.path.toLowerCase().includes(kw)) ||
                (api.description && api.description.toLowerCase().includes(kw))
            );
        }
        return apis;
    });
    const hasSearchKeyword = Vue.computed(() => !!store.searchKeyword.value);
    return {
        filteredApis,
        hasSearchKeyword
    };
}; 
