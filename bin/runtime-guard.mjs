import { assertSupportedRuntime } from "../lib/node-runtime.js";

// Evaluated before any later import in the bin. process.exit here skips
// modules that statically import node:sqlite.
assertSupportedRuntime();
