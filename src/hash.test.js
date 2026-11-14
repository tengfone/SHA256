import { describe, expect, it } from "vitest";
import {
  digestBytes,
  digestsMatch,
  formatDigest,
  groupHex,
  hmacBytes,
  textBytes,
} from "./hash.js";

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("digest", () => {
  it("hashes the empty string as the known SHA-256 value", async () => {
    const bytes = await digestBytes("SHA-256", textBytes(""));
    expect(formatDigest(bytes, "hex")).toBe(EMPTY_SHA256);
  });

  it("hashes abc", async () => {
    const bytes = await digestBytes("SHA-256", textBytes("abc"));
    expect(formatDigest(bytes, "hex")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hashes characters outside ASCII", async () => {
    const first = formatDigest(await digestBytes("SHA-256", textBytes("héllo")), "hex");
    const second = formatDigest(await digestBytes("SHA-256", textBytes("héllo")), "hex");
    expect(first).toBe(second);
    expect(first).not.toBe(formatDigest(await digestBytes("SHA-256", textBytes("hello")), "hex"));
  });
});

describe("hmac", () => {
  it("matches the RFC 4231 SHA-256 case 1 vector", async () => {
    const bytes = await hmacBytes("SHA-256", textBytes("Jefe"), textBytes("what do ya want for nothing?"));
    expect(formatDigest(bytes, "hex")).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  });
});

describe("compare", () => {
  it("groups hex for display", () => {
    expect(groupHex("e3b0c44298fc1c14")).toBe("e3b0c442 98fc1c14");
  });

  it("ignores spaces and case in hex", () => {
    expect(digestsMatch("E3B0C442 98FC", "e3b0c44298fc", "hex")).toBe(true);
  });

  it("reports a mismatch", () => {
    expect(digestsMatch("abcd", "abce", "hex")).toBe(false);
  });

  it("does not ignore a non-hex character", () => {
    expect(digestsMatch("abcd", "abcX", "hex")).toBe(false);
  });

  it("returns null when the expected digest is empty", () => {
    expect(digestsMatch("abcd", "   ", "hex")).toBe(null);
  });

  it("compares base64 without lowercasing", () => {
    expect(digestsMatch("abc+/w==", "abc+/w==", "base64")).toBe(true);
    expect(digestsMatch("abc+/w==", "ABC+/W==", "base64")).toBe(false);
  });
});
