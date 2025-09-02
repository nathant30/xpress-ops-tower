# NPC Philippines - Vendor Data Processing Registry

## Data Processing Registry Update for Expansion Manager Role

**Registry Entry ID**: VDR-2025-003  
**Effective Date**: 2025-08-31  
**Next Review**: 2025-12-01  
**Responsible Controller**: Xpress Operations Philippines Inc.

## Overview

This document registers vendor data processing activities performed by the `expansion_manager` role in compliance with the National Privacy Commission (NPC) Philippines Data Privacy Act of 2012 and its implementing rules and regulations.

## Data Processing Activities

### 1. Vendor Onboarding Dataset

**Data Category**: Vendor Business Information  
**Processing Purpose**: New region vendor partnership establishment  
**Legal Basis**: Legitimate Interest (Section 12, DPA 2012)

#### Personal Data Types Collected

| Data Type | Category | Example | Retention Period |
|-----------|----------|---------|------------------|
| **Business Contact Information** | Regular Personal Data | Name, email, phone, business address | 10 years post-contract |
| **Corporate Registration** | Regular Personal Data | Business registration number, TIN, permits | 10 years (legal requirement) |
| **Financial Information** | Sensitive Financial Data | Bank account details, credit references | 7 years post-contract |
| **Performance Metrics** | Regular Personal Data | Service ratings, delivery statistics | 3 years operational |

#### Processing Operations

| Operation | Expansion Manager Access | Purpose | Safeguards |
|-----------|-------------------------|---------|------------|
| **Collection** | ✅ Create vendor onboarding tasks | Initial vendor assessment | RBAC, audit logging |
| **Storage** | ❌ No direct storage access | N/A | Encrypted database, access controls |
| **Processing** | ✅ View vendor pipeline (masked) | Partnership evaluation | PII masking, purpose limitation |
| **Sharing** | ❌ No external sharing | N/A | Internal use only |
| **Deletion** | ❌ No deletion rights | N/A | Automated retention policy |

### 2. Market Intelligence Dataset  

**Data Category**: Competitor and Market Analysis  
**Processing Purpose**: Regional expansion feasibility assessment  
**Legal Basis**: Legitimate Interest (Business Operations)

#### Data Types

| Data Type | Sensitivity | Source | Processing Method |
|-----------|-------------|---------|------------------|
| **Public Business Data** | Low | Public registrations, websites | Automated collection |
| **Market Pricing Data** | Medium | Public rate cards, published tariffs | Manual research |
| **Service Area Data** | Low | Public route information | Geographic analysis |
| **Performance Estimates** | Medium | Public reviews, ratings | Aggregated analysis |

#### Privacy Controls

- ✅ **No PII Collection**: Only business entity information
- ✅ **Public Sources Only**: No private/confidential data
- ✅ **Masked Processing**: Individual identifiers removed  
- ✅ **Purpose Limitation**: Expansion analysis only

### 3. Regional Expansion Analytics

**Data Category**: Regional Business Metrics  
**Processing Purpose**: Pilot region performance assessment  
**Legal Basis**: Contract Performance (Vendor SLAs)

#### Metrics Collected

- **Supply Metrics**: Driver count, vehicle availability, utilization rates
- **Demand Patterns**: Trip volume, peak hour analysis, seasonal trends  
- **Financial Performance**: Revenue per trip, cost per acquisition
- **Service Quality**: Customer ratings, completion rates, response times

#### Data Minimization Controls

- ✅ **Aggregated Data Only**: No individual trip or user data
- ✅ **Regional Boundaries**: Prospect/pilot regions only
- ✅ **Time Limitations**: Current operational period only
- ✅ **Purpose Binding**: Expansion decision-making only

## Legal Basis Assessment

### Primary Legal Basis: Legitimate Interest

**Balancing Test Results:**

