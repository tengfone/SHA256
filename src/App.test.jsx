// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import * as hash from "./hash.js";

const ABC = {
  "SHA-256": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "SHA-1": "a9993e364706816aba3e25717850c26c9cd0d89d",
  "SHA-512":
    "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
};
const ABC_SHA256_BASE64 = "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=";

const digestText = () => screen.getByTestId("digest").textContent.replace(/\s+/g, "");
const verdictText = () => screen.getByTestId("verdict").textContent;

async function typeText(user, value) {
  const box = screen.getByLabelText("Text");
  await user.clear(box);
  await user.type(box, value);
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("live digest", () => {
  it("hashes text as you type and follows the algorithm", async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeText(user, "abc");
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-256"]));

    await user.click(screen.getByLabelText("SHA-512"));
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-512"]));
    expect(screen.getByLabelText("SHA-512")).toBeChecked();
  });

  it("switches between hex and base64 without recomputing a stale value", async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeText(user, "abc");
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-256"]));
    await user.click(screen.getByLabelText("base64"));
    expect(digestText()).toBe(ABC_SHA256_BASE64);
  });

  it("recomputes HMAC when the key changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "HMAC" }));
    expect(screen.getByRole("button", { name: "HMAC" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("digest")).toHaveTextContent("Enter a key to sign.");
    await user.type(screen.getByLabelText(/^Key/), "Jefe");
    await typeText(user, "what do ya want for nothing?");
    await waitFor(() =>
      expect(digestText()).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"),
    );
    await user.type(screen.getByLabelText(/^Key/), "!");
    await waitFor(() =>
      expect(digestText()).not.toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"),
    );
  });

  it("ignores an older digest that resolves after a newer one", async () => {
    const real = hash.digestBytes;
    const gates = [];
    vi.spyOn(hash, "digestBytes").mockImplementation((algorithm, bytes) => {
      const result = real(algorithm, bytes);
      if (algorithm !== "SHA-256") return result;
      // Hold the SHA-256 run back until the test releases it.
      return new Promise((resolve) => gates.push(() => resolve(result)));
    });
    const user = userEvent.setup();
    render(<App />);
    await typeText(user, "abc");
    await waitFor(() => expect(gates.length).toBeGreaterThan(0));
    await user.click(screen.getByLabelText("SHA-1"));
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-1"]));
    await act(async () => {
      gates.forEach((release) => release());
    });
    expect(digestText()).toBe(ABC["SHA-1"]);
  });
});

describe("verify", () => {
  it("never reports Match against a digest computed with another algorithm", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await typeText(user, "abc");
    fireEvent.change(screen.getByLabelText(/^Expected digest/), { target: { value: ABC["SHA-256"] } });
    await waitFor(() => expect(verdictText()).toMatch(/^Match/));

    await user.click(screen.getByLabelText("SHA-1"));
    expect(verdictText()).not.toMatch(/Match/);
    await waitFor(() => expect(verdictText()).toMatch(/Length doesn't match SHA-1/));
    expect(verdictText()).toMatch(/looks like SHA-256/);

    await user.click(screen.getByRole("button", { name: "Switch to SHA-256" }));
    await waitFor(() => expect(verdictText()).toMatch(/^Match/));
  });

  it("never reports Match after the text changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await typeText(user, "abc");
    fireEvent.change(screen.getByLabelText(/^Expected digest/), { target: { value: ABC["SHA-256"] } });
    await waitFor(() => expect(verdictText()).toMatch(/^Match/));
    await user.type(screen.getByLabelText("Text"), "d");
    expect(verdictText()).not.toMatch(/Match/);
    await waitFor(() => expect(verdictText()).toBe("Does not match"));
  });

  it("accepts sha256sum lines, base64 and upper-case hex", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await typeText(user, "abc");
    const expected = screen.getByLabelText(/^Expected digest/);
    for (const value of [`${ABC["SHA-256"]}  -`, ABC_SHA256_BASE64, ABC["SHA-256"].toUpperCase()]) {
      fireEvent.change(expected, { target: { value } });
      await waitFor(() => expect(verdictText()).toMatch(/^Match/));
    }
    fireEvent.change(expected, { target: { value: "hello there!" } });
    expect(verdictText()).toMatch(/Invalid digest format/);
  });
});

describe("files", () => {
  it("hashes a file, and Clear resets the file input", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const input = container.querySelector('input[type="file"]');
    await user.upload(input, new File(["abc"], "abc.txt", { type: "text/plain" }));
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-256"]));
    expect(screen.getByText(/abc\.txt · 3 B/)).toBeInTheDocument();
    expect(input.files).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(input.value).toBe("");
    expect(screen.getByText("Drop a file, or choose one")).toBeInTheDocument();
  });

  it("removes a file with its own control", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.upload(container.querySelector('input[type="file"]'), new File(["abc"], "abc.txt"));
    await user.click(await screen.findByRole("button", { name: "Remove file" }));
    expect(screen.getByLabelText("Text")).toBeEnabled();
  });

  it("shows an error when the file cannot be read", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const broken = new File(["abc"], "broken.bin");
    broken.arrayBuffer = () => Promise.reject(new Error("NotReadableError"));
    await user.upload(container.querySelector('input[type="file"]'), broken);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not read broken.bin");
  });

  it("refuses files over 2 GB", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const huge = new File(["x"], "huge.iso");
    Object.defineProperty(huge, "size", { value: 3 * 1024 ** 3 });
    huge.arrayBuffer = vi.fn();
    await user.upload(container.querySelector('input[type="file"]'), huge);
    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/);
    expect(huge.arrayBuffer).not.toHaveBeenCalled();
  });
});

describe("history", () => {
  it("restores text entries with their settings", async () => {
    const user = userEvent.setup();
    render(<App />);
    await typeText(user, "abc");
    await user.click(screen.getByLabelText("SHA-1"));
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-1"]));
    await user.click(screen.getByRole("button", { name: "Save to history" }));

    await user.click(screen.getByLabelText("SHA-256"));
    await typeText(user, "something else");
    await user.click(screen.getByRole("button", { name: /^abc/ }));
    expect(screen.getByLabelText("Text")).toHaveValue("abc");
    expect(screen.getByLabelText("SHA-1")).toBeChecked();
    await waitFor(() => expect(digestText()).toBe(ABC["SHA-1"]));
  });

  it("keeps HMAC entries as labelled results only", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "HMAC" }));
    await user.type(screen.getByLabelText(/^Key/), "topsecret");
    await typeText(user, "private message");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save to history" })).toBeEnabled());
    const signature = digestText();
    await user.click(screen.getByRole("button", { name: "Save to history" }));
    expect(sessionStorage.getItem("hash-bench-history-v2")).not.toMatch(/topsecret|private message/);

    await user.click(screen.getByRole("button", { name: /HMAC of 15 characters/ }));
    expect(screen.getByTestId("historic-digest").textContent.replace(/\s+/g, "")).toBe(signature);
    expect(screen.getByText(/can't be restored/)).toBeInTheDocument();
  });
});

it("credits the author", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "tengfone" })).toHaveAttribute("href", "https://github.com/tengfone");
  expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/tengfone/sha256",
  );
});
