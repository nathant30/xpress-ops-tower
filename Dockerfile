# Production RBAC+ABAC API Server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies  
RUN npm ci --only=production

# Install SQLite
RUN apk add --no-cache sqlite curl

# Copy application files
COPY production-api-server.js ./
COPY database/setup-rbac-sqlite.sql ./database/

# Create database
RUN sqlite3 production-authz.db < database/setup-rbac-sqlite.sql

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:4001/healthz || exit 1

# Run application
CMD ["node", "production-api-server.js"]