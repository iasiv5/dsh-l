import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const isProfileRoot = (dir) => {
  try {
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return Boolean(manifest.dsh && typeof manifest.dsh === "object" && "profile" in manifest.dsh);
  } catch {
    return false;
  }
};

export function findProfileRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (isProfileRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// bin.js 以位置参数接 profile 名（049 步骤 4：node bin.js <profile> --host … --port …），也兼容 --profile <name>。
function profileFromArgv(argv, dshHome) {
  const profiles = join(dshHome, "profiles");
  const flag = argv.indexOf("--profile");
  const names = flag >= 0 ? [argv[flag + 1]] : argv.slice(2).filter((a) => !a.startsWith("-"));
  for (const name of names) {
    if (name && isProfileRoot(join(profiles, name))) return join(profiles, name);
  }
  return undefined;
}

// home 语义 = DSH home（~/.dsh）；测试与宿主 argv 均按此传，OS 家目录仅在缺省时经 homedir() 拼 .dsh。
export function dataDir({ env = process.env, moduleUrl = import.meta.url, argv = process.argv, home } = {}) {
  if (env.DSH_L_DATA) {
    mkdirSync(env.DSH_L_DATA, { recursive: true, mode: 0o700 });
    return env.DSH_L_DATA;
  }
  let startDir = null;
  try { startDir = dirname(fileURLToPath(moduleUrl)); } catch {}
  const dshHome = env.DSH_HOME || home || join(homedir(), ".dsh");
  const profile = (startDir && findProfileRoot(startDir))
    ?? profileFromArgv(argv, dshHome);
  if (!profile || !existsSync(profile)) {
    throw new Error("dsh-l: 找不到所属 profile（模块位置与 argv 均未命中 dsh.profile 声明）；可用 DSH_L_DATA 指定数据目录");
  }
  const dir = join(profile, "data", "dsh-l");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
