// P1-2：动作 pending 态包装。执行期间禁用按钮并打 pending 标记；
// 成功路径通常已被全量重绘替换（isConnected=false，跳过恢复）；失败路径不重绘（P0 不变式），
// 必须在原按钮上恢复可用——错误行已由 go/act 就地呈现。
export function withPending(btn, fn) {
  return async (...args) => {
    if (btn.disabled) return;   // 重入保护（连点）
    btn.disabled = true;
    btn.dataset.pending = "1";
    btn.style.opacity = ".55";
    try {
      return await fn(...args);
    } finally {
      btn.dataset.pending = "";
      btn.style.opacity = "";
      if (btn.isConnected !== false) btn.disabled = false;
    }
  };
}
