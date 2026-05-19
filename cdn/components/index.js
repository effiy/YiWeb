// Common Components - organized in category directories
export { default as YiButton } from './common/buttons/YiButton/index.js';
export { default as YiIconButton } from './common/buttons/YiIconButton/index.js';
export { default as YiTag } from './common/tags/YiTag/index.js';
export { default as YiModal } from './common/modals/YiModal/index.js';
export { default as YiSelect } from './common/forms/YiSelect/index.js';
export { default as YiInput } from './common/forms/YiInput/index.js';
export { default as YiTextarea } from './common/forms/YiTextarea/index.js';
export { default as YiLoading } from './common/loaders/YiLoading/index.js';
export { default as YiEmptyState } from './common/feedback/YiEmptyState/index.js';
export { default as YiErrorState } from './common/feedback/YiErrorState/index.js';
// ... more to come

// Business Components
export { default as SkeletonLoader } from './business/SkeletonLoader/index.js';
export { default as SearchHeader } from './business/SearchHeader/index.js';
export { default as HeaderActions } from './business/HeaderActions/index.js';
export { default as MarkdownView } from './business/MarkdownView/index.js';
// ... more to come

// Default export - object with all components
export default {
  YiButton,
  YiIconButton,
  YiTag,
  YiModal,
  YiSelect,
  YiInput,
  YiTextarea,
  YiLoading,
  YiEmptyState,
  YiErrorState,
  SearchHeader,
  HeaderActions,
  SkeletonLoader,
  MarkdownView
};
