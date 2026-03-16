FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install ALL deps (including dev) needed for building
RUN npm ci --ignore-scripts

FROM node:18-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install ONLY production deps for the runner image
RUN npm ci --ignore-scripts --omit=dev

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root user — prevents cron installation and limits damage
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
# Use production-only node_modules (no devDependencies)
COPY --from=prod-deps /app/node_modules ./node_modules

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["npm", "start"]
