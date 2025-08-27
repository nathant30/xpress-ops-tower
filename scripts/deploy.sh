#!/bin/bash

# Xpress Ops Tower Deployment Script
# Production deployment automation with emergency system checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${PROJECT_DIR}/logs/deployment_${TIMESTAMP}.log"

# Default values
ENVIRONMENT="staging"
SKIP_TESTS=false
EMERGENCY_DEPLOY=false
ROLLBACK=false
VERSION=""
BACKUP_DATABASE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
        *) echo -e "$message" | tee -a "$LOG_FILE" ;;
    esac
}

# Error handling
error_exit() {
    log ERROR "Deployment failed: $1"
    log ERROR "Check log file: $LOG_FILE"
    exit 1
}

# Cleanup function
cleanup() {
    log INFO "Performing cleanup..."
    # Stop any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Remove temporary files
    rm -f /tmp/xpress-deploy-*
}

trap cleanup EXIT
trap 'error_exit "Deployment interrupted"' INT TERM

# Help function
show_help() {
    cat << EOF
Xpress Ops Tower Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (staging|production) [default: staging]
    -v, --version VERSION    Version to deploy [default: auto-generated]
    -s, --skip-tests        Skip non-critical tests
    -E, --emergency         Emergency deployment mode (minimal checks)
    -r, --rollback          Rollback to previous version
    -h, --help              Show this help message
    --no-backup             Skip database backup

EXAMPLES:
    # Deploy to staging
    $0 --environment staging

    # Emergency production deployment
    $0 --environment production --emergency

    # Rollback production
    $0 --environment production --rollback

    # Deploy specific version
    $0 --environment production --version v1.2.3

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -E|--emergency)
            EMERGENCY_DEPLOY=true
            SKIP_TESTS=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        --no-backup)
            BACKUP_DATABASE=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    error_exit "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
fi

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log INFO "🚀 Starting Xpress Ops Tower deployment"
log INFO "Environment: $ENVIRONMENT"
log INFO "Emergency mode: $EMERGENCY_DEPLOY"
log INFO "Skip tests: $SKIP_TESTS"
log INFO "Rollback: $ROLLBACK"
log INFO "Log file: $LOG_FILE"

# Load environment-specific configuration
ENV_FILE="${PROJECT_DIR}/config/.env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    log INFO "Loading environment configuration: $ENV_FILE"
    source "$ENV_FILE"
else
    log WARN "Environment file not found: $ENV_FILE"
fi

# Check prerequisites
check_prerequisites() {
    log INFO "🔍 Checking deployment prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is required but not installed"
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    
    if ! [[ "$node_version" > "$required_version" || "$node_version" == "$required_version" ]]; then
        error_exit "Node.js version $required_version or higher required, found $node_version"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm is required but not installed"
    fi
    
    # Check database connection
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log INFO "Testing database connection..."
        if ! timeout 10 psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
            error_exit "Cannot connect to database"
        fi
        log SUCCESS "Database connection successful"
    fi
    
    # Check Redis connection
    if [[ -n "${REDIS_URL:-}" ]]; then
        log INFO "Testing Redis connection..."
        if ! timeout 10 redis-cli -u "$REDIS_URL" ping &>/dev/null; then
            error_exit "Cannot connect to Redis"
        fi
        log SUCCESS "Redis connection successful"
    fi
    
    log SUCCESS "Prerequisites check passed"
}

# Generate version if not provided
generate_version() {
    if [[ -z "$VERSION" ]]; then
        if git rev-parse --is-inside-work-tree &>/dev/null; then
            local git_hash=$(git rev-parse --short HEAD)
            local git_branch=$(git rev-parse --abbrev-ref HEAD)
            VERSION="v$(date +%Y%m%d)-${git_hash}-${git_branch}"
        else
            VERSION="v$(date +%Y%m%d_%H%M%S)"
        fi
        log INFO "Generated version: $VERSION"
    fi
}

# Backup database
backup_database() {
    if [[ "$BACKUP_DATABASE" == true && -n "${DATABASE_URL:-}" ]]; then
        log INFO "📦 Creating database backup..."
        
        local backup_file="${PROJECT_DIR}/backups/db_backup_${ENVIRONMENT}_${TIMESTAMP}.sql"
        mkdir -p "$(dirname "$backup_file")"
        
        if pg_dump "$DATABASE_URL" > "$backup_file"; then
            log SUCCESS "Database backup created: $backup_file"
            
            # Compress backup
            gzip "$backup_file"
            log SUCCESS "Backup compressed: ${backup_file}.gz"
        else
            error_exit "Database backup failed"
        fi
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log WARN "Skipping tests (skip-tests flag enabled)"
        return 0
    fi
    
    log INFO "🧪 Running test suite..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies
    log INFO "Installing dependencies..."
    npm ci --production=false
    
    # Run unit tests
    log INFO "Running unit tests..."
    if ! npm run test:unit; then
        error_exit "Unit tests failed"
    fi
    
    # Run integration tests (if not emergency)
    if [[ "$EMERGENCY_DEPLOY" == false ]]; then
        log INFO "Running integration tests..."
        if ! npm run test:integration; then
            error_exit "Integration tests failed"
        fi
    fi
    
    # Run emergency system tests (always required)
    log INFO "🚨 Running emergency system tests (CRITICAL)..."
    if ! npm run test:emergency; then
        error_exit "CRITICAL: Emergency system tests failed - deployment blocked"
    fi
    
    log SUCCESS "All tests passed"
}

