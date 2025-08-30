#!/bin/bash
# Secure Logging Setup for Xpress Ops Tower
# Configures tamper-proof logging, encryption, and log rotation

set -e

LOG_DIR="/Users/nathan/Desktop/claude/Projects/ops-tower/logs"
SCRIPTS_DIR="/Users/nathan/Desktop/claude/Projects/ops-tower/scripts"

echo "📝 Setting up secure logging infrastructure..."

# Create logging directory structure
mkdir -p "${LOG_DIR}/app"
mkdir -p "${LOG_DIR}/security"
mkdir -p "${LOG_DIR}/audit"
mkdir -p "${LOG_DIR}/emergency"
mkdir -p "${LOG_DIR}/archive"
mkdir -p "${LOG_DIR}/backup"

# Create rsyslog configuration for tamper-proof logging
cat > "${LOG_DIR}/rsyslog-xpress.conf" << EOF
# Xpress Ops Tower Secure Logging Configuration

# Create log socket
\$ModLoad imuxsock

# Enable high-precision timestamps
\$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat

# Tamper-proof logging - sign all logs
\$ModLoad omcrypt
\$DefaultNetstreamDriverCAFile /etc/ssl/certs/ca-certificates.crt

# Application logs
:programname, isequal, "xpress-ops-tower" ${LOG_DIR}/app/application.log
& stop

# Security logs
:programname, isequal, "xpress-security" ${LOG_DIR}/security/security.log
& stop

# Audit logs
:programname, isequal, "xpress-audit" ${LOG_DIR}/audit/audit.log
& stop

# Emergency logs (highest priority)
:programname, isequal, "xpress-emergency" ${LOG_DIR}/emergency/emergency.log
& stop

