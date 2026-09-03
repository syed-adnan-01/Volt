# Production Dockerfile for VOLT API Gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json tsconfig.json ./
COPY packages/contracts ./packages/contracts
COPY services/battery-engine ./services/battery-engine
COPY services/api ./services/api

# Install dependencies and build TypeScript
RUN npm ci
RUN npm run build --workspace=packages/contracts
RUN npm run build --workspace=services/battery-engine
RUN npm run build --workspace=services/api

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/services/battery-engine/package.json ./services/battery-engine/
COPY --from=builder /app/services/battery-engine/dist ./services/battery-engine/dist
COPY --from=builder /app/services/api/package.json ./services/api/
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/src/db/migrations ./services/api/dist/src/db/migrations

RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=services/api"]
