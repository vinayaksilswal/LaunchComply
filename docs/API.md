# LaunchComply — Public REST API Specification
*Enterprise Assurance, Controls & Telemetry Endpoints.*

---

## 1. Authentication & Base URL

- **Production Base URL**: `https://app.launchcomply.io/api/v1`
- **Authentication**: Bearer token authentication via `Authorization: Bearer <TOKEN>` header or `X-Organization-ID: <ORG_ID>` for authorized public endpoints.
- **Content Type**: `application/json`

---

## 2. Public Enterprise Assurance Endpoints

### 2.1 Get Posture Summary
`GET /api/v1/public/v1/assurance/summary`
- **Headers**: `X-Organization-Id: <ORG_ID>`
- **Response**:
```json
{
  "monitored_controls_count": 28,
  "pass_count": 26,
  "partial_count": 1,
  "fail_count": 1,
  "overall_assurance_score": 93.5,
  "evidence_integrity": "VERIFIED"
}
```

### 2.2 List Continuous Controls
`GET /api/v1/public/v1/assurance/controls`
- **Headers**: `X-Organization-Id: <ORG_ID>`
- **Query Parameters**:
  - `framework` (optional): `SOC2` or `ISO27001`
  - `status` (optional): `PASSING` or `FAILING`

### 2.3 List Cryptographic Evidence Observations
`GET /api/v1/public/v1/assurance/evidence`
- **Headers**: `X-Organization-Id: <ORG_ID>`
- **Query Parameters**:
  - `framework`: Framework code
  - `limit`: Integer (default: 50)

---

## 3. Developer Integration Code Examples

### cURL
```bash
curl -X GET "https://app.launchcomply.io/api/v1/public/v1/assurance/summary" \
  -H "X-Organization-Id: demo-org-acmecloud-987" \
  -H "Accept: application/json"
```

### Python
```python
import requests

url = "https://app.launchcomply.io/api/v1/public/v1/assurance/summary"
headers = {
    "X-Organization-Id": "demo-org-acmecloud-987",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())
```

### TypeScript / Node.js
```typescript
import { apiClient } from "@/lib/api";

const summary = await apiClient("/public/v1/assurance/summary", {
  organizationId: "demo-org-acmecloud-987",
});
console.log("Assurance Score:", summary.overall_assurance_score);
```
