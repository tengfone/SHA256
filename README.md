# Hash bench

A local hash workbench. It hashes text and files in the browser with Web Crypto, checks a digest you already have, and computes HMAC. Nothing is uploaded.

Live site: [sha-256-tengfone.vercel.app](https://sha-256-tengfone.vercel.app/)

The GitHub homepage field should be `https://sha-256-tengfone.vercel.app/`. An older field pointed at `sha-256-puce.vercel.app`, which is not this app.

## What it does

- SHA-256, SHA-384, SHA-512, and SHA-1
- Hex or base64
- Text, including characters outside ASCII. The old hand-rolled function dropped those inputs.
- File drop
- Verify: paste an expected digest. Spaces and letter case are ignored for hex. A match or mismatch is the whole answer.
- HMAC with a key that stays in the page
- A short history for this browser tab

SHA-256 is one-way. There is no decode page, and the app does not send hashes to a lookup service.

## Run it locally

```bash
npm install
npm start
```

`npm test` checks the known SHA-256 and HMAC test vectors. `npm run build` writes `build/`, which Vercel already publishes. Old links such as `/encode` and `/decode` open this same page.
