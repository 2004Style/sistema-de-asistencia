# Stage 1: Build dependencies and application
FROM node:22-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN npm install -g pnpm && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Copy application source
COPY . .

# Build Next.js application
RUN pnpm build

# Stage 2: Runtime - minimal image for production
FROM node:22-alpine

WORKDIR /app

# Install pnpm in runtime image
RUN npm install -g pnpm

# Copy package files from builder
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN npm install -g pnpm && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile --prod; else pnpm install --prod; fi && \
    pnpm prune --prod

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port (configurable at runtime)
EXPOSE 3000

# Health check usando Node nativo (sin curl/wget)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200 && r.statusCode !== 304) process.exit(1)}).on('error', () => process.exit(1))"

# Start Next.js production server
CMD ["pnpm", "start"]
