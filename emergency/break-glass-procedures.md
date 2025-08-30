# 🚨 EMERGENCY BREAK-GLASS PROCEDURES
## Xpress Ops Tower Emergency Access Protocols

**⚠️ CRITICAL: Only use these procedures during actual system emergencies**

---

## 📋 EMERGENCY SCENARIOS

### 1. **SOS SYSTEM FAILURE**
**Trigger:** Life-threatening emergency and SOS system is down
**Priority:** CRITICAL - Lives at risk

**Immediate Actions:**
1. **Call local emergency services FIRST** (911, 117, etc.)
2. Execute break-glass access: `./emergency/break-glass-sos.sh`
3. Activate backup communication channels
4. Notify emergency response team

### 2. **DATABASE SYSTEM FAILURE**  
**Trigger:** Complete database unavailability affecting operations
**Priority:** HIGH - Service disruption

**Immediate Actions:**
1. Execute database failover: `./emergency/db-failover.sh`
2. Switch to read-only replica if available
3. Activate backup data center
4. Notify operations team

### 3. **AUTHENTICATION SYSTEM BREACH**
**Trigger:** Suspected unauthorized access or authentication compromise  
**Priority:** HIGH - Security incident

**Immediate Actions:**
1. Execute security lockdown: `./emergency/security-lockdown.sh`
2. Disable all user sessions
3. Force password resets
4. Activate incident response team

---

## 🔓 BREAK-GLASS ACCESS METHODS

### Method 1: Emergency Admin Override
```bash
# Location: /emergency/break-glass-sos.sh
export EMERGENCY_OVERRIDE_KEY="EMERGENCY_$(date +%Y%m%d)"
export EMERGENCY_OPERATOR="$(whoami)"
./scripts/emergency-access.sh --force --reason="SOS_SYSTEM_FAILURE"
```

### Method 2: Database Direct Access
```bash
# Emergency database connection (bypasses application layer)
export PGPASSWORD="${EMERGENCY_DB_PASSWORD}"
psql -h localhost -U emergency_admin -d xpress_ops_tower
```

### Method 3: System Recovery Mode
```bash
# Start system in emergency mode
docker-compose -f docker-compose.emergency.yml up -d
```

---

## 📞 BACKUP COMMUNICATION CHANNELS

### Primary Backup: SMS Gateway
- **Provider:** Twilio Backup Account
- **Endpoint:** https://api.twilio.com/2010-04-01/Accounts/BACKUP_SID
- **Auth Token:** `${TWILIO_BACKUP_AUTH_TOKEN}`

### Secondary Backup: Email Service  
- **Provider:** SendGrid Backup Account
- **API Key:** `${SENDGRID_BACKUP_API_KEY}`
- **Endpoint:** https://api.sendgrid.com/v3/mail/send

### Tertiary Backup: Push Notifications
- **Provider:** Firebase Cloud Messaging
- **Service Account:** `emergency-fcm-service-account.json`

---

## 🌐 GEO-REDUNDANCY SETUP

### Primary Data Center: Manila
- **Location:** Manila, Philippines  
- **IP Range:** 172.20.0.0/16
- **Status Endpoint:** https://manila.xpress-ops.com/health

### Backup Data Center: Cebu
- **Location:** Cebu, Philippines
- **IP Range:** 172.21.0.0/16  
- **Status Endpoint:** https://cebu.xpress-ops.com/health
- **Activation Script:** `./emergency/activate-cebu-dc.sh`

### Disaster Recovery: Cloud
- **Provider:** AWS Asia-Pacific (Singapore)
- **Region:** ap-southeast-1
- **Activation Script:** `./emergency/activate-aws-dr.sh`

---

## 📝 EMERGENCY CONTACT LIST

### 24/7 Emergency Response Team
- **Primary:** +63 917 XXX XXXX (Emergency Coordinator)
- **Secondary:** +63 918 XXX XXXX (Technical Lead)
- **Escalation:** +63 919 XXX XXXX (CTO/Emergency Director)

### External Emergency Services
- **Philippines Emergency:** 911
- **NDRRMC:** +63 2 911 5061
- **Local Emergency Services:** 117

### Technical Support Escalation
- **Database Team:** db-emergency@xpress.com
- **Network Team:** network-emergency@xpress.com  
- **Security Team:** security-incident@xpress.com

---

## 🔍 EMERGENCY MONITORING DASHBOARDS

### Real-time System Status
- **URL:** https://status.xpress-ops.com/emergency
- **Credentials:** `emergency_viewer` / `${EMERGENCY_DASHBOARD_PASSWORD}`

### Emergency Incident Tracker
- **URL:** https://incidents.xpress-ops.com
- **Access:** Break-glass login or emergency API key

---

## ⚠️ POST-EMERGENCY PROCEDURES

### Immediate (Within 1 Hour)
1. **Document the incident** in emergency log
2. **Notify stakeholders** of resolution
3. **Verify system integrity** across all components
4. **Reset emergency access credentials**

### Short-term (Within 24 Hours)  
1. **Conduct incident review** with response team
2. **Update emergency procedures** based on lessons learned
3. **Test backup systems** to ensure readiness
4. **Generate incident report** for management

### Long-term (Within 1 Week)
1. **Perform security audit** of emergency access
2. **Review and update** emergency contact list
3. **Conduct emergency drill** to validate procedures
4. **Update disaster recovery plans**

---

## 🔒 SECURITY NOTES

- **All emergency access is logged and audited**
- **Emergency credentials expire after 24 hours**
- **Two-person authorization required for database emergency access**
- **All break-glass actions trigger automatic incident creation**

**Last Updated:** $(date)
**Next Review:** $(date -d '+3 months')