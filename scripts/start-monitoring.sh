#!/bin/bash
# Xpress Ops Tower - Monitoring Stack Startup Script
# Starts Prometheus, Grafana, and AlertManager monitoring services

set -e

echo "🔍 Starting Xpress Ops Tower Monitoring Stack..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create monitoring directories if they don't exist
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/alertmanager
mkdir -p data/prometheus
mkdir -p data/grafana
mkdir -p data/alertmanager

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 777 data/prometheus
chmod 777 data/grafana
chmod 777 data/alertmanager

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found. Creating default monitoring environment..."
    cat > .env.monitoring << EOF
# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=admin123
PROMETHEUS_RETENTION=30d
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EMERGENCY_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/EMERGENCY/WEBHOOK
SECURITY_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK
SOS_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SOS/WEBHOOK
OPS_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/OPS/WEBHOOK
SMTP_PASSWORD=your_smtp_password_here

# Database monitoring credentials
POSTGRES_METRICS_USER=metrics_user
POSTGRES_METRICS_PASSWORD=secure_metrics_password
EOF
    echo "📝 Created .env.monitoring with default values. Please update with your actual credentials."
fi

# Start monitoring services
echo "🚀 Starting monitoring services..."

# Start Prometheus
echo "📊 Starting Prometheus..."
docker-compose up -d prometheus

# Wait for Prometheus to be ready
echo "⏳ Waiting for Prometheus to be ready..."
timeout 60 bash -c '
while ! curl -f http://localhost:9090/-/ready >/dev/null 2>&1; do
    echo "Waiting for Prometheus..."
    sleep 2
done
'

if [ $? -eq 0 ]; then
    echo "✅ Prometheus is ready at http://localhost:9090"
else
    echo "❌ Prometheus failed to start within 60 seconds"
    exit 1
fi

# Start AlertManager
echo "🚨 Starting AlertManager..."
docker-compose up -d alertmanager

# Wait for AlertManager to be ready
echo "⏳ Waiting for AlertManager to be ready..."
timeout 30 bash -c '
while ! curl -f http://localhost:9093/-/ready >/dev/null 2>&1; do
    echo "Waiting for AlertManager..."
    sleep 2
done
'

if [ $? -eq 0 ]; then
    echo "✅ AlertManager is ready at http://localhost:9093"
else
    echo "❌ AlertManager failed to start within 30 seconds"
fi

# Start Grafana
echo "📈 Starting Grafana..."
docker-compose up -d grafana

# Wait for Grafana to be ready
echo "⏳ Waiting for Grafana to be ready..."
timeout 60 bash -c '
while ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; do
    echo "Waiting for Grafana..."
    sleep 3
done
'

if [ $? -eq 0 ]; then
    echo "✅ Grafana is ready at http://localhost:3001"
    echo "   Default login: admin / admin123"
else
    echo "❌ Grafana failed to start within 60 seconds"
fi

# Start Loki and Promtail for log aggregation
echo "📜 Starting log aggregation services..."
docker-compose up -d loki promtail

echo ""
echo "🎉 Monitoring stack startup complete!"
echo ""
echo "🔗 Access URLs:"
echo "   📊 Prometheus: http://localhost:9090"
echo "   📈 Grafana:    http://localhost:3001 (admin/admin123)"
echo "   🚨 AlertManager: http://localhost:9093"
echo "   📜 Loki:       http://localhost:3100"
echo ""
echo "📋 Available Grafana Dashboards:"
echo "   • Xpress Security Overview"
echo "   • Xpress Operations Dashboard" 
echo "   • Xpress Emergency Monitoring"
echo ""
echo "🔍 Monitoring Features:"
echo "   ✅ Real-time metrics collection"
echo "   ✅ Security incident alerting"
echo "   ✅ SOS system monitoring"
echo "   ✅ Performance monitoring"
echo "   ✅ Compliance logging"
echo "   ✅ Emergency response tracking"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Configure Slack webhooks in .env file"
echo "   2. Set up SMTP credentials for email alerts"
echo "   3. Configure application metrics endpoints"
echo "   4. Test alert routing and escalation"
echo ""
echo "📚 Documentation: Check monitoring/ directory for configurations"