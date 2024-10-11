FROM oven/bun:1.1.30

WORKDIR /app

COPY src ./src
COPY bun.lockb ./bun.lockb
COPY build.ts ./build.ts
COPY tsconfig.json ./tsconfig.json
COPY package.json ./package.json

RUN mkdir -p /tmp/build && mkdir -p /app/dist

RUN bun install --frozen-lockfile

CMD ["bun", "run", "build"]
