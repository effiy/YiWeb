/**
 * 新闻页主入口
 * author: liangliang
 */
import { createStore } from '/views/news/data/store/index.js';
import { useComputed } from '/views/news/hooks/useComputed.js';
import { useMethods } from '/views/news/hooks/useMethods.js';

const App = {
  setup() {
    // 1. 创建响应式状态
    const store = createStore();

    // 2. 组合计算属性
    const computedProps = useComputed(store);

    // 3. 组合常用方法
    const methods = useMethods(store);

    // 4. 组件挂载时自动初始化
    // 这里可以根据需要添加额外的生命周期逻辑

    // 5. 返回所有需要暴露给模板的数据和方法
    return {
      ...store,         // 响应式数据
      ...computedProps, // 计算属性
      ...methods        // 方法
    };
  }
};

// 创建Vue应用并注册组件
// 创建并挂载应用
const app = Vue.createApp(App);

// 注册组件（确保组件已经加载）
if (typeof SearchHeader !== 'undefined') {
    app.component('SearchHeader', SearchHeader);
}
if (typeof NewsList !== 'undefined') {
    app.component('NewsList', NewsList);
}
if (typeof Calendar !== 'undefined') {
    app.component('Calendar', Calendar);
}
if (typeof TagStatistics !== 'undefined') {
    app.component('TagStatistics', TagStatistics);
}
if (typeof Sidebar !== 'undefined') {
    app.component('Sidebar', Sidebar);
}

// 挂载应用
app.mount('#app'); 