import os
from typing import List, Literal, Dict, Any, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from urllib.parse import urlsplit


class Settings(BaseSettings):
    PROJECT_NAME: str = "LaunchComply"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment (development, test, demo, staging, production)
    ENVIRONMENT: Literal["development", "test", "demo", "staging", "production"] = "development"
    DEBUG: bool = Field(default=True)
    MIGRATE_ON_STARTUP: bool = False

    # Database (Defaults to local SQLite async DB for effortless zero-setup dev & automated testing; PostgreSQL mandatory in production)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./launchcomply.db"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Psycopg supports async SQLAlchemy and preserves libpq TLS/channel binding.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    # JWT & Cryptography
    JWT_SECRET: str = Field(
        default="launchcomply_super_secure_jwt_secret_key_change_in_production_32chars"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ENCRYPTION_KEY: str = Field(
        default="launchcomply_default_dev_encryption_key_32chars_min"
    )

    # Production Domains
    PLATFORM_DOMAIN: str = "launchcomply.com"
    APP_DOMAIN: str = "app.launchcomply.com"
    API_DOMAIN: str = "api.launchcomply.com"
    STATUS_DOMAIN: str = "status.launchcomply.com"
    DEMO_DOMAIN: str = "demo.launchcomply.com"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://launchcomply.com",
        "https://app.launchcomply.com",
        "https://api.launchcomply.com",
        "https://status.launchcomply.com",
        "https://demo.launchcomply.com",
    ]

    # AWS Integration Settings
    LAUNCHCOMPLY_AWS_ACCOUNT_ID: str = "012345678901"
    LAUNCHCOMPLY_EXTERNAL_ID_PREFIX: str = "launchcomply-ext-"
    AWS_SES_REGION: str = "ap-south-1"

    # Optional GitHub App user authorization; secrets stay on the API server.
    GITHUB_APP_ID: str = ""
    GITHUB_APP_SLUG: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_CALLBACK_URL: str = ""
    GITHUB_APP_PRIVATE_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ARCHITECTURE_AI_MODEL: str = "gpt-4.1-mini"
    ENABLE_AWS_KNOWLEDGE: bool = False
    ENABLE_SERVICE_PAYMENTS: bool = False
    BILLING_RETURN_ORIGIN: str = ""
    ENABLE_AWS_ACCOUNT_CONNECTION: bool = False
    AWS_PLATFORM_ROLE_ARN: str = ""

    @field_validator("BILLING_RETURN_ORIGIN")
    @classmethod
    def validate_billing_return_origin(cls, value: str) -> str:
        if value and not cls._is_https_origin(value):
            raise ValueError("BILLING_RETURN_ORIGIN must be an exact HTTPS origin.")
        return value

    # Phase 5 Execution Safety Flags
    ENABLE_REAL_MONITORING: bool = False
    ENABLE_REAL_RESTORE_DRILLS: bool = False
    ENABLE_REAL_SECURITY_INGESTION: bool = False
    ENABLE_REAL_COST_INGESTION: bool = False
    ENABLE_AUTO_ROLLBACK: bool = False

    # Phase 6 Security & Resilience Execution Safety Flags
    ENABLE_REAL_SAST: bool = False
    ENABLE_REAL_SCA: bool = False
    ENABLE_REAL_CONTAINER_SCAN: bool = False
    ENABLE_REAL_DAST: bool = False
    ENABLE_REAL_API_SECURITY_TESTING: bool = False
    ENABLE_REAL_DR_DRILLS: bool = False
    ENABLE_SLACK_INTEGRATION: bool = False
    ENABLE_PAGERDUTY_INTEGRATION: bool = False

    # Phase 7 Compliance OS Execution Safety Flags
    ENABLE_REAL_COMPLIANCE_NOTIFICATIONS: bool = False
    ENABLE_EXTERNAL_DOCUMENT_SIGNING: bool = False
    ENABLE_AUTOMATED_VENDOR_SYNC: bool = False

    # Phase 8 & 9 Commercial & Live Activation Safety Flags
    ENABLE_REAL_STRIPE: bool = False
    ENABLE_REAL_RAZORPAY: bool = False
    ENABLE_REAL_EMAIL: bool = False
    ENABLE_PLATFORM_IMPERSONATION: bool = False
    ENABLE_EXTERNAL_CONNECTORS: bool = False
    ENABLE_REAL_TAX_CALCULATION: bool = False
    DEMO_MODE: bool = True
    PILOT_MODE: bool = False

    # Phase 10 Enterprise, AI & Partner Safety Flags
    ENABLE_REAL_SAML: bool = False
    ENABLE_REAL_SCIM: bool = False
    ENABLE_AI_COPILOT: bool = False
    ENABLE_AI_SOURCE_CODE_ACCESS: bool = False
    ENABLE_PARTNER_PORTAL: bool = True
    ENABLE_OUTBOUND_WEBHOOKS: bool = False

    # Phase 11 Continuous Assurance & White-Label Safety Flags
    ENABLE_AUDIT_BOTS: bool = True
    ENABLE_CONTINUOUS_CONTROL_MONITORING: bool = True
    ENABLE_PARTNER_WHITE_LABEL: bool = False
    ENABLE_PARTNER_CUSTOM_DOMAINS: bool = False
    ENABLE_REAL_EVIDENCE_CONNECTORS: bool = False

    # Live Provider Credentials & Modes
    STRIPE_MODE: str = "test"  # "test" or "live"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    RAZORPAY_MODE: str = "test"  # "test" or "live"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    EMAIL_PROVIDER: str = "mock"  # "ses", "smtp", "mock"
    EMAIL_FROM_ADDRESS: str = "no-reply@launchcomply.com"
    SUPPORT_EMAIL: str = "support@launchcomply.com"
    SECURITY_EMAIL: str = "security@launchcomply.com"
    BILLING_EMAIL: str = "billing@launchcomply.com"

    OBJECT_STORAGE_PROVIDER: str = "local"  # "s3", "local"
    OBJECT_STORAGE_BUCKET: str = "launchcomply-production-artifacts"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    def validate_production_environment(self) -> Tuple[bool, List[str], List[str]]:
        """
        Validates environment constraints for production readiness.
        Returns: (is_valid, blockers, warnings)
        """
        blockers = []
        warnings = []

        is_prod = self.ENVIRONMENT.lower() in ("staging", "production")

        if is_prod:
            # 1. No SQLite in production
            if self.DATABASE_URL.startswith("sqlite"):
                blockers.append("SQLite is prohibited in production. A production PostgreSQL database must be configured.")

            # 2. DEMO_MODE must be false
            if self.DEMO_MODE:
                blockers.append("DEMO_MODE is enabled. Production environments must strictly enforce DEMO_MODE=False.")

            # 3. DEBUG must be false
            if self.DEBUG:
                blockers.append("DEBUG mode is enabled. Production environments must have DEBUG=False.")

            # 4. Insecure default secrets
            if "change_in_production" in self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                blockers.append("Insecure or default JWT_SECRET detected. Provide a cryptographically strong 32+ character key.")

            if "default_dev" in self.ENCRYPTION_KEY or len(self.ENCRYPTION_KEY) < 32:
                blockers.append("Insecure or default ENCRYPTION_KEY detected. Provide a secure 32+ character key.")

            # 5. Billing providers
            if self.ENABLE_REAL_STRIPE:
                if not self.STRIPE_SECRET_KEY or not self.STRIPE_WEBHOOK_SECRET:
                    blockers.append("ENABLE_REAL_STRIPE is true but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is missing.")

            if self.ENABLE_REAL_RAZORPAY:
                if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_SECRET or not self.RAZORPAY_WEBHOOK_SECRET:
                    blockers.append("ENABLE_REAL_RAZORPAY is true but RAZORPAY credentials or webhook secret are missing.")

            # 6. Email provider
            if self.ENABLE_REAL_EMAIL:
                if self.EMAIL_PROVIDER not in ("ses", "smtp"):
                    blockers.append("ENABLE_REAL_EMAIL is true but EMAIL_PROVIDER is not set to 'ses' or 'smtp'.")

            # 7. S3 in production
            if self.OBJECT_STORAGE_PROVIDER != "s3":
                warnings.append("OBJECT_STORAGE_PROVIDER is local. Production artifacts should be stored in private Amazon S3.")

        return (len(blockers) == 0, blockers, warnings)

    def validate_hosted_environment(self) -> Tuple[bool, List[str], List[str]]:
        """Startup gate for hosted owner testing and production alike."""
        valid, blockers, warnings = self.validate_production_environment()
        if self.ENVIRONMENT.lower() not in ("staging", "production"):
            return valid, blockers, warnings
        if not self.DATABASE_URL.startswith(("postgresql+asyncpg://", "postgresql+psycopg://")):
            blockers.append("Hosted environments require PostgreSQL using an async-capable driver.")
        if any(marker in secret.lower() for secret in (self.JWT_SECRET, self.ENCRYPTION_KEY)
               for marker in ("placeholder", "replace-with", "example", "dev_secret", "must_be_overridden")):
            blockers.append("Hosted authentication/encryption secrets must not be placeholders or development secrets.")
        if self.ENVIRONMENT == "production":
            if self.ENABLE_REAL_STRIPE and (self.STRIPE_MODE != "live" or not self.STRIPE_SECRET_KEY.startswith("sk_live_")):
                blockers.append("Production Stripe requires live mode and a live secret key.")
            if self.ENABLE_REAL_RAZORPAY and (self.RAZORPAY_MODE != "live" or not self.RAZORPAY_KEY_ID.startswith("rzp_live_")):
                blockers.append("Production Razorpay requires live mode and a live key ID.")
        if not self.BACKEND_CORS_ORIGINS or any(
            not self._is_https_origin(origin) for origin in self.BACKEND_CORS_ORIGINS
        ):
            blockers.append("BACKEND_CORS_ORIGINS must contain exact HTTPS frontend origins without wildcards, paths or localhost.")
        return not blockers, blockers, warnings

    @staticmethod
    def _is_https_origin(origin: str) -> bool:
        parsed = urlsplit(origin)
        return bool(
            parsed.scheme == "https" and parsed.hostname
            and parsed.hostname not in ("localhost", "127.0.0.1", "::1")
            and "*" not in origin and not parsed.username and not parsed.password
            and not parsed.path and not parsed.query and not parsed.fragment
        )


settings = Settings()
