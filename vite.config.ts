import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        target: "es2022",
        lib: {
            entry: "src/index.ts",
            name: "RimGlow",
            formats: ["es", "iife"],
            fileName: (format) => (format === "es" ? "rim-glow.js" : "rim-glow.iife.js"),
        },
    },
    plugins: [
        {
            name: "rim-glow-standalone-css",
            apply: "build",
            generateBundle() {
                this.emitFile({ type: "asset", fileName: "rim-glow.css", source: readFileSync("src/rim-glow.css", "utf8") });
            },
        },
    ],
});
