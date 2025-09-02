# Security Testing Guide for Xpress Ops Tower

## Overview

This guide provides comprehensive instructions for security testing in the Xpress Ops Tower CI/CD pipeline. Our security testing framework ensures that the rideshare platform maintains the highest security standards to protect user data, emergency systems, and critical infrastructure.

## Table of Contents

1. [Security Testing Framework](#security-testing-framework)
2. [CI/CD Pipeline Integration](#cicd-pipeline-integration)
3. [Static Security Analysis (SAST)](#static-security-analysis-sast)
4. [Dynamic Security Testing (DAST)](#dynamic-security-testing-dast)
5. [Dependency Security](#dependency-security)
6. [Secret Detection](#secret-detection)
7. [Container Security](#container-security)
8. [Infrastructure Security](#infrastructure-security)
9. [Security Test Suite](#security-test-suite)
10. [Quality Gates](#quality-gates)
11. [Reporting and Metrics](#reporting-and-metrics)
12. [Emergency Procedures](#emergency-procedures)
13. [Best Practices](#best-practices)

## Security Testing Framework

### Core Components

The Xpress Ops Tower security testing framework consists of multiple layers:

```
┌─────────────────────────────────────────────────────────┐
│                 Security Pipeline                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    SAST     │  │    DAST     │  │  Container  │    │
│  │             │  │             │  │  Security   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Dependency  │  │   Secret    │  │ Infrastructure │
│  │  Security   │  │ Detection   │  │   Security    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────┤
│                 Quality Gates                           │
├─────────────────────────────────────────────────────────┤
│                Security Reporting                       │
└─────────────────────────────────────────────────────────┘
```

### Severity Levels

- **Critical**: Immediate security threats requiring pipeline failure
- **High**: Serious vulnerabilities requiring attention within 24-48 hours
- **Medium**: Important issues to address in regular development cycle
- **Low**: Informational findings for security awareness

## CI/CD Pipeline Integration

### GitHub Actions Workflow

The main security pipeline is defined in `.github/workflows/security-pipeline.yml`:

```yaml
# Triggered on:
# - Push to main/develop branches
# - Pull requests
# - Daily scheduled scans
# - Manual workflow dispatch
```

### Pipeline Stages

1. **Pre-commit Hooks** - Local security checks
2. **Static Analysis** - Code security analysis
3. **Dependency Scanning** - Vulnerability detection in dependencies
4. **Secret Detection** - Exposed secrets identification
5. **Dynamic Testing** - Runtime security testing
6. **Container Scanning** - Docker image vulnerability assessment
7. **Quality Gates** - Pass/fail decisions
8. **Reporting** - Comprehensive security reports

### Execution Modes

- **Standard**: Basic security checks for regular development
- **Comprehensive**: Full security suite for releases
- **Emergency**: Critical security assessment for urgent issues

## Static Security Analysis (SAST)

### Tools Used

#### 1. CodeQL
- **Purpose**: Semantic code analysis for security vulnerabilities
- **Configuration**: `.github/codeql/security-config.yml`
- **Languages**: JavaScript, TypeScript
- **Queries**: Security-extended, security-and-quality

```bash
# Manual CodeQL scan
npm run security:codeql
```

#### 2. Semgrep
- **Purpose**: Fast static analysis with custom rules
- **Rules**: OWASP Top 10, React, Node.js, TypeScript
- **Configuration**: Automatic via GitHub Actions

#### 3. ESLint Security
- **Purpose**: JavaScript/TypeScript security linting
- **Configuration**: `.eslintrc-security.js`
- **Focus**: Authentication, authorization, emergency systems

```bash
# Run security linting
npx eslint --config .eslintrc-security.js src/
```

### Security Rules

#### Authentication & Authorization
- SQL injection prevention
- XSS protection
- Authentication bypass detection
- Authorization checks
- Session management validation

#### Emergency Systems
- Input validation for SOS data
- Emergency endpoint security
- Data integrity checks
- Access control verification

#### Data Protection
- Personal data handling
- Location data security
- Payment information protection
- Encryption validation

## Dynamic Security Testing (DAST)

### OWASP ZAP Integration

The pipeline uses OWASP ZAP for dynamic application security testing:

#### Configuration
- **Rules**: `.zap/rules.tsv`
- **Config**: `.zap/config.conf`
- **Target**: Running application instance

#### Test Scope
- Authentication endpoints
- Emergency systems
- API security
- Data protection
- Infrastructure security

### Custom API Security Tests

Location: `scripts/security-tests/api-security-tests.js`

#### Test Categories
1. **Authentication Security**
   - Unauthenticated access testing
   - Weak password handling
   - Brute force protection
   - Session security
   - MFA validation

2. **Authorization Security**
   - Role-based access control
   - Privilege escalation
   - Resource access control
   - Cross-user data access

3. **Input Validation**
   - SQL injection
   - XSS protection
   - NoSQL injection
   - Command injection
   - Path traversal
   - XXE protection

4. **Emergency System Security**
   - Emergency endpoint security
   - SOS data validation
   - Rate limiting
   - Data integrity

5. **Data Protection**
   - PII protection
   - Data leakage prevention
   - Location data security
   - Payment data security

6. **Infrastructure Security**
   - Security headers
   - CORS configuration
   - HTTPS redirection
   - Error handling
   - Rate limiting

### Running DAST Tests

```bash
# Start application for testing
npm run build && npm run start &

# Run DAST tests
npm run test:security:dast

# Run specific test category
node scripts/security-tests/api-security-tests.js
```

## Dependency Security

### Scanning Tools

#### 1. NPM Audit
- **Purpose**: Built-in Node.js vulnerability scanner
- **Usage**: Integrated into package manager

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

#### 2. Snyk
- **Purpose**: Advanced vulnerability database
- **Integration**: GitHub Actions + CLI
- **Features**: Fix suggestions, license compliance

#### 3. Trivy
- **Purpose**: Container and filesystem vulnerability scanner
- **Scope**: Dependencies, OS packages, config files

### Security Policies

#### Vulnerability Thresholds
- **Critical**: 0 allowed
- **High**: Maximum 5 for non-production
- **Medium**: Monitor and plan fixes
- **Low**: Informational

#### Dependency Management
- Regular updates scheduled weekly
- Security patches applied immediately
- Dependencies reviewed quarterly
- License compliance checking

### Running Dependency Scans

```bash
# NPM audit
npm audit --audit-level high

# Snyk scan
snyk test

# Trivy scan
trivy fs .
```

## Secret Detection

### Tools Configuration

#### GitLeaks
- **Configuration**: `.gitleaks.toml`
- **Scope**: Git repository history
- **Custom Rules**: Xpress-specific secrets

#### TruffleHog
- **Purpose**: High-entropy string detection
- **Integration**: GitHub Actions
- **Verification**: Validated secrets only

### Secret Types Detected

#### API Keys and Tokens
- Xpress API keys
- Ops Tower secrets
- Emergency system tokens
- Third-party service keys (Twilio, Google Maps, SendGrid)

#### Authentication Credentials
- JWT secrets
- Database connection strings
- Redis passwords
- Private keys and certificates

#### Custom Patterns
- Application-specific secret formats
- Development/staging credentials
- Service account tokens

### Secret Management

#### Best Practices
1. **Never commit secrets to code**
2. **Use environment variables**
3. **Implement secret rotation**
4. **Use secret management services**
5. **Audit secret access regularly**

#### Emergency Response
1. **Immediate secret rotation**
2. **Git history cleaning**
3. **Access log review**
4. **Incident documentation**

### Running Secret Detection

```bash
# GitLeaks scan
gitleaks detect --config .gitleaks.toml

# TruffleHog scan
trufflehog filesystem .
```

## Container Security

### Docker Security

#### Base Image Security
- Use official, minimal images
- Regular base image updates
- Distroless images when possible
- Multi-stage builds

#### Runtime Security
- Non-root users
- Read-only filesystems
- Capability dropping
- Resource limits

#### Configuration Security
- Security options enabled
- Network isolation
- Secret management
- Health checks implemented

### Security Scanning

#### Trivy Container Scanning
```bash
# Scan Docker image
trivy image xpress-ops-tower:latest

# Scan with specific severity
trivy image --severity HIGH,CRITICAL xpress-ops-tower:latest
```

#### Dockerfile Security
- **Hadolint**: Dockerfile linting
- **Best practices**: Security recommendations
- **Compliance**: CIS benchmarks

### Secure Docker Compose

Configuration: `docker-compose.security.yml`

#### Security Features
- Resource limits
- Security options
- Network isolation
- Secret management
- Health monitoring

## Infrastructure Security

### Infrastructure as Code (IaC)

#### Terraform Security
- Resource configuration validation
- Security group analysis
- IAM policy review
- Encryption requirements

#### Kubernetes Security
- Pod security standards
- Network policies
- RBAC configuration
- Secret management

### Configuration Security

#### Environment Variables
- Sensitive data protection
- Configuration validation
- Environment separation
- Access controls

#### Network Security
- Firewall configurations
- SSL/TLS enforcement
- CORS policies
- Rate limiting

### Running Infrastructure Scans

```bash
# Terraform scan
trivy config terraform/

# Kubernetes scan
trivy config k8s/

# Docker Compose scan
trivy config docker-compose.yml
```

## Security Test Suite

### Unit Tests

Location: `src/__tests__/security/`

#### Authentication Tests
- Token validation
- Password hashing
- Session management
- MFA functionality

#### Authorization Tests
- Role-based access
- Permission validation
- Resource ownership
- API endpoint security

#### Data Protection Tests
- Encryption functions
- Data sanitization
- Input validation
- Output encoding

### Integration Tests

#### API Security Tests
- End-to-end authentication flows
- Authorization scenarios
- Data validation
- Error handling

#### Emergency System Tests
- SOS alert processing
- Data integrity validation
- Access control verification
- Communication security

### Running Security Tests

```bash
# All security tests
npm run test:security

# Specific test categories
npm run test:security:auth
npm run test:security:emergency
npm run test:security:data

# Integration tests
npm run test:integration -- --testPathPattern="security"
```

## Quality Gates

### Gate Criteria

#### Critical Gate (Blocking)
- Zero critical vulnerabilities
- No exposed secrets
- Security tests passing
- SAST analysis complete

#### Warning Gate (Non-blocking)
- High vulnerabilities < 5
- Medium vulnerabilities < 10
- Test coverage > 80%
- Performance benchmarks met

### Gate Configuration

Gates are enforced in:
- `.github/workflows/security-pipeline.yml`
- Branch protection rules
- Merge requirements

### Bypassing Gates

Emergency bypass procedures:
1. Security team approval required
2. Incident documentation
3. Immediate remediation plan
4. Post-incident review

## Reporting and Metrics

### Security Reports

#### Automated Reports
- **JSON**: Machine-readable results
- **HTML**: Human-readable dashboard
- **SARIF**: GitHub Security tab integration
- **Metrics**: Time-series data

#### Report Contents
- Vulnerability summary
- Component analysis
- Compliance assessment
- Recommendations
- Trends and metrics

### Security Metrics

#### Key Performance Indicators
- Mean Time to Remediation (MTTR)
- Vulnerability density
- Security test coverage
- Critical vulnerability rate
- Security score

#### Dashboards
- Real-time security status
- Trend analysis
- Compliance tracking
- Team performance metrics

### Generating Reports

```bash
# Generate security report
node scripts/security-tests/generate-security-report.js

# View HTML report
open security-report.html

# Check metrics
cat security-metrics.json
```

## Emergency Procedures

### Security Incident Response

#### Immediate Actions (0-1 hours)
1. **Isolate affected systems**
2. **Stop deployment pipeline**
3. **Notify security team**
4. **Begin incident documentation**

#### Short-term Response (1-24 hours)
1. **Assess impact scope**
2. **Implement temporary fixes**
3. **Communicate with stakeholders**
4. **Gather forensic evidence**

#### Long-term Response (1-7 days)
1. **Implement permanent fixes**
2. **Update security controls**
3. **Conduct post-incident review**
4. **Update documentation**

### Emergency Contacts

- **Security Team**: security@xpress.com
- **DevOps Team**: devops@xpress.com
- **On-call Engineer**: +63-XXX-XXX-XXXX
- **Incident Commander**: incident-commander@xpress.com

### Emergency Workflows

#### Critical Vulnerability
1. Trigger emergency security scan
2. Block all deployments
3. Implement hotfix if available
4. Schedule emergency maintenance

#### Data Breach
1. Activate incident response team
2. Preserve evidence
3. Notify regulatory authorities
4. Communicate with affected users

## Best Practices

### Development Guidelines

#### Secure Coding
1. **Input validation**: Validate all user inputs
2. **Output encoding**: Encode all outputs
3. **Authentication**: Use strong authentication
4. **Authorization**: Implement proper access controls
5. **Error handling**: Don't expose sensitive information

#### Code Review
1. **Security focus**: Review for security issues
2. **Threat modeling**: Consider attack vectors
3. **Compliance**: Ensure regulatory compliance
4. **Documentation**: Document security decisions

### Testing Guidelines

#### Test Coverage
- Authentication: 100%
- Authorization: 100%
- Input validation: 95%
- Emergency systems: 100%
- Data protection: 90%

#### Test Quality
- Realistic test data
- Comprehensive scenarios
- Edge case coverage
- Performance testing
- Error condition testing

### Deployment Guidelines

#### Pre-deployment
1. Security tests passing
2. Vulnerability scan clean
3. Code review completed
4. Documentation updated

#### Post-deployment
1. Monitor security metrics
2. Verify security controls
3. Test emergency procedures
4. Update security documentation

### Monitoring Guidelines

#### Continuous Monitoring
- Security event logging
- Anomaly detection
- Performance monitoring
- Compliance tracking
- Threat intelligence

#### Alert Configuration
- Critical security events
- Unusual access patterns
- System performance issues
- Compliance violations
- Emergency system failures

## Tool Configuration Reference

### GitHub Actions Secrets

Required secrets for security pipeline:

```yaml
SNYK_TOKEN: "Snyk authentication token"
SEMGREP_APP_TOKEN: "Semgrep authentication token"
GITLEAKS_LICENSE: "GitLeaks license key (if using pro)"
SECURITY_SLACK_WEBHOOK: "Slack webhook for security alerts"
```

### Environment Variables

Security-related environment variables:

```bash
NODE_ENV=production
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
LOG_SECURITY_EVENTS=true
SECURITY_SCAN_LEVEL=comprehensive
```

### File Locations

Important security files:

```
.github/workflows/security-pipeline.yml    # Main security workflow
.github/codeql/security-config.yml         # CodeQL configuration
.eslintrc-security.js                      # ESLint security rules
.gitleaks.toml                            # GitLeaks configuration
.zap/                                     # ZAP configuration
.trivyignore                              # Trivy ignore patterns
docker-compose.security.yml               # Secure Docker Compose
scripts/security-tests/                   # Security test scripts
docs/SECURITY_TESTING_GUIDE.md           # This documentation
```

## Troubleshooting

### Common Issues

#### False Positives
- Review ignore files
- Add specific exclusions
- Contact security team for guidance

#### Pipeline Failures
- Check security gate status
- Review vulnerability reports
- Implement required fixes

#### Performance Issues
- Optimize scan configurations
- Use parallel execution
- Cache dependencies

### Getting Help

1. **Documentation**: Check this guide first
2. **Security Team**: Email security@xpress.com
3. **DevOps Team**: Slack #devops-support
4. **Emergency**: Use incident response procedures

---

**Last Updated**: 2024-01-XX  
**Version**: 1.0.0  
**Maintainer**: Xpress Security Team

For questions or updates to this guide, please create an issue or contact the security team.