#!/bin/bash

# Production Security: Fix File Permissions
# Run this script to set proper file permissions for production deployment

echo "🔐 Fixing file permissions for production security..."

# Set restrictive permissions for sensitive configuration files
chmod 600 package.json
chmod 600 package-lock.json  
chmod 600 tsconfig.json
chmod 600 next.config.js
chmod 600 .env*
chmod 600 .gitignore

# Set permissions for scripts
chmod 755 scripts/*.sh
chmod 755 scripts/*.js

# Set permissions for source code (readable by owner and group)
find src/ -type f -name "*.ts" -exec chmod 644 {} \;
find src/ -type f -name "*.tsx" -exec chmod 644 {} \;
find src/ -type f -name "*.js" -exec chmod 644 {} \;
find src/ -type f -name "*.jsx" -exec chmod 644 {} \;

# Set directory permissions
find src/ -type d -exec chmod 755 {} \;

# Database and security files - most restrictive
chmod 600 *.db 2>/dev/null || true
chmod 600 security/reports/*.json 2>/dev/null || true

echo "✅ File permissions secured for production deployment"
echo "⚠️  Remember to set proper ownership: chown -R app:app /path/to/app"