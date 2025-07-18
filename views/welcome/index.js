import { createStore } from '/views/welcome/data/store/index.js';
import { useComputed } from '/views/welcome/hooks/useComputed.js';
import { useMethods } from '/views/welcome/hooks/useMethods.js';
import { useInit } from '/views/welcome/hooks/useInit.js';

const App = {
  
  setup() {
    // 从Vue中解构需要的函数
    const { onMounted } = Vue;

    // 创建状态存储
    const store = createStore();

    // 创建计算属性
    const computedProps = useComputed(store);

    // 创建方法函数
    const methods = useMethods(store);

    // 创建初始化方法
    const init = useInit(store, methods);

    // 组件挂载时执行初始化
    onMounted(() => {});

    return {
      // 响应式数据
      ...store,

      // 计算属性
      ...computedProps,

      // 方法
      ...methods,
    }
  }
}

const app = Vue.createApp(App);
app.mount('#app');