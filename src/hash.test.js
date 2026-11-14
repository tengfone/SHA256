import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  digestBytes,
  formatDigest,
  groupHex,
  hexToBytes,
  hmacBytes,
  parseExpectedDigest,
  textBytes,
  verifyDigest,
} from "./hash.js";

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

async function hex(algorithm, text) {
  return formatDigest(await digestBytes(algorithm, textBytes(text)), "hex");
}

describe("digest", () => {
  it.each([
    ["SHA-1", "", "da39a3ee5e6b4b0d3255bfef95601890afd80709"],
    ["SHA-1", "abc", "a9993e364706816aba3e25717850c26c9cd0d89d"],
    ["SHA-256", "", EMPTY_SHA256],
    ["SHA-256", "abc", ABC_SHA256],
    ["SHA-256", "héllo", "3c48591d8d098a4538f5e013dfcf406e948eac4d3277b10bf614e295d6068179"],
    [
      "SHA-384",
      "",
      "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
    ],
    [
      "SHA-384",
      "abc",
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
    ],
    [
      "SHA-512",
      "",
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    ],
    [
      "SHA-512",
      "abc",
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    ],
  ])("%s(%j) matches the known vector", async (algorithm, input, expected) => {
    expect(await hex(algorithm, input)).toBe(expected);
  });

  it("encodes text as UTF-8", () => {
    expect(Array.from(textBytes("é"))).toEqual([0xc3, 0xa9]);
  });

  it.each([
    ["SHA-1", "qZk+NkcGgWq6PiVxeFDCbJzQ2J0="],
    ["SHA-256", "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0="],
    ["SHA-512", "3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw=="],
  ])("formats %s(abc) as base64", async (algorithm, expected) => {
    expect(formatDigest(await digestBytes(algorithm, textBytes("abc")), "base64")).toBe(expected);
  });
});

