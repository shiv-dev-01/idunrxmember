# YourCoach Integration: Information to Send to YourCoach Team

## Overview

This document outlines all the information and actions required on our side (iDunRx) to be shared with the YourCoach team for successful integration.

---

## Step 1: Generate RSA Key Pair

**Status**: Ready to execute

### Instructions

1. Navigate to the project root directory
2. Run the following command:
   ```bash
   node scripts/generate-yourcoach-keys.js
   ```

3. This will create two files in the `keys/` directory:
   - `keys/yourcoach.public.pem` ← **SEND THIS TO YOURCOACH**
   - `keys/yourcoach.private.pem` ← **KEEP PRIVATE & SECURE**

### Timeline
- ⏱️ Time required: **< 1 minute**
- ⏱️ Do this: **Immediately, before contacting YourCoach**

---

## Step 2: Information to Send to YourCoach

### 2.1 RSA Public Key

**What**: The public key from `keys/yourcoach.public.pem`

**How to obtain**:
```bash
cat keys/yourcoach.public.pem
```

**Format**: PEM format with following structure:
```
-----BEGIN PUBLIC KEY-----
[base64 encoded key content]
-----END PUBLIC KEY-----
```

**Action**: Copy the entire public key content and send to YourCoach

---

### 2.2 Application Domains

**What**: The domain(s) where the YourCoach widget will be hosted

**Domains to provide**:

| Environment | Domain | Status |
|-------------|--------|--------|
| Staging | app-staging.idunrx.com | **TO BE CONFIRMED** |
| Production | app.idunrx.com | **TO BE CONFIRMED** |

**Action**: 
1. Confirm/update the staging and production domains
2. Provide these to YourCoach for whitelisting

**Why**: YourCoach needs to whitelist your domains for iframe communication security

---

### 2.3 Partner ID Confirmation

**Current Value**: `idunrx`

**Action**: Confirm with YourCoach that `idunrx` is the correct partner ID, or provide the correct value if different

---

### 2.4 Brand Assets (Optional but Recommended)

**Items to provide**:

1. **Logo**
   - Format: PNG or SVG
   - Size: At least 500x500px
   - Purpose: For widget UI styling

2. **Primary Brand Color**
   - Format: Hex code (e.g., `#FF5733`)
   - Purpose: For widget UI theming

**Action**: Prepare these assets and include in communication with YourCoach

---

### 2.5 Environment Preference

**Recommended Starting Point**:
- **Environment**: RC (Staging)
- **Package**: 1-month subscription
- **Purpose**: Initial integration testing

**Action**: Confirm this preference with YourCoach or specify alternative

---

### 2.6 QA Access Request

**What we're requesting**:
- Access to your pre-prod/staging environment for QA team testing
- Credentials and staging URL for the YourCoach team to test end-to-end

**Why**: 
- Ensures smooth integration
- Allows YourCoach to verify functionality in our environment
- Reduces issues at production launch

**Action**: 
1. Prepare staging environment credentials
2. Provide staging URL
3. Ask YourCoach team when they'll be ready for testing

---

## Step 3: Information We're Requesting from YourCoach

Once you send the above information, YourCoach will provide:

### 3.1 Client Credentials

```
clientId: ___________________
clientSecret: ___________________
```

**Timeline**: Typically provided within 1-2 business days

**Action**: Once received, add to `.env.local`:
```env
VITE_YOURCOACH_CLIENT_ID=<clientId>
VITE_YOURCOACH_CLIENT_SECRET=<clientSecret>
```

---

### 3.2 Onboarding Questions

**What**: The list of questions for the SIGNUP flow

**Example format**:
```
Q1: "How ready are you to make changes to your health?"
Expected answer: (varies by user)

Q2: "Please share any health-related concerns..."
Expected answer: (varies by user)
```

**Action**: Once received, update `src/config/yourcoach.ts` → `onboardingQuestions`

---

### 3.3 Population IDs (if applicable)

**What**: Any specific population/demographic tags to assign to users

**Example**: `['dei_ppl', 'african_american_ppl']`

**Action**: Update `src/config/yourcoach.ts` → `populationIds`

---

### 3.4 Testing Credentials

**What**: Test user account(s) for our integration testing

**Why**: Allows us to test the complete SIGNUP/LOGIN flow

**Action**: 
1. Request at least 2 test accounts
2. Use them for integration testing
3. Provide feedback to YourCoach

---

### 3.5 Confirmation: Domain Whitelisting

**What**: Confirmation that our domain(s) have been whitelisted

**Why**: Required for iframe widget to function

**Action**: Verify this is confirmed before production deployment

---

