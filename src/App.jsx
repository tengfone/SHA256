import { useEffect, useRef, useState } from "react";
import {
  ALGORITHMS,
  digestBytes,
  formatDigest,
  groupHex,
  hasWebCrypto,
  hexToBytes,
  hmacBytes,
  textBytes,
  toHex,
  verifyDigest,
} from "./hash.js";
import { addEntry, loadHistory, makeEntry, saveHistory } from "./history.js";

const TEXT_DEBOUNCE_MS = 150;
const LARGE_FILE_BYTES = 512 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

const MODES = [
  { id: "hash", label: "Hash" },
  { id: "verify", label: "Verify" },
  { id: "hmac", label: "HMAC" },
];
const ENCODINGS = ["hex", "base64"];

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(2)} GB`;
}

function errorMessage(cause, fallback) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function Segmented({ legend, name, options, value, onChange, renderLabel = (item) => item }) {
  return (
    <fieldset className="flex flex-wrap gap-1">
      <legend className="sr-only">{legend}</legend>
      {options.map((item) => (
        <label
          key={item}
          className="cursor-pointer border border-edge bg-panel px-2.5 py-1 font-mono text-xs tracking-wide text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-panel has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-dye"
        >
          <input
            type="radio"
            name={name}
            value={item}
            checked={value === item}
            onChange={() => onChange(item)}
            className="sr-only"
          />
          {renderLabel(item)}
        </label>
      ))}
    </fieldset>
  );
}

export default function App() {
  const cryptoReady = hasWebCrypto();
  const [mode, setMode] = useState("hash");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [encoding, setEncoding] = useState("hex");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [key, setKey] = useState("");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileWarning, setFileWarning] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const [copyError, setCopyError] = useState("");
  const [history, setHistory] = useState(() => loadHistory());
  const [historic, setHistoric] = useState(null);
  const [storageWarning, setStorageWarning] = useState(false);

  const requestRef = useRef(0);
  const readRef = useRef(0);
  const lastTextRef = useRef(text);
  const fileInputRef = useRef(null);

  // Hash and Verify produce the same digest; only HMAC uses the key.
  const operation = mode === "hmac" ? "hmac" : "digest";
  const activeKey = operation === "hmac" ? key : "";
  const needsKey = operation === "hmac" && key === "";

  // Recompute whenever an input changes. Each run gets an id, and only the
  // newest run may store its result, so slow digests resolving out of order
  // can never overwrite a newer one.
  useEffect(() => {
    if (!cryptoReady || needsKey) {
      requestRef.current += 1;
      return undefined;
    }
    const id = ++requestRef.current;
    const typing = lastTextRef.current !== text;
    lastTextRef.current = text;
    const inputs = { operation, algorithm, text, file, key: activeKey };
    const timer = setTimeout(
      async () => {
        let next;
        try {
          const data = file ? file.bytes : textBytes(text);
          const bytes =
            operation === "hmac"
              ? await hmacBytes(algorithm, textBytes(activeKey), data)
              : await digestBytes(algorithm, data);
          next = { ...inputs, bytes, error: "" };
        } catch (cause) {
          next = { ...inputs, bytes: null, error: errorMessage(cause, "Could not hash that input.") };
        }
        if (id === requestRef.current) setResult(next);
      },
      typing && !file ? TEXT_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [cryptoReady, needsKey, operation, algorithm, text, file, activeKey]);

  // A result only counts when it was computed from exactly the current inputs.
  const current =
    result &&
    !needsKey &&
    result.operation === operation &&
    result.algorithm === algorithm &&
    result.text === text &&
    result.file === file &&
    result.key === activeKey
      ? result
      : null;
  const ready = Boolean(current && current.bytes);
  const updating = cryptoReady && !needsKey && !current;
  const stale = updating && result && result.bytes ? result : null;

  const shown = ready ? current : stale;
  const value = shown ? formatDigest(shown.bytes, encoding) : "";
  const display = value && encoding === "hex" ? groupHex(value) : value;
  const label =
    (shown ? shown.operation : operation) === "hmac"
      ? `HMAC-${shown ? shown.algorithm : algorithm}`
      : shown
        ? shown.algorithm
        : algorithm;

  const verdict = mode === "verify" && ready ? verifyDigest(current.bytes, expected, algorithm) : null;
  const checking = mode === "verify" && !ready && expected.trim() !== "";

  function changeMode(next) {
    setMode(next);
    setHistoric(null);
  }

  async function readFile(next) {
    const token = ++readRef.current;
    setFileError("");
    setHistoric(null);
    if (next.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileWarning("");
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileError(
        `${next.name} is ${formatBytes(next.size)}. Files over 2 GB are too large to hash in a browser tab; use sha256sum or shasum on your computer instead.`,
      );
      return;
    }
    setFileWarning(
      next.size > LARGE_FILE_BYTES
        ? `Large file (${formatBytes(next.size)}): it is held in memory while it is hashed, which can be slow.`
        : "",
    );
    setReading(true);
    try {
      const bytes = new Uint8Array(await next.arrayBuffer());
      if (token !== readRef.current) return;
      setFile({ name: next.name, size: next.size, bytes });
    } catch (cause) {
      if (token !== readRef.current) return;
      setFile(null);
      setFileError(`Could not read ${next.name}: ${errorMessage(cause, "the browser refused to open it")}.`);
    } finally {
      if (token === readRef.current) setReading(false);
    }
  }

  function removeFile() {
    readRef.current += 1;
    setFile(null);
    setReading(false);
    setFileError("");
    setFileWarning("");
    setHistoric(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearAll() {
    removeFile();
    setText("");
    setKey("");
    setExpected("");
    setCopyError("");
  }

  function remember() {
    if (!ready) return;
    const entry = makeEntry({ mode, algorithm, encoding, digestHex: toHex(current.bytes), text, file });
    const next = addEntry(history, entry);
    if (next === history) return;
    setHistory(next);
    setStorageWarning(!saveHistory(next));
  }

  async function copyDigest() {
    if (!ready) return;
    setCopyError("");
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      remember();
    } catch {
      setCopyError("Copy failed. Select the digest and copy it manually.");
    }
  }

  function restore(entry) {
    setMode(entry.mode);
    setAlgorithm(entry.algorithm);
    setEncoding(entry.encoding);
    setCopyError("");
    if (entry.text !== null) {
      removeFile();
      setText(entry.text);
    } else {
      setHistoric(entry);
    }
  }

  function verifyAgainstHistoric() {
    if (!historic) return;
    setMode("verify");
    setAlgorithm(historic.algorithm);
    setExpected(historic.digestHex);
    setHistoric(null);
  }

  const historicValue = historic ? formatDigest(hexToBytes(historic.digestHex), historic.encoding) : "";
  const borderTone =
    verdict?.status === "match" ? "border-match" : verdict && verdict.status !== "empty" ? "border-miss" : "border-dye";

  return (
    <div className="flex min-h-dvh flex-col bg-field text-ink">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 pt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-dye uppercase">Local hash bench</p>
          <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight sm:text-5xl">Hash it here.</h1>
        </div>
        <p className="max-w-56 text-sm text-ink/75 sm:text-right">
          Text and files stay in this browser. Nothing is uploaded.
        </p>
      </header>

      {!cryptoReady && (
        <p role="alert" className="mx-auto mt-6 w-full max-w-5xl border-l-4 border-miss bg-panel px-5 py-3 text-sm">
          This browser can&apos;t hash here: Web Crypto is only available on secure (HTTPS or localhost) pages.
        </p>
      )}

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mode">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => changeMode(item.id)}
                className={`border px-3 py-1.5 text-sm ${mode === item.id ? "border-ink bg-ink text-panel" : "border-edge bg-panel"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <Segmented
              legend="Algorithm"
              name="algorithm"
              options={ALGORITHMS}
              value={algorithm}
              onChange={(next) => {
                setAlgorithm(next);
                setHistoric(null);
              }}
            />
            <Segmented legend="Output encoding" name="encoding" options={ENCODINGS} value={encoding} onChange={setEncoding} />
          </div>
          {algorithm === "SHA-1" && (
            <p className="text-sm text-ink/75">
              SHA-1 is not collision-resistant. Use it only to check legacy checksums, not for anything security-related.
            </p>
          )}

          {mode === "hmac" && (
            <label className="grid gap-1 text-sm">
              Key
              <input
                value={key}
                type="text"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  setKey(event.target.value);
                  setHistoric(null);
                }}
                className="border border-edge bg-panel px-3 py-2 font-mono outline-none focus:border-dye"
              />
              <span className="text-ink/75">The key is used in this page only. It is never saved.</span>
            </label>
          )}

          <label className="grid gap-1 text-sm">
            Text
            <textarea
              value={text}
              disabled={Boolean(file)}
              onChange={(event) => {
                setText(event.target.value);
                setHistoric(null);
              }}
              rows={7}
              placeholder={file ? "Remove the file to hash text instead." : "Type anything, including accents and emoji."}
              className="resize-y border border-edge bg-panel px-3 py-2 outline-none focus:border-dye disabled:bg-field disabled:text-ink/75"
            />
          </label>

          <div
            className={`grid gap-2 border border-dashed bg-panel/70 px-3 py-4 text-sm ${dragging ? "border-dye" : "border-edge"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const next = event.dataTransfer.files?.[0];
              if (next) readFile(next);
            }}
          >
            <label className="grid cursor-pointer gap-1">
              <span>
                {reading
                  ? "Reading file…"
                  : file
                    ? `${file.name} · ${formatBytes(file.size)}`
                    : "Drop a file, or choose one"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="text-xs"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) readFile(next);
                }}
              />
            </label>
            {(file || reading) && (
              <button type="button" onClick={removeFile} className="justify-self-start border border-edge px-2.5 py-1 text-xs">
                Remove file
              </button>
            )}
            {fileWarning && <p className="text-ink/75">{fileWarning}</p>}
          </div>
          {fileError && (
            <p role="alert" className="text-sm text-miss">
              {fileError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={clearAll} className="border border-edge px-4 py-2 text-sm">
              Clear
            </button>
          </div>
        </div>

        <section className="grid content-start gap-4" aria-label="Result">
          {historic && (
            <div className="border-l-4 border-edge bg-panel p-4">
              <p className="font-mono text-xs tracking-[0.14em] text-ink/75 uppercase">
                From history · {historic.mode === "hmac" ? `HMAC-${historic.algorithm}` : historic.algorithm} · {historic.encoding}
              </p>
              <p className="mt-1 text-sm">{historic.label}</p>
              <p className="mt-2 font-mono text-sm break-all" data-testid="historic-digest">
                {historic.encoding === "hex" ? groupHex(historicValue) : historicValue}
              </p>
              <p className="mt-2 text-sm text-ink/75">
                {historic.source === "file"
                  ? "File contents aren't saved. Choose the file again to recompute it."
                  : "HMAC messages and keys aren't saved, so this input can't be restored."}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {historic.mode !== "hmac" && (
                  <button type="button" onClick={verifyAgainstHistoric} className="border border-ink px-3 py-1.5 text-sm">
                    Verify against this
                  </button>
                )}
                <button type="button" onClick={() => setHistoric(null)} className="border border-edge px-3 py-1.5 text-sm">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className={`border-l-4 bg-panel p-4 ${borderTone}`} aria-busy={updating}>
            <p className="font-mono text-xs tracking-[0.14em] text-ink/75 uppercase">
              {label} · {encoding}
              {shown?.file ? " · file" : shown && shown.text === "" ? " · empty input" : ""}
              {updating && shown ? " · updating" : ""}
            </p>
            <p
              data-testid="digest"
              className={`mt-3 min-h-16 font-mono text-lg leading-relaxed break-all ${ready ? "" : "text-ink/75"}`}
            >
              {needsKey
                ? "Enter a key to sign."
                : display || (current?.error ? "" : cryptoReady ? "Computing…" : "Unavailable")}
            </p>
            {current?.error && (
              <p role="alert" className="text-sm text-miss">
                {current.error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyDigest}
                disabled={!ready}
                className="border border-ink px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {ready && copiedValue === value ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={remember}
                disabled={!ready}
                className="border border-edge px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Save to history
              </button>
            </div>
            {copyError && <p className="mt-2 text-sm text-miss">{copyError}</p>}
            <div role="status" aria-live="polite" className="mt-3 text-sm" data-testid="verdict">
              {checking && <span className="text-ink/75">Checking…</span>}
              {verdict?.status === "match" && (
                <span className="font-semibold text-match">
                  Match{verdict.filename ? ` (${verdict.filename})` : ""} · read as {verdict.encoding}
                </span>
              )}
              {verdict?.status === "mismatch" && <span className="font-semibold text-miss">Does not match</span>}
              {verdict?.status === "invalid" && (
                <span className="font-semibold text-miss">
                  Invalid digest format. Paste a hex or base64 digest, or a line from sha256sum.
                </span>
              )}
              {verdict?.status === "length" && (
                <span className="font-semibold text-miss">
                  Length doesn&apos;t match {verdict.algorithm}: it gives {verdict.actualLength} bytes, the pasted digest is{" "}
                  {verdict.expectedLength} bytes.
                  {verdict.looksLike && verdict.looksLike !== verdict.algorithm && (
                    <>
                      {" "}
                      It looks like {verdict.looksLike}.{" "}
                      <button
                        type="button"
                        onClick={() => setAlgorithm(verdict.looksLike)}
                        className="font-normal text-ink underline underline-offset-2"
                      >
                        Switch to {verdict.looksLike}
                      </button>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {mode === "verify" && (
            <label className="grid gap-1 text-sm">
              Expected digest
              <textarea
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                rows={3}
                spellCheck={false}
                placeholder="Paste a hex or base64 digest, or a sha256sum line"
                className="border border-edge bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-dye"
              />
              <span className="text-ink/75">
                Hex is case-insensitive. Lines like <code className="font-mono">&lt;hash&gt;  file.iso</code> or{" "}
                <code className="font-mono">SHA256 (file.iso) = &lt;hash&gt;</code> work too.
              </span>
            </label>
          )}

          <p className="text-sm text-ink/75">
            Hashes are one-way. Verify compares a digest you already have; nothing can turn a digest back into its input.
          </p>

          <div>
            <h2 className="font-mono text-xs tracking-[0.16em] text-ink/75 uppercase">This session</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ink/75">
                Copy or save a digest to keep it here until you close this tab.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" onClick={() => restore(entry)} className="grid w-full gap-1 py-2 text-left">
                      <span className="text-sm break-all">{entry.label}</span>
                      <span className="font-mono text-xs text-ink/75">
                        {entry.mode === "hmac" ? `HMAC-${entry.algorithm}` : entry.algorithm} · {entry.digestHex.slice(0, 16)}…
                        {entry.text === null ? " · result only" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {storageWarning && (
              <p className="mt-2 text-sm text-ink/75">This browser isn&apos;t letting the page keep history for the session.</p>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
