# Runbook: Expansion Manager Security Violations

## Alert: ExpansionManagerActiveRegionViolation

**Severity**: SEV-2 (Critical)  
**Response Time**: Immediate (< 1 minute)  
**Escalation**: Security Team Pager

### Description

An `expansion_manager` user attempted to access an active or suspended region, violating security boundaries.

### Immediate Actions (0-5 minutes)

1. **Suspend User Access**
   ```bash
   # Disable expansion_manager user immediately
   kubectl exec -it ops-tower-api -- node -e "
     const { suspendUser } = require('./src/lib/auth/user-management');
     suspendUser('${USER_ID}', 'security_violation', 'active_region_access');
   "
   ```

2. **Check Alert Details**
   ```bash
   # Get violation details from logs
   kubectl logs -l app=ops-tower --since=5m | grep "expansion_scope_violation"
   
   # Check Grafana dashboard for context
   open "https://grafana.xpress.ph/d/expansion-ops/expansion-operations?var-expansion_user=${USER_ID}"
   ```

3. **Validate Violation**
   ```bash
   # Confirm the region is actually active/suspended
   psql -c "SELECT region_id, region_state FROM regions WHERE region_id = '${REGION_ID}';"
   
   # Check if this is a legitimate emergency override
   psql -c "SELECT * FROM emergency_overrides WHERE user_id = '${USER_ID}' AND expires_at > NOW();"
   ```

### Investigation Steps (5-15 minutes)

1. **Audit Trail Analysis**
   ```bash
   # Get full user action history
   psql -c "
     SELECT timestamp, action, resource, result, metadata 
     FROM audit_logs 
     WHERE user_id = '${USER_ID}' 
       AND timestamp > NOW() - INTERVAL '1 hour'
     ORDER BY timestamp DESC;
   "
   
   # Check for pattern of violations
   psql -c "
     SELECT DATE(timestamp), COUNT(*) as violation_count
     FROM security_violations 
     WHERE user_id = '${USER_ID}' 
       AND violation_type = 'active_region_access'
       AND timestamp > NOW() - INTERVAL '7 days'
     GROUP BY DATE(timestamp);
   "
   ```

2. **Technical Root Cause**
   ```bash
   # Check if expansionScopeOK function is working
   kubectl exec -it ops-tower-api -- node -e "
     const { expansionScopeOK } = require('./src/lib/auth/checks');
     const result = expansionScopeOK({
       user: { role: 'expansion_manager' },
       resource: { region_state: 'active' }
     });
     console.log('expansionScopeOK result:', result);
   "
   
   # Verify RBAC engine integration
   kubectl logs -l app=ops-tower --since=10m | grep "RBAC.*expansion_manager"
   ```

3. **User Context Investigation**
   ```bash
   # Check user's normal regions
   psql -c "
     SELECT ur.region_id, r.region_state 
     FROM user_regions ur 
     JOIN regions r ON ur.region_id = r.region_id 
     WHERE ur.user_id = '${USER_ID}';
   "
   
   # Look for any legitimate business justification
   psql -c "
     SELECT * FROM case_escalations 
     WHERE user_id = '${USER_ID}' 
       AND status = 'active'
       AND expires_at > NOW();
   "
   ```

### Escalation Procedures

#### If Violation is Confirmed (Malicious/Accidental)

1. **Immediate Security Response**
   - Keep user suspended
   - Notify CISO and Security Team Lead
   - Document incident in security incident system
   - Preserve all audit logs

2. **Management Notification** 
   ```bash
   # Send security alert to management
   curl -X POST ${SLACK_SECURITY_WEBHOOK} -d '{
     "text": "🚨 SEV-2: expansion_manager security violation confirmed",
     "attachments": [{
       "color": "danger",
       "fields": [
         {"title": "User ID", "value": "'${USER_ID}'", "short": true},
         {"title": "Region", "value": "'${REGION_ID}'", "short": true},
         {"title": "Action", "value": "'${ATTEMPTED_ACTION}'", "short": true},
         {"title": "Status", "value": "User suspended, investigation in progress", "short": false}
       ]
     }]
   }'
   ```

