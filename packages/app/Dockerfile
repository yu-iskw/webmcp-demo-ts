FROM node:24.13.0-bookworm-slim AS build

WORKDIR /src
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app/package.json packages/app/package.json
COPY packages/common/package.json packages/common/package.json
RUN pnpm install --frozen-lockfile --filter @typescript-template/app...

COPY packages/app packages/app
RUN pnpm --filter @typescript-template/app build

FROM nginx:1.28-alpine

COPY packages/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/packages/app/dist /usr/share/nginx/html

EXPOSE 80
