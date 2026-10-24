# YourCoach — Backend Integration Guide

**Audience:** idunRx backend team  
**Member portal:** `https://member.idunrx.com` (React SPA, static deploy)  
**Vendor spec:** `YourCoach Technical Documentation (1).md` in this repo

---

## 1. Architecture (required by YourCoach)

YourCoach does **not** allow the member portal to call their API from the browser.

| Action | Who implements it | How |
|--------|-------------------|-----|
| **Register** member in YourCoach | **Backend (you)** | Server-to-server HTTP POST to YourCoach API |
| **Login** to coaching | **Member portal** | Open widget iframe + JWT via `postMessage` (LOGIN) — **no API call from browser** |
| Subscription events (cancel, renew, etc.) | **Backend (you)** | Server-to-server `user.hooks.eligibility` (phase 2) |

```text
[Purchase / eligible plan]
        │
        ▼
┌───────────────────┐
│  idunRx backend   │  ──POST──►  api.rc.yourcoach.health
│  register user    │            user.auth.external_auth (action: register)
└───────────────────┘
        │
        │  (later) member opens portal
        ▼
┌───────────────────┐
│  Member portal    │  ──►  widget.rc.yourcoach.health (iframe only)
│  JWT + LOGIN      │      no call to YourCoach API from browser
└───────────────────┘
```

---

## 2. What you must build (phase 1)

### 2.1 Register user with YourCoach

**Trigger (pick one or combine — product decision):**

- After successful subscription / order for a coaching-eligible product (recommended), or  
- Before first access to coaching, if not already registered (lazy register)

**Do not** rely on the portal to register users.

**HTTP**

- **URL (RC / pre-prod):** `POST https://api.rc.yourcoach.health/`
- **Production (later):** `POST https://api.yourcoach.health/`
- **Content-Type:** `application/json`
- **Body:** JSON-RPC style (see below)

**Credentials (store in secrets — never in frontend)**

| Secret | RC value (example) |
|--------|---------------------|
| `client_id` | `idunrx` |
| `client_secret` | *(from YourCoach / secure store)* |
| RSA private key | *(same key pair shared with YourCoach for JWT)* |
| JWT `iss` | `idunrx` |

**JWT for `token` field**

- Algorithm: **RS256**
- Payload must include: `user_id` = idunRx member ID (string, same ID portal uses)
- Short expiry (e.g. 1 minute) is fine
- Sign with your private key

**Request body — `user.auth.external_auth` (register)**

```json
{
  "id": 1,
  "meta": { "version": [10, 0] },
  "method": "user.auth.external_auth",
  "params": {
    "client_id": "idunrx",
    "client_secret": "<secret>",
    "token": "<signed-jwt>",
    "action": "register",
    "device": "idunrx-backend",
    "push_token": null,
    "external_offer_id": "idunrx_sub_1m",
    "user_info": {
      "partner_id": "idunrx_weight_mgmt",
      "demographics": {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
        "phone": "+14155552672",
        "state": "CA",
        "zipcode": "90210",
        "date_of_birth": "1990-01-01",
        "gender": "female"
      },
      "additional_data": [
        {
          "question": "How ready are you to make changes to your health?",
          "answer": "Very"
        },
        {
          "question": "Please share any health-related concerns or additional details that you would like to share with your coach. If none, just write \"none\".",
          "answer": "None"
        }
      ]
    }
  }
}
```

**Field rules**

- API uses **snake_case** (not camelCase like the widget).
- **`phone`:** E.164 only, e.g. `+14155552672` (not `4155552672`).
- **`external_offer_id`:** max 255 chars — see mapping below.
- **`gender`:** `female` | `male` | `na` | null

**Idempotency**

- If user already exists, handle without breaking checkout (log + treat as OK, or skip register).
- Portal will only **LOGIN** via widget; user must exist in YourCoach first.

---

### 2.2 Optional but recommended: JWT endpoint for portal

Move signing off the frontend long term.

**Example:** `POST /idunrx/api/yourcoach/session-token`  
**Auth:** existing member session (same as other portal APIs)  
**Response:** `{ "token": "<jwt>" }`  

