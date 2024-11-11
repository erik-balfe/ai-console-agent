FROM oven/bun:1.1.34

WORKDIR /app

# Copy package management files
COPY package.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and configuration files
COPY src/ ./src/
COPY tsconfig.json ./
COPY build.ts ./

# Run command (this will run when the container starts)
CMD ["bun", "run", "build"]
