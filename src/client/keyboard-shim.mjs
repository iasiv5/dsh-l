// 键盘事件原型语义补齐（鲁棒性 shim，2026-11-20 用户实测反馈驱动）：
// 页面上出现「new Event("keydown") 这类缺键盘语义的合成事件」时（常见于浏览器扩展的不规范派发），
// 宿主两个 window 级 keydown 处理器会因 event.key 为 undefined 抛 TypeError——
//   ① @deepseek-ai/dsh-client-ui-primitives/lib/index.js:1788（焦点导航，capture:true）
//   ② @deepseek-ai/dsh-client-shortcuts/src/client/dom.ts:78（快捷键守卫，getModifierState）
// 崩溃发生在会话列表渲染流程中 → 宿主「工作区」列表中断、F5 才恢复。
// 本补丁在 Event.prototype 补齐 W3C UI Events 对「无法识别按键」的标准语义（key="Unidentified"），
// 使宿主处理器安全早退——这是语义正确的补齐，不是吞错。
// 隔离性：真实键盘事件（KeyboardEvent.prototype 自带 key/isComposing/getModifierState/repeat）
// 经自有原型链解析，完全不受影响；宿主捕获监听先于本插件注册也无关——原型补齐与监听器注册顺序无关。
// 上游根治建议（一行守卫）已拟反馈文本；本 shim 为插件侧覆盖，上游修复后可移除。

export function installKeyboardPrototypeShim() {
  if (typeof Event === "undefined") return false;
  const proto = Event.prototype;
  if (Object.getOwnPropertyDescriptor(proto, "key")) return false;   // 已有语义（幂等）
  Object.defineProperty(proto, "key", {
    get() { return "Unidentified"; },   // W3C UI Events：无法识别的按键标准值 → 宿主处理器安全早退
    set(v) { Object.defineProperty(this, "key", { value: v, writable: true, configurable: true }); },
    configurable: true,
  });
  Object.defineProperty(proto, "isComposing", { get() { return false; }, configurable: true });
  Object.defineProperty(proto, "repeat", { get() { return false; }, configurable: true });
  Object.defineProperty(proto, "getModifierState", { value: () => false, configurable: true, writable: true });
  return true;
}
