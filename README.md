# webmcp-demo-ts

Sequential WebMCP front-desk demo: a Vue page exposes native Chrome tools, Docker Compose serves them on a trustworthy origin, and headed Chrome proves the tools work.

This repository is an example, not a production service.

## WebMCP demo

The front-desk page is a Vue 3 client. It registers native Chrome WebMCP tools, not a Vue plugin. [How the front desk uses WebMCP](packages/app/README.md) explains who talks to whom.

You need Google Chrome on the host. Docker Compose serves the page only on `http://127.0.0.1:8080`. That address is the trustworthy origin WebMCP requires. Do not open the published Docker hostname instead.

```bash
pnpm install
docker compose up -d --build web
pnpm check:webmcp
```

`pnpm check:webmcp` launches headed Chrome with `--enable-features=WebMCP,WebMCPTesting`, then runs the visit in order: `start_visit`, `list_slots`, `book_slot`, `file_request`, `confirm_visit`. A later tool fails until the earlier one succeeds. The checker exits non-zero if a tool is missing, returns `ERROR:`, or the page does not show the matching change. Headless Chrome is not a valid proof.

To watch the same sequence and keep the window open for three minutes:

```bash
pnpm demo:webmcp
```

Screenshots are written to `/tmp/webmcp-demo` unless `WEBMCP_DEMO_DIR` is set. Stop the page with `docker compose down`.

## Development

### Prerequisites

- [pnpm](https://pnpm.io/) **11.x** (see `packageManager` in `package.json`; use [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- Node.js **22+** (see `engines` in `package.json`; `.node-version` pins the local and CI version)

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format
```

pnpm 11 supply-chain settings live in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) (7-day `minimumReleaseAge`, `blockExoticSubdeps`, and `allowBuilds`). Lint and format use [Trunk](https://trunk.io/) via the project launcher.

## Project structure

- `packages/app/`: Vue front desk and WebMCP tools
- `packages/webmcp-check/`: Headed Chrome checker and visual demo
- `packages/common/`: Shared utilities

## License

Apache-2.0
