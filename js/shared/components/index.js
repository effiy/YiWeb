/**
 * 共享组件统一入口
 * author: liangliang
 * 
 * 提供所有共享组件的统一导出，简化导入过程
 */

// 导入所有组件
import { Button } from './Button.js';
import { Input } from './Input.js';

// 统一导出
export { Button, Input };

// 默认导出组件集合
export default {
    Button,
    Input
};

// 组件工厂函数
export const UI = {
    // 按钮工厂
    button: (options) => new Button(options),
    primaryButton: (text, onClick) => Button.primary(text, onClick),
    secondaryButton: (text, onClick) => Button.secondary(text, onClick),
    outlineButton: (text, onClick) => Button.outline(text, onClick),
    ghostButton: (text, onClick) => Button.ghost(text, onClick),
    
    // 输入框工厂
    input: (options) => new Input(options),
    textInput: (placeholder, options) => Input.text(placeholder, options),
    passwordInput: (placeholder, options) => Input.password(placeholder, options),
    emailInput: (placeholder, options) => Input.email(placeholder, options),
    searchInput: (placeholder, options) => Input.search(placeholder, options),
    textarea: (placeholder, options) => Input.textarea(placeholder, options),
};

// 快速创建函数（全局可用）
if (typeof window !== 'undefined') {
    window.UI = UI;
    
    // 为向后兼容性，也可以通过window.SharedComponents访问
    window.SharedComponents = {
        Button,
        Input,
        UI
    };
} 
