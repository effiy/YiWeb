/**
 * Vim快捷键数据
 */

export const shortcutsData = {
    categories: [
        {
            id: 'movement',
            name: '移动',
            icon: 'fas fa-arrows-alt',
            sections: [
                {
                    title: '基础移动',
                    icon: 'fas fa-arrows-alt',
                    shortcuts: [
                        { key: 'h', desc: '左移' },
                        { key: 'j', desc: '下移' },
                        { key: 'k', desc: '上移' },
                        { key: 'l', desc: '右移' },
                        { key: 'w', desc: '下一个单词' },
                        { key: 'b', desc: '上一个单词' },
                        { key: 'e', desc: '单词末尾' },
                        { key: 'ge', desc: '上一个单词末尾' },
                        { key: '0', desc: '行首' },
                        { key: '^', desc: '行首非空白' },
                        { key: '$', desc: '行尾' },
                        { key: 'g_', desc: '行尾非空白' },
                        { key: 'f字符', desc: '向右查找字符' },
                        { key: 'F字符', desc: '向左查找字符' },
                        { key: 't字符', desc: '向右查找字符前' },
                        { key: 'T字符', desc: '向左查找字符前' }
                    ]
                },
                {
                    title: '快速跳转',
                    icon: 'fas fa-rocket',
                    shortcuts: [
                        { key: 'gg', desc: '文件开头' },
                        { key: 'G', desc: '文件结尾' },
                        { key: ':行号', desc: '跳转行号' },
                        { key: 'Ctrl+g', desc: '显示位置' },
                        { key: '%', desc: '匹配括号' },
                        { key: '*', desc: '下一个匹配' },
                        { key: '#', desc: '上一个匹配' },
                        { key: 'Ctrl+o', desc: '返回' },
                        { key: 'Ctrl+i', desc: '前进' },
                        { key: 'H', desc: '屏幕顶部' },
                        { key: 'M', desc: '屏幕中间' },
                        { key: 'L', desc: '屏幕底部' },
                        { key: 'zt', desc: '当前行到顶部' },
                        { key: 'zz', desc: '当前行到中间' },
                        { key: 'zb', desc: '当前行到底部' }
                    ]
                }
            ]
        },
        {
            id: 'edit',
            name: '编辑',
            icon: 'fas fa-edit',
            sections: [
                {
                    title: '编辑操作',
                    icon: 'fas fa-edit',
                    shortcuts: [
                        { key: 'i', desc: '插入模式', type: 'important' },
                        { key: 'a', desc: '追加模式', type: 'important' },
                        { key: 'o', desc: '新行插入' },
                        { key: 'O', desc: '上行插入' },
                        { key: 's', desc: '替换字符' },
                        { key: 'S', desc: '替换整行' },
                        { key: 'x', desc: '删除字符' },
                        { key: 'X', desc: '删除前字符' },
                        { key: 'dd', desc: '删除行', type: 'important' },
                        { key: 'yy', desc: '复制行', type: 'important' },
                        { key: 'p', desc: '粘贴', type: 'important' },
                        { key: 'P', desc: '粘贴到前面' },
                        { key: 'r', desc: '替换字符' },
                        { key: 'R', desc: '替换模式' },
                        { key: 'J', desc: '合并下一行' },
                        { key: 'gJ', desc: '合并下一行(无空格)' }
                    ]
                },
                {
                    title: '文本对象',
                    icon: 'fas fa-object-group',
                    shortcuts: [
                        { key: 'iw', desc: '内词' },
                        { key: 'aw', desc: '词(含空格)' },
                        { key: 'iW', desc: '内大词' },
                        { key: 'aW', desc: '大词(含空格)' },
                        { key: 'is', desc: '内句子' },
                        { key: 'as', desc: '句子' },
                        { key: 'ip', desc: '内段落' },
                        { key: 'ap', desc: '段落' },
                        { key: 'i"', desc: '内双引号' },
                        { key: 'a"', desc: '双引号' },
                        { key: 'i\'', desc: '内单引号' },
                        { key: 'a\'', desc: '单引号' },
                        { key: 'i(', desc: '内括号' },
                        { key: 'a(', desc: '括号' },
                        { key: 'i{', desc: '内大括号' },
                        { key: 'a{', desc: '大括号' }
                    ]
                },
                {
                    title: '撤销重做',
                    icon: 'fas fa-undo-alt',
                    shortcuts: [
                        { key: 'u', desc: '撤销', type: 'important' },
                        { key: 'Ctrl+r', desc: '重做', type: 'important' },
                        { key: '.', desc: '重复操作' },
                        { key: '~', desc: '大小写切换' },
                        { key: 'g~', desc: '切换大小写' },
                        { key: 'gu', desc: '转小写' },
                        { key: 'gU', desc: '转大写' },
                        { key: 'g?', desc: 'ROT13编码' }
                    ]
                }
            ]
        },
        {
            id: 'search',
            name: '搜索',
            icon: 'fas fa-search',
            sections: [
                {
                    title: '搜索替换',
                    icon: 'fas fa-search',
                    shortcuts: [
                        { key: '/文本', desc: '向下搜索' },
                        { key: '?文本', desc: '向上搜索' },
                        { key: 'n', desc: '下一个' },
                        { key: 'N', desc: '上一个' },
                        { key: ':s/old/new', desc: '替换当前行' },
                        { key: ':%s/old/new/g', desc: '全局替换' },
                        { key: ':s/old/new/gc', desc: '确认替换' },
                        { key: ':s/old/new/i', desc: '忽略大小写' },
                        { key: ':s/old/new/I', desc: '区分大小写' },
                        { key: ':s/old/new/n', desc: '显示匹配数' },
                        { key: ':s/old/new/p', desc: '打印替换行' }
                    ]
                }
            ]
        },
        {
            id: 'visual',
            name: '可视',
            icon: 'fas fa-highlighter',
            sections: [
                {
                    title: '可视模式',
                    icon: 'fas fa-highlighter',
                    shortcuts: [
                        { key: 'v', desc: '字符选择' },
                        { key: 'V', desc: '行选择' },
                        { key: 'Ctrl+v', desc: '块选择' },
                        { key: 'gv', desc: '重新选择' },
                        { key: 'o', desc: '切换端点' },
                        { key: 'y', desc: '复制选中' },
                        { key: 'd', desc: '删除选中' },
                        { key: 'c', desc: '修改选中' },
                        { key: 'r', desc: '替换选中' },
                        { key: '~', desc: '大小写切换' },
                        { key: 'u', desc: '转小写' },
                        { key: 'U', desc: '转大写' }
                    ]
                }
            ]
        },
        {
            id: 'window',
            name: '窗口',
            icon: 'fas fa-window-maximize',
            sections: [
                {
                    title: '窗口操作',
                    icon: 'fas fa-window-maximize',
                    shortcuts: [
                        { key: ':sp', desc: '水平分割' },
                        { key: ':vsp', desc: '垂直分割' },
                        { key: 'Ctrl+w h', desc: '左窗口' },
                        { key: 'Ctrl+w j', desc: '下窗口' },
                        { key: 'Ctrl+w k', desc: '上窗口' },
                        { key: 'Ctrl+w l', desc: '右窗口' },
                        { key: 'Ctrl+w c', desc: '关闭窗口' },
                        { key: 'Ctrl+w o', desc: '只保留当前' },
                        { key: 'Ctrl+w =', desc: '等分窗口' },
                        { key: 'Ctrl+w +', desc: '增加高度' },
                        { key: 'Ctrl+w -', desc: '减少高度' },
                        { key: 'Ctrl+w >', desc: '增加宽度' },
                        { key: 'Ctrl+w <', desc: '减少宽度' },
                        { key: 'Ctrl+w H', desc: '移动到左' },
                        { key: 'Ctrl+w J', desc: '移动到下' },
                        { key: 'Ctrl+w K', desc: '移动到上' },
                        { key: 'Ctrl+w L', desc: '移动到右' }
                    ]
                },
                {
                    title: '标签页操作',
                    icon: 'fas fa-tabs',
                    shortcuts: [
                        { key: ':tabnew', desc: '新建标签页' },
                        { key: ':tabclose', desc: '关闭标签页' },
                        { key: 'gt', desc: '下一个标签页' },
                        { key: 'gT', desc: '上一个标签页' },
                        { key: '1gt', desc: '跳转标签页1' },
                        { key: ':tabmove +1', desc: '向右移动标签页' },
                        { key: ':tabmove -1', desc: '向左移动标签页' },
                        { key: ':tabonly', desc: '只保留当前标签页' }
                    ]
                }
            ]
        },
        {
            id: 'file',
            name: '文件',
            icon: 'fas fa-file-alt',
            sections: [
                {
                    title: '文件操作',
                    icon: 'fas fa-file-alt',
                    shortcuts: [
                        { key: ':w', desc: '保存文件', type: 'important' },
                        { key: ':q', desc: '退出' },
                        { key: ':wq', desc: '保存并退出', type: 'important' },
                        { key: ':q!', desc: '强制退出', type: 'danger' },
                        { key: ':e 文件名', desc: '编辑文件' },
                        { key: ':r 文件名', desc: '插入文件' },
                        { key: ':set nu', desc: '显示行号' },
                        { key: ':set nonu', desc: '隐藏行号' },
                        { key: ':set wrap', desc: '自动换行' },
                        { key: ':set nowrap', desc: '不换行' },
                        { key: ':set list', desc: '显示不可见字符' },
                        { key: ':set nolist', desc: '隐藏不可见字符' },
                        { key: ':set paste', desc: '粘贴模式' },
                        { key: ':set nopaste', desc: '退出粘贴模式' }
                    ]
                }
            ]
        },
        {
            id: 'advanced',
            name: '高级',
            icon: 'fas fa-magic',
            sections: [
                {
                    title: '寄存器操作',
                    icon: 'fas fa-clipboard',
                    shortcuts: [
                        { key: '"ayy', desc: '复制到寄存器a' },
                        { key: '"ap', desc: '粘贴寄存器a' },
                        { key: '"*yy', desc: '复制到系统剪贴板' },
                        { key: '"*p', desc: '粘贴系统剪贴板' },
                        { key: ':reg', desc: '显示寄存器' },
                        { key: '"0', desc: '最近复制' },
                        { key: '"1', desc: '最近删除' },
                        { key: '"a-"z', desc: '命名寄存器' },
                        { key: '"A-"Z', desc: '追加到寄存器' }
                    ]
                },
                {
                    title: '宏操作',
                    icon: 'fas fa-play-circle',
                    shortcuts: [
                        { key: 'qa', desc: '开始录制宏a' },
                        { key: 'q', desc: '停止录制' },
                        { key: '@a', desc: '执行宏a' },
                        { key: '@@', desc: '重复上次宏' },
                        { key: '10@a', desc: '执行宏a 10次' },
                        { key: ':let @a=\'\'', desc: '清空宏a' },
                        { key: ':reg a', desc: '查看宏a内容' },
                        { key: ':let @a=@b', desc: '复制宏b到a' }
                    ]
                },
                {
                    title: '折叠操作',
                    icon: 'fas fa-compress-alt',
                    shortcuts: [
                        { key: 'zf', desc: '创建折叠' },
                        { key: 'zo', desc: '打开折叠' },
                        { key: 'zc', desc: '关闭折叠' },
                        { key: 'za', desc: '切换折叠' },
                        { key: 'zR', desc: '打开所有折叠' },
                        { key: 'zM', desc: '关闭所有折叠' },
                        { key: 'zj', desc: '下一个折叠' },
                        { key: 'zk', desc: '上一个折叠' },
                        { key: 'zd', desc: '删除折叠' },
                        { key: 'zE', desc: '删除所有折叠' }
                    ]
                },
                {
                    title: '高级操作',
                    icon: 'fas fa-magic',
                    shortcuts: [
                        { key: 'ma', desc: '设置标记a' },
                        { key: '\'a', desc: '跳转标记a' },
                        { key: ':!命令', desc: '执行shell命令' },
                        { key: ':r !命令', desc: '插入命令输出' },
                        { key: 'Ctrl+n', desc: '自动补全' },
                        { key: 'Ctrl+p', desc: '向上补全' },
                        { key: ':help', desc: '帮助文档' },
                        { key: ':version', desc: '版本信息' },
                        { key: ':syntax on', desc: '开启语法高亮' },
                        { key: ':syntax off', desc: '关闭语法高亮' },
                        { key: ':set spell', desc: '开启拼写检查' },
                        { key: ':set nospell', desc: '关闭拼写检查' },
                        { key: ']s', desc: '下一个拼写错误' },
                        { key: '[s', desc: '上一个拼写错误' },
                        { key: 'zg', desc: '添加到拼写字典' },
                        { key: 'zw', desc: '从拼写字典移除' }
                    ]
                }
            ]
        }
    ]
}; 
