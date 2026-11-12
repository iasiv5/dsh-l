const GROUPS = [
  ["inbox", false], ["triaged", false], ["gating", false],
  ["building", true], ["shipped", true], ["closed", true],
];
const bucketOf = (stage) => {
  if (stage === "inbox" || stage === "triaged" || stage === "gating" || stage === "shipped") return stage;
  if (stage === "building" || stage === "verifying") return "building";
  return "closed";
};

export function groupCandidates(list, t) {
  const groups = GROUPS.map(([id, dim]) => ({ id, label: t("groups." + id), dim, items: [] }));
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const c of list ?? []) byId[bucketOf(c.stage)].items.push(c);
  return groups;
}

export function filterCandidates(list, { type = "all", repo = "all", urgency = "all" } = {}) {
  return (list ?? []).filter((c) =>
    (type === "all" || c.type === type)
    && (repo === "all" || c.repo === repo)
    && (urgency === "all" || (c.triage?.urgency ?? "") === urgency));
}

export function pickTriageBatch(list, filters = {}) {
  return filterCandidates(list, { type: filters.type ?? "all", repo: filters.repo ?? "all", urgency: "all" })
    .filter((c) => c.stage === "inbox").slice(0, 10).map((c) => c.key);
}

export function gateState(candidate) {
  return { G1: candidate?.stage === "gating", G2: false, G3: false };
}

export function stageCounts(list) {
  const all = list ?? [];
  const n = (pred) => all.filter(pred).length;
  return {
    ingest: all.length,
    backlog: n((c) => c.stage === "inbox"),
    triage: n((c) => Boolean(c.triage)),
    feedback: n((c) => c.stage === "gating"),
    build: n((c) => c.stage === "building"),
    verify: n((c) => c.stage === "verifying"),
    ship: n((c) => c.stage === "shipped"),
  };
}

const modelValueOf = (sel) => (sel ? sel.provider + "\n" + sel.model : "");

export function settingsPatch(initial, form) {
  const patch = { intervalMinutes: form.intervalMinutes };
  if (form.modelValue === modelValueOf(initial.triageModel)) return patch;
  if (form.modelValue === "") return { ...patch, triageModel: null };
  const cut = form.modelValue.indexOf("\n");
  return { ...patch, triageModel: { provider: form.modelValue.slice(0, cut), model: form.modelValue.slice(cut + 1) } };
}
