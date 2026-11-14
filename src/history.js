export const HISTORY_KEY = "hash-bench-history-v2";
export const HISTORY_LIMIT = 8;
/** Text inputs longer than this are not stored, so the entry can't be restored. */
export const RESTORABLE_TEXT_LIMIT = 4096;
const LABEL_LENGTH = 42;

function isEntry(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.mode === "string" &&
    typeof value.algorithm === "string" &&
    typeof value.encoding === "string" &&
    typeof value.digestHex === "string" &&
    (value.text === null || typeof value.text === "string")
  );
}

export function loadHistory(storage = globalThis.sessionStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refuses the write (quota, privacy mode). */
export function saveHistory(entries, storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

let counter = 0;
function nextId() {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

/**
 * Builds a history entry. HMAC keys and messages are never stored: an HMAC
 * entry keeps only a label and the signature. Text is stored only when it is
 * short enough; files are never stored.
 */
export function makeEntry({ mode, algorithm, encoding, digestHex, text, file }) {
  let label;
  let storedText = null;
  if (file) {
    label = file.name;
  } else if (mode === "hmac") {
    label = `HMAC of ${text.length} character${text.length === 1 ? "" : "s"}`;
  } else {
    label = text === "" ? "Empty text" : text.length > LABEL_LENGTH ? `${text.slice(0, LABEL_LENGTH)}…` : text;
    if (text.length <= RESTORABLE_TEXT_LIMIT) storedText = text;
  }
  return {
    id: nextId(),
    createdAt: Date.now(),
    label,
    source: file ? "file" : "text",
    mode,
    algorithm,
    encoding,
    digestHex,
    text: storedText,
  };
}

export function addEntry(history, entry) {
  const [latest] = history;
  if (
    latest &&
    latest.digestHex === entry.digestHex &&
    latest.mode === entry.mode &&
    latest.algorithm === entry.algorithm &&
    latest.label === entry.label
  ) {
    return history;
  }
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}
