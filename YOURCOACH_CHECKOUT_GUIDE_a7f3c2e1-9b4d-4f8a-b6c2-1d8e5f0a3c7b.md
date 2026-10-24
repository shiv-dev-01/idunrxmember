# YourCoach — Checkout Register Integration

**Integration GUID (search in checkout repo):** `a7f3c2e1-9b4d-4f8a-b6c2-1d8e5f0a3c7b`

**Member portal repo:** `idunrx_member` (coaching uses `session-token` only — register is checkout)

---

## 1. When to call register

After **`POST .../createOrder_test`** (or production `createOrder`) returns success:

```json
{
  "status": 1,
  "user_id": 4,
  "message": "Success",
  "order_id": "334555"
}
```

Call register **only if** the purchased product is coaching-eligible (Weight Loss GLP-1 plans below).

---

## 2. Register API

| Item | Value |
|------|--------|
| **URL** | `POST https://panel.whitelabelmd.com/idunrx/api/yourcoach/register` |
| **Content-Type** | `application/json` |

### Request body

| Field | Source | Required |
|-------|--------|----------|
| `member_id` | `String(createOrderResponse.user_id)` | Yes — **portal user id, NOT order_id** |
| `first_name` | Checkout form `first_name` | Yes |
| `last_name` | Checkout form `last_name` | Yes |
| `email` | Checkout form `email` | Yes |
| `phone` | Checkout form `phone` | Yes |
| `state` | Checkout form `state_name` | Yes |
| `zipcode` | Checkout form `zip_code` | Yes |
| `date_of_birth` | Form or default | Yes — confirm with backend |
| `gender` | Form or `"na"` | Yes |
| `sku` | From product map below (`product_id` → `sku`) | Yes |
| `product_category` | From product map (`category_name`) | Yes |
| `order_id` | `createOrderResponse.order_id` | Optional — ask backend |

### Success response

```json
{ "success": true, "message": "registered" }
```

- Treat “already registered” as success if backend returns it (idempotent).
- Log errors; do not block thank-you page if register fails (retry from backend/job).

---

## 3. Product ID → SKU (from your product APIs)

Use the **selected** `product_id` from checkout (`product_id[0]` in order payload).

### Semaglutide (`product_id` 260–263)

| product_id | Plan | sku | product_category |
|------------|------|-----|------------------|
| 260 | Monthly | `Semaginj-CR1-1W` | Weight Loss |
| 261 | 3 month | `SG-MAINT-S3-A-3W` | Weight Loss |
| 262 | 6 month | `Semaginj-CR1-6M-6W` | Weight Loss |
| 263 | 12 month | `Semaginj-CR1-12M-12W` | Weight Loss |

### Tirzepatide (`product_id` 264–267)

| product_id | Plan | sku | product_category |
|------------|------|-----|------------------|
| 264 | Monthly | `TIRZ-CR1-11W` | Weight Loss |
| 265 | 3 month | `TZ-MAINT-S2-A-13W` | Weight Loss |
| 266 | 6 month | `TIRZ-2.5MG-30-6B-16W` | Weight Loss |
| 267 | 12 month | `TIRZ-2.5MG-30-12B-112W` | Weight Loss |

Backend may map these SKUs to YourCoach `external_offer_id` (`idunrx_sub_1m`, etc.). **Send the real `sku` from the product API**, not guessed `Semaginj-CR1` codes.

---

## 4. Copy-paste: product lookup + register (JavaScript)

Search checkout for GUID: `a7f3c2e1-9b4d-4f8a-b6c2-1d8e5f0a3c7b`

