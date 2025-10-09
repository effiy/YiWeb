/**
 * 全屏查看器关闭按钮使用示例
 * @author liangliang
 */

// 示例1: 基础全屏查看
function exampleBasicFullscreen() {
    window.fullscreenViewer.open({
        title: '示例图表',
        content: '<div style="padding: 20px; text-align: center;"><h2>这是一个示例内容</h2></div>',
        type: 'html'
    });
}

// 示例2: 使用不同关闭按钮变体
function exampleCloseButtonVariants() {
    // 默认红色关闭按钮
    window.fullscreenViewer.open({
        title: '默认关闭按钮',
        content: '<div style="padding: 20px;">默认红色渐变关闭按钮</div>',
        type: 'html'
    });

    // 紫色变体
    setTimeout(() => {
        window.fullscreenViewer.setCloseButtonVariant('variant-1');
    }, 1000);

    // 青色变体
    setTimeout(() => {
        window.fullscreenViewer.setCloseButtonVariant('variant-2');
    }, 2000);

    // 绿色变体
    setTimeout(() => {
        window.fullscreenViewer.setCloseButtonVariant('variant-3');
    }, 3000);
}

// 示例3: 关闭按钮特效
function exampleCloseButtonEffects() {
    window.fullscreenViewer.open({
        title: '关闭按钮特效演示',
        content: '<div style="padding: 20px;">观察关闭按钮的各种特效</div>',
        type: 'html'
    });

    // 添加脉冲效果
    setTimeout(() => {
        window.fullscreenViewer.addCloseButtonEffect('pulse', 2000);
    }, 1000);

    // 添加呼吸效果
    setTimeout(() => {
        window.fullscreenViewer.addCloseButtonEffect('breathing', 3000);
    }, 4000);

    // 添加加载效果
    setTimeout(() => {
        window.fullscreenViewer.addCloseButtonEffect('loading', 2000);
    }, 8000);
}

// 示例4: 自定义关闭按钮样式
function exampleCustomCloseButton() {
    // 创建自定义样式
    const customStyle = document.createElement('style');
    customStyle.textContent = `
        .fullscreen-viewer-close.custom-style {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
            border: 2px solid #fff;
        }
        
        .fullscreen-viewer-close.custom-style:hover {
            background: linear-gradient(135deg, #ee5a24 0%, #d63031 100%);
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
            transform: scale(1.15) rotate(180deg);
        }
        
        .fullscreen-viewer-close.custom-style i {
            font-size: 18px;
            font-weight: bold;
        }
    `;
    document.head.appendChild(customStyle);

    window.fullscreenViewer.open({
        title: '自定义关闭按钮',
        content: '<div style="padding: 20px;">自定义样式的关闭按钮</div>',
        type: 'html'
    });

    // 应用自定义样式
    setTimeout(() => {
        const closeBtn = document.querySelector('.fullscreen-viewer-close');
        if (closeBtn) {
            closeBtn.classList.add('custom-style');
        }
    }, 500);
}

// 示例5: 关闭按钮交互测试
function exampleCloseButtonInteraction() {
    window.fullscreenViewer.open({
        title: '关闭按钮交互测试',
        content: `
            <div style="padding: 20px; text-align: center;">
                <h3>关闭按钮交互测试</h3>
                <p>尝试以下操作：</p>
                <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                    <li>点击关闭按钮</li>
                    <li>按 ESC 键</li>
                    <li>点击背景区域</li>
                </ul>
                <p style="margin-top: 20px; color: #666;">
                    观察关闭按钮的动画效果和交互反馈
                </p>
            </div>
        `,
        type: 'html',
        onClose: () => {
            console.log('全屏查看器已关闭');
        }
    });
}

// 示例6: 响应式关闭按钮
function exampleResponsiveCloseButton() {
    window.fullscreenViewer.open({
        title: '响应式关闭按钮',
        content: `
            <div style="padding: 20px;">
                <h3>响应式关闭按钮测试</h3>
                <p>在不同屏幕尺寸下测试关闭按钮的显示效果：</p>
                <ul>
                    <li>桌面端：40x40px 圆形按钮</li>
                    <li>移动端：36x36px 圆形按钮</li>
                    <li>触摸设备：更大的点击区域</li>
                </ul>
            </div>
        `,
        type: 'html'
    });
}

// 示例7: 关闭按钮主题适配
function exampleCloseButtonThemeAdaptation() {
    // 检测系统主题
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    window.fullscreenViewer.open({
        title: '主题适配关闭按钮',
        content: `
            <div style="padding: 20px;">
                <h3>主题适配测试</h3>
                <p>当前系统主题：${isDark ? '深色' : '浅色'}</p>
                <p>关闭按钮会自动适配当前主题：</p>
                <ul>
                    <li>深色主题：增强的阴影和对比度</li>
                    <li>浅色主题：柔和的阴影和颜色</li>
                </ul>
            </div>
        `,
        type: 'html'
    });
}

console.log('🎨 全屏查看器关闭按钮示例已加载');
console.log('💡 可用的示例函数:');
console.log('- exampleBasicFullscreen() - 基础全屏查看');
console.log('- exampleCloseButtonVariants() - 关闭按钮变体');
console.log('- exampleCloseButtonEffects() - 关闭按钮特效');
console.log('- exampleCustomCloseButton() - 自定义关闭按钮');
console.log('- exampleCloseButtonInteraction() - 关闭按钮交互测试');
console.log('- exampleResponsiveCloseButton() - 响应式关闭按钮');
console.log('- exampleCloseButtonThemeAdaptation() - 主题适配测试');
