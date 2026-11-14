import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// jsdom replaces `crypto` with a version that has no SubtleCrypto.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
