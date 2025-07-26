import { getData } from '/apis/index.js';
import { withGlobalLoading } from '/utils/loading.js';
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

export const createStore = () => {
    const apis = vueRef([]);
    const tags = vueRef([]);
    const filterBtns = vueRef([]);
    const currentCategory = vueRef('all');
    const searchKeyword = vueRef('');
    const loading = vueRef(false);
    const error = vueRef(null);
    const selectedTags = vueRef([]);

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    const loadApis = async () => {
        return await withGlobalLoading(async () => {
            loading.value = true;
            error.value = null;
            try {
                const data = await getData('https://data.effiy.cn/mock/apis/apis.json');
                if (Array.isArray(data)) {
                    apis.value = data;
                } else {
                    apis.value = getDefaultApis();
                }
            } catch (err) {
                console.warn('加载API数据失败，使用默认数据:', err);
                apis.value = getDefaultApis();
            } finally {
                loading.value = false;
            }
        }, '正在加载API数据...');
    };

    const loadFilterBtns = async () => {
        return await withGlobalLoading(async () => {
            try {
                const data = await getData('https://data.effiy.cn/mock/apis/filterBtns.json');
                if (Array.isArray(data)) {
                    filterBtns.value = data;
                } else {
                    filterBtns.value = getDefaultFilterBtns();
                }
            } catch (err) {
                console.warn('加载过滤器数据失败，使用默认数据:', err);
                filterBtns.value = getDefaultFilterBtns();
            }
        }, '正在加载过滤器数据...');
    };

    const getDefaultApis = () => [
        {
            id: '1',
            name: '获取用户信息',
            method: 'GET',
            path: '/api/user/info',
            description: '获取当前登录用户的详细信息',
            requestExample: 'GET /api/user/info',
            responseExample: '{ "id": 1, "name": "张三", "email": "zhangsan@example.com" }',
            tags: ['用户', '基础'],
            category: 'user'
        },
        {
            id: '2',
            name: '创建新用户',
            method: 'POST',
            path: '/api/user/create',
            description: '创建一个新的用户',
            requestExample: 'POST /api/user/create\n{ "name": "李四", "email": "lisi@example.com" }',
            responseExample: '{ "success": true, "id": 2 }',
            tags: ['用户', '创建'],
            category: 'user'
        }
    ];

    const getDefaultFilterBtns = () => [
        { id: 'all', name: '全部', icon: 'fas fa-list' },
        { id: 'user', name: '用户', icon: 'fas fa-user' }
    ];

    const setCurrentCategory = (category) => { currentCategory.value = category; };
    const setSearchKeyword = (keyword) => { searchKeyword.value = keyword; };
    const addApi = (apiData) => { apis.value.push({ ...apiData, id: generateId() }); };
    const updateApi = (apiData) => {
        const idx = apis.value.findIndex(api => api.id === apiData.id);
        if (idx !== -1) apis.value[idx] = { ...apis.value[idx], ...apiData };
    };
    const deleteApi = (apiId) => { apis.value = apis.value.filter(api => api.id !== apiId); };
    const updateTagsList = () => {
        const tagSet = new Set();
        apis.value.forEach(api => (api.tags || []).forEach(tag => tagSet.add(tag)));
        tags.value = Array.from(tagSet);
    };
    const addTag = (tagName) => { if (!tags.value.includes(tagName)) tags.value.push(tagName); };
    const deleteTag = (tagName) => { tags.value = tags.value.filter(tag => tag !== tagName); };
    const getTagCount = (tagName) => apis.value.filter(api => (api.tags || []).includes(tagName)).length;

    loadApis();
    loadFilterBtns();

    return {
        apis,
        tags,
        filterBtns,
        currentCategory,
        searchKeyword,
        loading,
        error,
        selectedTags,
        setCurrentCategory,
        setSearchKeyword,
        addApi,
        updateApi,
        deleteApi,
        updateTagsList,
        addTag,
        deleteTag,
        getTagCount
    };
}; 
