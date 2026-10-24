# YourCoach Integration Checklist

This document outlines the complete YourCoach integration process with all steps and requirements.

## Phase 1: Preparation & Key Generation

### Our Side (iDunRx)

- [ ] **Generate RSA Key Pair**
  - Run: `node scripts/generate-yourcoach-keys.js yourcoach`
  - Creates: `keys/yourcoach.public.pem` and `keys/yourcoach.private.pem`
  - **Action**: Extract the public key content to send to YourCoach
  - **Keep secure**: Store the private key safely in environment variables

- [ ] **Configure Environment Variables**
  - Copy `.env.yourcoach.example` to `.env.local`
  - Add VITE_YOURCOACH_PRIVATE_KEY (full content of private key)
  - Set VITE_YOURCOACH_ENV=staging (for initial integration)
  - See below for sample values

- [ ] **Review Integration Documentation**
  - Read `YourCoach Technical Documentation (1).md`
  - Understand widget initialization, events, and API endpoints

---

## Phase 2: YourCoach Information Requests

### Information to SEND to YourCoach Team

**Contact**: YourCoach Support Team

**Email**: [Request this from your YourCoach contact]

**Provide the following:**

1. **RSA Public Key** (from Phase 1)
   - File: `keys/yourcoach.public.pem`
   - Include the full content including header and footer

2. **Application Domain(s)**
   - Staging domain: (e.g., `app-staging.idunrx.com`)
   - Production domain: (e.g., `app.idunrx.com`)
   - These domains need to be whitelisted for iframe communication

3. **Partner ID Confirmation**
   - Confirm: `idunrx` is the correct partner ID
   - Or provide the correct identifier if different

4. **Brand Assets** (optional but recommended)
   - Logo: PNG/SVG format
   - Primary brand color: Hex code (e.g., `#FF5733`)

5. **QA Environment Access Request**
   - Request: Access to your pre-prod/staging environment for YourCoach QA team testing
   - Provide: Credentials and staging URL

6. **Initial Configuration**
   - Confirm starting with **1-month package** for testing
   - Confirm environment: **RC (Staging)**

### Information to RECEIVE from YourCoach Team

- [ ] **Client Credentials**
  - [ ] `clientId` (add to VITE_YOURCOACH_CLIENT_ID)
  - [ ] `clientSecret` (add to VITE_YOURCOACH_CLIENT_SECRET)

- [ ] **Onboarding Questions**
  - [ ] List of questions for SIGNUP flow
  - [ ] Expected answers (if any)
  - [ ] Update: `src/config/yourcoach.ts` → `onboardingQuestions`

- [ ] **Population IDs** (if applicable)
  - [ ] Any specific population tags to assign
  - [ ] Update: `src/config/yourcoach.ts` → `populationIds`

- [ ] **Domain Whitelisting Confirmation**
  - [ ] Confirmation that domains are whitelisted

- [ ] **API Endpoint Confirmation**
  - [ ] Confirm staging endpoint: `https://api.rc.yourcoach.health`
  - [ ] Confirm production endpoint (for future use)

- [ ] **Testing Credentials** (if applicable)
  - [ ] Test user account(s) for integration testing
  - [ ] Test environment URL

---

## Phase 3: Code Integration

### Install Dependencies

```bash
npm install jose
```

**Why?** The `jose` library is needed for JWT token generation with RS256 algorithm.

### Update package.json

Ensure `jose` is added to dependencies:
```json
{
  "dependencies": {
    "jose": "^5.0.0"
  }
}
```

### Files Created

The following files have been created for the integration:

1. **Configuration & Types**
   - `src/config/yourcoach.ts` - YourCoach configuration
   - `src/types/yourcoach.ts` - TypeScript types for all YourCoach interactions

2. **Utilities**
   - `src/utils/yourcoach-token.ts` - JWT token generation
   - `src/utils/yourcoach-subscription.ts` - Subscription management helpers

3. **Services**
   - `src/services/yourcoach.ts` - YourCoach API service layer

