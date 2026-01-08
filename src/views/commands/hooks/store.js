/**
 * Linux命令大全页面数据存储管理
 * author: liangliang
 */

import { getData } from '/src/services/index.js';
import { withGlobalLoading } from '/src/utils/loading.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理Linux命令数据、标签数据、过滤器数据、加载状态和错误信息
 * @returns {Object} store对象，包含commands, tags, filterBtns, loading, error等方法
 */
export const createStore = () => {
    // 命令数据
    const commands = vueRef([]);
    // 标签数据
    const tags = vueRef([]);
    // 过滤器按钮数据
    const filterBtns = vueRef([]);
    // 当前选中的分类
    const currentCategory = vueRef('all');
    // 搜索关键词
    const searchKeyword = vueRef('');
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    // 选中的标签
    const selectedTags = vueRef([]);

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    /**
     * 异步加载命令数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadCommands = async () => {
        return await withGlobalLoading(async () => {
            loading.value = true;
            error.value = null;
            try {
                // 支持本地mock和远程接口切换
                const data = await getData('https://data.effiy.cn/mock/commands/commands.json');
                if (Array.isArray(data)) {
                    commands.value = data;
                } else {
                    // 如果没有数据，使用默认数据
                    commands.value = getDefaultCommands();
                }
            } catch (err) {
                console.warn('加载命令数据失败，使用默认数据:', err);
                commands.value = getDefaultCommands();
            } finally {
                loading.value = false;
            }
        }, '正在加载命令数据...');
    };

    /**
     * 异步加载过滤器按钮数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFilterBtns = async () => {
        return await withGlobalLoading(async () => {
            try {
                const data = await getData('https://data.effiy.cn/mock/commands/filterBtns.json');
                if (Array.isArray(data)) {
                    filterBtns.value = data;
                } else {
                    // 使用默认过滤器
                    filterBtns.value = getDefaultFilterBtns();
                }
            } catch (err) {
                console.warn('加载过滤器数据失败，使用默认数据:', err);
                filterBtns.value = getDefaultFilterBtns();
            }
        }, '正在加载过滤器数据...');
    };

    /**
     * 获取默认命令数据
     * @returns {Array} 默认命令数据
     */
    const getDefaultCommands = () => {
        return [
            {
                id: '1',
                name: 'ls',
                syntax: 'ls [选项] [文件或目录]',
                description: '列出目录内容，显示文件和子目录',
                category: '文件操作',
                tags: ['文件', '目录', '列表'],
                difficulty: 'easy',
                examples: ['ls -la', 'ls -lh', 'ls -R'],
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: '2',
                name: 'cd',
                syntax: 'cd [目录]',
                description: '切换当前工作目录',
                category: '文件操作',
                tags: ['目录', '导航'],
                difficulty: 'easy',
                examples: ['cd /home/user', 'cd ..', 'cd ~'],
                createdAt: '2024-01-16T14:30:00Z'
            },
            {
                id: '3',
                name: 'cp',
                syntax: 'cp [选项] 源文件 目标文件',
                description: '复制文件或目录',
                category: '文件操作',
                tags: ['文件', '复制'],
                difficulty: 'easy',
                examples: ['cp file.txt backup/', 'cp -r dir1 dir2'],
                createdAt: '2024-01-17T09:15:00Z'
            },
            {
                id: '4',
                name: 'mv',
                syntax: 'mv [选项] 源文件 目标文件',
                description: '移动或重命名文件',
                category: '文件操作',
                tags: ['文件', '移动', '重命名'],
                difficulty: 'easy',
                examples: ['mv old.txt new.txt', 'mv file.txt /tmp/'],
                createdAt: '2024-01-18T16:45:00Z'
            },
            {
                id: '5',
                name: 'rm',
                syntax: 'rm [选项] 文件或目录',
                description: '删除文件或目录',
                category: '文件操作',
                tags: ['文件', '删除'],
                difficulty: 'easy',
                examples: ['rm file.txt', 'rm -rf directory'],
                createdAt: '2024-01-19T11:20:00Z'
            },
            {
                id: '6',
                name: 'grep',
                syntax: 'grep [选项] 模式 文件',
                description: '在文件中搜索文本模式',
                category: '文本处理',
                tags: ['搜索', '文本', '过滤'],
                difficulty: 'medium',
                examples: ['grep "pattern" file.txt', 'grep -i "hello" *.txt'],
                createdAt: '2024-01-20T13:10:00Z'
            },
            {
                id: '7',
                name: 'find',
                syntax: 'find 路径 [选项] [表达式]',
                description: '在目录树中查找文件',
                category: '文件操作',
                tags: ['搜索', '文件', '查找'],
                difficulty: 'medium',
                examples: ['find . -name "*.txt"', 'find /home -type f -mtime -7'],
                createdAt: '2024-01-21T08:30:00Z'
            },
            {
                id: '8',
                name: 'chmod',
                syntax: 'chmod [选项] 模式 文件',
                description: '修改文件或目录的权限',
                category: '系统管理',
                tags: ['权限', '安全'],
                difficulty: 'medium',
                examples: ['chmod 755 file.sh', 'chmod +x script.sh'],
                createdAt: '2024-01-22T15:20:00Z'
            },
            {
                id: '9',
                name: 'ps',
                syntax: 'ps [选项]',
                description: '显示当前进程状态',
                category: '系统管理',
                tags: ['进程', '监控'],
                difficulty: 'medium',
                examples: ['ps aux', 'ps -ef', 'ps -p 1234'],
                createdAt: '2024-01-23T12:45:00Z'
            },
            {
                id: '10',
                name: 'top',
                syntax: 'top [选项]',
                description: '实时显示系统进程和资源使用情况',
                category: '系统管理',
                tags: ['监控', '性能', '进程'],
                difficulty: 'medium',
                examples: ['top', 'top -p 1234', 'top -u username'],
                createdAt: '2024-01-24T10:15:00Z'
            },
            {
                id: '11',
                name: 'tar',
                syntax: 'tar [选项] 文件名 [文件或目录]',
                description: '创建、查看或提取归档文件',
                category: '文件操作',
                tags: ['压缩', '归档'],
                difficulty: 'medium',
                examples: ['tar -czf archive.tar.gz dir/', 'tar -xzf archive.tar.gz'],
                createdAt: '2024-01-25T14:30:00Z'
            },
            {
                id: '12',
                name: 'ssh',
                syntax: 'ssh [选项] 用户@主机',
                description: '安全连接到远程服务器',
                category: '网络工具',
                tags: ['远程', '连接', '安全'],
                difficulty: 'medium',
                examples: ['ssh user@server.com', 'ssh -p 2222 user@host'],
                createdAt: '2024-01-26T16:45:00Z'
            },
            {
                id: '13',
                name: 'scp',
                syntax: 'scp [选项] 源文件 目标文件',
                description: '在本地和远程主机之间复制文件',
                category: '网络工具',
                tags: ['传输', '文件', '远程'],
                difficulty: 'medium',
                examples: ['scp file.txt user@server:/path/', 'scp -r dir/ user@server:/path/'],
                createdAt: '2024-01-27T09:15:00Z'
            },
            {
                id: '14',
                name: 'wget',
                syntax: 'wget [选项] URL',
                description: '从网络下载文件',
                category: '网络工具',
                tags: ['下载', '网络'],
                difficulty: 'easy',
                examples: ['wget https://example.com/file.zip', 'wget -c URL'],
                createdAt: '2024-01-28T11:20:00Z'
            },
            {
                id: '15',
                name: 'curl',
                syntax: 'curl [选项] URL',
                description: '传输数据的命令行工具',
                category: '网络工具',
                tags: ['HTTP', '传输', 'API'],
                difficulty: 'medium',
                examples: ['curl -O URL', 'curl -X POST -d "data" URL'],
                createdAt: '2024-01-29T13:10:00Z'
            },
            {
                id: '16',
                name: 'sed',
                syntax: 'sed [选项] 命令 文件',
                description: '流编辑器，用于文本处理',
                category: '文本处理',
                tags: ['文本', '编辑', '替换'],
                difficulty: 'hard',
                examples: ['sed "s/old/new/g" file.txt', 'sed -i "s/pattern/replace/" file.txt'],
                createdAt: '2024-01-30T15:30:00Z'
            },
            {
                id: '17',
                name: 'awk',
                syntax: 'awk [选项] 程序 文件',
                description: '强大的文本处理工具',
                category: '文本处理',
                tags: ['文本', '处理', '编程'],
                difficulty: 'hard',
                examples: ['awk "{print $1}" file.txt', 'awk -F: "{print $1}" /etc/passwd'],
                createdAt: '2024-01-31T17:45:00Z'
            },
            {
                id: '18',
                name: 'crontab',
                syntax: 'crontab [选项]',
                description: '管理定时任务',
                category: '系统管理',
                tags: ['定时', '任务', '调度'],
                difficulty: 'hard',
                examples: ['crontab -e', 'crontab -l', 'crontab -r'],
                createdAt: '2024-02-01T19:20:00Z'
            },
            {
                id: '19',
                name: 'iptables',
                syntax: 'iptables [选项] 命令 [链] [规则]',
                description: 'Linux防火墙规则管理',
                category: '系统管理',
                tags: ['防火墙', '安全', '网络'],
                difficulty: 'hard',
                examples: ['iptables -L', 'iptables -A INPUT -p tcp --dport 80 -j ACCEPT'],
                createdAt: '2024-02-02T21:10:00Z'
            },
            {
                id: '20',
                name: 'docker',
                syntax: 'docker [选项] 命令 [参数]',
                description: '容器化平台管理工具',
                category: '开发工具',
                tags: ['容器', '虚拟化', '部署'],
                difficulty: 'hard',
                examples: ['docker run nginx', 'docker ps', 'docker build -t image .'],
                createdAt: '2024-02-03T23:30:00Z'
            }
        ];
    };

    /**
     * 获取默认过滤器按钮数据
     * @returns {Array} 默认过滤器按钮数据
     */
    const getDefaultFilterBtns = () => {
        return [
            { id: 'all', name: '全部', icon: 'fas fa-terminal', active: true },
            { id: '文件操作', name: '文件操作', icon: 'fas fa-folder', active: false },
            { id: '系统管理', name: '系统管理', icon: 'fas fa-cogs', active: false },
            { id: '文本处理', name: '文本处理', icon: 'fas fa-file-alt', active: false },
            { id: '网络工具', name: '网络工具', icon: 'fas fa-network-wired', active: false },
            { id: '开发工具', name: '开发工具', icon: 'fas fa-code', active: false }
        ];
    };

    /**
     * 切换当前分类
     * @param {string} category - 分类ID
     */
    const setCurrentCategory = (category) => {
        if (category && typeof category === 'string') {
            currentCategory.value = category;
            // 更新过滤器按钮状态
            filterBtns.value.forEach(btn => {
                btn.active = btn.id === category;
            });
        }
    };

    /**
     * 设置搜索关键词
     * @param {string} keyword - 搜索关键词
     */
    const setSearchKeyword = (keyword) => {
        if (typeof keyword === 'string') {
            searchKeyword.value = keyword.trim();
        }
    };

    /**
     * 添加新命令
     * @param {Object} commandData - 命令数据
     */
    const addCommand = (commandData) => {
        const newCommand = {
            ...commandData,
            id: generateId(),
            createdAt: new Date().toISOString()
        };
        commands.value.unshift(newCommand);
        // 更新标签列表
        updateTagsList();
    };

    /**
     * 更新命令
     * @param {Object} commandData - 命令数据
     */
    const updateCommand = (commandData) => {
        const index = commands.value.findIndex(command => command.id === commandData.id);
        if (index !== -1) {
            commands.value[index] = {
                ...commands.value[index],
                ...commandData,
                updatedAt: new Date().toISOString()
            };
            // 更新标签列表
            updateTagsList();
        }
    };

    /**
     * 删除命令
     * @param {string} commandId - 命令ID
     */
    const deleteCommand = (commandId) => {
        const index = commands.value.findIndex(command => command.id === commandId);
        if (index !== -1) {
            commands.value.splice(index, 1);
            // 更新标签列表
            updateTagsList();
        }
    };

    /**
     * 更新标签列表
     */
    const updateTagsList = () => {
        const allTags = new Set();
        commands.value.forEach(command => {
            if (Array.isArray(command.tags)) {
                command.tags.forEach(tag => allTags.add(tag));
            }
        });
        tags.value = Array.from(allTags).sort();
    };

    /**
     * 添加新标签
     * @param {string} tagName - 标签名称
     */
    const addTag = (tagName) => {
        if (tagName && !tags.value.includes(tagName)) {
            tags.value.push(tagName);
            tags.value.sort();
        }
    };

    /**
     * 删除标签
     * @param {string} tagName - 标签名称
     */
    const deleteTag = (tagName) => {
        const index = tags.value.indexOf(tagName);
        if (index !== -1) {
            tags.value.splice(index, 1);
        }
    };

    /**
     * 获取标签使用次数
     * @param {string} tagName - 标签名称
     * @returns {number} 使用次数
     */
    const getTagCount = (tagName) => {
        return commands.value.filter(command => 
            Array.isArray(command.tags) && command.tags.includes(tagName)
        ).length;
    };

    // 自动初始化加载
    loadCommands();
    loadFilterBtns();

    // 便于扩展：后续可添加更多数据和方法
    return {
        commands,                 // 命令数据
        tags,                     // 标签数据
        filterBtns,              // 过滤器按钮数据
        currentCategory,         // 当前选中的分类
        searchKeyword,           // 搜索关键词
        loading,                 // 加载状态
        error,                   // 错误信息
        selectedTags,            // 选中的标签
        loadCommands,            // 手动刷新命令数据方法
        loadFilterBtns,          // 手动刷新过滤器数据方法
        setCurrentCategory,      // 切换分类方法
        setSearchKeyword,        // 设置搜索关键词方法
        addCommand,              // 添加命令方法
        updateCommand,           // 更新命令方法
        deleteCommand,           // 删除命令方法
        updateTagsList,          // 更新标签列表方法
        addTag,                  // 添加标签方法
        deleteTag,               // 删除标签方法
        getTagCount,             // 获取标签使用次数方法
        generateId               // 生成唯一ID方法
    };
}; 

