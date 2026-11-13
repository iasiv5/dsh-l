#!/usr/bin/env bash
# dsh-l 隔离装机冒烟（know-how 049）。不触在役宿主：独立 profile + 3095 端口；证据落盘不删。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
EVID="/home/ubuntu/workspace/.dsh-research/dsh-l-smoke/$STAMP"
PROFILE="dsh-l-smoke-$STAMP"
PROFILE_DIR="$HOME/.dsh/profiles/$PROFILE"
LIVE_STORE="$HOME/.dsh/profiles/web/data/dsh-l/store.json"
DSH=/home/ubuntu/.local/share/pnpm/dsh
PNPM="$(command -v pnpm || echo /home/ubuntu/.local/share/pnpm/pnpm)"
RUNTIME_BIN=/home/ubuntu/.local/share/dsh-runtime/node_modules/@deepseek-ai/dsh/lib/bin.js
PORT=3095
BASE="http://127.0.0.1:$PORT"
mkdir -p "$EVID"
fail() { echo "FAIL: $*" | tee -a "$EVID/result.txt"; exit 1; }

cleanup() {
  if [ -f "$EVID/host.pid" ]; then kill "$(cat "$EVID/host.pid")" 2>/dev/null || true; fi
  if [ "$KEEP_PROFILE_FLAG" != "1" ] && [ -n "$PROFILE" ] && [ -d "$PROFILE_DIR" ]; then rm -rf "$PROFILE_DIR"; fi
}
KEEP_PROFILE_FLAG="$(printenv KEEP_PROFILE || echo 0)"
trap cleanup EXIT

# 0. 预检：产物存在、端口空闲、在役数据基线
[ -f "$ROOT/lib/host.js" ] && [ -f "$ROOT/lib/client.js" ] || fail "先 npm run build"
BUILD="$(grep -m1 -oE 'dsh-l-build:[0-9a-f]{12}' "$ROOT/lib/client.js" | cut -d: -f2)"
[ -n "$BUILD" ] || fail "client 缺构建指纹"
if curl -s -o /dev/null --max-time 2 "$BASE/"; then fail "端口 $PORT 已被占用"; fi
LIVE_BEFORE="$(stat -c %Y "$LIVE_STORE" 2>/dev/null || echo absent)"

# 1. 官方模板建 profile（3080 被在役宿主占用 → 模板首启 EADDRINUSE 退出属预期，049 步骤 1）
timeout 60 "$DSH" "$PROFILE" --from-default-profile web --no-open > "$EVID/profile-create.log" 2>&1 || true
[ -f "$PROFILE_DIR/cordis.yml" ] || fail "profile 未建成（见 profile-create.log）"

# 2. 装本地包，并核对装进去的就是刚构建的产物
(cd "$PROFILE_DIR" && "$PNPM" add "file:$ROOT") > "$EVID/pnpm-add.log" 2>&1 || fail "pnpm add 失败"
grep -q "dsh-l-build:$BUILD" "$PROFILE_DIR/node_modules/dsh-l/lib/client.js" || fail "装入产物指纹不符"

# 3. bundles 追加 dsh-l（装包 ≠ 挂载，049 坑位一）
node -e 'const fs=require("fs");const p=process.argv[1]+"/package.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));j.dsh.profile.bundles=[...new Set([...(j.dsh.profile.bundles||[]),"dsh-l"])];fs.writeFileSync(p,JSON.stringify(j,null,2));' "$PROFILE_DIR"

# 4. 隔离端口启动（脚本托管，trap 按精确 pid 收尾，不用 pkill，049 坑位三）
node "$RUNTIME_BIN" "$PROFILE" --host 127.0.0.1 --port "$PORT" --no-open > "$EVID/host.log" 2>&1 &
echo $! > "$EVID/host.pid"
for _ in $(seq 1 90); do grep -q "127.0.0.1:$PORT/?token=" "$EVID/host.log" && break; sleep 1; done
grep -q "127.0.0.1:$PORT/?token=" "$EVID/host.log" || fail "宿主未起（见 host.log）"
if grep -qE "did not activate|skipping profile bundle|waiting for service|disabling profile plugin row" "$EVID/host.log"; then fail "插件拒载或未激活（见 host.log）"; fi

# 5. token（含连字符，049 坑位二）→ cookie 会话；hc = 带 cookie 与同源头的 curl
TOKEN="$(grep -m1 -oE 'token=[A-Za-z0-9_-]+' "$EVID/host.log" | cut -d= -f2)"
JAR="$EVID/cookies.txt"
curl -s -c "$JAR" -o /dev/null "$BASE/?token=$TOKEN"
hc() { curl -s -b "$JAR" -H "origin: $BASE" -H "host: 127.0.0.1:$PORT" "$@"; }

