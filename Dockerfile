FROM node:16.16.0-bullseye AS builder

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update
RUN apt-get install -y build-essential

COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build


FROM node:16.16.0-bullseye-slim AS runner

WORKDIR /misskey

RUN apt-get update
RUN apt-get install -y ffmpeg mecab mecab-ipadic-utf8 tini

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "start"]
