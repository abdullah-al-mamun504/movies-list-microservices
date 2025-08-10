# backend/Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY src ./src

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

RUN mkdir -p /app/logs

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "src/server.js"]

