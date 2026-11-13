import { useEffect, useMemo, useState } from "react";
import {
  ALGORITHMS,
  digestBytes,
  digestsMatch,
  formatDigest,
  groupHex,
  hmacBytes,
  textBytes,
} from "./hash.js";

const HISTORY_KEY = "sha256-bench-history";
const HISTORY_LIMIT = 8;

const MODES = [
  { id: "hash", label: "Hash" },
  { id: "verify", label: "Verify" },
  { id: "hmac", label: "HMAC" },
];

function loadHistory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [mode, setMode] = useState("hash");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [encoding, setEncoding] = useState("hex");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [key, setKey] = useState("");
  const [digest, setDigest] = useState("");
  const [expected, setExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(() => loadHistory());

  useEffect(() => {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const display = encoding === "hex" && digest ? groupHex(digest) : digest;
  const verdict = useMemo(() => {
    if (mode !== "verify" || !digest) return null;
    return digestsMatch(digest, expected, encoding);
  }, [digest, encoding, expected, mode]);

  async function readFile(next) {
    const bytes = new Uint8Array(await next.arrayBuffer());
    setFile({ name: next.name, size: next.size, bytes });
    setDigest("");
    setError("");
  }

  async function runHash(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const data = file ? file.bytes : textBytes(text);
      const bytes =
        mode === "hmac"
          ? await hmacBytes(algorithm, textBytes(key), data)
          : await digestBytes(algorithm, data);
      const next = formatDigest(bytes, encoding);
      setDigest(next);
      const label = file ? file.name : text === "" ? "Empty text" : text.slice(0, 42);
      setHistory((current) =>
        [
          {
            id: crypto.randomUUID(),
            label,
            mode,
            algorithm,
            encoding,
            digest: next,
          },
          ...current,
        ].slice(0, HISTORY_LIMIT),
      );
    } catch (cause) {
      setDigest("");
      setError(cause instanceof Error ? cause.message : "Could not hash that input.");
    } finally {
      setBusy(false);
    }
  }

  async function copyDigest() {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the digest and copy it manually.");
    }
  }

  function clearSource() {
    setText("");
    setFile(null);
    setKey("");
    setDigest("");
    setExpected("");
    setError("");
    setCopied(false);
  }

  function restore(entry) {
    setMode(entry.mode);
    setAlgorithm(entry.algorithm);
    setEncoding(entry.encoding);
    setDigest(entry.digest);
    setFile(null);
    setError("");
  }

  return (
    <div className="min-h-dvh bg-field text-ink">
      <header className="mx-auto flex max-w-5xl items-end justify-between gap-6 px-5 pt-8">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-dye uppercase">Local hash bench</p>
          <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight sm:text-5xl">
            Hash it here.
          </h1>
        </div>
        <p className="hidden max-w-56 text-right text-sm text-ink/70 sm:block">
          Text and files stay in this browser. Nothing is uploaded.
        </p>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form onSubmit={runHash} className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  setDigest("");
                }}
                className={`border px-3 py-1.5 text-sm ${mode === item.id ? "border-ink bg-ink text-panel" : "border-line bg-panel"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Algorithm">
              {ALGORITHMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={algorithm === item}
                  onClick={() => setAlgorithm(item)}
                  className={`font-mono text-xs tracking-wide ${algorithm === item ? "text-dye underline decoration-2 underline-offset-4" : "text-ink/60"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2 font-mono text-xs">
              {["hex", "base64"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEncoding(item)}
                  className={encoding === item ? "text-ink" : "text-ink/45"}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {mode === "hmac" && (
            <label className="grid gap-1 text-sm">
              Key
              <input
                value={key}
                autoComplete="off"
                onChange={(event) => setKey(event.target.value)}
                className="border border-line bg-panel px-3 py-2 outline-none focus:border-dye"
              />
            </label>
          )}

          <label className="grid gap-1 text-sm">
            Text
            <textarea
              value={text}
              disabled={Boolean(file)}
              onChange={(event) => {
                setText(event.target.value);
                setDigest("");
              }}
              rows={7}
              placeholder="Type anything, including accents and emoji."
              className="resize-y border border-line bg-panel px-3 py-2 outline-none focus:border-dye disabled:bg-field"
            />
          </label>

          <label
            className="grid cursor-pointer gap-1 border border-dashed border-line bg-panel/70 px-3 py-4 text-sm"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const next = event.dataTransfer.files?.[0];
              if (next) readFile(next);
            }}
          >
            <span>{file ? `${file.name} · ${formatBytes(file.size)}` : "Drop a file, or choose one"}</span>
            <input
              type="file"
              className="text-xs"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) readFile(next);
              }}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="bg-dye px-4 py-2 text-sm font-semibold text-panel disabled:opacity-60">
              {busy ? "Working" : mode === "hmac" ? "Sign" : "Hash"}
            </button>
            <button type="button" onClick={clearSource} className="border border-line px-4 py-2 text-sm">
              Clear
            </button>
          </div>
          {error && <p className="text-sm text-miss">{error}</p>}
        </form>

        <section className="grid content-start gap-4">
          <div
            className={`border-l-4 bg-panel p-4 ${verdict === true ? "border-match" : verdict === false ? "border-miss" : "border-dye"}`}
          >
            <p className="font-mono text-xs tracking-[0.14em] text-ink/60 uppercase">
              {mode === "hmac" ? "HMAC" : algorithm} · {encoding}
            </p>
            <p className="mt-3 min-h-16 font-mono text-lg leading-relaxed break-all">
              {display || "The digest shows up here."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={copyDigest} disabled={!digest} className="border border-ink px-3 py-1.5 text-sm disabled:opacity-40">
                {copied ? "Copied" : "Copy"}
              </button>
              {verdict === true && <span className="text-sm font-semibold text-match">Match</span>}
              {verdict === false && <span className="text-sm font-semibold text-miss">Does not match</span>}
            </div>
          </div>

          {mode === "verify" && (
            <label className="grid gap-1 text-sm">
              Expected digest
              <textarea
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                rows={3}
                placeholder="Paste a hex or base64 digest"
                className="border border-line bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-dye"
              />
              <span className="text-ink/70">
                SHA-256 is one-way. This checks a digest. It does not recover the original text.
              </span>
            </label>
          )}

          {mode !== "verify" && (
            <p className="text-sm text-ink/70">
              SHA-256 is one-way. Use Verify to compare a digest you already have. The old decode page is gone.
            </p>
          )}

          <div>
            <h2 className="font-mono text-xs tracking-[0.16em] uppercase text-ink/60">This session</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ink/70">Hashes you run stay in this tab until you close it.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" onClick={() => restore(entry)} className="grid w-full gap-1 py-2 text-left">
                      <span className="text-sm">{entry.label}</span>
                      <span className="font-mono text-xs text-ink/60">
                        {entry.mode === "hmac" ? "HMAC" : entry.algorithm} · {entry.digest.slice(0, 18)}…
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
