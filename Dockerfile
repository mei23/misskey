FROM node:16.13.2-bullseye AS builder

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update
RUN apt-get install -y build-essential

COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build


FROM node:16.13.2-bullseye-slim AS runner

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update
RUN apt-get install -y ffmpeg mecab mecab-ipadic-utf8

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

CMD ["npm", "start"]
