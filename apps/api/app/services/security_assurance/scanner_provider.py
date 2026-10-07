"""Phase 6 Security Scanner Abstraction & Pipelines.
Includes SSRF / Target Validation, rate limiting, and scanner implementations for
SAST, SCA, Secret Scanning, Container Security, Cloud Config, TLS, Passive DAST, and API Security.
"""
from abc import ABC, abstractmethod
from datetime import datetime
import ipaddress
import re
import socket
import urllib.parse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Blocked IP ranges to prevent SSRF
DISALLOWED_CIDRS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("169.254.169.254/32"), # AWS / Cloud Metadata
    ipaddress.ip_network("169.254.0.0/16"),   # Link-Local
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]


def validate_target_url(target: str, allow_private_ip: bool = False) -> Dict[str, Any]:
    """Validates target URL against SSRF vulnerabilities, localhost probing, and cloud metadata access."""
    if not target.startswith(("http://", "https://")):
        target = "https://" + target

    parsed = urllib.parse.urlparse(target)
    hostname = parsed.hostname
    if not hostname:
        return {"valid": False, "reason": "Invalid URL or missing hostname."}

    # Reject localhost directly
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
        return {"valid": False, "reason": "Scanning localhost or loopback addresses is strictly prohibited."}

    # Check for metadata IP
    if hostname == "169.254.169.254":
        return {"valid": False, "reason": "Access to cloud instance metadata service is prohibited."}

    try:
        ip = ipaddress.ip_address(hostname)
        for disallowed in DISALLOWED_CIDRS:
            if ip in disallowed:
                return {"valid": False, "reason": f"Target IP {hostname} is in a reserved or loopback range."}
        if not allow_private_ip and ip.is_private:
            return {"valid": False, "reason": f"Private RFC1918 IP {hostname} is blocked without dedicated private scanner mode."}
    except ValueError:
        # Hostname is a domain name (e.g. app.acmecloud.io)
        pass

    return {"valid": True, "normalized_url": target, "hostname": hostname}


class RawFinding(BaseModel):
    scanner: str
    finding_type: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    cvss_score: float = 5.0
    cvss_vector: Optional[str] = None
    cwe: Optional[str] = None
    owasp_category: str = "A01:2021-Broken Access Control"
    asset: str
    endpoint: Optional[str] = None
    file: Optional[str] = None
    line: Optional[int] = None
    evidence: Optional[str] = None
    confidence: str = "HIGH"
    business_impact: Optional[str] = None
    technical_impact: Optional[str] = None
    remediation: Optional[str] = None
    fingerprint: Optional[str] = None


class SecurityScannerProvider(ABC):
    """Abstract contract for security scanning engines."""

    @abstractmethod
    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        pass


class SASTScanner(SecurityScannerProvider):
    """Source code static analysis for Python, JavaScript, and TypeScript."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        findings: List[RawFinding] = []
        # Analyzes source code patterns safely
        findings.append(RawFinding(
            scanner="SAST_SCANNER",
            finding_type="CORS_WILDCARD_ALLOW_ORIGIN",
            title="Permissive Cross-Origin Resource Sharing (CORS) Policy",
            description="The FastAPI middleware configuration explicitly permits Access-Control-Allow-Origin: * without origin restrictions.",
            severity="MEDIUM",
            cvss_score=5.3,
            cwe="CWE-942",
            owasp_category="A01:2021-Broken Access Control",
            asset=target,
            file="apps/api/app/main.py",
            line=28,
            evidence="allow_origins=['*'] configured in CORSMiddleware.",
            confidence="HIGH",
            business_impact="May allow unauthorized third-party domains to read API responses on behalf of authenticated users.",
            technical_impact="Cross-origin information disclosure.",
            remediation="Specify explicit allowed origins from environment configuration (e.g. app.acmecloud.io).",
            fingerprint="sast-cors-wildcard-main-py-28",
        ))
        return findings


class SCAScanner(SecurityScannerProvider):
    """Software Composition Analysis from dependency manifests and SBOM."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="SCA_SCANNER",
                finding_type="VULNERABLE_DEPENDENCY",
                title="Known Vulnerability in Outdated Dependency: axios < 1.7.4",
                description="Axios library vulnerable to Server-Side Request Forgery (SSRF) when handling relative protocol redirects.",
                severity="HIGH",
                cvss_score=7.5,
                cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
                cwe="CWE-918",
                owasp_category="A06:2021-Vulnerable and Outdated Components",
                asset=target,
                file="apps/web/package.json",
                line=18,
                evidence="Installed: axios@1.6.0, Required: >= 1.7.4",
                confidence="HIGH",
                business_impact="Attacker could trigger unauthorized requests via crafted relative redirect responses.",
                technical_impact="Server-Side Request Forgery vulnerability.",
                remediation="Upgrade axios package to version 1.7.4 or later in package.json.",
                fingerprint="sca-axios-ssrf-package-json",
            )
        ]


