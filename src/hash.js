export const ALGORITHMS = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

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

export function normalizeComparable(value, encoding) {
  const compact = value.trim().replace(/\s+/g, "");
  if (encoding === "base64") {
    return compact;
  }
  return compact.toLowerCase();
}

export function digestsMatch(actual, expected, encoding) {
  const right = normalizeComparable(expected, encoding);
  if (!right) {
    return null;
  }
  const left = normalizeComparable(actual, encoding);
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export function emptySha256() {
  return EMPTY_SHA256;
}