# 6. 生效探针：health 回显同一指纹 + 数据目录落在 scratch profile
hc "$BASE/dsh-l/health?token=$TOKEN" > "$EVID/health.json"
node -e 'const j=require(process.argv[1]);if(j.build!==process.argv[2])throw new Error("build "+j.build+" != "+process.argv[2]);if(!String(j.dataDir).startsWith(process.argv[3]))throw new Error("dataDir "+j.dataDir+" 不在 scratch profile");' "$EVID/health.json" "$BUILD" "$PROFILE_DIR" || fail "health 指纹/数据目录不符（见 health.json）"

# 7. 业务探针：默认 12 仓；收活闸门（未绑定 refresh 401）→ 绑定本机 gh 账号 → 刷新返回 12 仓逐仓结果
hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state.json"
node -e 'const j=require(process.argv[1]);if(j.watch.repos.length!==12)throw new Error("watch="+j.watch.repos.length);if(!("auth" in j))throw new Error("no auth in state");' "$EVID/state.json" || fail "默认监看仓不是 12 或 state 缺 auth"
hc -H "content-type: application/json" -X POST -d '{}' "$BASE/dsh-l/refresh?token=$TOKEN" > "$EVID/refresh-gate.json"
node -e 'const j=require(process.argv[1]);if(j.error!=="auth-required")throw new Error(JSON.stringify(j));' "$EVID/refresh-gate.json" || fail "未绑定时 refresh 未被闸门拦截（见 refresh-gate.json）"
hc "$BASE/dsh-l/auth?token=$TOKEN" > "$EVID/auth.json"
node -e 'const j=require(process.argv[1]);if(typeof j.installed!=="boolean"||typeof j.tokenAvailable!=="boolean"||!("account" in j))throw new Error(JSON.stringify(j));' "$EVID/auth.json" || fail "auth 状态形状不符（见 auth.json）"
ACCOUNT="$(gh api user -q .login 2>/dev/null || echo iasiv5)"
hc -H "content-type: application/json" -X POST -d "{\"account\":\"$ACCOUNT\"}" "$BASE/dsh-l/auth/bind?token=$TOKEN" > "$EVID/bind.json"
node -e 'const j=require(process.argv[1]);if(j.login!==process.argv[2])throw new Error(JSON.stringify(j));' "$EVID/bind.json" "$ACCOUNT" || fail "GitHub 绑定失败（见 bind.json；本机需先 gh auth login）"
hc -H "content-type: application/json" -X POST -d '{}' "$BASE/dsh-l/refresh?token=$TOKEN" > "$EVID/refresh.json"
node -e 'const j=require(process.argv[1]);const n=Object.keys(j.perRepo||{}).length;if(n!==12)throw new Error("perRepo="+n);' "$EVID/refresh.json" || fail "刷新未覆盖 12 仓（见 refresh.json）"

# 7b. 模型目录探针（Task 10 的 /dsh-l/models 形状）
hc "$BASE/dsh-l/models?token=$TOKEN" > "$EVID/models.json"
node -e 'const j=require(process.argv[1]);if(!Array.isArray(j.providers))throw new Error("providers not array");if(!("hostDefault" in j))throw new Error("no hostDefault");' "$EVID/models.json" || fail "模型目录接口形状不符（见 models.json）"
node -e 'const j=require(process.argv[1]);if(!("sweep" in j))throw new Error("no sweep field");' "$EVID/refresh.json" || fail "refresh 缺 sweep 字段（上游回收未上线）"