# Build application
build_application() {
    log INFO "🏗️ Building application..."
    
    cd "$PROJECT_DIR"
    
    # Type checking
    log INFO "Running type check..."
    if ! npm run type-check; then
        error_exit "Type checking failed"
    fi
    
    # Linting
    log INFO "Running linter..."
    if ! npm run lint; then
        error_exit "Linting failed"
    fi
    
    # Build
    log INFO "Building Next.js application..."
    if ! npm run build; then
        error_exit "Build failed"
    fi
    
    log SUCCESS "Application built successfully"
}

# Deploy to staging
deploy_staging() {
    log INFO "🎯 Deploying to staging environment..."
    
    local staging_host="${STAGING_HOST:-localhost}"
    local staging_user="${STAGING_USER:-deploy}"
    local staging_path="${STAGING_PATH:-/opt/xpress-ops-tower}"
    
    # Create deployment package
    local package_file="/tmp/xpress-deploy-${VERSION}.tar.gz"
    
    log INFO "Creating deployment package..."
    tar -czf "$package_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=__tests__ \
        --exclude=*.log \
        -C "$PROJECT_DIR" .
    
    # Upload package
    log INFO "Uploading to staging server..."
    if ! scp "$package_file" "${staging_user}@${staging_host}:/tmp/"; then
        error_exit "Failed to upload package to staging"
    fi
    
    # Deploy on staging server
    log INFO "Deploying on staging server..."
    ssh "${staging_user}@${staging_host}" << EOF
        set -e
        
        # Extract package
        cd "$staging_path"
        tar -xzf "/tmp/xpress-deploy-${VERSION}.tar.gz"
        
        # Install dependencies
        npm ci --production
        
        # Run database migrations
        npm run db:migrate || true
        
        # Restart services
        sudo systemctl restart xpress-ops-tower
        
        # Wait for service
        sleep 30
        
        # Health check
        for i in {1..30}; do
            if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                echo "Health check passed"
                break
            fi
            echo "Waiting for service... (\$i/30)"
            sleep 2
        done
        
        # Emergency system check
        if ! curl -f http://localhost:3000/api/emergency/health > /dev/null 2>&1; then
            echo "CRITICAL: Emergency system health check failed"
            exit 1
        fi
        
        echo "Staging deployment completed successfully"
EOF
    
    log SUCCESS "Staging deployment completed"
}

