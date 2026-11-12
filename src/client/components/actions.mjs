import { api } from "../api.mjs";
import { pickTriageBatch, gateState } from "../logic.mjs";
import { openRepoPicker } from "./repoPicker.mjs";
import { renderStrip } from "./pipelineStrip.mjs";

const btn = (text, onClick, disabled = false) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = text; b.disabled = disabled; b.onclick = onClick;
  return b;
};
const sel = (pairs, value) => {
  const s = document.createElement("select");
  for (const [v, text] of pairs) { const o = document.createElement("option"); o.value = v; o.textContent = text; s.append(o); }
  s.value = value;
  return s;
};
const row = () => { const d = document.createElement("div"); d.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center"; return d; };
const copy = (obj) => navigator.clipboard?.writeText(JSON.stringify(obj, null, 2)).catch(() => {});

export function installActions({ getLang }) {
  const run = (view) => async (fn) => {
    try { await fn(); } catch (e) { console.warn("[dsh-l]", e); }
    await view.reload();
  };
  return {
    header(header, { t, state, view }) {
      header.append(btn(t("watchedRepos"), () => openRepoPicker(view.shadow, { t, current: state?.watch?.repos ?? [], onSaved: () => view.refresh() })));
    },
    strip(container, { t, state }) { renderStrip(container, { t, candidates: state?.candidates ?? [] }); },
    bar(bar, { t, state, filters, view }) {
      const keys = pickTriageBatch(state?.candidates ?? [], filters);
      bar.append(btn(t("actions.triageBatch") + " (" + keys.length + ")", () => run(view)(() => api.triage(keys, getLang())), keys.length === 0));
    },
    rowActions(detail, c, { t, view, lang }) {
      const go = run(view);
      const tr = c.triage ?? { validity: "medium", urgency: "P2", action: "hold", reason: "" };
      const v = sel(["high", "medium", "low"].map((x) => [x, t("validity." + x)]), tr.validity);
      const u = sel(["P0", "P1", "P2", "P3"].map((x) => [x, t("urgency." + x)]), tr.urgency);
      const a = sel(["start", "feedback", "close", "hold"].map((x) => [x, t("recommendedActions." + x)]), tr.action);
      const reason = document.createElement("input");
      reason.value = tr.reason ?? "";
      reason.placeholder = t("actions.reason");
      const override = row();
      override.append(v, u, a, reason, btn(t("actions.override"), () => go(() => api.override({ key: c.key, validity: v.value, urgency: u.value, action: a.value, reason: reason.value, lang }))));
      const stages = row();
      for (const s of ["triaged", "gating", "held", "closed"]) {
        const label = s === "held" ? t("recommendedActions.hold") : t("groups." + s);
        stages.append(btn(t("actions.moveTo") + " " + label, () => go(() => api.stage(c.key, s, "")), c.stage === s));
      }
      const gates = row();
      const g = gateState(c);
      gates.append(
        btn("G1 " + t("gates.G1") + " · " + t("actions.pass"), () => go(async () => { const r = await api.gate(c.key, "G1", "pass", ""); if (r.taskPackage) await copy(r.taskPackage); }), !g.G1),
        btn("G1 · " + t("actions.reject"), () => go(() => api.gate(c.key, "G1", "reject", "")), !g.G1),
        btn("G2 " + t("gates.G2"), () => {}, true),
        btn("G3 " + t("gates.G3"), () => {}, true),
      );
      if (c.taskPackage) gates.append(btn(t("actions.copyPackage"), () => copy(c.taskPackage)));
      const hint = document.createElement("small");
      hint.textContent = t("gateV1Hint");
      detail.append(override, stages, gates, hint);
    },
  };
}