Portal uses this JWT only to open the widget with **LOGIN**. Still **no** YourCoach API call from browser.

---

## 3. ID mapping (register + future eligibility)

### 3.1 `partner_id` (program category)

| Order `product_category_name` | `partner_id` |
|------------------------------|--------------|
| Weight Loss / GLP-1 / Semaglutide | `idunrx_weight_mgmt` |
| Women's health / HRT / TRT (future) | `idunrx_women_health` |

### 3.2 `external_offer_id` (plan duration)

Map from **`product_sku`** on the order line:

| `product_sku` | `external_offer_id` |
|---------------|---------------------|
| `Semaginj-CR1` | `idunrx_sub_1m` |
| `Semaginj-CR3` | `idunrx_sub_3m` |
| `Semaginj-CR6` | `idunrx_sub_6m` |
| `Semaginj-CR12` | `idunrx_sub_12m` |

Example cart/order fields from member API:

- `product_sku`: `Semaginj-CR1`
- `product_category_name`: `Weight Loss`

---

## 4. What the portal does (no backend work for login API)

When a member opens **Health Coaching** (`/coaching`):

1. Build or fetch JWT (`user_id` in claims).
2. Load iframe: `https://widget.rc.yourcoach.health`
3. `postMessage` with type **`LOGIN`** + `clientId`, `clientSecret`, `token`

**You do not need a YourCoach API call on each login** if the user was already registered in step 2.1.

---

## 5. Phase 2 — eligibility events (after register works)

When billing/subscription changes on **your** side, call **`user.hooks.eligibility`** server-to-server.

| Business event | `eligibility` | Typical `reason` |
|----------------|---------------|------------------|
| Cancel renewal (portal already calls `subscription_stop`) | `stop_renewal` | `subscription_canceled` |
| Immediate stop | `stop_now` | `subscription_canceled` |
| Payment failed | `stop_now` | `failed_payment` |
| Refund | `stop_now` | `refunded` |
| Subscription renewed | `restart_renewal` | `subscription_restarted` |

Same JWT + `client_id` / `client_secret` + `external_offer_id` as register.

**Renewal timing:** YourCoach expects renewal notification **&lt; 7 days before expiration** — confirm with billing team.

Portal **removed** browser-side eligibility calls; this must live on backend.

---

## 6. Reference code in member portal repo (payload examples only)

Do not call from browser in production. Use as shape reference:

| File | Purpose |
|------|---------|
| `src/services/yourcoach.ts` | Request payloads for auth + eligibility |
| `src/utils/yourcoach-subscription.ts` | Register / login / eligibility helpers |
| `src/utils/yourcoach-offer.ts` | SKU → `partner_id` / `external_offer_id` |
| `src/utils/yourcoach-token.ts` | JWT signing (move to backend) |

---

## 7. Acceptance criteria (phase 1)

- [ ] New coaching-eligible subscriber is registered via **server-to-server** `user.auth.external_auth` (`action: register`).
- [ ] `user_id` in JWT matches member ID used in the portal.
- [ ] `partner_id` and `external_offer_id` match SKU/category mapping.
- [ ] Phone numbers sent in **E.164** format.
- [ ] Member can open `https://member.idunrx.com/coaching` and complete widget **LOGIN** without portal calling YourCoach API.
- [ ] Credentials and private key stored only on server.

---

## 8. Questions for product / YourCoach

1. Exact trigger for register: on order paid, on first ship, or first coaching visit?  
2. Production credentials and go-live date (separate from RC).  
3. Renewal event timing vs YourCoach 7-day rule.

---

## 9. One-page summary for Slack

> **YourCoach backend (phase 1):** On coaching-eligible purchase, call `POST https://api.rc.yourcoach.health` with method `user.auth.external_auth`, `action: register`, JWT (`user_id`), demographics, `partner_id` (`idunrx_weight_mgmt`), `external_offer_id` from SKU (`Semaginj-CR1` → `idunrx_sub_1m`, etc.). Portal only opens widget for login — no browser API calls. Optional: expose `session-token` endpoint for JWT. Phase 2: `user.hooks.eligibility` on cancel/renew from our billing events.
