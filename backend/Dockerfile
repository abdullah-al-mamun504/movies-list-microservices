# -----------------------
# Stage 1: Install deps
# -----------------------
FROM node:18-alpine AS builder

WORKDIR /app

# build dependencies for some packages (if needed)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install production deps (faster container)
RUN npm ci --production

# Copy source
COPY src ./src

# -----------------------
# Stage 2: runtime image
# -----------------------
FROM node:18-alpine

WORKDIR /app

# Install su-exec (small helper to drop privileges) and any tools
RUN apk add --no-cache su-exec

# Copy installed node modules + source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Create logs dir (entrypoint will ensure permissions)
RUN mkdir -p /app/logs

# Ensure the application directory is owned by the node user so
# when we run as the node user (downstream) writes succeed.
# NOTE: the container image already provides 'node' user (UID 1000),
# but we chown here in case it's needed for image consistency.
RUN chown -R node:node /app

# Switch to non-root user for normal operation
USER node

EXPOSE 3000

# default command if entrypoint doesn't override
CMD ["node", "src/server.js"]