3. **Executive Briefing Required** (within 30 minutes)
   - CEO, CTO, CISO notification
   - Preliminary incident summary
   - Immediate remediation steps taken

#### If Violation is False Positive

1. **Restore User Access**
   ```bash
   kubectl exec -it ops-tower-api -- node -e "
     const { restoreUser } = require('./src/lib/auth/user-management');
     restoreUser('${USER_ID}', 'false_positive_resolved');
   "
   ```

2. **Fix Technical Issue**
   - Update expansionScopeOK logic if needed
   - Fix region state classification
   - Update monitoring rules to prevent false positives

### Remediation Actions

#### Short-term (0-24 hours)

1. **User Access Control**
   - If malicious: Permanent revocation, legal review
   - If accidental: Mandatory security training, supervised access restoration
   - If system error: Immediate fix, user restoration

2. **System Hardening**
   ```bash
   # Add additional validation layer
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: expansion-security-hardening
   data:
     additional_checks.js: |
       // Double-check region state before any expansion action
       function doubleCheckRegionAccess(userId, regionId) {
         const region = database.getRegion(regionId);
         if (region.state === 'active' || region.state === 'suspended') {
           logger.error('DOUBLE_CHECK_VIOLATION', { userId, regionId, state: region.state });
           throw new Error('Expansion manager cannot access active/suspended regions');
         }
       }
   EOF
   ```

#### Long-term (1-7 days)

1. **Process Improvements**
   - Review expansion_manager onboarding process
   - Enhance security training materials
   - Implement additional authorization checkpoints

2. **Monitoring Enhancements**
   - Lower alerting thresholds for expansion violations
   - Add predictive monitoring for suspicious patterns
   - Implement real-time blocking at API gateway level

### Prevention Measures

1. **Code Review Requirements**
   - All expansion-related code requires security team approval
   - Mandatory unit tests for boundary conditions
   - Integration tests must cover security violation scenarios

2. **Continuous Monitoring**
   ```bash
   # Add synthetic monitoring for security boundaries
   kubectl apply -f - <<EOF
   apiVersion: batch/v1
   kind: CronJob
   metadata:
     name: expansion-security-synthetic-test
   spec:
     schedule: "*/10 * * * *"  # Every 10 minutes
     jobTemplate:
       spec:
         template:
           spec:
             containers:
             - name: security-test
               image: ops-tower-test:latest
               command:
               - /bin/sh
               - -c
               - |
                 # Test that expansion_manager cannot access active regions
                 newman run /tests/security/expansion-boundary-test.json || {
                   curl -X POST ${ALERT_WEBHOOK} -d '{"alert": "expansion_security_test_failed"}'
                 }
             restartPolicy: OnFailure
   EOF
   ```

### Post-Incident Actions

1. **Incident Report** (within 24 hours)
   - Full timeline of events
   - Root cause analysis
   - Remediation steps taken
   - Lessons learned

2. **Security Review** (within 48 hours)
   - Assessment of current security controls
   - Recommendations for improvements
   - Risk assessment update

3. **Policy Updates** (within 1 week)
   - Update security policies if needed
   - Revise training materials
   - Communicate changes to all expansion_manager users

### Contact Information

**Immediate Response**
- Security Team Pager: +63-917-XXX-XXXX
- Security Slack: #security-incidents
- CISO: ciso@xpress.ph

**Escalation**
- CTO: cto@xpress.ph  
- CEO: ceo@xpress.ph
- Legal: legal@xpress.ph

### Related Runbooks

- [User Access Management](./user-access-management.md)
- [Security Incident Response](./security-incident-response.md)
- [Audit Log Investigation](./audit-log-investigation.md)
- [Emergency Override Procedures](./emergency-override-procedures.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-31  
**Next Review**: 2025-09-30  
**Owner**: Security Team  
**24/7 Support**: security-oncall@xpress.ph