# 7c. 全环探针（2026-11-13 契约对表后）：override → stage → G1 pass → 任务包 golden → state 回溯
hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state2.json"
KEY="$(node -e 'const j=require(process.argv[1]);const c=(j.candidates||[])[0];if(!c)throw new Error("no candidates");process.stdout.write(c.key);' "$EVID/state2.json" 2>/dev/null || true)"
[ -n "$KEY" ] || fail "刷新后无候选，无法走全环（见 state2.json）"
post() { hc --max-time 30 -H "content-type: application/json" -X POST -d "$2" "$BASE/dsh-l/$1?token=$TOKEN"; }
post candidate/override "{\"key\":\"$KEY\",\"validity\":\"high\",\"urgency\":\"P1\",\"action\":\"start\",\"reason\":\"smoke override\",\"lang\":\"zh-CN\"}" > "$EVID/override.json"
node -e 'const j=require(process.argv[1]);if(j.ok!==true)throw new Error(JSON.stringify(j));' "$EVID/override.json" || fail "override 失败（见 override.json）"
post candidate/stage "{\"key\":\"$KEY\",\"stage\":\"gating\",\"note\":\"smoke\"}" > "$EVID/stage.json"
node -e 'const j=require(process.argv[1]);if(j.ok!==true)throw new Error(JSON.stringify(j));' "$EVID/stage.json" || fail "stage 失败（见 stage.json）"
post candidate/gate "{\"key\":\"$KEY\",\"gate\":\"G1\",\"decision\":\"pass\",\"note\":\"smoke\"}" > "$EVID/gate.json"
node -e '
const j=require(process.argv[1]), key=process.argv[2];
const p=j.taskPackage; if(!p) throw new Error("no taskPackage: "+JSON.stringify(j));
const ek=Object.keys(p.emit).sort().join(",");
if(ek!=="id,link,subject,summary,type") throw new Error("emit keys: "+ek+"（信封外字段会被 autoloop 拒收）");
if(p.emit.type!=="build.requested"||p.emit.subject!==key||!p.emit.id) throw new Error("emit content: "+JSON.stringify(p.emit));
const gk=Object.keys(p.gate).sort().join(",");
if(gk!=="at,decision,gate,via") throw new Error("gate keys: "+gk);
if(!p.repo.defaultBranch||!String(p.repo.cloneUrl).startsWith("git@github.com:")) throw new Error("repo block: "+JSON.stringify(p.repo));
' "$EVID/gate.json" "$KEY" || fail "任务包 golden 不符（见 gate.json）"
hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state3.json"
node -e '
const j=require(process.argv[1]), key=process.argv[2];
const c=(j.candidates||[]).find(x=>x.key===key);
if(!c) throw new Error("candidate vanished");
if(c.stage!=="building") throw new Error("stage="+c.stage);
if(c.gates.G1?.decision!=="pass") throw new Error("gates.G1="+JSON.stringify(c.gates.G1));
if(!c.taskPackage) throw new Error("taskPackage 未挂候选");
const evs=c.history.map(h=>h.event);
if(!evs.includes("triage.human")) throw new Error("缺 override 落痕: "+evs.join(","));
if(!evs.includes("gate.G1")) throw new Error("缺 gate 落痕: "+evs.join(","));
if(!Array.isArray(j.ingestLog)||j.ingestLog.length<1) throw new Error("ingestLog 缺失");
' "$EVID/state3.json" "$KEY" || fail "state 回溯断言失败（见 state3.json）"

# 7d. 设置往返（PUT → GET 读取 → 归零；rearm 经 onSettingsChange 链路不打断服务即算通过）
hc --max-time 15 -H "content-type: application/json" -X PUT -d '{"intervalMinutes":5}' "$BASE/dsh-l/settings?token=$TOKEN" > "$EVID/settings5.json"
node -e 'const j=require(process.argv[1]);if(j.intervalMinutes!==5)throw new Error(JSON.stringify(j));' "$EVID/settings5.json" || fail "设置 PUT 5 失败"
hc "$BASE/dsh-l/settings?token=$TOKEN" > "$EVID/settings-get.json"
node -e 'const j=require(process.argv[1]);if(j.intervalMinutes!==5)throw new Error(JSON.stringify(j));' "$EVID/settings-get.json" || fail "设置读回不为 5（持久化断链）"
hc --max-time 15 -H "content-type: application/json" -X PUT -d '{"intervalMinutes":0}' "$BASE/dsh-l/settings?token=$TOKEN" > "$EVID/settings0.json"
node -e 'const j=require(process.argv[1]);if(j.intervalMinutes!==0)throw new Error(JSON.stringify(j));' "$EVID/settings0.json" || fail "设置归零失败"

