FROM node:12.18.3 AS base

ENV NODE_ENV=production

WORKDIR /misskey

FROM base AS builder

RUN apt-get update
RUN apt-get install -y build-essential ffmpeg mecab mecab-ipadic-utf8

COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build

FROM base AS runner

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

CMD ["npm", "start"]
