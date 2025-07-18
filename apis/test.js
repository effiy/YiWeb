// API 使用示例
// 作者：liangliang

import apiClient, { 
  getData, 
  createData, 
  buildUrl, 
  retry, 
  debounce,
  CacheManager 
} from '/apis/index.js';

// 示例 1：基础 CRUD 操作
async function basicCRUDExample() {
  try {
    // 获取数据
    const users = await getData('https://api.example.com/users');
    console.log('获取用户列表：', users);
    
    // 创建数据
    const newUser = await createData('https://api.example.com/users', {
      name: '张三',
      email: 'zhangsan@example.com',
      age: 25
    }, {
      name: ['required', 'string'],
      email: ['required', 'email'],
      age: ['required', 'number']
    });
    console.log('创建新用户：', newUser);
    
    // 更新数据
    const updatedUser = await apiClient.put('https://api.example.com/users/1', {
      name: '李四',
      age: 26
    });
    console.log('更新用户：', updatedUser);
    
    // 删除数据
    await apiClient.delete('https://api.example.com/users/1');
    console.log('删除用户成功');
    
  } catch (error) {
    console.error('操作失败：', error);
  }
}

// 示例 2：使用缓存
async function cacheExample() {
  // 第一次请求，会从服务器获取数据
  const data1 = await getData('https://api.example.com/posts', {}, true);
  console.log('第一次获取数据：', data1);
  
  // 第二次请求，会从缓存获取数据
  const data2 = await getData('https://api.example.com/posts', {}, true);
  console.log('第二次获取数据（从缓存）：', data2);
  
  // 清除缓存
  CacheManager.clear();
  console.log('缓存已清除');
}

// 示例 3：构建 URL
function urlBuildingExample() {
  const baseUrl = 'https://api.example.com/search';
  const params = {
    q: 'JavaScript',
    page: 1,
    limit: 10,
    tags: ['web', 'programming']
  };
  
  const fullUrl = buildUrl(baseUrl, params);
  console.log('构建的 URL：', fullUrl);
  // 输出：https://api.example.com/search?q=JavaScript&page=1&limit=10&tags=web&tags=programming
}

// 示例 4：重试机制
async function retryExample() {
  const fetchWithRetry = () => fetch('https://api.example.com/unstable-api');
  
  try {
    const result = await retry(fetchWithRetry, 3, 1000);
    console.log('重试成功：', result);
  } catch (error) {
    console.error('重试失败：', error);
  }
}

// 示例 5：防抖和节流
function debounceThrottleExample() {
  // 防抖：搜索输入
  const searchInput = debounce(async (query) => {
    const results = await getData(`https://api.example.com/search?q=${query}`);
    console.log('搜索结果：', results);
  }, 500);
  
  // 节流：滚动事件
  const handleScroll = throttle(() => {
    console.log('滚动事件触发');
  }, 100);
  
  // 模拟使用
  searchInput('JavaScript'); // 500ms 后执行
  handleScroll(); // 立即执行
}

// 示例 6：批量操作
async function batchExample() {
  const operations = [
    {
      type: 'GET',
      url: 'https://api.example.com/users',
      options: {},
      useCache: true
    },
    {
      type: 'POST',
      url: 'https://api.example.com/users',
      data: { name: '王五', email: 'wangwu@example.com' },
      validationRules: {
        name: ['required', 'string'],
        email: ['required', 'email']
      }
    },
    {
      type: 'PUT',
      url: 'https://api.example.com/users/1',
      data: { name: '赵六' }
    }
  ];
  
  try {
    const result = await apiClient.batch(operations);
    console.log('批量操作结果：', result);
    console.log(`成功：${result.successCount}，失败：${result.errorCount}`);
  } catch (error) {
    console.error('批量操作失败：', error);
  }
}

// 示例 7：网络状态监听
function networkExample() {
  const unsubscribe = onNetworkChange((isOnline) => {
    if (isOnline) {
      console.log('网络已连接');
    } else {
      console.log('网络已断开');
    }
  });
  
  // 检查当前网络状态
  console.log('当前网络状态：', isOnline() ? '在线' : '离线');
  
  // 返回取消监听的函数
  return unsubscribe;
}

// 导出示例函数
export {
  basicCRUDExample,
  cacheExample,
  urlBuildingExample,
  retryExample,
  debounceThrottleExample,
  batchExample,
  networkExample
};

// 如果直接运行此文件，执行所有示例
if (typeof window !== 'undefined') {
  console.log('=== API 使用示例 ===');
  
  // 执行示例
  basicCRUDExample();
  cacheExample();
  urlBuildingExample();
  retryExample();
  debounceThrottleExample();
  batchExample();
  networkExample();
} 