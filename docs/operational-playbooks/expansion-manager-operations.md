# Expansion Manager Operations Playbook

## Overview

This playbook defines operational procedures, SLAs, and escalation paths for the `expansion_manager` role in the Xpress Ops Tower platform.

## Table of Contents

- [Role Overview](#role-overview)
- [Standard Operating Procedures](#standard-operating-procedures)
- [Service Level Agreements](#service-level-agreements)
- [Dual-Control Escalation Paths](#dual-control-escalation-paths)
- [Emergency Procedures](#emergency-procedures)
- [Monitoring & Alerting](#monitoring--alerting)
- [Compliance Requirements](#compliance-requirements)

## Role Overview

### Expansion Manager Responsibilities
- **Region Lifecycle Management**: Manage regions from prospect → pilot → regional manager handover
- **Pre-launch Configuration**: Configure pricing, supply campaigns, and vendor partnerships
- **Market Intelligence**: Analyze market conditions with masked PII data
- **Vendor Onboarding**: Coordinate vendor partnerships and onboarding processes
- **Handover Orchestration**: Ensure smooth transition to regional managers

### Security Boundaries
- ❌ **Cannot Access**: Active/suspended regions, PII unmasking, payroll, HR records
- ✅ **Can Access**: Prospect/pilot regions, masked market data, vendor pipeline
- 🔒 **Dual-Control Required**: Prelaunch pricing, region promotion, supply campaigns

## Standard Operating Procedures

### 1. New Region Request (T-11)

**Process Flow:**
1. expansion_manager submits region request via API
2. System validates expansion scope (prospect regions only)
3. Request routed to executive approval
4. Upon approval, region created in 'prospect' state

**Required Fields:**
- `region_name`: Descriptive name
- `country_code`: ISO country code  
- `timezone`: IANA timezone identifier
- `justification`: Business case (minimum 100 characters)

**Approval Timeline:** 3-5 business days

### 2. Region Promotion Workflow (T-15)

**State Transitions:**
- `prospect` → `pilot`: expansion_manager + executive approval
- `pilot` → `active`: regional_manager + executive approval  
- `active` → `suspended`: executive + compliance approval only

**Dual-Control Requirements:**
- **Primary Approval**: expansion_manager initiates
- **Secondary Approval**: executive (level 60+) required
- **Expiry**: 24 hours for approval completion

### 3. Prelaunch Configuration (T-13)

**Configuration Areas:**
- **Pricing Models**: Base fare, per-km rate, time-based pricing
- **Supply Campaigns**: Driver acquisition, vehicle onboarding
- **Market Intelligence**: Competitor analysis (masked data only)

**Security Controls:**
- All configurations flagged for dual-control approval
- No direct modification of active region pricing
- Audit trail required for all changes

### 4. Regional Manager Handover

**Handover Criteria:**
- ✅ Pilot operations stable for 14+ days
- ✅ Supply targets achieved (min 50 active drivers)
- ✅ Pricing model validated with real transactions
- ✅ Vendor partnerships established
- ✅ Operational readiness checklist complete

**Handover Process:**
1. expansion_manager publishes go-live checklist
2. Regional manager accepts handover request
3. System transfers region ownership
4. Handover duration metrics recorded

## Service Level Agreements

### Primary SLAs

| Metric | Target | Warning | Critical |
|--------|---------|---------|----------|
| **Region Request Processing** | 3 business days | 5 days | 7 days |
| **Pilot → Active Handover** | 30 days | 45 days | 60 days |
| **Dual-Control Approval** | 4 hours | 12 hours | 24 hours |
| **Emergency Response** | 15 minutes | 30 minutes | 1 hour |

### Secondary SLAs

| Metric | Target | Notes |
|--------|---------|-------|
| **Vendor Onboarding** | 14 days | From initial contact to active |
| **Pricing Configuration** | 2 hours | Including dual-control approval |
| **Market Intel Refresh** | Daily | Automated with manual validation |
| **Handover Documentation** | 100% complete | Before regional manager transfer |

## Dual-Control Escalation Paths

### Standard Escalation (Regional Manager Blocks Promotion)

**Scenario**: Regional manager refuses to accept pilot → active promotion

**Escalation Path:**
1. **L1 (0-24 hours)**: expansion_manager discusses with regional_manager
2. **L2 (24-48 hours)**: Operations manager mediates (level 25+)
3. **L3 (48-72 hours)**: Executive arbitration (level 60+)
4. **L4 (72+ hours)**: CEO final decision with compliance review

**Arbitration Criteria:**
- ✅ Technical readiness (infrastructure, systems)
- ✅ Operational readiness (staffing, processes)  
- ✅ Financial viability (unit economics, projections)
- ✅ Compliance requirements (regulatory, legal)

### Emergency Escalation

**Scenario**: Critical expansion security violation or operational incident

**Immediate Actions (0-15 minutes):**
1. Security team automatically notified (SEV-2 alert)
2. expansion_manager access temporarily suspended
3. Incident commander assigned
4. Executive stakeholders alerted

**Investigation Process:**
1. **Evidence Collection**: Audit logs, system traces, user actions
2. **Impact Assessment**: Affected regions, data, users
3. **Root Cause Analysis**: Technical and procedural failures
4. **Remediation Plan**: Immediate and long-term fixes

### Approval Workflow Deadlock Resolution

**Common Deadlock Scenarios:**
- Executive unavailable for secondary approval
- Regional manager disputes handover readiness
- Compliance objects to vendor partnership

**Resolution Matrix:**

| Scenario | Primary Escalation | Secondary Escalation | Final Authority |
|----------|-------------------|---------------------|-----------------|
| **Executive Unavailable** | Deputy executive (level 55+) | Board member | CEO |
| **Regional Manager Dispute** | Operations manager | Executive | CEO + Compliance |
| **Compliance Objection** | Legal counsel | External auditor | Board + Legal |
| **Technical Issues** | Engineering manager | CTO | CEO |

## Emergency Procedures

### Security Incident Response

**Triggers:**
- expansion_manager accessing active/suspended regions
- Permission escalation attempts
- Bulk data export without justification
- After-hours critical operations

**Response Protocol:**
1. **Immediate**: Suspend user access, log all actions
2. **Within 15 minutes**: Security team notified, incident commander assigned
3. **Within 30 minutes**: Executive stakeholders briefed
4. **Within 1 hour**: Initial assessment complete, remediation started
5. **Within 24 hours**: Full incident report, lessons learned

### Business Continuity

**Expansion Manager Unavailability:**
- **Backup Coverage**: Operations manager (temporary expansion permissions)
- **Escalation**: Executive can override dual-control for critical operations
- **Documentation**: All expansion activities must be documented in shared systems

**System Outages:**
- **Manual Processes**: Paper-based approval for emergency region access
- **Communication**: Slack channels for coordination
- **Recovery**: Audit trail reconstruction once systems restored

## Monitoring & Alerting

### Critical Alerts (SEV-1/SEV-2)

| Alert | Severity | Response Time | Escalation |
|-------|----------|---------------|------------|
| **Active Region Access Violation** | SEV-2 | Immediate | Security team pager |
| **Permission Escalation** | SEV-1 | Immediate | CISO + Security team |
| **Bulk Vendor Data Export** | SEV-2 | 5 minutes | Compliance team |
| **After-hours Critical Ops** | SEV-3 | 15 minutes | Operations manager |

### Operational Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| **Handover SLA Breach** | 30 days | Regional manager notification |
| **Dual-Control Backlog** | 10 pending | Operations manager review |
| **Region Promotion Stalled** | 48 hours | Executive escalation |
| **Vendor Onboarding Delays** | 14 days | Expansion manager review |

### Performance Dashboards

**Primary Dashboard**: [Expansion Operations Dashboard](../monitoring/grafana/expansion-operations-dashboard.json)

**Key Metrics:**
- Region request volume (daily/weekly)
- Region promotion success rate  
- Average handover duration
- Security violation count
- Dual-control approval times

## Compliance Requirements

### Audit Trail Requirements

**Mandatory Logging:**
- All expansion_manager actions with timestamps
- Region state transitions with justifications
- Dual-control approval workflows
- Vendor data access with business purpose
- Security boundary crossings (even if blocked)

**Retention Periods:**
- **Operational Logs**: 3 years
- **Security Events**: 10 years  
- **Compliance Audits**: 7 years
- **Financial Records**: 7 years

### NPC Philippines Compliance

**Vendor Data Processing:**
- **Legal Basis**: Legitimate interest for business operations
- **Data Categories**: Vendor contact info, business details, contracts
- **Access Controls**: expansion_manager role-based access only
- **Retention**: 10 years post-contract for legal requirements

### Regulatory Reporting

**Monthly Reports:**
- Expansion activity summary
- Security incident log
- SLA performance metrics
- Compliance violation summary

**Quarterly Reports:**  
- Regional expansion ROI analysis
- Vendor partnership effectiveness
- Risk assessment updates
- Process improvement recommendations

## Contact Information

### Primary Contacts

| Role | Primary | Backup | Emergency |
|------|---------|--------|-----------|
| **Operations Manager** | ops-manager@xpress.ph | deputy-ops@xpress.ph | +63-XXX-XXXX |
| **Security Team** | security@xpress.ph | security-oncall@xpress.ph | Pager: XXXXXXX |
| **Compliance Officer** | compliance@xpress.ph | legal@xpress.ph | +63-XXX-XXXX |
| **Executive On-Call** | exec-oncall@xpress.ph | ceo@xpress.ph | +63-XXX-XXXX |

### Communication Channels

- **Expansion Operations**: #expansion-ops
- **Security Alerts**: #security-alerts
- **Compliance Issues**: #compliance-review
- **Executive Escalation**: #exec-escalation

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-31  
**Next Review**: 2025-11-30  
**Owner**: Operations Team  
**Approvers**: Executive Team, Compliance Team