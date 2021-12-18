FROM node:16.7.0-bullseye AS base

ENV NODE_ENV=production

WORKDIR /misskey

FROM base AS builder

RUN apt-get update
RUN apt-get install -y build-essential

COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build

FROM base AS runner

RUN apt-get update
RUN apt-get install -y ffmpeg mecab mecab-ipadic-utf8

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

CMD ["npm", "start"]
