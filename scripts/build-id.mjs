import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function buildId(root = "src") {
  const hash = createHash("sha256");
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else { hash.update(path); hash.update(readFileSync(path)); }
    }
  };
  walk(root);
  return hash.digest("hex").slice(0, 12);
}
