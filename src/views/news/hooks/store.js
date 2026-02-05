/**
 * 新闻页面数据存储管理
 * author: liangliang
 */

import { buildServiceUrl, SERVICE_MODULE } from "/src/services/helper/requestHelper.js";
import { formatDate, isFutureDate } from "/src/utils/date.js";
import { safeExecuteAsync, createError, ErrorTypes } from "/src/utils/error.js";
import { extractDomainCategory } from "/src/utils/domain.js";

/**
 * 对新闻项进行分类
 * @param {Object} item - 新闻项
 * @returns {Object} 分类信息
 */
export const categorizeNewsItem = (item) => {
  if (!item) {
    return {
      key: "unknown",
      title: "未知来源",
      icon: "fas fa-question-circle",
      color: "#6c757d",
    };
  }

  // 使用域名分类作为主要分类方式
  return extractDomainCategory(item);
};

// 兼容Vue2和Vue3的ref获取方式
const vueRef =
  typeof Vue !== "undefined" && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理新闻数据、搜索状态、日期导航、加载状态和错误信息
 * @returns {Object} store对象，包含newsData, searchQuery, currentDate, loading, error等方法
 */
export const createStore = () => {
  // 新闻数据
  const newsData = vueRef([]);
  // 项目文件数据
  const projectFilesData = vueRef([]);
  // 搜索查询
  const searchQuery = vueRef("");
  // 当前选中的分类
  const selectedCategories = vueRef(new Set());
  // 当前选中的标签
  const selectedTags = vueRef(new Set());
  // 顶部分类（全部/每日清单/新闻/评论/项目文件）
  const activeCategory = vueRef("all");
  // 当前日期
  const currentDate = vueRef(new Date());
  // 日历月份
  const calendarMonth = vueRef(new Date());
  // 今天日期
  const today = vueRef(new Date());
  // 加载状态
  const loading = vueRef(false);
  // 错误信息
  const error = vueRef(null);
  // 错误消息
  const errorMessage = vueRef("");
  // 点击过的新闻项
  const clickedItems = vueRef(new Set());
  // 搜索历史
  const searchHistory = vueRef([]);
  // 侧边栏收缩状态
  const sidebarCollapsed = vueRef(false);
  // 已读新闻集合（本地持久化）
  const readItems = vueRef(new Set());
  // 收藏新闻集合（本地持久化）
  const favoriteItems = vueRef(new Set());
  const rssManagerOpen = vueRef(false);
  const rssSources = vueRef([]);
  const rssManagerBusy = vueRef(false);
  const rssFetchingNow = vueRef(false);
  const rssSourceFetchingKey = vueRef("");
  const rssSchedulerLoading = vueRef(false);
  const rssSchedulerEnabled = vueRef(false);
  const rssSchedulerType = vueRef("interval");
  const rssSchedulerIntervalMinutes = vueRef(60);
  const rssSchedulerCronMinute = vueRef("");
  const rssSchedulerCronHour = vueRef("");
  const rssSchedulerCronDayOfWeek = vueRef("");

  const buildExecUrl = (moduleName, methodName, params = {}) => {
    const parameters = encodeURIComponent(JSON.stringify(params || {}));
    return `${window.API_URL}/?module_name=${moduleName}&method_name=${methodName}&parameters=${parameters}`;
  };

  const normalizeOptionalInt = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  };

  const clampMinInt = (value, min) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.trunc(n));
  };

  const loadRssSchedulerStatus = async () => {
    return safeExecuteAsync(
      async () => {
        rssSchedulerLoading.value = true;
        const url = buildExecUrl(
          "services.rss.rss_scheduler",
          "get_scheduler_status_info",
          {},
        );
        const resp = await window.requestClient.get(url);
        const data = resp?.data || {};
        rssSchedulerEnabled.value = data.enabled === true;
        rssSchedulerType.value = data.type === "cron" ? "cron" : "interval";

        const intervalSeconds = Number(data.interval);
        const minutes =
          Number.isFinite(intervalSeconds) && intervalSeconds > 0
            ? Math.max(1, Math.round(intervalSeconds / 60))
            : 60;
        rssSchedulerIntervalMinutes.value = minutes;

        const cron = data.cron && typeof data.cron === "object" ? data.cron : {};
        const minute =
          cron.minute === 0 || Number.isFinite(Number(cron.minute))
            ? String(cron.minute ?? "")
            : "";
        const hour =
          cron.hour === 0 || Number.isFinite(Number(cron.hour))
            ? String(cron.hour ?? "")
            : "";
        const dow =
          cron.day_of_week === 0 || Number.isFinite(Number(cron.day_of_week))
            ? String(cron.day_of_week ?? "")
            : "";
        rssSchedulerCronMinute.value = minute;
        rssSchedulerCronHour.value = hour;
        rssSchedulerCronDayOfWeek.value = dow;
        return data;
      },
      "RSS定时状态加载",
      () => {
        rssSchedulerEnabled.value = false;
        rssSchedulerType.value = "interval";
        rssSchedulerIntervalMinutes.value = 60;
        rssSchedulerCronMinute.value = "";
        rssSchedulerCronHour.value = "";
        rssSchedulerCronDayOfWeek.value = "";
      },
    ).finally(() => {
      rssSchedulerLoading.value = false;
    });
  };

  const saveRssSchedulerSettings = async () => {
    return safeExecuteAsync(async () => {
      rssManagerBusy.value = true;
      const type = rssSchedulerType.value === "cron" ? "cron" : "interval";
      const enabled = rssSchedulerEnabled.value === true;

      const config = { type };
      if (type === "interval") {
        const minutes = clampMinInt(rssSchedulerIntervalMinutes.value, 1);
        config.interval = Math.max(60, minutes * 60);
      } else {
        const minute = normalizeOptionalInt(rssSchedulerCronMinute.value);
        const hour = normalizeOptionalInt(rssSchedulerCronHour.value);
        const dayOfWeek = normalizeOptionalInt(rssSchedulerCronDayOfWeek.value);
        if (minute === null && hour === null && dayOfWeek === null) {
          throw createError(
            "Cron 模式至少需要填写分钟/小时/星期中的一个",
            ErrorTypes.VALIDATION,
            "RSS定时设置保存",
          );
        }
        config.cron = {
          second: 0,
          ...(minute === null ? {} : { minute }),
          ...(hour === null ? {} : { hour }),
          ...(dayOfWeek === null ? {} : { day_of_week: dayOfWeek }),
        };
      }

      const configUrl = buildExecUrl(
        "services.rss.rss_scheduler",
        "set_scheduler_config",
        { config },
      );
      await window.requestClient.get(configUrl);

      const toggleUrl = buildExecUrl(
        "services.rss.rss_scheduler",
        enabled ? "start_rss_scheduler" : "stop_rss_scheduler",
        {},
      );
      await window.requestClient.get(toggleUrl);
      await loadRssSchedulerStatus();
      return true;
    }, "RSS定时设置保存").finally(() => {
      rssManagerBusy.value = false;
    });
  };

  const runRssFetchNow = async () => {
    return safeExecuteAsync(async () => {
      rssManagerBusy.value = true;
      rssFetchingNow.value = true;
      const url = buildExecUrl(
        "services.rss.rss_scheduler",
        "parse_all_enabled_rss_sources",
        {},
      );
      const resp = await window.requestClient.get(url, { timeout: 10 * 60 * 1000 });
      return resp?.data || {};
    }, "RSS手动抓取").finally(() => {
      rssFetchingNow.value = false;
      rssManagerBusy.value = false;
    });
  };

  const getRssSourceFetchKey = (source, idx) => {
    const key = source && source.key ? String(source.key) : "";
    if (key) return `key:${key}`;
    const url = source && source.url ? String(source.url).trim() : "";
    if (url) return `url:${url}`;
    return `idx:${String(idx)}`;
  };

  const runRssFetchSourceAt = async (idx) => {
    return safeExecuteAsync(async () => {
      if (!Array.isArray(rssSources.value)) rssSources.value = [];
      const i = Number(idx);
      if (!Number.isFinite(i) || i < 0 || i >= rssSources.value.length) {
        throw createError("订阅源索引无效", ErrorTypes.VALIDATION, "RSS单源抓取");
      }

      const source = rssSources.value[i] || {};
      const url = source.url ? String(source.url).trim() : "";
      if (!url) {
        throw createError("RSS URL 不能为空", ErrorTypes.VALIDATION, "RSS单源抓取");
      }
      const name = source.title ? String(source.title).trim() : "";

      rssSourceFetchingKey.value = getRssSourceFetchKey(source, i);
      rssManagerBusy.value = true;
      const execUrl = buildExecUrl("services.rss.feed_service", "parse_feed", {
        url,
        ...(name ? { name } : {}),
      });
      const resp = await window.requestClient.get(execUrl, { timeout: 10 * 60 * 1000 });
      return resp?.data || {};
    }, "RSS单源抓取").finally(() => {
      rssSourceFetchingKey.value = "";
      rssManagerBusy.value = false;
    });
  };

  let prevBodyOverflow = "";
  let escListener = null;

  const REQUEST_ABORT_KEYS = {
    news: "YiWeb.news.list",
    projectFiles: "YiWeb.projectFiles.list",
  };

  const parseDateParam = (value) => {
    if (!value || typeof value !== "string") return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
      return null;
    return dt;
  };

  const getUrlState = () => {
    try {
      const url = new URL(window.location.href);
      const dateStr = url.searchParams.get("date");
      const active = url.searchParams.get("cat");
      const q = url.searchParams.get("q");
      return {
        date: parseDateParam(dateStr),
        activeCategory: active ? String(active) : null,
        searchQuery: q ? String(q) : "",
      };
    } catch (_) {
      return { date: null, activeCategory: null, searchQuery: "" };
    }
  };

  const applyUrlState = (nextState = {}) => {
    if (nextState.date instanceof Date) {
      currentDate.value = new Date(nextState.date);
      calendarMonth.value = new Date(
        nextState.date.getFullYear(),
        nextState.date.getMonth(),
        1,
      );
    }
    if (typeof nextState.searchQuery === "string") {
      searchQuery.value = nextState.searchQuery.trim();
    }
    if (typeof nextState.activeCategory === "string") {
      const allowed = new Set([
        "all",
        "dailyChecklist",
        "news",
        "comments",
        "projectFiles",
      ]);
      if (allowed.has(nextState.activeCategory)) {
        activeCategory.value = nextState.activeCategory;
      }
    }
  };

  /**
   * 异步加载新闻数据
   * 支持多次调用，自动处理加载状态和错误
   */
  const loadNewsData = async (date) => {
    return safeExecuteAsync(
      async () => {
        loading.value = true;
        error.value = null;
        errorMessage.value = "";

        const targetDate = date || currentDate.value;
        const dateStr = formatDate(targetDate);

        if (isFutureDate(targetDate, today.value)) {
          throw createError(
            "无法查看未来日期的新闻",
            ErrorTypes.VALIDATION,
            "新闻加载",
          );
        }

        console.log(`[loadNewsData] 正在加载 ${dateStr} 的新闻数据...`);

        const rssUrl = buildServiceUrl("query_documents", {
          cname: "rss",
          isoDate: `${dateStr},${dateStr}`,
        });
        const response = await window.requestClient.get(rssUrl, {
          abortKey: REQUEST_ABORT_KEYS.news,
        });
        const data = response.data.list;

        if (!Array.isArray(data)) {
          throw createError("新闻数据格式错误", ErrorTypes.API, "新闻加载");
        }

        newsData.value = data;
        console.log(`[loadNewsData] 成功加载 ${data.length} 条新闻数据`);

        return data;
      },
      "新闻数据加载",
      (errorInfo) => {
        error.value = errorInfo.message;
        errorMessage.value = errorInfo.message;
        newsData.value = [];
      },
    ).finally(() => {
      loading.value = false;
    });
  };

  /**
   * 异步加载项目文件数据
   * 使用updatedTime字段进行日期搜索
   */
  const loadProjectFilesData = async (date) => {
    return safeExecuteAsync(
      async () => {
        loading.value = true;
        error.value = null;
        errorMessage.value = "";

        const targetDate = date || currentDate.value;
        const dateStr = formatDate(targetDate);

        if (isFutureDate(targetDate, today.value)) {
          throw createError(
            "无法查看未来日期的项目文件",
            ErrorTypes.VALIDATION,
            "项目文件加载",
          );
        }

        console.log(
          `[loadProjectFilesData] 正在加载 ${dateStr} 的项目文件数据...`,
        );

        projectFilesData.value = [];
        console.log("[loadProjectFilesData] 已跳过 projectVersionFiles 请求");
        return [];
      },
      "项目文件数据加载",
      (errorInfo) => {
        error.value = errorInfo.message;
        errorMessage.value = errorInfo.message;
        projectFilesData.value = [];
      },
    ).finally(() => {
      loading.value = false;
    });
  };

  /**
   * 从本地存储恢复状态
   */
  const restorePersistence = () => {
    try {
      const readRaw = localStorage.getItem("newsReadItems");
      const favRaw = localStorage.getItem("newsFavoriteItems");
      if (readRaw) {
        const parsed = JSON.parse(readRaw);
        if (Array.isArray(parsed)) {
          readItems.value = new Set(parsed);
        }
      }
      if (favRaw) {
        const parsed = JSON.parse(favRaw);
        if (Array.isArray(parsed)) {
          favoriteItems.value = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn("[news/store] 恢复本地持久化失败", e);
    }
  };

  const restoreRssSources = () => {
    return safeExecuteAsync(
      async () => {
        const url = buildServiceUrl("query_documents", {
          cname: "seeds",
          pageSize: 2000,
          orderBy: "createdTime",
          orderType: "desc",
        });
        const response = await window.requestClient.get(url);
        const list = response?.data?.list || [];
        rssSources.value = Array.isArray(list)
          ? list.map((it) => ({
              key: it && it.key ? String(it.key) : "",
              title: it && it.name ? String(it.name) : "",
              url: it && it.url ? String(it.url) : "",
              enabled: it && typeof it.enabled === "boolean" ? it.enabled : true,
              origin_url: it && it.url ? String(it.url) : "",
            }))
          : [];
        return rssSources.value;
      },
      "RSS订阅源加载",
      () => {
        rssSources.value = [];
      },
    );
  };

  const openRssManager = () => {
    rssManagerOpen.value = true;
    restoreRssSources();
    loadRssSchedulerStatus();
    try {
      prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch (_) {}
    if (!escListener) {
      escListener = (e) => {
        if (e && e.key === "Escape") {
          closeRssManager();
        }
      };
      try {
        document.addEventListener("keydown", escListener);
      } catch (_) {}
    }
  };

  const closeRssManager = () => {
    rssManagerOpen.value = false;
    try {
      document.body.style.overflow = prevBodyOverflow || "";
    } catch (_) {}
    if (escListener) {
      try {
        document.removeEventListener("keydown", escListener);
      } catch (_) {}
      escListener = null;
    }
  };

  const addRssSource = () => {
    if (!Array.isArray(rssSources.value)) rssSources.value = [];
    rssSources.value.unshift({
      key: "",
      title: "",
      url: "",
      enabled: true,
      origin_url: "",
    });
  };

  const deleteRssSourceAt = async (idx) => {
    return safeExecuteAsync(async () => {
      if (!Array.isArray(rssSources.value)) return;
      const i = Number(idx);
      if (!Number.isFinite(i) || i < 0 || i >= rssSources.value.length) return;

      const target = rssSources.value[i] || {};
      const key = target.key ? String(target.key) : "";
      const originUrl = target.origin_url ? String(target.origin_url) : "";
      const url = target.url ? String(target.url) : "";

      if (key || originUrl || url) {
        const payload = {
          module_name: SERVICE_MODULE,
          method_name: "delete_document",
          parameters: {
            cname: "seeds",
            ...(key ? { key } : {}),
            ...(!key && originUrl ? { origin_url: originUrl } : {}),
            ...(!key && !originUrl && url ? { url } : {}),
          },
        };
        await window.requestClient.post(`${window.API_URL}/`, payload);
      }

      rssSources.value.splice(i, 1);
    }, "RSS订阅源删除");
  };

  const saveRssSources = async () => {
    return safeExecuteAsync(async () => {
      rssManagerBusy.value = true;
      if (!Array.isArray(rssSources.value)) {
        rssSources.value = [];
      }

      const normalized = rssSources.value.map((it) => ({
        key: it && it.key ? String(it.key) : "",
        title: it && it.title ? String(it.title).trim() : "",
        url: it && it.url ? String(it.url).trim() : "",
        enabled: it && typeof it.enabled === "boolean" ? it.enabled : true,
        origin_url: it && it.origin_url ? String(it.origin_url) : "",
      }));

      const urls = new Set();
      for (const item of normalized) {
        if (!item.url) {
          throw createError("RSS URL 不能为空", ErrorTypes.VALIDATION, "RSS订阅源保存");
        }
        if (urls.has(item.url)) {
          throw createError(`RSS URL 重复: ${item.url}`, ErrorTypes.VALIDATION, "RSS订阅源保存");
        }
        urls.add(item.url);
      }

      for (const item of normalized) {
        if (item.key) {
          const payload = {
            module_name: SERVICE_MODULE,
            method_name: "update_document",
            parameters: {
              cname: "seeds",
              data: {
                key: item.key,
                name: item.title,
                url: item.url,
                enabled: item.enabled,
              },
            },
          };
          await window.requestClient.post(`${window.API_URL}/`, payload);
          continue;
        }

        if (item.origin_url) {
          const payload = {
            module_name: SERVICE_MODULE,
            method_name: "update_document",
            parameters: {
              cname: "seeds",
              data: {
                origin_url: item.origin_url,
                name: item.title,
                url: item.url,
                enabled: item.enabled,
              },
            },
          };
          await window.requestClient.post(`${window.API_URL}/`, payload);
          continue;
        }

        const payload = {
          module_name: SERVICE_MODULE,
          method_name: "create_document",
          parameters: {
            cname: "seeds",
            data: {
              name: item.title,
              url: item.url,
              enabled: item.enabled,
            },
          },
        };
        const resp = await window.requestClient.post(`${window.API_URL}/`, payload);
        const createdKey = resp?.data?.key ? String(resp.data.key) : "";
        item.key = createdKey;
        item.origin_url = item.url;
      }

      rssSources.value = normalized;
      await restoreRssSources();
      return rssSources.value;
    }, "RSS订阅源保存").finally(() => {
      rssManagerBusy.value = false;
    });
  };

  /**
   * 保存已读集合到本地
   */
  const persistRead = () => {
    try {
      localStorage.setItem(
        "newsReadItems",
        JSON.stringify(Array.from(readItems.value)),
      );
    } catch (e) {
      console.warn("[news/store] 保存已读状态失败", e);
    }
  };

  /**
   * 保存收藏集合到本地
   */
  const persistFavorites = () => {
    try {
      localStorage.setItem(
        "newsFavoriteItems",
        JSON.stringify(Array.from(favoriteItems.value)),
      );
    } catch (e) {
      console.warn("[news/store] 保存收藏状态失败", e);
    }
  };

  /**
   * 标记新闻为已读
   * @param {string} itemKey
   */
  const markItemRead = (itemKey) => {
    if (!itemKey) return;
    readItems.value.add(itemKey);
    persistRead();
  };

  /**
   * 切换收藏
   * @param {string} itemKey
   */
  const toggleFavorite = (itemKey) => {
    if (!itemKey) return;
    if (favoriteItems.value.has(itemKey)) {
      favoriteItems.value.delete(itemKey);
    } else {
      favoriteItems.value.add(itemKey);
    }
    persistFavorites();
  };

  /**
   * 设置搜索查询
   * @param {string} query - 搜索查询
   */
  const setSearchQuery = (query) => {
    if (typeof query === "string") {
      searchQuery.value = query.trim();
    }
  };

  /**
   * 切换分类选择
   * @param {string} category - 分类名称
   */
  const toggleCategory = (category) => {
    if (selectedCategories.value.has(category)) {
      selectedCategories.value.delete(category);
    } else {
      selectedCategories.value.add(category);
    }
  };

  /**
   * 切换标签选择
   * @param {string} tag - 标签名称
   */
  const toggleTag = (tag) => {
    if (selectedTags.value.has(tag)) {
      selectedTags.value.delete(tag);
    } else {
      selectedTags.value.add(tag);
    }
  };

  /**
   * 设置当前日期
   * @param {Date} date - 日期对象
   */
  const setCurrentDate = (date) => {
    if (date instanceof Date) {
      currentDate.value = new Date(date);
    }
  };

  /**
   * 设置日历月份
   * @param {Date} date - 月份日期
   */
  const setCalendarMonth = (date) => {
    if (date instanceof Date) {
      calendarMonth.value = new Date(date.getFullYear(), date.getMonth(), 1);
    }
  };

  /**
   * 切换侧边栏状态
   */
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  /**
   * 添加点击的新闻项
   * @param {string} itemKey - 新闻项标识
   */
  const addClickedItem = (itemKey) => {
    clickedItems.value.add(itemKey);
    setTimeout(() => clickedItems.value.delete(itemKey), 300);
  };

  /**
   * 添加搜索历史
   * @param {string} query - 搜索查询
   */
  const addSearchHistory = (query) => {
    if (query && !searchHistory.value.includes(query)) {
      searchHistory.value.unshift(query);
      searchHistory.value = searchHistory.value.slice(0, 10);
    }
  };

  /**
   * 清空搜索
   */
  const clearSearch = () => {
    searchQuery.value = "";
    selectedCategories.value.clear();
    selectedTags.value.clear();
  };

  /**
   * 清空错误
   */
  const clearError = () => {
    error.value = null;
    errorMessage.value = "";
  };

  /**
   * 设置顶部分类
   * @param {('all'|'dailyChecklist'|'news'|'comments'|'projectFiles')} key
   */
  const setActiveCategory = (key) => {
    const allowed = new Set([
      "all",
      "dailyChecklist",
      "news",
      "comments",
      "projectFiles",
    ]);
    if (allowed.has(key)) {
      activeCategory.value = key;
    }
  };

  const initFromUrlAndLoad = () => {
    const urlState = getUrlState();
    applyUrlState(urlState);
    setTimeout(() => {
      if (activeCategory.value === "projectFiles") {
        loadProjectFilesData(currentDate.value);
      } else if (activeCategory.value === "news") {
        loadNewsData(currentDate.value);
      } else {
        loadNewsData(currentDate.value);
        loadProjectFilesData(currentDate.value);
      }
    }, 100);
  };

  initFromUrlAndLoad();

  try {
    window.addEventListener("popstate", () => {
      const urlState = getUrlState();
      applyUrlState(urlState);
      if (activeCategory.value === "projectFiles") {
        loadProjectFilesData(currentDate.value);
      } else if (activeCategory.value === "news") {
        loadNewsData(currentDate.value);
      } else {
        loadNewsData(currentDate.value);
        loadProjectFilesData(currentDate.value);
      }
    });
  } catch (_) {}

  // 恢复本地持久化
  restorePersistence();

  // 返回状态和方法
  return {
    // 响应式数据
    newsData,
    projectFilesData,
    searchQuery,
    selectedCategories,
    selectedTags,
    activeCategory,
    currentDate,
    calendarMonth,
    today,
    loading,
    error,
    errorMessage,
    clickedItems,
    searchHistory,
    sidebarCollapsed,
    readItems,
    favoriteItems,
    rssManagerOpen,
    rssSources,
    rssManagerBusy,
    rssFetchingNow,
    rssSourceFetchingKey,
    rssSchedulerLoading,
    rssSchedulerEnabled,
    rssSchedulerType,
    rssSchedulerIntervalMinutes,
    rssSchedulerCronMinute,
    rssSchedulerCronHour,
    rssSchedulerCronDayOfWeek,

    // 方法
    loadNewsData,
    loadProjectFilesData,
    setSearchQuery,
    toggleCategory,
    toggleTag,
    setCurrentDate,
    setCalendarMonth,
    toggleSidebar,
    addClickedItem,
    addSearchHistory,
    clearSearch,
    clearError,
    setActiveCategory,
    // 持久化相关
    markItemRead,
    toggleFavorite,
    openRssManager,
    closeRssManager,
    addRssSource,
    deleteRssSourceAt,
    saveRssSources,
    loadRssSchedulerStatus,
    saveRssSchedulerSettings,
    runRssFetchNow,
    runRssFetchSourceAt,
    getRssSourceFetchKey,
  };
};
