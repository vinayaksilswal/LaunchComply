# LaunchComply — MSP & Partner Guide
*White-Label Portals, Custom Vanity Domains & Delegated Tenant Security.*

---

## 1. Overview for Managed Service Providers (MSPs)
LaunchComply enables cybersecurity consultants, cloud MSPs, and fractional CISOs to manage compliance, cloud infrastructure, and security assessments across multiple customer tenants from a single pane of glass.

---

## 2. Onboarding as an MSP Partner
1. Register your partner organization via `/partner`.
2. Generate an invitation link or send an invite to customer organizations via `/partner/relationships/invite`.
3. Customer administrators approve the relationship from their settings console.

---

## 3. White-Label Branding Studio
Navigate to `/partner/settings/branding` to customize:
- **Brand Name & Portal Title**
- **Brand Primary Accent Color**
- **Custom Logo URL & Favicon**
- **Custom Support Email & Notification Footer**

---

## 4. Custom Vanity Domains & Automated TLS
1. Go to `/partner/settings/domain`.
2. Input your vanity hostname (e.g. `compliance.securemsp.io`).
3. Add the provided DNS verification tokens to your DNS provider:
   - **CNAME Record**: Points to `edge.launchcomply.io`
   - **TXT Record**: Contains unique token `launchcomply-verify=lc-partner-token-xyz`
4. Click **Verify DNS & Provision TLS**.
5. Once verified, the edge router resolves all incoming HTTP traffic for `compliance.securemsp.io` directly into the branded tenant workspace.
