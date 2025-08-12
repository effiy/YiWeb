// author: liangliang
// 工具库聚合出口（barrel）——非破坏性重构：统一对外导出，保留原有按文件导入方式

// 独立命名导出，保持树摇友好
export * from '/utils/baseView.js';
export * from '/utils/dom.js';
export * from '/utils/error.js';
export * from '/utils/events.js';
export * from '/utils/loading.js';
export * from '/utils/message.js';
export * from '/utils/performance.js';
export * from '/utils/date.js';
export * from '/utils/common.js';
export * from '/utils/template.js';

// 默认导出一个整合对象，便于一次性引入
import * as BaseView from '/utils/baseView.js';
import * as Dom from '/utils/dom.js';
import * as ErrorUtils from '/utils/error.js';
import * as Events from '/utils/events.js';
import * as Loading from '/utils/loading.js';
import * as Message from '/utils/message.js';
import * as Performance from '/utils/performance.js';
import * as DateUtils from '/utils/date.js';
import * as Common from '/utils/common.js';
import * as Template from '/utils/template.js';

const Utils = {
  BaseView,
  Dom,
  ErrorUtils,
  Events,
  Loading,
  Message,
  Performance,
  DateUtils,
  Common,
  Template,
};

export default Utils;

