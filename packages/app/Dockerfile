FROM node:24.13.0-bookworm-slim AS build

WORKDIR /src
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.0.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app/package.json packages/app/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/webmcp-check/package.json packages/webmcp-check/package.json
RUN pnpm install --frozen-lockfile --filter @typescript-template/app...

COPY packages/app packages/app
RUN pnpm --filter @typescript-template/app build

FROM nginxinc/nginx-unprivileged:1.28-alpine

COPY packages/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /src/packages/app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