| Interest Assessment | Expansion Manager Role | Data Subject Impact | Mitigation |
|-------------------|----------------------|-------------------|------------|
| **Business Need** | HIGH - Critical for expansion operations | LOW - Business entity data only | Role-based access limits |
| **Purpose Limitation** | HIGH - Specific expansion use case | LOW - No individual impact | Automated purpose checking |
| **Data Minimization** | HIGH - Only necessary vendor data | LOW - Public/business data only | Masked data processing |
| **Technical Safeguards** | HIGH - RBAC + audit trails | LOW - No sensitive personal data | Encryption + access logging |

**Conclusion**: Legitimate interest justified for expansion_manager vendor data processing.

### Secondary Legal Basis: Contract Performance

For existing vendor partnerships, processing is necessary for contract performance and service level agreement monitoring.

## Data Subject Rights Implementation

### Rights Applicable to Vendor Data

| Right | Implementation | Expansion Manager Role |
|-------|----------------|----------------------|
| **Right to Information** | Privacy notice provided | Cannot modify notices |
| **Right of Access** | Vendor portal available | Cannot access subject requests |
| **Right to Rectification** | Vendor self-service updates | Cannot modify vendor data |
| **Right to Erasure** | Automated retention policies | Cannot delete data |
| **Right to Data Portability** | Export functionality | Cannot access export functions |

### Data Subject Request Handling

expansion_manager users **cannot** handle data subject requests directly. All requests must be forwarded to:

- **Primary**: dpo@xpress.ph (Data Protection Officer)
- **Backup**: compliance@xpress.ph (Compliance Team)
- **Legal**: legal@xpress.ph (Legal Counsel)

## Security Measures

### Technical Safeguards

1. **Access Controls**
   - Role-based access (expansion_manager level 45)
   - Region-state restrictions (prospect/pilot only)
   - Multi-factor authentication for sensitive operations
   - Session timeout and monitoring

2. **Data Protection**
   ```
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - Database access logging
   - PII masking for market intelligence
   ```

3. **Audit and Monitoring**
   - All vendor data access logged
   - Real-time security monitoring
   - Quarterly access reviews
   - Annual security assessments

### Organizational Safeguards

1. **Training and Awareness**
   - Mandatory privacy training for expansion_manager users
   - Annual refresher training
   - Incident response procedures
   - Data breach notification protocols

2. **Governance**
   - Privacy impact assessments for new processing
   - Regular compliance reviews
   - Third-party vendor assessments
   - Data retention policy enforcement

## Cross-Border Data Transfers

### International Vendor Data

**Adequacy Decision**: Philippines is not on EU adequacy list  
**Transfer Mechanism**: Standard Contractual Clauses (SCCs) + Additional Safeguards

#### Transfer Safeguards for Expansion Operations

| Destination | Data Type | Legal Basis | Additional Safeguards |
|-------------|-----------|-------------|---------------------|
| **APAC Vendors** | Business contact info | SCCs + Legitimate Interest | Encryption, access controls |
| **Regional Partners** | Performance metrics | SCCs + Contract Performance | Data minimization, purpose limitation |
| **Service Providers** | Aggregated analytics | SCCs + Legitimate Interest | Anonymization, retention limits |

### Data Residency Requirements

- ✅ **Vendor Business Data**: Stored in Philippines data centers
- ✅ **Financial Information**: Philippines-only processing
- ✅ **Performance Metrics**: Regional processing allowed with SCCs
- ❌ **No PII Transfers**: expansion_manager cannot transfer personal data internationally

## Incident Response Procedures

### Data Breach Classification

| Breach Type | Impact Level | Response Time | Notification Required |
|-------------|--------------|---------------|---------------------|
| **Vendor Data Exposure** | HIGH | 15 minutes | NPC + Data subjects |
| **Unauthorized Access** | MEDIUM | 1 hour | NPC notification |
| **System Vulnerability** | LOW-MEDIUM | 24 hours | Internal review |
| **Third-party Breach** | HIGH | Immediate | NPC + affected parties |

### Expansion Manager Specific Incidents

**Scenario**: expansion_manager accesses vendor data outside authorized scope