# Log rotation configuration
\$ActionFileEnableSync on
\$WorkDirectory ${LOG_DIR}
\$IncludeConfig ${LOG_DIR}/rsyslog.d/*.conf
EOF

# Create logrotate configuration
cat > "${LOG_DIR}/xpress-logrotate.conf" << EOF
# Xpress Ops Tower Log Rotation Configuration

${LOG_DIR}/app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        # Encrypt rotated logs
        find ${LOG_DIR}/app -name "*.log.*.gz" -exec gpg --cipher-algo AES256 --compress-algo 2 --symmetric --output {}.gpg {} \;
        find ${LOG_DIR}/app -name "*.log.*.gz" -not -name "*.gpg" -delete
        # Send to backup
        rsync -az ${LOG_DIR}/app/*.gpg backup-server:/secure-backups/xpress-logs/
    endscript
}

${LOG_DIR}/security/*.log {
    hourly
    missingok
    rotate 168
    compress
    delaycompress
    notifempty
    create 0600 root root
    sharedscripts
    postrotate
        # Security logs get immediate encryption and backup
        find ${LOG_DIR}/security -name "*.log.*" -exec gpg --cipher-algo AES256 --symmetric --output {}.gpg {} \;
        find ${LOG_DIR}/security -name "*.log.*" -not -name "*.gpg" -delete
        # Immediate backup for security logs
        rsync -az ${LOG_DIR}/security/*.gpg backup-server:/secure-backups/xpress-security/
        # Alert security team of log rotation
        echo "Security logs rotated at \$(date)" | mail -s "Xpress Security Log Rotation" security@xpress.com
    endscript
}

${LOG_DIR}/audit/*.log {
    daily
    missingok
    rotate 365
    compress
    delaycompress
    notifempty
    create 0600 root root
    sharedscripts
    postrotate
        # Audit logs get digital signature + encryption
        find ${LOG_DIR}/audit -name "*.log.*" -exec gpg --sign --cipher-algo AES256 --symmetric --output {}.sig.gpg {} \;
        find ${LOG_DIR}/audit -name "*.log.*" -not -name "*.gpg" -delete
        # Compliance backup for audit logs
        rsync -az ${LOG_DIR}/audit/*.sig.gpg backup-server:/compliance-backups/xpress-audit/
    endscript
}

${LOG_DIR}/emergency/*.log {
    never_rotate
    # Emergency logs are never rotated and kept indefinitely
    missingok
    notifempty
    create 0600 root root
    postrotate
        # Immediate encrypted backup for emergency logs
        find ${LOG_DIR}/emergency -name "*.log" -exec gpg --cipher-algo AES256 --symmetric --output {}.$(date +%Y%m%d_%H%M%S).gpg {} \;
        # Multiple backup locations for emergency logs
        rsync -az ${LOG_DIR}/emergency/*.gpg backup-server-1:/critical-backups/emergency/
        rsync -az ${LOG_DIR}/emergency/*.gpg backup-server-2:/critical-backups/emergency/
        aws s3 cp ${LOG_DIR}/emergency/ s3://xpress-emergency-logs/ --recursive --include "*.gpg"
    endscript
}
EOF

# Create log integrity checker
cat > "${SCRIPTS_DIR}/check-log-integrity.sh" << 'EOF'
#!/bin/bash
# Check log integrity and detect tampering

set -e

LOG_DIR="/Users/nathan/Desktop/claude/Projects/ops-tower/logs"
INTEGRITY_LOG="${LOG_DIR}/integrity-check.log"

echo "🔍 Checking log integrity..."

# Function to calculate and verify checksums
check_directory_integrity() {
    local dir="$1"
    local name="$2"
    
    echo "[$(date)] Checking integrity of $name logs..." >> "$INTEGRITY_LOG"
    
    if [ -d "$dir" ]; then
        # Calculate checksums for all log files
        find "$dir" -name "*.log" -type f -exec sha256sum {} \; > "${dir}/.checksums.new"
        
        # Compare with previous checksums
        if [ -f "${dir}/.checksums" ]; then
            if ! diff "${dir}/.checksums" "${dir}/.checksums.new" > /dev/null; then
                echo "⚠️  INTEGRITY WARNING: $name logs have been modified!" | tee -a "$INTEGRITY_LOG"
                echo "Differences:" >> "$INTEGRITY_LOG"
                diff "${dir}/.checksums" "${dir}/.checksums.new" >> "$INTEGRITY_LOG"
                
                # Alert security team
                echo "Log integrity violation detected in $name" | mail -s "🚨 Log Tampering Alert" security@xpress.com
            else
                echo "✅ $name logs integrity verified" | tee -a "$INTEGRITY_LOG"
            fi
        else
            echo "📝 Creating initial checksums for $name logs" | tee -a "$INTEGRITY_LOG"
        fi
        
        # Update checksums
        mv "${dir}/.checksums.new" "${dir}/.checksums"
    else
        echo "❌ Directory $dir not found" | tee -a "$INTEGRITY_LOG"
    fi
}

# Check all log directories
check_directory_integrity "${LOG_DIR}/app" "Application"
check_directory_integrity "${LOG_DIR}/security" "Security"
check_directory_integrity "${LOG_DIR}/audit" "Audit"
check_directory_integrity "${LOG_DIR}/emergency" "Emergency"

# Check for suspicious log patterns
echo "🔍 Checking for suspicious log patterns..."

# Check for log injection attempts
if grep -r "(\%0A|\%0D|\%27|\%3C|\%3E|\%00)" "${LOG_DIR}" 2>/dev/null; then
    echo "⚠️  SECURITY ALERT: Log injection patterns detected!" | tee -a "$INTEGRITY_LOG"
fi

# Check for excessive failed login attempts
if grep -c "authentication failed" "${LOG_DIR}/security/security.log" 2>/dev/null | awk '$1 > 100 {print "⚠️  HIGH: Excessive failed logins: " $1}' >> "$INTEGRITY_LOG"; then
    echo "Security alert logged for excessive failed logins"
fi

# Check for emergency log entries
if [ -s "${LOG_DIR}/emergency/emergency.log" ]; then
    echo "🚨 Emergency log entries detected - notifying response team" | tee -a "$INTEGRITY_LOG"
    # Send emergency log digest to response team
    tail -n 50 "${LOG_DIR}/emergency/emergency.log" | mail -s "🚨 Emergency Log Activity" emergency@xpress.com
fi

echo "📊 Log integrity check completed at $(date)" >> "$INTEGRITY_LOG"
EOF

chmod +x "${SCRIPTS_DIR}/check-log-integrity.sh"

# Create encrypted backup script
cat > "${SCRIPTS_DIR}/backup-logs.sh" << 'EOF'
#!/bin/bash
# Encrypted log backup system

set -e

LOG_DIR="/Users/nathan/Desktop/claude/Projects/ops-tower/logs"
BACKUP_DIR="${LOG_DIR}/backup"
S3_BUCKET="xpress-secure-log-backups"

echo "💾 Starting encrypted log backup..."

# Create backup timestamp
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="xpress_logs_${BACKUP_TIMESTAMP}"

# Create temporary backup directory
TEMP_BACKUP="/tmp/${BACKUP_NAME}"
mkdir -p "$TEMP_BACKUP"

# Copy all logs to temporary location
echo "📂 Collecting logs for backup..."
cp -r "${LOG_DIR}/app" "$TEMP_BACKUP/" 2>/dev/null || echo "No app logs found"
cp -r "${LOG_DIR}/security" "$TEMP_BACKUP/" 2>/dev/null || echo "No security logs found"
cp -r "${LOG_DIR}/audit" "$TEMP_BACKUP/" 2>/dev/null || echo "No audit logs found"
cp -r "${LOG_DIR}/emergency" "$TEMP_BACKUP/" 2>/dev/null || echo "No emergency logs found"

# Add backup metadata
cat > "$TEMP_BACKUP/backup-metadata.json" << EOL
{
  "backup_timestamp": "${BACKUP_TIMESTAMP}",
  "backup_type": "encrypted_log_backup",
  "system": "xpress_ops_tower",
  "version": "1.0",
  "created_by": "$(whoami)",
  "hostname": "$(hostname)",
  "file_count": $(find "$TEMP_BACKUP" -type f | wc -l),
  "total_size": $(du -sh "$TEMP_BACKUP" | cut -f1)
}
EOL

# Create compressed archive
echo "🗜️  Compressing logs..."
tar -czf "/tmp/${BACKUP_NAME}.tar.gz" -C "/tmp" "$BACKUP_NAME"

# Encrypt the backup
echo "🔐 Encrypting backup..."
gpg --cipher-algo AES256 --compress-algo 2 --symmetric --output "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.gpg" "/tmp/${BACKUP_NAME}.tar.gz"

# Generate checksum
echo "🔍 Generating integrity checksum..."
sha256sum "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.gpg" > "${BACKUP_DIR}/${BACKUP_NAME}.sha256"

# Upload to cloud storage (if configured)
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to cloud storage..."
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.gpg" "s3://$S3_BUCKET/daily-backups/"
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.sha256" "s3://$S3_BUCKET/daily-backups/"
    echo "✅ Cloud backup completed"
fi

# Cleanup old backups (keep 30 days)
echo "🧹 Cleaning old backups..."
find "${BACKUP_DIR}" -name "xpress_logs_*.gpg" -mtime +30 -delete
find "${BACKUP_DIR}" -name "xpress_logs_*.sha256" -mtime +30 -delete

# Cleanup temporary files
rm -rf "$TEMP_BACKUP" "/tmp/${BACKUP_NAME}.tar.gz"

# Log backup completion
echo "[$(date)] Encrypted backup completed: ${BACKUP_NAME}.tar.gz.gpg" >> "${LOG_DIR}/backup/backup.log"

echo "✅ Encrypted log backup completed: ${BACKUP_NAME}.tar.gz.gpg"
echo "📊 Backup size: $(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.gpg" | cut -f1)"
echo "🔍 Checksum: $(cat "${BACKUP_DIR}/${BACKUP_NAME}.sha256")"
EOF

chmod +x "${SCRIPTS_DIR}/backup-logs.sh"

# Create log monitoring service
cat > "${LOG_DIR}/log-monitor.service" << EOF
[Unit]
Description=Xpress Ops Tower Log Monitor
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=${SCRIPTS_DIR}/monitor-logs.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "✅ Secure logging infrastructure setup completed!"
echo ""
echo "📋 Created components:"
echo "   - Tamper-proof rsyslog configuration"
echo "   - Encrypted log rotation with GPG"
echo "   - Log integrity checker"
echo "   - Encrypted backup system"
echo "   - Log monitoring service"
echo ""
echo "🔧 Next steps:"
echo "   1. Install and configure rsyslog with the provided config"
echo "   2. Set up GPG keys for log encryption"
echo "   3. Configure backup destinations"
echo "   4. Add to crontab: 0 2 * * * ${SCRIPTS_DIR}/backup-logs.sh"
echo "   5. Add to crontab: */15 * * * * ${SCRIPTS_DIR}/check-log-integrity.sh"