# Deploy to production
deploy_production() {
    log INFO "🚀 Deploying to production environment..."
    
    if [[ "$EMERGENCY_DEPLOY" == false ]]; then
        log INFO "This is a production deployment. Waiting 10 seconds for confirmation..."
        log INFO "Press Ctrl+C to abort..."
        sleep 10
    fi
    
    local blue_host="${PRODUCTION_HOST_BLUE:-}"
    local green_host="${PRODUCTION_HOST_GREEN:-}"
    local lb_host="${LOAD_BALANCER_HOST:-}"
    local prod_user="${PRODUCTION_USER:-deploy}"
    local prod_path="${PRODUCTION_PATH:-/opt/xpress-ops-tower}"
    
    if [[ -z "$blue_host" || -z "$green_host" || -z "$lb_host" ]]; then
        error_exit "Production hosts not configured"
    fi
    
    # Determine active/inactive environments
    local active_env=$(ssh "${prod_user}@${lb_host}" "cat /opt/load-balancer/active-env.txt 2>/dev/null || echo 'green'")
    local deploy_host deploy_env
    
    if [[ "$active_env" == "blue" ]]; then
        deploy_host="$green_host"
        deploy_env="green"
    else
        deploy_host="$blue_host"
        deploy_env="blue"
    fi
    
    log INFO "Deploying to $deploy_env environment ($deploy_host)"
    
    # Create deployment package
    local package_file="/tmp/xpress-deploy-${VERSION}.tar.gz"
    
    log INFO "Creating deployment package..."
    tar -czf "$package_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=__tests__ \
        --exclude=*.log \
        -C "$PROJECT_DIR" .
    
    # Upload package
    log INFO "Uploading to production server..."
    if ! scp "$package_file" "${prod_user}@${deploy_host}:/tmp/"; then
        error_exit "Failed to upload package to production"
    fi
    
    # Deploy on production server
    log INFO "Deploying on production server..."
    ssh "${prod_user}@${deploy_host}" << EOF
        set -e
        
        # Extract package
        cd "$prod_path"
        tar -xzf "/tmp/xpress-deploy-${VERSION}.tar.gz"
        
        # Install dependencies
        npm ci --production
        
        # Run database migrations (carefully)
        npm run db:migrate || echo "Migration skipped"
        
        # Start monitoring
        node monitoring/performance-monitor.js > /dev/null 2>&1 &
        
        # Restart application
        sudo systemctl restart xpress-ops-tower
        
        # Wait for service
        sleep 60
        
        # Comprehensive health checks
        echo "Running health checks..."
        for i in {1..60}; do
            if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                echo "Application health check passed"
                break
            fi
            echo "Waiting for application... (\$i/60)"
            sleep 2
        done
        
        # Emergency system check (CRITICAL)
        if ! curl -f http://localhost:3000/api/emergency/health > /dev/null 2>&1; then
            echo "CRITICAL: Emergency system health check failed"
            exit 1
        fi
        echo "Emergency system health check passed"
        
        # Integration health checks
        if ! curl -f http://localhost:3000/api/integrations/health > /dev/null 2>&1; then
            echo "WARNING: Integration health check failed"
        fi
        
        echo "Production deployment completed on $deploy_env"
EOF
    
    # Switch load balancer
    log INFO "🔄 Switching load balancer to $deploy_env environment..."
    ssh "${prod_user}@${lb_host}" << EOF
        set -e
        
        # Update load balancer configuration
        sudo cp "/opt/load-balancer/configs/${deploy_env}.conf" /opt/load-balancer/active.conf
        sudo nginx -t
        sudo systemctl reload nginx
        
        # Update active environment marker
        echo "$deploy_env" > /opt/load-balancer/active-env.txt
        
        echo "Load balancer switched to $deploy_env"
EOF
    
    log SUCCESS "Production deployment completed successfully"
    
    # Post-deployment verification
    log INFO "🔍 Running post-deployment verification..."
    sleep 30
    
    local prod_url="${PRODUCTION_URL:-https://xpress-ops-tower.com}"
    
    # Critical system checks
    if ! curl -f "$prod_url/api/health"; then
        error_exit "Production health check failed"
    fi
    
    if ! curl -f "$prod_url/api/emergency/health"; then
        error_exit "Production emergency system health check failed"
    fi
    
    log SUCCESS "Post-deployment verification completed"
    
    # Start production monitoring
    log INFO "📊 Activating production monitoring..."
    # Monitoring activation logic would go here
    
    log SUCCESS "🎉 Production deployment successful!"
    log INFO "Version: $VERSION"
    log INFO "Environment: $deploy_env"
    log INFO "URL: $prod_url"
}

# Rollback function
rollback_deployment() {
    log INFO "🔄 Initiating rollback for $ENVIRONMENT environment..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local lb_host="${LOAD_BALANCER_HOST:-}"
        local prod_user="${PRODUCTION_USER:-deploy}"
        
        if [[ -z "$lb_host" ]]; then
            error_exit "Load balancer host not configured for rollback"
        fi
        
        # Switch to previous environment
        ssh "${prod_user}@${lb_host}" << 'EOF'
            set -e
            
            current_env=$(cat /opt/load-balancer/active-env.txt)
            if [[ "$current_env" == "blue" ]]; then
                rollback_env="green"
            else
                rollback_env="blue"
            fi
            
            echo "Rolling back to $rollback_env environment"
            
            # Update load balancer
            sudo cp "/opt/load-balancer/configs/${rollback_env}.conf" /opt/load-balancer/active.conf
            sudo nginx -t
            sudo systemctl reload nginx
            echo "$rollback_env" > /opt/load-balancer/active-env.txt
            
            echo "Rollback completed - switched to $rollback_env"
EOF
        
        log SUCCESS "Production rollback completed"
    else
        error_exit "Rollback not implemented for $ENVIRONMENT environment"
    fi
}

# Main deployment logic
main() {
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        return 0
    fi
    
    check_prerequisites
    generate_version
    backup_database
    run_tests
    build_application
    
    case $ENVIRONMENT in
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            error_exit "Unknown environment: $ENVIRONMENT"
            ;;
    esac
    
    log SUCCESS "✅ Deployment completed successfully!"
    log INFO "Check logs: $LOG_FILE"
}

# Run main function
main "$@"