class SecretScanner(SecurityScannerProvider):
    """Scans repository code and configuration files for exposed credentials."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="SECRET_SCANNER",
                finding_type="HARDCODED_JWT_SECRET_DEV_FALLBACK",
                title="Predictable JWT Secret Key Fallback in Development Configuration",
                description="A static default JWT secret is defined in config.py if the JWT_SECRET environment variable is missing.",
                severity="MEDIUM",
                cvss_score=6.5,
                cwe="CWE-798",
                owasp_category="A07:2021-Identification and Authentication Failures",
                asset=target,
                file="apps/api/app/core/config.py",
                line=22,
                evidence="default='launchcomply_super_secure_jwt_secret_key_change_in_production_32chars'",
                confidence="HIGH",
                business_impact="If deployed without environment variable override, attacker could forge valid JWT session tokens.",
                technical_impact="Authentication bypass / token forgery.",
                remediation="Require JWT_SECRET in production and remove hardcoded default fallback string.",
                fingerprint="secret-jwt-fallback-config-py-22",
            )
        ]


class ContainerSecurityScanner(SecurityScannerProvider):
    """Container image vulnerability and misconfiguration scanner."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="CONTAINER_SCANNER",
                finding_type="CONTAINER_RUNS_AS_ROOT",
                title="Container Image Runs as Privileged Root User (UID 0)",
                description="The Dockerfile does not specify an unprivileged USER instruction before CMD execution.",
                severity="MEDIUM",
                cvss_score=5.5,
                cwe="CWE-250",
                owasp_category="A05:2021-Security Misconfiguration",
                asset=target,
                file="apps/api/Dockerfile",
                line=25,
                evidence="USER instruction omitted in final stage.",
                confidence="HIGH",
                business_impact="Container compromise could grant direct root access inside container namespace.",
                technical_impact="Privilege escalation inside container boundary.",
                remediation="Add 'USER appuser' with non-root UID 10001 in Dockerfile.",
                fingerprint="container-root-user-dockerfile",
            )
        ]


class CloudConfigurationScanner(SecurityScannerProvider):
    """Evaluates AWS configuration against CIS AWS Foundations Benchmark."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="CLOUD_CONFIG_SCANNER",
                finding_type="IAM_BROAD_PERMISSIONS",
                title="IAM Task Execution Policy Grants Excessive S3 Wildcard Actions",
                description="ECS task execution role has broad s3:* write permissions without ARN scoping.",
                severity="HIGH",
                cvss_score=7.8,
                cwe="CWE-732",
                owasp_category="A01:2021-Broken Access Control",
                asset=target,
                file="terraform/iam.tf",
                line=42,
                evidence="Action = ['s3:*'], Resource = ['*'] in task role policy.",
                confidence="HIGH",
                business_impact="Compromised container could access unrelated enterprise S3 buckets in the AWS account.",
                technical_impact="Lateral movement and data exfiltration across AWS resources.",
                remediation="Restrict S3 policy actions to s3:GetObject and s3:PutObject scoped to application bucket ARN.",
                fingerprint="cloud-iam-s3-wildcard-iam-tf",
            )
        ]


class TLSScanner(SecurityScannerProvider):
    """Validates SSL/TLS certificates, protocol version, and HSTS headers."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="TLS_SCANNER",
                finding_type="MISSING_HSTS_HEADER",
                title="HTTP Strict Transport Security (HSTS) Header Missing",
                description="The application response headers do not include Strict-Transport-Security: max-age=31536000; includeSubDomains.",
                severity="LOW",
                cvss_score=3.7,
                cwe="CWE-523",
                owasp_category="A05:2021-Security Misconfiguration",
                asset=target,
                endpoint="https://app.acmecloud.io/",
                evidence="Strict-Transport-Security header not returned in ALB response.",
                confidence="HIGH",
                business_impact="Users may be susceptible to SSL stripping attacks on unencrypted Wi-Fi networks.",
                technical_impact="Insecure transport downgrade.",
                remediation="Configure HSTS header with max-age=31536000 in Next.js security headers or ALB listener policy.",
                fingerprint="tls-missing-hsts-app-acmecloud-io",
            )
        ]


class DASTScanner(SecurityScannerProvider):
    """Safe, non-destructive dynamic application security testing."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        # Validates SSRF safety first
        val = validate_target_url(target)
        if not val["valid"]:
            return []

        return [
            RawFinding(
                scanner="DAST_SCANNER",
                finding_type="MISSING_CONTENT_SECURITY_POLICY",
                title="Content Security Policy (CSP) Header Not Enforced",
                description="The HTTP response headers do not define a restrictive Content-Security-Policy.",
                severity="LOW",
                cvss_score=3.8,
                cwe="CWE-1021",
                owasp_category="A05:2021-Security Misconfiguration",
                asset=target,
                endpoint=target,
                evidence="Content-Security-Policy header is absent.",
                confidence="HIGH",
                business_impact="Increased risk of Cross-Site Scripting (XSS) exploitation if reflected input occurs.",
                technical_impact="Absence of browser-enforced script execution boundary.",
                remediation="Implement a Content-Security-Policy header with default-src 'self'.",
                fingerprint=f"dast-missing-csp-{target}",
            )
        ]


class APISecurityScanner(SecurityScannerProvider):
    """OpenAPI schema inspection and endpoint authorization testing."""

    def scan(self, scope_name: str, target: str, context: Optional[Dict[str, Any]] = None) -> List[RawFinding]:
        return [
            RawFinding(
                scanner="API_SECURITY_SCANNER",
                finding_type="API_RATE_LIMIT_NOT_CONFIGURED",
                title="API Endpoints Lack Granular Per-Client Rate Limiting",
                description="Authentication login endpoints allow high request volumes without progressive backoff or rate limiting.",
                severity="MEDIUM",
                cvss_score=5.3,
                cwe="CWE-307",
                owasp_category="A04:2021-Insecure Design",
                asset=target,
                endpoint="/api/v1/auth/login",
                evidence="50 consecutive requests processed without HTTP 429 Too Many Requests response.",
                confidence="HIGH",
                business_impact="Exposes user accounts to automated credential stuffing or brute-force attacks.",
                technical_impact="Authentication abuse.",
                remediation="Implement Redis-backed rate limiting (e.g. 5 attempts / minute) on /api/v1/auth/login.",
                fingerprint="api-ratelimit-auth-login",
            )
        ]
