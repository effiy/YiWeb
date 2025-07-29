/**
 * 字符串模板替换函数（支持嵌套属性、健壮性更强）
 * @param {string} template - 含有 {{ key }} 占位符的字符串
 * @param {Object} data - 替换用的键值对对象
 * @returns {string} 替换后的字符串
 *
 * 示例：
 *   templateReplace('你好，{{ name }}！', { name: '小明' }) // '你好，小明！'
 *   templateReplace('城市：{{ user.city }}', { user: { city: '北京' } }) // '城市：北京'
 */
function templateReplace(template, data) {
  if (typeof template !== 'string' || typeof data !== 'object' || data === null) return template;
  return template.replace(/\{\{\s*([\w$.]+)\s*\}\}/g, (match, key) => {
      // 支持嵌套属性，如 user.name.first
      const value = key.split('.').reduce((obj, prop) => (obj && obj[prop] !== undefined ? obj[prop] : undefined), data);
      return value !== undefined && value !== null ? value : match;
  });
}
