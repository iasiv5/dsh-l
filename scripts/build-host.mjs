import esbuild from "esbuild";
import { mkdir } from "node:fs/promises";
import { buildId } from "./build-id.mjs";

await mkdir("lib", { recursive: true });
await esbuild.build({
  entryPoints: ["src/host.mjs"], outfile: "lib/host.js", bundle: true,
  format: "esm", platform: "node", target: "node22",
  external: ["@deepseek-ai/*", "cordis"],
  define: { __DSH_L_BUILD__: JSON.stringify(buildId()) },
});
console.log("wrote lib/host.js");