```javascript
// YOURCOACH_CHECKOUT a7f3c2e1-9b4d-4f8a-b6c2-1d8e5f0a3c7b
const YOURCOACH_REGISTER_URL =
  'https://panel.whitelabelmd.com/idunrx/api/yourcoach/register';

/** Build from product API responses (Semaglutide + Tirzepatide lists). */
const YOURCOACH_PRODUCT_BY_ID = {
  260: { sku: 'Semaginj-CR1-1W', product_category: 'Weight Loss' },
  261: { sku: 'SG-MAINT-S3-A-3W', product_category: 'Weight Loss' },
  262: { sku: 'Semaginj-CR1-6M-6W', product_category: 'Weight Loss' },
  263: { sku: 'Semaginj-CR1-12M-12W', product_category: 'Weight Loss' },
  264: { sku: 'TIRZ-CR1-11W', product_category: 'Weight Loss' },
  265: { sku: 'TZ-MAINT-S2-A-13W', product_category: 'Weight Loss' },
  266: { sku: 'TIRZ-2.5MG-30-6B-16W', product_category: 'Weight Loss' },
  267: { sku: 'TIRZ-2.5MG-30-12B-112W', product_category: 'Weight Loss' },
};

const YOURCOACH_ELIGIBLE_PRODUCT_IDS = new Set(
  Object.keys(YOURCOACH_PRODUCT_BY_ID).map(Number)
);

/**
 * @param {object} orderResult - createOrder_test response item
 * @param {number|string} orderResult.user_id
 * @param {string} orderResult.order_id
 * @param {object} form - checkout form fields
 * @param {number} productId - selected product_id[0]
 */
export async function registerYourCoachAfterOrder(orderResult, form, productId) {
  if (orderResult?.status !== 1 || !orderResult?.user_id) {
    return { skipped: true, reason: 'order_not_success' };
  }

  const pid = Number(productId);
  if (!YOURCOACH_ELIGIBLE_PRODUCT_IDS.has(pid)) {
    return { skipped: true, reason: 'not_coaching_product' };
  }

  const product = YOURCOACH_PRODUCT_BY_ID[pid];
  const body = {
    member_id: String(orderResult.user_id),
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    phone: form.phone,
    state: form.state_name,
    zipcode: form.zip_code,
    date_of_birth: form.date_of_birth || '1990-01-01',
    gender: form.gender || 'na',
    sku: product.sku,
    product_category: product.product_category,
    order_id: orderResult.order_id,
  };

  const res = await fetch(YOURCOACH_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[YourCoach register]', res.status, data);
    return { success: false, error: data };
  }
  return { success: true, data };
}
```

### Wire after `createOrder_test`

```javascript
// Example: inside existing success handler
const orderResult = response[0]; // [{ status, user_id, order_id, message }]
const productId = payload.product_id[0];

try {
  await registerYourCoachAfterOrder(orderResult, formValues, productId);
} catch (err) {
  console.error('[YourCoach register] failed', err);
}
// Continue to thank-you / redirect — do not block on register failure
```

---

## 5. End-to-end IDs (must match)

| Step | ID used |
|------|---------|
| Checkout register | `member_id` = `user_id` from createOrder (e.g. `"4"`) |
| Member portal login | Same value in `userData.userId` |
| `/coaching` session-token | `member_id` = same `userId` |
| Cancel eligibility | `member_id` = same `userId` |

**Never** use `order_id` as `member_id`.

---

## 6. Example (your test order)

- createOrder: `user_id: 4`, `order_id: "334555"`, `product_id: [263]`
- register body includes: `member_id: "4"`, `sku: "Semaginj-CR1-12M-12W"`, `product_category: "Weight Loss"`, `order_id: "334555"`

---

## 7. Member portal (already done)

- `POST /yourcoach/session-token` with `member_id` = logged-in `userId`
- Widget LOGIN at `/coaching`
- Cancel → `/yourcoach/eligibility`

No register call in member portal when checkout handles register.

---

## 8. Backend confirmation checklist

- [ ] Register idempotent if same `member_id` + order registers twice
- [ ] Accept checkout SKUs (`SG-MAINT-S3-A-3W`, `Semaginj-CR1-12M-12W`, Tirzepatide SKUs)
- [ ] `order_id` field supported on register if sent
- [ ] `date_of_birth` / `gender` required or optional
