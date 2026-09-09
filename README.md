# {PROJECT_NAME}

{PROJECT_DESCRIPTION}

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) **11.x** (see `packageManager` in `package.json`; use [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- Node.js **22+** (see `engines` in `package.json`; `.node-version` pins the version used for local dev and CI)

Dependency installs follow pnpm 11 supply-chain settings in [`pnpm-workspace.yaml`](pnpm-workspace.yaml): **minimum release age** (this template uses a **7-day** quarantine, stricter than pnpm’s built-in 24-hour default), **blocking exotic transitive dependencies**, and an **`allowBuilds`** allowlist for packages that run install scripts. See [pnpm 11 release notes](https://pnpm.io/blog/releases/11.0) and [Supply-chain defaults (Socket)](https://socket.dev/blog/pnpm-11-adds-new-supply-chain-protection-defaults).

Linting and formatting use [Trunk](https://trunk.io/) (ESLint, Prettier, and more). The Trunk **launcher** is installed with project dependencies—you do not need a separate Trunk install for the default workflow.

### Installation

```bash
pnpm install
```

Optional: prefetch Trunk’s hermetic tools (helpful for offline work or CI images):

```bash
pnpm exec trunk install
```

If you prefer a global `trunk` on your PATH, see the [Trunk installation guide](https://docs.trunk.io/references/cli/getting-started/install) (e.g. `brew install trunk-io` on macOS).

### Supply-chain protections

The template uses **pnpm 11** with settings in [`pnpm-workspace.yaml`](pnpm-workspace.yaml): a **7-day** [`minimumReleaseAge`](https://pnpm.io/settings#minimumreleaseage) (10080 minutes, stricter than pnpm’s default 1 day), [`blockExoticSubdeps`](https://pnpm.io/settings#blockexoticsubdeps) enabled, and an [`allowBuilds`](https://pnpm.io/settings#allowbuilds) map for dependencies that must run install scripts (pnpm 11 requires this for native toolchain packages such as esbuild). See the [pnpm 11 release notes](https://pnpm.io/blog/releases/11.0).

CI: pull requests and `main` run `pnpm lint:security` then generate/scan an SPDX SBOM (`.github/workflows/sbom.yml`). Publish re-checks `pnpm lint:security` before npm publish.

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

## WebMCP demo

The front-desk page is a Vue 3 client. It registers native Chrome WebMCP tools, not a Vue plugin. [How the front desk uses WebMCP](packages/app/README.md) explains who talks to whom.

You need Google Chrome installed on the host. Docker Compose serves the page only on `http://127.0.0.1:8080`. That address is the trustworthy origin WebMCP requires. Do not open the published Docker hostname instead.

```bash
docker compose up -d --build web
pnpm check:webmcp
```

`pnpm check:webmcp` launches headed Chrome with `--enable-features=WebMCP,WebMCPTesting`, then runs the visit in order: `start_visit`, `list_slots`, `book_slot`, `file_request`, `confirm_visit`. A later tool fails until the earlier one succeeds. The checker exits non-zero if a tool is missing, returns `ERROR:`, or the page does not show the matching change. Headless Chrome is not a valid proof.

To watch the same sequence and keep the window open for three minutes:

```bash
pnpm demo:webmcp
```

Screenshots are written to `/tmp/webmcp-demo` unless `WEBMCP_DEMO_DIR` is set. Stop the page with `docker compose down`.

## Project Structure

- `packages/`: Monorepo packages
  - `app/`: Vue front desk and WebMCP tools
  - `webmcp-check/`: Headed Chrome checker and visual demo
  - `common/`: Shared utilities and types

## License

{LICENSE}