describe("hmac (RFC 4231)", () => {
  const case1Key = new Uint8Array(20).fill(0x0b);
  it.each([
    ["SHA-256", "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"],
    [
      "SHA-384",
      "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6",
    ],
    [
      "SHA-512",
      "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854",
    ],
  ])("test case 1, HMAC-%s", async (algorithm, expected) => {
    const bytes = await hmacBytes(algorithm, case1Key, textBytes("Hi There"));
    expect(formatDigest(bytes, "hex")).toBe(expected);
  });

  it.each([
    ["SHA-256", "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"],
    [
      "SHA-384",
      "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    ],
    [
      "SHA-512",
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
    ],
  ])("test case 2, HMAC-%s", async (algorithm, expected) => {
    const bytes = await hmacBytes(algorithm, textBytes("Jefe"), textBytes("what do ya want for nothing?"));
    expect(formatDigest(bytes, "hex")).toBe(expected);
  });
});

describe("decoding", () => {
  it("groups hex for display", () => {
    expect(groupHex("e3b0c44298fc1c14")).toBe("e3b0c442 98fc1c14");
  });

  it("decodes hex in either case", () => {
    expect(Array.from(hexToBytes("0aFf"))).toEqual([10, 255]);
    expect(hexToBytes("abc")).toBeNull();
    expect(hexToBytes("zz")).toBeNull();
  });

  it("decodes standard and URL-safe base64, with or without padding", () => {
    expect(Array.from(base64ToBytes("+/8="))).toEqual([251, 255]);
    expect(Array.from(base64ToBytes("-_8"))).toEqual([251, 255]);
    expect(base64ToBytes("a")).toBeNull();
    expect(base64ToBytes("ab=c")).toBeNull();
  });
});

describe("parseExpectedDigest", () => {
  const hexBytes = (value) => Array.from(hexToBytes(value));
  const hexCandidate = (parsed) => parsed.candidates.find((candidate) => candidate.encoding === "hex");

  it("reports empty input", () => {
    expect(parseExpectedDigest("   \n ")).toEqual({ kind: "empty" });
  });

  it("reports text that is neither hex nor base64", () => {
    expect(parseExpectedDigest("not a digest!")).toEqual({ kind: "invalid" });
  });

  it("accepts a bare digest with spaces, line breaks and upper case", () => {
    const parsed = parseExpectedDigest(`  ${groupHex(ABC_SHA256.toUpperCase()).replace(" ", "\n")}  `);
    expect(Array.from(hexCandidate(parsed).bytes)).toEqual(hexBytes(ABC_SHA256));
  });

  it.each([
    [`${ABC_SHA256}  -`, "standard input"],
    [`${ABC_SHA256}  ubuntu.iso`, "ubuntu.iso"],
    [`${ABC_SHA256} *ubuntu.iso`, "ubuntu.iso"],
    [`${ABC_SHA256}  my file.txt\nother  line`, "my file.txt"],
  ])("accepts sha256sum output %j", (input, filename) => {
    const parsed = parseExpectedDigest(input);
    expect(parsed.kind).toBe("ok");
    expect(parsed.filename).toBe(filename);
    expect(Array.from(hexCandidate(parsed).bytes)).toEqual(hexBytes(ABC_SHA256));
  });

  it("accepts BSD style output", () => {
    const parsed = parseExpectedDigest(`SHA256 (my file.iso) = ${ABC_SHA256}`);
    expect(parsed.kind).toBe("ok");
    expect(parsed.filename).toBe("my file.iso");
    expect(parsed.algorithmHint).toBe("SHA256");
    expect(Array.from(hexCandidate(parsed).bytes)).toEqual(hexBytes(ABC_SHA256));
  });
});

describe("verifyDigest", () => {
  const abc = hexToBytes(ABC_SHA256);

  it("matches hex regardless of case and grouping", () => {
    expect(verifyDigest(abc, ABC_SHA256.toUpperCase(), "SHA-256")).toMatchObject({ status: "match", encoding: "hex" });
    expect(verifyDigest(abc, groupHex(ABC_SHA256), "SHA-256").status).toBe("match");
  });

  it("matches base64 even when hex is displayed", () => {
    expect(verifyDigest(abc, "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=", "SHA-256")).toMatchObject({
      status: "match",
      encoding: "base64",
    });
  });

  it("does not lowercase base64", () => {
    expect(verifyDigest(abc, "UNGWV48BZ+PBQUDEXA4II7ADYAOWF3QCTBD/YFIAFA0=", "SHA-256").status).toBe("mismatch");
  });

  it("matches sha256sum and BSD lines and reports the file name", () => {
    expect(verifyDigest(abc, `${ABC_SHA256}  -`, "SHA-256").status).toBe("match");
    expect(verifyDigest(abc, `${ABC_SHA256} *a.txt`, "SHA-256")).toMatchObject({ status: "match", filename: "a.txt" });
    expect(verifyDigest(abc, `SHA256 (a.txt) = ${ABC_SHA256}`, "SHA-256").status).toBe("match");
  });

  it("reports a mismatch of the right length", () => {
    const wrong = `${ABC_SHA256.slice(0, -1)}e`;
    expect(verifyDigest(abc, wrong, "SHA-256").status).toBe("mismatch");
  });

  it("reports a length that does not fit the algorithm, and suggests one that does", async () => {
    const sha1 = await digestBytes("SHA-1", textBytes("abc"));
    expect(verifyDigest(sha1, ABC_SHA256, "SHA-1")).toMatchObject({
      status: "length",
      algorithm: "SHA-1",
      actualLength: 20,
      looksLike: "SHA-256",
    });
  });

  it("reports invalid and empty input", () => {
    expect(verifyDigest(abc, "zzzz-not-hex!", "SHA-256").status).toBe("invalid");
    expect(verifyDigest(abc, "  ", "SHA-256").status).toBe("empty");
  });
});
