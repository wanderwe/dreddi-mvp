import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";

const originalJsLoader = Module._extensions[".js"];

Module._extensions[".ts"] = function (module, filename) {
  const source = readFileSync(filename, "utf8");
  const { outputText } = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2020,
      jsx: ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: path.basename(filename),
  });

  module._compile(outputText, filename);
};

Module._extensions[".tsx"] = Module._extensions[".ts"];
Module._extensions[".js"] = function (module, filename) {
  if (filename.endsWith(".ts")) {
    return Module._extensions[".ts"](module, filename);
  }

  return originalJsLoader(module, filename);
};
