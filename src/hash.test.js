import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  digestBytes,
  digestsMatch,
  emptySha256,
  formatDigest,
  groupHex,
  hmacBytes,
  textBytes,
} from "./hash.js";

describe("digest", () => {
  it("hashes the empty string as the known SHA-256 value", async () => {
    const bytes = await digestBytes("SHA-256", textBytes(""));
    assert.equal(formatDigest(bytes, "hex"), emptySha256());
  });

  it("hashes abc", async () => {
    const bytes = await digestBytes("SHA-256", textBytes("abc"));
    assert.equal(
      formatDigest(bytes, "hex"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes characters outside ASCII", async () => {
    const first = formatDigest(await digestBytes("SHA-256", textBytes("héllo")), "hex");
    const second = formatDigest(await digestBytes("SHA-256", textBytes("héllo")), "hex");
    assert.equal(first, second);
    assert.notEqual(first, formatDigest(await digestBytes("SHA-256", textBytes("hello")), "hex"));
  });
});

describe("hmac", () => {
  it("matches the RFC 4231 SHA-256 case 1 vector", async () => {
    const bytes = await hmacBytes("SHA-256", textBytes("Jefe"), textBytes("what do ya want for nothing?"));
    assert.equal(
      formatDigest(bytes, "hex"),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });
});

describe("compare", () => {
  it("groups hex for display", () => {
    assert.equal(groupHex("e3b0c44298fc1c14"), "e3b0c442 98fc1c14");
  });

  it("ignores spaces and case in hex", () => {
    assert.equal(digestsMatch("E3B0C442 98FC", "e3b0c44298fc", "hex"), true);
  });

  it("reports a mismatch", () => {
    assert.equal(digestsMatch("abcd", "abce", "hex"), false);
  });

  it("does not ignore a non-hex character", () => {
    assert.equal(digestsMatch("abcd", "abcX", "hex"), false);
  });

  it("returns null when the expected digest is empty", () => {
    assert.equal(digestsMatch("abcd", "   ", "hex"), null);
  });

  it("compares base64 without lowercasing", () => {
    assert.equal(digestsMatch("abc+/w==", "abc+/w==", "base64"), true);
    assert.equal(digestsMatch("abc+/w==", "ABC+/W==", "base64"), false);
  });
});
