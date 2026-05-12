FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Expose port (Railway sets PORT automatically)
EXPOSE ${PORT:-4000}

# Default: start gateway (override in Railway per service)
CMD ["pnpm", "run", "start:gateway"]
