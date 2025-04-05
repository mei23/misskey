FROM node:22.14.0-bullseye AS builder

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential

COPY package.json pnpm-lock.yaml ./

RUN npm i -g pnpm

RUN pnpm i --frozen-lockfile

COPY . ./

RUN pnpm build

FROM node:22.14.0-bullseye-slim AS runner

WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg mecab mecab-ipadic-utf8 tini \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/* \
 && npm i -g pnpm

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "start"]
