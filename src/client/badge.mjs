// 侧栏 label 计数角标的可变持有者（design-v2 §13.2）：index.mjs 的 label 闭包读 count，
// workbench paint 时写入。宿主 label() 调用时机实测钉死；计数滞后一次刷新可接受。
export const badge = { count: 0 };
