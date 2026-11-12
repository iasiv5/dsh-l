// en UI dictionary. Keys must stay in sync with zh-CN.mjs; these two files are the single source of UI copy.
export const en = {
  panelLabel: "L♾️p Engineering Workbench",
  refresh: "Refresh",
  refreshing: "Refreshing…",
  watchedRepos: "Watched repos",
  repoPicker: {
    title: "Choose repositories to watch",
    discover: "Discover from my GitHub account",
    addManually: "Add owner/repo manually",
    save: "Save",
  },
  groups: {
    inbox: "Inbox",
    triaged: "Triaged",
    gating: "Awaiting decision",
    building: "In progress",
    shipped: "Shipped",
  },
  filters: {
    all: "All",
    issues: "Issues",
    pullRequests: "PRs",
    repo: "Repository",
    urgency: "Urgency",
  },
  urgency: { P0: "P0 now", P1: "P1 high", P2: "P2 medium", P3: "P3 low" },
  validity: { high: "credible", medium: "doubtful", low: "not credible", none: "unrated" },
  recommendedActions: { start: "start", feedback: "await feedback", close: "close", hold: "hold" },
  gates: { G1: "before build", G2: "before ship", G3: "before release" },
  stages: {
    ingest: "Ingest",
    backlog: "Backlog",
    triage: "Triage",
    feedback: "Feedback gate",
    build: "Build",
    verify: "Verify",
    ship: "Ship",
  },
  emptyStates: {
    backlog: "No candidates. Refresh, or check the watched-repo list.",
    inbox: "Nothing waiting for triage.",
  },
  errors: {
    refreshFailed: "Refresh failed. Please retry later.",
    noToken: "No GitHub credential found: configure a token or sign in to gh on this machine.",
  },
  meta: { candidates: "candidates", lastRefreshAt: "Last refresh" },
}
