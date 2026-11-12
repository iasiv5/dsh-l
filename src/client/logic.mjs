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
