FROM node:16.20.2-bullseye AS builder

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential

COPY package.json pnpm-lock.yaml ./

RUN corepack enable pnpm

RUN pnpm i --frozen-lockfile

COPY . ./

RUN pnpm build

FROM node:16.20.2-bullseye-slim AS runner

WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends libjemalloc2 ffmpeg mecab mecab-ipadic-utf8 tini \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable pnpm

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "start"]
