import { defineConfig } from "vitest/config";

export default defineConfig(async (env) => ({
    test: {
        dir: "src",
        includeSource: ["**/*.{js,ts}"],
        chaiConfig: {
            showDiff: true,
            includeStack: true,
            truncateThreshold: Infinity,
        },
    },
    define: {
        "import.meta.vitest": "undefined"
    },
}));
