/**
 * 全屏查看器使用示例
 * @author liangliang
 */

// 示例1: 查看 Mermaid 图表
function exampleMermaidViewer() {
    // 使用全局实例
    window.fullscreenViewer.open({
        title: '流程图示例',
        content: `
            <svg viewBox="0 0 200 100">
                <rect x="10" y="10" width="80" height="40" fill="#e1f5fe" stroke="#01579b"/>
                <text x="50" y="35" text-anchor="middle" font-size="14">开始</text>
                <rect x="110" y="10" width="80" height="40" fill="#f3e5f5" stroke="#4a148c"/>
                <text x="150" y="35" text-anchor="middle" font-size="14">结束</text>
            </svg>
        `,
        type: 'svg',
        actions: [
            { label: '复制', icon: 'fas fa-copy', action: 'copy' },
            { label: '下载', icon: 'fas fa-download', action: 'download' }
        ],
        onAction: (action) => {
            console.log('操作:', action);
        }
    });
}

// 示例2: 查看图片
function exampleImageViewer() {
    window.fullscreenViewer.open({
        title: '图片查看',
        content: 'https://via.placeholder.com/800x600/4f46e5/ffffff?text=示例图片',
        type: 'image',
        actions: [
            { label: '下载', icon: 'fas fa-download', action: 'download' }
        ]
    });
}

// 示例3: 查看代码
function exampleCodeViewer() {
    const code = `function hello() {
    console.log("Hello, World!");
}`;
    
    window.fullscreenViewer.open({
        title: '代码查看',
        content: code,
        type: 'text',
        actions: [
            { label: '复制', icon: 'fas fa-copy', action: 'copy' }
        ]
    });
}

// 示例4: 使用图表查看器
function exampleChartViewer() {
    // 查看 Mermaid 图表
    window.chartViewer.viewMermaid('my-diagram-id');
    
    // 查看 SVG
    window.chartViewer.viewSVG('my-svg-id');
    
    // 查看图片
    window.chartViewer.viewImage('https://example.com/image.jpg');
    
    // 查看文本
    window.chartViewer.viewText('Hello, World!', { title: '文本内容' });
}
