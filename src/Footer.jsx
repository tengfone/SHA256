export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-5 text-sm text-ink/75">
        <p>
          Made by{" "}
          <a
            href="https://github.com/tengfone"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            tengfone
          </a>{" "}
          with React and Tailwind CSS.
        </p>
        <a
          href="https://github.com/tengfone/sha256"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-2"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
