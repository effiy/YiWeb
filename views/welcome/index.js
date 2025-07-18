/**
 * 欢迎页主入口
 * author: liangliang
 */
import { createStore } from '/views/welcome/data/store/index.js';
import { useComputed } from '/views/welcome/hooks/useComputed.js';
import { useMethods } from '/views/welcome/hooks/useMethods.js';
import { useInit } from '/views/welcome/hooks/useInit.js';

const App = {
  setup() {
    // 1. 创建响应式状态
    const store = createStore();

    // 2. 组合计算属性
    const computedProps = useComputed(store);

    // 3. 组合常用方法
    const methods = useMethods(store);

    // 4. 初始化逻辑
    useInit(store, methods);

    // 5. 组件挂载时自动初始化（useInit内部已处理，无需重复调用）
    // 这里可以根据需要添加额外的生命周期逻辑

    // 6. 返回所有需要暴露给模板的数据和方法
    return {
      ...store,         // 响应式数据
      ...computedProps, // 计算属性
      ...methods        // 方法
    };
  }
};

// 创建并挂载Vue应用
Vue.createApp(App).mount('#app');