**Response Protocol**:
1. **Immediate**: Suspend access, preserve logs
2. **15 minutes**: Assess data impact, classify severity
3. **30 minutes**: Notify DPO and compliance team
4. **1 hour**: Preliminary breach assessment
5. **24 hours**: NPC notification (if required)
6. **72 hours**: Data subject notification (if high risk)

## Compliance Monitoring

### Regular Assessments

| Assessment Type | Frequency | Responsible Party | Scope |
|----------------|-----------|-------------------|-------|
| **Access Reviews** | Quarterly | IT Security + DPO | expansion_manager access logs |
| **Purpose Limitation Check** | Monthly | Compliance Team | Vendor data usage analysis |
| **Data Minimization Audit** | Semi-annually | DPO + Legal | Data collection necessity |
| **Security Assessment** | Annually | External Auditor | Technical and organizational measures |

### Key Performance Indicators

| KPI | Target | Current | Trend |
|-----|--------|---------|-------|
| **Privacy Training Completion** | 100% | 98% | ↗️ |
| **Data Subject Request Response Time** | < 30 days | 18 days avg | ↗️ |  
| **Security Incident Response Time** | < 1 hour | 23 minutes avg | ↗️ |
| **Vendor Data Accuracy** | > 95% | 97.2% | ↗️ |

## Documentation and Records

### Mandatory Documentation

1. **Processing Records** (Article 30 compliance)
   - Purpose and legal basis for each processing activity
   - Categories of personal data processed  
   - Recipients of personal data
   - Retention periods and deletion schedules

2. **Privacy Impact Assessments**
   - High-risk processing identification
   - Risk mitigation measures
   - Ongoing monitoring procedures
   - Regular review and updates

3. **Data Transfer Records**
   - International transfer mechanisms
   - Adequacy decisions or safeguards
   - Transfer impact assessments
   - Ongoing monitoring of transfer conditions

### Record Retention Schedule

| Document Type | Retention Period | Storage Location | Access Controls |
|---------------|------------------|------------------|----------------|
| **Processing Records** | Life of processing + 3 years | DPO secure storage | DPO, Legal, Compliance |
| **Privacy Impact Assessments** | 10 years | Legal document management | DPO, Legal counsel |
| **Data Transfer Records** | Duration of transfer + 5 years | Compliance database | DPO, International team |
| **Incident Response Records** | 10 years | Security incident system | DPO, CISO, Legal |

## Contact Information

### Primary Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **Data Protection Officer** | Maria Santos | dpo@xpress.ph | +63-2-XXX-XXXX |
| **Compliance Manager** | Juan Dela Cruz | compliance@xpress.ph | +63-917-XXX-XXXX |
| **Legal Counsel** | Ana Reyes | legal@xpress.ph | +63-2-XXX-XXXX |
| **IT Security Manager** | Carlos Mendoza | security@xpress.ph | +63-917-XXX-XXXX |

### Regulatory Contacts

| Authority | Contact Information | Purpose |
|-----------|-------------------|---------|
| **National Privacy Commission** | privacy@privacy.gov.ph | Data breach notifications, complaints |
| **Department of Trade and Industry** | info@dti.gov.ph | Business registration compliance |
| **Bangko Sentral ng Pilipinas** | consumeraffairs@bsp.gov.ph | Financial data processing |

## Appendices

### Appendix A: Vendor Data Flow Diagram

```
[Vendor Registration] 
        ↓
[Expansion Manager Assessment]
        ↓  
[Automated PII Masking]
        ↓
[Encrypted Database Storage]
        ↓
[Regional Manager Handover]
        ↓
[Retention Policy Application]
```

### Appendix B: Privacy Notice Template

Standard privacy notice template for vendors whose data is processed by expansion_manager role.

### Appendix C: Data Subject Request Forms

Templates for handling vendor data subject requests under DPA 2012.

### Appendix D: Incident Response Flowchart

Visual guide for responding to vendor data incidents involving expansion_manager.

---

**Document Classification**: Confidential  
**Version**: 1.0  
**Last Updated**: 2025-08-31  
**Next Review**: 2025-12-01  
**Approved By**: Data Protection Officer, Legal Counsel  
**Document ID**: NPC-VDR-2025-003