4. **Components**
   - `src/components/yourcoach/YourCoachWidget.tsx` - Widget iframe component

5. **Scripts**
   - `scripts/generate-yourcoach-keys.js` - RSA key pair generation

---

## Phase 4: Environment Configuration

### Create/Update `.env.local`

```env
# YourCoach Configuration
VITE_YOURCOACH_ENV=staging
VITE_YOURCOACH_CLIENT_ID=<your_client_id_from_yourcoach>
VITE_YOURCOACH_CLIENT_SECRET=<your_client_secret_from_yourcoach>
VITE_YOURCOACH_PARTNER_ID=idunrx
VITE_YOURCOACH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n<entire private key content>\n-----END PRIVATE KEY-----
```

**Note**: When adding the private key:
- Use the full content from `keys/yourcoach.private.pem`
- Preserve the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Replace actual newlines with `\n` if needed (depending on your environment)

---

## Phase 5: Integration in Your Application

### Basic Usage

#### 1. Register/Login a User (API Approach)

```typescript
import { intelligentUserLogin } from '@/utils/yourcoach-subscription';

const handleYourCoachAuth = async (userId: number, userData) => {
  const result = await intelligentUserLogin(userId, {
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    phone: userData.phone,
    state: userData.state,
    zipcode: userData.zipcode,
    dateOfBirth: userData.dateOfBirth,
    gender: userData.gender,
  });

  if (result.success) {
    console.log(`User ${result.action === 'login' ? 'logged in' : 'registered'}`);
  } else {
    console.error('Error:', result.error);
  }
};
```

#### 2. Embed Widget (iframe Approach)

```typescript
import { YourCoachWidget } from '@/components/yourcoach/YourCoachWidget';
import { generateYourCoachToken } from '@/utils/yourcoach-token';

export function YourCoachPage() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Generate token for current user
    generateYourCoachToken(currentUserId).then(setToken);
  }, []);

  return (
    <YourCoachWidget
      action="SIGNUP"
      token={token}
      onAuthSuccess={() => console.log('Success!')}
      onAuthError={(error) => console.error('Error:', error)}
      onTermsDeclined={() => console.log('Terms declined')}
    />
  );
}
```

#### 3. Handle Subscription Cancellation

```typescript
import { cancelUserSubscription, handleFailedPayment } from '@/utils/yourcoach-subscription';

// On subscription cancel
await cancelUserSubscription(userId, 'subscription_canceled', 'User cancelled');

// On failed payment
await handleFailedPayment(userId, 'Payment method declined');
```

---

## Phase 6: Testing Checklist

### Local Testing

- [ ] RSA key pair generated successfully
- [ ] Environment variables configured
- [ ] `jose` library installed
- [ ] TypeScript compilation works without errors
- [ ] Widget component renders without errors
- [ ] JWT token generation works
- [ ] API calls can be made (test in development console)

### Integration Testing (with YourCoach Staging)

- [ ] SIGNUP flow works on staging environment
- [ ] LOGIN flow works on staging environment
- [ ] User fallback (try LOGIN → fallback to SIGNUP) works
- [ ] Widget events are received and handled correctly
- [ ] TERMS_DECLINED event is handled
- [ ] AUTH_ERROR event is handled
- [ ] AUTH_SUCCESS event is handled
- [ ] Subscription cancellation works
- [ ] Status check works
- [ ] Profile update works

### Pre-Production Testing

- [ ] All tests pass on staging environment
- [ ] QA team has completed end-to-end testing
- [ ] No console errors or warnings
- [ ] All error scenarios handled gracefully
- [ ] Performance is acceptable
- [ ] Mobile responsiveness tested (if applicable)

---

## Phase 7: Production Deployment

### Pre-Deployment Checklist

- [ ] All staging tests completed successfully
- [ ] YourCoach team confirms readiness
- [ ] Get production client credentials from YourCoach
- [ ] Generate production RSA keys (or use same keys)
- [ ] Update environment variables for production
- [ ] Test in production environment
- [ ] Inform YourCoach team of production go-live date
- [ ] Have incident response plan ready

