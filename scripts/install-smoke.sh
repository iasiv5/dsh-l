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

# 7. 业务探针：默认 12 仓；刷新返回 12 仓逐仓结果
hc "$BASE/dsh-l/state?token=$TOKEN" > "$EVID/state.json"
node -e 'const j=require(process.argv[1]);if(j.watch.repos.length!==12)throw new Error("watch="+j.watch.repos.length);' "$EVID/state.json" || fail "默认监看仓不是 12"
hc -H "content-type: application/json" -X POST -d '{}' "$BASE/dsh-l/refresh?token=$TOKEN" > "$EVID/refresh.json"
node -e 'const j=require(process.argv[1]);const n=Object.keys(j.perRepo||{}).length;if(n!==12)throw new Error("perRepo="+n);' "$EVID/refresh.json" || fail "刷新未覆盖 12 仓（见 refresh.json）"

# 7b. 模型目录探针（Task 10 的 /dsh-l/models 形状）
hc "$BASE/dsh-l/models?token=$TOKEN" > "$EVID/models.json"
node -e 'const j=require(process.argv[1]);if(!Array.isArray(j.providers))throw new Error("providers not array");if(!("hostDefault" in j))throw new Error("no hostDefault");' "$EVID/models.json" || fail "模型目录接口形状不符（见 models.json）"

# 8. 隔离探针：在役 profile 的 dsh-l 数据未被触碰
LIVE_AFTER="$(stat -c %Y "$LIVE_STORE" 2>/dev/null || echo absent)"
[ "$LIVE_BEFORE" = "$LIVE_AFTER" ] || fail "在役数据被改动（$LIVE_BEFORE → $LIVE_AFTER）"

# 9. UI 探针：侧栏入口 + 主栏工作台渲染 + 指纹
node "$ROOT/scripts/ui-probe.cjs" "$BASE/?token=$TOKEN" "$EVID" "$BUILD" || fail "UI 探针失败（见 probe.log / ui.png）"

echo "SMOKE PASS build=$BUILD evidence=$EVID" | tee -a "$EVID/result.txt"
