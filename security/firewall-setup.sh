#!/bin/bash
# Firewall and Network Security Setup for Xpress Ops Tower
# This script configures UFW firewall rules for production deployment

set -e

echo "🔒 Setting up firewall rules for Xpress Ops Tower..."

# Reset UFW to defaults
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw default deny forward

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp comment "SSH"

# Allow HTTP/HTTPS for web traffic
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Allow application port (only from specific sources in production)
sudo ufw allow from any to any port 3000 proto tcp comment "Xpress Ops Tower Application"

# Allow internal Docker network traffic
sudo ufw allow from 172.20.0.0/16 comment "Docker Frontend Network"
sudo ufw allow from 172.21.0.0/24 comment "Docker Backend Network"

# Block database and Redis ports from external access
sudo ufw deny 5432/tcp comment "Block PostgreSQL from external"
sudo ufw deny 6379/tcp comment "Block Redis from external"

# Allow specific monitoring ports (restrict to admin IPs in production)
sudo ufw allow from any to any port 9090 proto tcp comment "Prometheus (restrict in prod)"
sudo ufw allow from any to any port 3001 proto tcp comment "Grafana (restrict in prod)"

# Rate limiting rules
sudo ufw limit ssh comment "Rate limit SSH connections"

# Enable UFW
sudo ufw --force enable

# Configure fail2ban for additional protection
if command -v fail2ban-server &> /dev/null; then
    echo "📊 Configuring fail2ban..."
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    # Create custom jail for our application
    cat > /tmp/xpress-jail.conf << EOF
[xpress-ops-tower]
enabled = true
port = 3000,80,443
filter = xpress-filter
logpath = /var/log/xpress-ops-tower/*.log
maxretry = 5
bantime = 3600
findtime = 600

[sshd]
enabled = true
maxretry = 3
bantime = 3600
EOF
    
    sudo cp /tmp/xpress-jail.conf /etc/fail2ban/jail.d/
    sudo systemctl restart fail2ban
    echo "✅ fail2ban configured successfully"
else
    echo "⚠️  fail2ban not installed. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y fail2ban
    elif command -v yum &> /dev/null; then
        sudo yum install -y epel-release
        sudo yum install -y fail2ban
    else
        echo "❌ Could not install fail2ban. Please install manually."
    fi
fi

# Display current status
echo ""
echo "🔍 Current firewall status:"
sudo ufw status verbose

echo ""
echo "✅ Firewall configuration completed!"
echo ""
echo "🚨 IMPORTANT SECURITY NOTES:"
echo "   1. In production, restrict monitoring ports (9090, 3001) to admin IPs only"
echo "   2. Consider changing SSH port from default 22"
echo "   3. Regularly review and update firewall rules"
echo "   4. Monitor logs for blocked connection attempts"
echo ""
echo "📝 Log locations:"
echo "   - UFW logs: /var/log/ufw.log"
echo "   - fail2ban logs: /var/log/fail2ban.log"