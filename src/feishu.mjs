// 飞书单向通知（design-v2 §13.3/§13.4）：自定义机器人 webhook（open.feishu.cn），msg_type=text。
// 尽力而为：未配置 webhook（getWebhook 空值/抛错）或网络失败 → {sent:false} 静默返回，绝不 throw、
// 绝不阻塞引擎；webhook URL 含 secret，仅经 credentials 读取（getWebhook 注入），不落日志。
export function formatNotice(evt) {
  if (evt?.type === "gate") {
    return "待拍板：" + (evt.key ?? "") + " " + (evt.title ?? "") + "（" + (evt.nodeId ?? "") + "）";
  }
  return "执行失败：" + (evt?.key ?? "") + " " + String(evt?.error ?? "").slice(0, 200);
}

export function makeFeishu({ fetch: f = globalThis.fetch, getWebhook } = {}) {
  return {
    async sendNotice(text) {
      let hook = null;
      try { hook = typeof getWebhook === "function" ? await getWebhook() : getWebhook ?? null; } catch { hook = null; }
      if (!hook) return { sent: false, reason: "webhook-not-configured" };
      try {
        const res = await f(hook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ msg_type: "text", content: { text } }),
        });
        const body = await res.json?.().catch(() => ({}));
        const ok = Boolean(res.ok) && (body?.code === undefined || body?.code === 0);
        return ok ? { sent: true } : { sent: false, reason: "http " + res.status + " code " + body?.code };
      } catch (err) {
        return { sent: false, reason: String(err?.message ?? err) };
      }
    },
    async testSend() { return this.sendNotice("DSH Loop Forge 测试消息"); },
  };
}
