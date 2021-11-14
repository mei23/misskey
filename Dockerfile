FROM node:16.13.0-bullseye AS base

WORKDIR /misskey

FROM base AS builder

RUN apt-get update
RUN apt-get install -y build-essential

COPY . ./

RUN git submodule update --init
RUN yarn install
RUN yarn build

FROM base AS runner

RUN apt-get update
RUN apt-get install -y ffmpeg

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY --from=builder /misskey/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /misskey/packages/backend/built ./packages/backend/built
COPY --from=builder /misskey/packages/client/node_modules ./packages/client/node_modules
COPY . ./

CMD ["npm", "run", "migrateandstart"]
