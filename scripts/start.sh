#!/bin/bash

# Xpress Ops Tower - Backend Startup Script
# High-performance real-time fleet operations backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-3000}

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                    🚀 XPRESS OPS TOWER BACKEND                      ║"
echo "║                         Real-time Fleet Operations                   ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}📋 Starting backend initialization...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created from template${NC}"
        echo -e "${YELLOW}⚠️  Please update the .env file with your configuration${NC}"
    else
        echo -e "${RED}❌ No .env.example file found${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

echo -e "${BLUE}🔧 Environment: $NODE_ENV${NC}"

# Check Node.js version
NODE_VERSION=$(node --version)
echo -e "${BLUE}📦 Node.js version: $NODE_VERSION${NC}"

# Validate required Node.js version
REQUIRED_NODE_VERSION="18.0.0"
if ! node -e "process.exit(process.version.slice(1).localeCompare('$REQUIRED_NODE_VERSION', undefined, {numeric: true}) >= 0 ? 0 : 1)"; then
    echo -e "${RED}❌ Node.js version $REQUIRED_NODE_VERSION or higher is required${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Database connectivity check
echo -e "${YELLOW}📊 Checking database connectivity...${NC}"
if command -v psql &> /dev/null; then
    if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo -e "${YELLOW}💡 Please check your database configuration in .env${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not found. Skipping database connectivity check${NC}"
fi

# Redis connectivity check
echo -e "${YELLOW}🔄 Checking Redis connectivity...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis connection successful${NC}"
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        echo -e "${YELLOW}💡 Please check your Redis configuration in .env${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  redis-cli not found. Skipping Redis connectivity check${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if database schema is initialized
echo -e "${YELLOW}📊 Checking database schema...${NC}"
if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('drivers', 'bookings', 'incidents');" | grep -q "3"; then
    echo -e "${GREEN}✅ Database schema appears to be initialized${NC}"
else
    echo -e "${YELLOW}⚠️  Database schema may need initialization${NC}"
    echo -e "${YELLOW}💡 Please run the database migration scripts in /database/migrations/${NC}"
fi

# Build application if in production
if [ "$NODE_ENV" = "production" ]; then
    echo -e "${YELLOW}🏗️  Building application for production...${NC}"
    npm run build
    echo -e "${GREEN}✅ Application built successfully${NC}"
fi

# Set process title
export PROCESS_TITLE="xpress-ops-tower"

# Performance optimization for Node.js
export UV_THREADPOOL_SIZE=128  # Increase libuv thread pool size
export NODE_OPTIONS="--max-old-space-size=2048"  # Increase heap size

echo -e "${GREEN}🎯 All pre-flight checks completed successfully!${NC}"
echo -e "${BLUE}🚀 Starting Xpress Ops Tower Backend on port $PORT...${NC}"

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    # Production: Use compiled TypeScript and PM2 if available
    if command -v pm2 &> /dev/null; then
        echo -e "${BLUE}📊 Starting with PM2 process manager...${NC}"
        pm2 start dist/server.js --name "xpress-ops-tower" --instances max --exec-mode cluster
        pm2 logs xpress-ops-tower --lines 50
    else
        echo -e "${BLUE}🏃 Starting production server...${NC}"
        node dist/server.js
    fi
else
    # Development: Use ts-node with hot reload
    if command -v tsx &> /dev/null; then
        echo -e "${BLUE}🔄 Starting with tsx (hot reload)...${NC}"
        tsx watch src/server.ts
    elif command -v ts-node &> /dev/null; then
        echo -e "${BLUE}🔄 Starting with ts-node...${NC}"
        ts-node src/server.ts
    else
        echo -e "${YELLOW}⚠️  tsx/ts-node not found. Installing tsx...${NC}"
        npm install -g tsx
        tsx watch src/server.ts
    fi
fi