### Deployment Steps

1. Update environment variables for production:
   ```env
   VITE_YOURCOACH_ENV=production
   VITE_YOURCOACH_CLIENT_ID=<production_client_id>
   VITE_YOURCOACH_CLIENT_SECRET=<production_client_secret>
   ```

2. Deploy application

3. Verify connectivity with production YourCoach environment

4. Monitor for errors and issues

---

## Quick Reference

### API Endpoints

- **Staging**: `https://api.rc.yourcoach.health`
- **Production**: `https://api.yourcoach.health`

### Widget URLs

- **Staging**: `https://widget.rc.yourcoach.health`
- **Production**: `https://widget.yourcoach.health`

### Key Methods

| Function | Purpose |
|----------|---------|
| `generateYourCoachToken(userId)` | Create JWT token |
| `intelligentUserLogin(userId, demographics, additionalData)` | Smart registration/login |
| `cancelUserSubscription(userId, reason)` | Cancel subscription |
| `restartUserSubscription(userId, reason)` | Restart subscription |
| `getUserProgramStatus(userId)` | Check program status |
| `YourCoachWidget` | Embed widget in UI |

### Environment Variables Summary

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_YOURCOACH_ENV` | `staging` | Yes |
| `VITE_YOURCOACH_CLIENT_ID` | `client_123` | Yes |
| `VITE_YOURCOACH_CLIENT_SECRET` | `secret_xyz` | Yes |
| `VITE_YOURCOACH_PARTNER_ID` | `idunrx` | Yes |
| `VITE_YOURCOACH_PRIVATE_KEY` | `-----BEGIN...` | Yes |
| `VITE_YOURCOACH_APP_ID` | `app_456` | No |
| `VITE_YOURCOACH_POPULATION_IDS` | `dei_ppl,ppl2` | No |

---

## Troubleshooting

### "Client credentials not configured"

- [ ] Check that `VITE_YOURCOACH_CLIENT_ID` is set in `.env.local`
- [ ] Check that `VITE_YOURCOACH_CLIENT_SECRET` is set in `.env.local`
- [ ] Restart dev server after updating environment variables

### "Private key not configured"

- [ ] Check that `VITE_YOURCOACH_PRIVATE_KEY` is set in `.env.local`
- [ ] Verify key includes `-----BEGIN PRIVATE KEY-----` header
- [ ] Verify key includes `-----END PRIVATE KEY-----` footer

### Widget not loading

- [ ] Check browser console for CORS errors
- [ ] Verify domain is whitelisted with YourCoach
- [ ] Check that widget URL is correct for environment
- [ ] Verify JWT token is valid

### "USER_DOES_NOT_EXIST" error on LOGIN

- [ ] This is expected for new users
- [ ] Use `intelligentUserLogin()` which handles this automatically
- [ ] Or catch the error and fallback to SIGNUP

### API Response Errors

- [ ] Check that API endpoint is correct for environment
- [ ] Verify credentials are correct
- [ ] Check that JWT token is valid and not expired
- [ ] Review error code in YourCoach documentation

---

## Support Contacts

- **YourCoach Support**: [To be provided]
- **YourCoach Staging**: https://widget.rc.yourcoach.health
- **YourCoach Production**: https://widget.yourcoach.health
- **Documentation**: See `YourCoach Technical Documentation (1).md`

---

## Next Steps

1. ✅ **Generate RSA Keys** (Phase 1)
2. ⏳ **Send Public Key & Domain Info to YourCoach** (Phase 2)
3. ⏳ **Receive Client Credentials** (Phase 2)
4. ⏳ **Install Dependencies** (Phase 3)
5. ⏳ **Configure Environment** (Phase 4)
6. ⏳ **Integrate into Application** (Phase 5)
7. ⏳ **Run Tests** (Phase 6)
8. ⏳ **Deploy to Production** (Phase 7)
