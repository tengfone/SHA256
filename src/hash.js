export const ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];

/** Digest length in bytes for each supported algorithm. */
export const DIGEST_LENGTHS = {
  "SHA-1": 20,
  "SHA-256": 32,
  "SHA-384": 48,
  "SHA-512": 64,
};

export function hasWebCrypto() {
  return Boolean(globalThis.crypto && globalThis.crypto.subtle);
}

export function textBytes(text) {
  return new TextEncoder().encode(text);
}

export async function digestBytes(algorithm, bytes) {
  const buffer = await crypto.subtle.digest(algorithm, bytes);
  return new Uint8Array(buffer);
}

export async function hmacBytes(algorithm, keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, dataBytes);
  return new Uint8Array(signature);
}

export function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function formatDigest(bytes, encoding) {
  if (encoding === "base64") {
    return toBase64(bytes);
  }
  return toHex(bytes);
}

export function groupHex(hex) {
  return hex.replace(/(.{8})/g, "$1 ").trim();
}

export function hexToBytes(value) {
  if (!/^[0-9a-f]*$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Decodes standard or URL-safe base64, with or without padding. */
export function base64ToBytes(value) {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return null;
  const unpadded = value.replace(/=+$/, "");
  if (unpadded.length % 4 === 1) return null;
  if (value.includes("=") && value.length % 4 !== 0) return null;
  const standard = unpadded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

const KNOWN_LENGTHS = new Set(Object.values(DIGEST_LENGTHS));

function decodeCandidates(token) {
  const candidates = [];
  const hex = hexToBytes(token);
  if (hex && hex.length > 0) candidates.push({ encoding: "hex", bytes: hex });
  const base64 = base64ToBytes(token);
  if (base64 && base64.length > 0) candidates.push({ encoding: "base64", bytes: base64 });
  return candidates;
}

const BSD_LINE = /^([A-Za-z0-9-]+)\s*\((.*)\)\s*=\s*(\S+)$/;
const SUM_LINE = /^\\?(\S+) [ *]?(.+)$/;

/**
 * Parses a pasted digest. Accepts a bare hex or base64 digest (spaces and
 * line breaks are ignored), `sha256sum` output (`<hash>  file`, `<hash> *file`,
 * `<hash>  -`) and BSD style output (`SHA256 (file) = <hash>`).
 *
 * Returns `{ kind: "empty" }`, `{ kind: "invalid" }`, or
 * `{ kind: "ok", candidates, filename, algorithmHint }`, where each candidate is
 * one way of reading the digest (hex or base64) as bytes.
 */
export function parseExpectedDigest(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { kind: "empty" };

  const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim() !== "").trim();

  const bsd = firstLine.match(BSD_LINE);
  if (bsd) {
    const candidates = decodeCandidates(bsd[3]);
    if (candidates.length) {
      return { kind: "ok", candidates, filename: bsd[2], algorithmHint: bsd[1] };
    }
  }

  const sum = firstLine.match(SUM_LINE);
  if (sum) {
    const candidates = decodeCandidates(sum[1]);
    if (candidates.some((candidate) => KNOWN_LENGTHS.has(candidate.bytes.length))) {
      const filename = sum[2].trim();
      return { kind: "ok", candidates, filename: filename === "-" ? "standard input" : filename };
    }
  }

  const compact = trimmed.replace(/\s+/g, "");
  const candidates = decodeCandidates(compact);
  if (candidates.length) return { kind: "ok", candidates };

  return { kind: "invalid" };
}

function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function algorithmForLength(length) {
  return Object.keys(DIGEST_LENGTHS).find((name) => DIGEST_LENGTHS[name] === length);
}

/**
 * Compares computed digest bytes with a pasted digest, whatever encoding the
 * page is displaying. Returns `{ status, ... }` where status is one of
 * "empty", "invalid", "length", "match" or "mismatch".
 */
export function verifyDigest(actualBytes, input, algorithm) {
  const parsed = parseExpectedDigest(input);
  if (parsed.kind !== "ok") return { status: parsed.kind };

  const sameLength = parsed.candidates.filter(
    (candidate) => candidate.bytes.length === actualBytes.length,
  );
  if (sameLength.length === 0) {
    const lengths = parsed.candidates.map((candidate) => candidate.bytes.length);
    const guess = lengths.map(algorithmForLength).find(Boolean);
    return {
      status: "length",
      expectedLength: lengths[0],
      actualLength: actualBytes.length,
      looksLike: guess ?? null,
      algorithm,
    };
  }

  const match = sameLength.find((candidate) => bytesEqual(candidate.bytes, actualBytes));
  return {
    status: match ? "match" : "mismatch",
    encoding: (match ?? sameLength[0]).encoding,
    filename: parsed.filename ?? null,
  };
}