### 3.6 API Endpoint Confirmation

**Current endpoints we're using**:
- Staging: `https://api.rc.yourcoach.health` ✓ (from documentation)
- Production: `https://api.yourcoach.health` ✓ (from documentation)

**Action**: Ask YourCoach to confirm these are current/correct

---

## Communication Checklist

### Initial Contact Email

**To**: YourCoach Integration Team

**Subject**: iDunRx YourCoach Integration - Initial Setup Information

**Content**:
```
Hello YourCoach Team,

We're excited to integrate the YourCoach widget into our application.

As per the integration requirements, please find the following information:

1. PUBLIC KEY (attached/pasted below)
   [Your RSA public key from keys/yourcoach.public.pem]

2. DOMAIN INFORMATION
   - Staging: app-staging.idunrx.com
   - Production: app.idunrx.com
   
   (Please confirm if these need to be adjusted)

3. PARTNER ID CONFIRMATION
   - Partner ID: idunrx
   
   (Please confirm)

4. ENVIRONMENT PREFERENCE
   - We would like to start with RC (Staging) environment
   - Package: 1-month subscription for initial testing

5. QA ACCESS REQUEST
   - Would your QA team like access to our staging environment for end-to-end testing?
   - We can provide staging credentials if needed

Next steps:
- Please provide client credentials (clientId & clientSecret) once confirmed
- Please whitelist our domain(s) for iframe communication
- Please provide onboarding questions if different from your documentation

We're ready to begin integration and testing. Please let us know if you need any additional information.

Best regards,
iDunRx Team
```

---

## Timeline Summary

### Immediate Actions (Today)
- ✅ Verify project structure is ready
- ⏱️ Generate RSA key pair (< 1 minute)
- ⏱️ Prepare domain information

### Before Contacting YourCoach
- ⏱️ Extract public key
- ⏱️ Confirm brand assets are available
- ⏱️ Prepare staging environment info

### After Sending Information to YourCoach
- ⏳ Wait for client credentials (1-2 business days)
- ⏳ Wait for onboarding questions
- ⏳ Wait for domain whitelisting confirmation
- ⏳ Receive test credentials

### Development Phase
- ⏳ Configure environment variables
- ⏳ Install dependencies
- ⏳ Test integration on staging
- ⏳ Coordinate with YourCoach QA

### Before Production
- ⏳ Receive production credentials
- ⏳ Update environment for production
- ⏳ Final testing
- ⏳ Launch

---

## Quick Reference

### Files Created for Integration

```
Project Root
├── scripts/
│   └── generate-yourcoach-keys.js          (Key generation script)
├── keys/                                    (Will be created on first run)
│   ├── yourcoach.public.pem                (Send to YourCoach)
│   └── yourcoach.private.pem               (Keep secure)
├── src/
│   ├── config/
│   │   └── yourcoach.ts                    (Configuration)
│   ├── types/
│   │   └── yourcoach.ts                    (TypeScript types)
│   ├── services/
│   │   └── yourcoach.ts                    (API service)
│   ├── utils/
│   │   ├── yourcoach-token.ts              (JWT generation)
│   │   └── yourcoach-subscription.ts       (Subscription management)
│   ├── hooks/
│   │   └── useYourCoach.ts                 (React hook)
│   └── components/
│       └── yourcoach/
│           └── YourCoachWidget.tsx         (Widget component)
├── .env.yourcoach.example                  (Environment template)
└── YOURCOACH_INTEGRATION.md                (Complete integration guide)
```

### Environment Variables Needed

```env
VITE_YOURCOACH_ENV=staging
VITE_YOURCOACH_CLIENT_ID=                   (From YourCoach)
VITE_YOURCOACH_CLIENT_SECRET=               (From YourCoach)
VITE_YOURCOACH_PARTNER_ID=idunrx            (Confirmed)
VITE_YOURCOACH_PRIVATE_KEY=                 (From keys/yourcoach.private.pem)
```

---

## Support & Questions

**Documentation**: See `YOURCOACH_INTEGRATION.md` for complete integration guide

**Key Contacts**:
- YourCoach Support: [To be provided]
- iDunRx Team: [Your contact info]

---

## Next Steps

1. ✅ **Generate Keys** → Run `node scripts/generate-yourcoach-keys.js`
2. ⏳ **Send Public Key & Info** → Contact YourCoach with information from this document
3. ⏳ **Receive Credentials** → YourCoach provides clientId & clientSecret
4. ⏳ **Configure & Test** → Set up environment and run integration tests
5. ⏳ **Deploy** → Launch to production

---

**Last Updated**: May 11, 2026
**Integration Status**: Ready for YourCoach coordination
