import esbuild from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { buildId } from "./build-id.mjs";

const id = buildId();
const result = await esbuild.build({
  entryPoints: ["src/client/index.mjs"], bundle: true, platform: "browser",
  format: "cjs", target: "es2022", write: false, minify: false,
  external: ["react"],
  define: { __DSH_L_BUILD__: JSON.stringify(id) },
});
const output = "window.__ModuleLoader__.load({\n"
  + "\tid: \"dsh-l\",\n"
  + "\tfactory: (require) => {\n"
  + "\t\tvar module = { exports: {} };\n"
  + "\t\tvar exports = module.exports;\n"
  + "\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: \"Module\" });\n"
  + result.outputFiles[0].text + "\n"
  + "\t\treturn module.exports;\n"
  + "\t}\n"
  + "});\n"
  + "/* dsh-l-build:" + id + " */\n";
await mkdir("lib", { recursive: true });
await writeFile("lib/client.js", output, "utf8");
console.log("wrote lib/client.js build=" + id);
