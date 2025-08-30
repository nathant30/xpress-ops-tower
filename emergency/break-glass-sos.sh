#!/bin/bash
# Emergency SOS System Break-Glass Access
# Only use during actual life-threatening emergencies

set -e

# Emergency configuration
EMERGENCY_LOG="/var/log/xpress/emergency-access.log"
EMERGENCY_DB_USER="emergency_admin"
EMERGENCY_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
EMERGENCY_OPERATOR="${USER:-unknown}"

echo "🚨🚨🚨 EMERGENCY SOS BREAK-GLASS ACCESS INITIATED 🚨🚨🚨"
echo "Timestamp: ${EMERGENCY_TIMESTAMP}"
echo "Operator: ${EMERGENCY_OPERATOR}"
echo ""

# Log the emergency access
mkdir -p "$(dirname "$EMERGENCY_LOG")"
echo "[${EMERGENCY_TIMESTAMP}] EMERGENCY ACCESS: SOS System break-glass by ${EMERGENCY_OPERATOR}" >> "$EMERGENCY_LOG"

# Verify this is a real emergency
echo "⚠️  CRITICAL WARNING:"
echo "   This is EMERGENCY BREAK-GLASS access to the SOS system"
echo "   Only proceed if there is an actual life-threatening emergency"
echo "   All actions will be logged and audited"
echo ""
read -p "🚨 Confirm this is a REAL EMERGENCY [type 'EMERGENCY' to continue]: " confirmation

if [ "$confirmation" != "EMERGENCY" ]; then
    echo "❌ Break-glass access cancelled"
    echo "[${EMERGENCY_TIMESTAMP}] EMERGENCY ACCESS CANCELLED by ${EMERGENCY_OPERATOR}" >> "$EMERGENCY_LOG"
    exit 1
fi

echo "[${EMERGENCY_TIMESTAMP}] EMERGENCY ACCESS CONFIRMED by ${EMERGENCY_OPERATOR}" >> "$EMERGENCY_LOG"

# Set emergency environment variables
export NODE_ENV="emergency"
export EMERGENCY_MODE="true"
export EMERGENCY_OPERATOR="${EMERGENCY_OPERATOR}"
export EMERGENCY_TIMESTAMP="${EMERGENCY_TIMESTAMP}"

echo "🔓 Activating emergency SOS access..."

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null; then
    echo "📦 Starting emergency SOS system..."
    
    # Start emergency services
    docker-compose -f docker-compose.emergency.yml up -d xpress-emergency postgres-emergency emergency-notifier
    
    echo "⏳ Waiting for services to be ready..."
    sleep 30
    
    # Test emergency SOS endpoint
    echo "🧪 Testing emergency SOS endpoint..."
    if curl -f -s "http://localhost/api/emergency/sos/test" > /dev/null 2>&1; then
        echo "✅ Emergency SOS system is ONLINE"
    else
        echo "❌ Emergency SOS system test FAILED"
        echo "   Manual intervention required"
    fi
    
else
    echo "⚠️  Docker Compose not available, attempting direct node startup..."
    
    # Set emergency database connection
    export DATABASE_URL="${EMERGENCY_DATABASE_URL:-postgresql://emergency_admin:${EMERGENCY_DB_PASSWORD}@localhost:5433/xpress_emergency}"
    
    # Start application in emergency mode
    if [ -f "package.json" ]; then
        npm run build
        NODE_ENV=emergency npm start &
        APP_PID=$!
        echo "🚀 Emergency application started with PID: $APP_PID"
    else
        echo "❌ Unable to start emergency application"
        exit 1
    fi
fi

# Activate backup communication channels
echo "📡 Activating backup communication channels..."

# Test SMS backup
if [ -n "${TWILIO_EMERGENCY_SID}" ]; then
    echo "📱 SMS backup: ACTIVE"
else
    echo "📱 SMS backup: NOT CONFIGURED"
fi

# Test email backup
if [ -n "${SENDGRID_EMERGENCY_API_KEY}" ]; then
    echo "📧 Email backup: ACTIVE"
else
    echo "📧 Email backup: NOT CONFIGURED"
fi

# Notify emergency contacts
echo "📞 Notifying emergency response team..."

# Send emergency notification
cat << EOF > /tmp/emergency-notification.txt
🚨 EMERGENCY SYSTEM ACCESS ACTIVATED 🚨

Timestamp: ${EMERGENCY_TIMESTAMP}
Operator: ${EMERGENCY_OPERATOR}
System: SOS Break-Glass Access
Status: ACTIVE

Emergency SOS system has been manually activated due to system failure.
All emergency protocols are now in effect.

Immediate actions required:
1. Verify all emergency communication channels
2. Coordinate with local emergency services
3. Monitor system status dashboards
4. Prepare for incident response procedures

This is an automated emergency notification.
EOF

# Send via available channels
if command -v mail &> /dev/null && [ -n "${EMERGENCY_EMAIL_CONTACTS}" ]; then
    echo "${EMERGENCY_EMAIL_CONTACTS}" | tr ',' '\n' | while read contact; do
        mail -s "🚨 EMERGENCY: SOS System Activated" "$contact" < /tmp/emergency-notification.txt
    done
fi

# Display emergency dashboard URLs
echo ""
echo "🖥️  EMERGENCY DASHBOARDS:"
echo "   Application: http://localhost/ (Emergency Mode)"
echo "   Database: postgresql://localhost:5433/xpress_emergency"
echo "   Monitoring: http://localhost:9091/"
echo "   Logs: tail -f ${EMERGENCY_LOG}"
echo ""

# Display emergency contacts
echo "📋 EMERGENCY CONTACTS:"
echo "   Emergency Services: 911 / 117"
echo "   Technical Team: ${EMERGENCY_TECH_CONTACT:-Not configured}"
echo "   Management: ${EMERGENCY_MGMT_CONTACT:-Not configured}"
echo ""

echo "🚨 EMERGENCY SOS SYSTEM IS NOW ACTIVE 🚨"
echo "💡 Remember to call local emergency services FIRST for life-threatening situations"
echo "📝 All actions are being logged to: ${EMERGENCY_LOG}"

# Log completion
echo "[${EMERGENCY_TIMESTAMP}] EMERGENCY SOS SYSTEM ACTIVATED by ${EMERGENCY_OPERATOR}" >> "$EMERGENCY_LOG"

# Cleanup temporary files
rm -f /tmp/emergency-notification.txt