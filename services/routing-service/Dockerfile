# Production Dockerfile for VOLT EV Routing & Multi-Stop Optimizer (Member 5)
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copy root workspace configurations and routing service
COPY package*.json tsconfig.json ./
COPY services/routing-service ./services/routing-service

# Install dependencies across workspaces
RUN npm ci

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=routing-service"]
