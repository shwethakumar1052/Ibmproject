# ─────────────────────────────────────────────────────────────
# GovMatch AI — Backend (Node.js Express)
# Port 5001
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine

# Install dumb-init for signal handling + curl for health checks
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create notifications directory and empty store if not present
RUN mkdir -p notifications && \
    [ -f notifications/notifications.json ] || echo "[]" > notifications/notifications.json

# Expose backend port
EXPOSE 5001

# Run as non-root user
USER node

# Use dumb-init to handle PID 1 signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
