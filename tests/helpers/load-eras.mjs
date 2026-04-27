import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

export function loadErasData() {
  const code = fs.readFileSync(path.join(root, "data.js"), "utf8");
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(code, ctx);
  return ctx.window.ERAS_DATA;
}
