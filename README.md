# SHA256 Generator

Started this as a side project while I was learning about blockchain, and it has grown into a small hash bench: hash text or files, check a digest you already have, or sign with HMAC. Everything runs in your browser with the Web Crypto API, so nothing you type or drop in is uploaded anywhere.

<a href="https://sha-256-puce.vercel.app/"><img alt="Vercel" src="https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white"/></a>

## Features

- **Hash** text or a file with SHA-256, SHA-384, SHA-512 or SHA-1, shown as hex or base64. The digest updates as you type.
- **Verify** a digest you already have. Paste it as hex (any case) or base64, or paste a line straight from `sha256sum` (`<hash>  file.iso`) or BSD-style tools (`SHA256 (file.iso) = <hash>`). You get a clear match / no match, and a hint when the length belongs to a different algorithm.
- **HMAC** with SHA-256, SHA-384, SHA-512 or SHA-1.
- **Session history**: copy or save a result to keep it in the tab until you close it.

SHA-1 is only there for checking old checksums. It is not collision-resistant, so don't use it for anything security-related.

Hashes are one-way: there is no way to "decode" one back into the original text.

## Privacy

- Text, files and HMAC keys never leave the page. There is no backend, no analytics and no third-party fonts; the deployed site's Content Security Policy blocks outgoing connections entirely.
- History lives in `sessionStorage` for the current tab only. HMAC keys and messages are never stored, and files are kept by name only.
- Files are read into memory to be hashed. Above 512 MB the page warns you; above 2 GB it asks you to use `sha256sum` instead.

## Development

Needs Node.js 26 (the current LTS); `.nvmrc` pins it, so `nvm use` picks it up.

```bash
npm install
npm run dev      # start the dev server
npm test         # unit and component tests (Vitest)
npm run lint     # ESLint
npm run build    # production build in build/
npm run preview  # serve the production build
```

Built with React, Vite and Tailwind CSS. Deployed on Vercel.

Made by [tengfone](https://github.com/tengfone).
