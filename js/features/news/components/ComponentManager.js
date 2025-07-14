// 组件管理器 - 统一管理所有Vue组件

/**
 * 组件管理器
 * 负责加载和注册所有Vue组件
 * 提供统一的组件访问接口
 */
class ComponentManager {
    constructor() {
        this.components = new Map();
        this.loadOrder = [
            'Calendar',
            'TagStatistics', 
            'Sidebar',
            'NewsList',
            'SearchHeader'
        ];
    }

    /**
     * 异步加载组件
     * @param {string} componentName - 组件名称
     * @returns {Promise} 组件加载Promise
     */
    async loadComponent(componentName) {
        try {
            // 这里使用动态导入组件
            const componentPath = `./components/${componentName}.js`;
            const script = document.createElement('script');
            script.src = componentPath;
            script.async = true;
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    // 组件加载完成后，从全局作用域获取组件
                    const component = window[componentName];
                    if (component) {
                        this.components.set(componentName, component);
                        resolve(component);
                    } else {
                        reject(new Error(`Component ${componentName} not found`));
                    }
                };
                script.onerror = () => reject(new Error(`Failed to load component ${componentName}`));
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * 加载所有组件
     * @returns {Promise} 所有组件加载完成的Promise
     */
    async loadAllComponents() {
        const loadPromises = this.loadOrder.map(componentName => 
            this.loadComponent(componentName)
        );
        
        try {
            await Promise.all(loadPromises);
            console.log('All components loaded successfully');
            return this.components;
        } catch (error) {
            console.error('Failed to load some components:', error);
            throw error;
        }
    }

    /**
     * 获取组件
     * @param {string} componentName - 组件名称
     * @returns {Object} Vue组件对象
     */
    getComponent(componentName) {
        return this.components.get(componentName);
    }

    /**
     * 获取所有组件
     * @returns {Map} 所有组件的Map
     */
    getAllComponents() {
        return this.components;
    }

    /**
     * 注册组件到Vue应用
     * @param {Object} app - Vue应用实例
     */
    registerComponents(app) {
        this.components.forEach((component, name) => {
            app.component(name, component);
        });
    }

    /**
     * 检查组件是否已加载
     * @param {string} componentName - 组件名称
     * @returns {boolean} 是否已加载
     */
    isComponentLoaded(componentName) {
        return this.components.has(componentName);
    }

    /**
     * 获取组件统计信息
     * @returns {Object} 组件统计信息
     */
    getComponentStats() {
        return {
            total: this.components.size,
            loaded: Array.from(this.components.keys()),
            expected: this.loadOrder.length,
            missing: this.loadOrder.filter(name => !this.components.has(name))
        };
    }
}

// 导出组件管理器实例
const componentManager = new ComponentManager();

// 全局访问
window.ComponentManager = componentManager; 