# 7e. 真 LLM 分诊探针：happy path 或 fail-closed 落痕，二者必居其一才算接线正确
TKEY="$(node -e 'const j=require(process.argv[1]);const key=process.argv[2];const inbox=(j.candidates||[]).filter(c=>c.stage==="inbox");const c=inbox[0]||(j.candidates||[]).find(x=>x.key!==key);if(!c)process.exit(0);process.stdout.write(c.key);' "$EVID/state3.json" "$KEY")"
TRIAGE_VERDICT="skipped（无第二条候选）"
if [ -n "$TKEY" ]; then
  MODEL_ARG="$(node -e 'const j=require(process.argv[1]);for(const p of j.providers||[])for(const m of p.models||[]){process.stdout.write(JSON.stringify({provider:p.provider,model:m.id}));process.exit(0);}' "$EVID/models.json" 2>/dev/null || true)"
  if [ -n "$MODEL_ARG" ]; then
    hc --max-time 15 -H "content-type: application/json" -X PUT -d "{\"triageModel\":$MODEL_ARG}" "$BASE/dsh-l/settings?token=$TOKEN" > "$EVID/settings-model.json" || true
  fi
  hc --max-time 400 -H "content-type: application/json" -X POST -d "{\"keys\":[\"$TKEY\"],\"lang\":\"zh-CN\"}" "$BASE/dsh-l/triage?token=$TOKEN" > "$EVID/triage.json" || echo '{"error":"curl-failed"}' > "$EVID/triage.json"
  hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state4.json"
  TRIAGE_VERDICT="$(node -e '
  const fs=require("fs");
  const read=(f)=>{try{return JSON.parse(fs.readFileSync(f,"utf8"))}catch{return null}};
  const j=read(process.argv[1]), s=read(process.argv[2]), key=process.argv[3];
  const c=s&&(s.candidates||[]).find(x=>x.key===key);
  const evs=c?c.history.map(h=>h.event):[];
  if(j&&Array.isArray(j.updated)&&j.updated.includes(key)&&c&&c.triage&&c.triage.by==="llm"){
    process.stdout.write("PASS-happy（updated+by=llm，reason=\""+String(c.triage.reason||"").slice(0,40)+"\"）");process.exit(0);
  }
  if(j&&j.error&&evs.includes("triage.error")){
    const last=c.history.filter(h=>h.event==="triage.error").at(-1);
    process.stdout.write("PASS-fail-closed（502 error=\""+String(j.error).slice(0,60)+"\"，history triage.error=\""+String(last&&last.detail).slice(0,60)+"\"）");process.exit(0);
  }
  process.stdout.write("FAIL（resp="+(j?JSON.stringify(j).slice(0,120):"unparseable")+" events="+evs.join(",")+"）");process.exit(1);
  ' "$EVID/triage.json" "$EVID/state4.json" "$TKEY" || true)"
  case "$TRIAGE_VERDICT" in FAIL*) fail "真分诊接线不正确：$TRIAGE_VERDICT（见 triage.json / state4.json）";; esac
fi
echo "triage verdict: $TRIAGE_VERDICT" | tee -a "$EVID/result.txt"

# 7f. 退出账号：解绑后 refresh 重新被闸门拦截；监看配置保留
hc -H "content-type: application/json" -X POST -d '{}' "$BASE/dsh-l/auth/logout?token=$TOKEN" > "$EVID/logout.json"
node -e 'const j=require(process.argv[1]);if(j.ok!==true)throw new Error(JSON.stringify(j));' "$EVID/logout.json" || fail "logout 失败（见 logout.json）"
hc -H "content-type: application/json" -X POST -d '{}' "$BASE/dsh-l/refresh?token=$TOKEN" > "$EVID/refresh-gate2.json"
node -e 'const j=require(process.argv[1]);if(j.error!=="auth-required")throw new Error(JSON.stringify(j));' "$EVID/refresh-gate2.json" || fail "退出后 refresh 未回到闸门（见 refresh-gate2.json）"
hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state5.json"
node -e 'const j=require(process.argv[1]);if(j.auth.account!==null||j.watch.repos.length!==12)throw new Error("auth="+JSON.stringify(j.auth)+" watch="+j.watch.repos.length);' "$EVID/state5.json" || fail "退出未清绑定或误清监看配置（见 state5.json）"

# 8. 隔离探针：在役 profile 的 dsh-l 数据未被触碰
LIVE_AFTER="$(stat -c %Y "$LIVE_STORE" 2>/dev/null || echo absent)"
[ "$LIVE_BEFORE" = "$LIVE_AFTER" ] || fail "在役数据被改动（$LIVE_BEFORE → $LIVE_AFTER）"

# 9. UI 探针：侧栏入口 + 主栏工作台渲染 + 指纹
node "$ROOT/scripts/ui-probe.cjs" "$BASE/?token=$TOKEN" "$EVID" "$BUILD" || fail "UI 探针失败（见 probe.log / ui.png）"

echo "SMOKE PASS build=$BUILD evidence=$EVID" | tee -a "$EVID/result.txt"
