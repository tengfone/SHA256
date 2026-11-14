import { describe, expect, it } from "vitest";
import { addEntry, HISTORY_KEY, loadHistory, makeEntry, RESTORABLE_TEXT_LIMIT, saveHistory } from "./history.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    data,
  };
}

const base = { algorithm: "SHA-256", encoding: "hex", digestHex: "ab", file: null };

describe("history entries", () => {
  it("stores short text so it can be restored", () => {
    const entry = makeEntry({ ...base, mode: "hash", text: "hello" });
    expect(entry).toMatchObject({ label: "hello", text: "hello", source: "text" });
  });

  it("does not store long text", () => {
    const entry = makeEntry({ ...base, mode: "hash", text: "x".repeat(RESTORABLE_TEXT_LIMIT + 1) });
    expect(entry.text).toBeNull();
    expect(entry.label.length).toBeLessThan(50);
  });

  it("never stores HMAC messages or keys", () => {
    const entry = makeEntry({ ...base, mode: "hmac", text: "secret message", key: "k3y" });
    expect(entry.text).toBeNull();
    expect(entry.label).toBe("HMAC of 14 characters");
    expect(JSON.stringify(entry)).not.toMatch(/secret|k3y/);
  });

  it("stores only the name of a file", () => {
    const entry = makeEntry({ ...base, mode: "hash", text: "", file: { name: "a.iso", bytes: new Uint8Array(4) } });
    expect(entry).toMatchObject({ label: "a.iso", text: null, source: "file" });
  });

  it("skips a duplicate of the latest entry", () => {
    const entry = makeEntry({ ...base, mode: "hash", text: "a" });
    const list = addEntry([], entry);
    expect(addEntry(list, makeEntry({ ...base, mode: "hash", text: "a" }))).toBe(list);
  });
});

describe("history storage", () => {
  it("round-trips entries and drops malformed ones", () => {
    const storage = memoryStorage();
    const entry = makeEntry({ ...base, mode: "hash", text: "a" });
    expect(saveHistory([entry], storage)).toBe(true);
    storage.data[HISTORY_KEY] = JSON.stringify([entry, { id: 1 }, null]);
    expect(loadHistory(storage)).toEqual([entry]);
  });

  it("survives unreadable or unwritable storage", () => {
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: "{not json" }))).toEqual([]);
    const full = {
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(saveHistory([], full)).toBe(false);
  });
});
