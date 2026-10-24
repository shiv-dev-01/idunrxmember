# YourCoach Integration: Quick Start Guide

This is a quick reference guide for developers integrating YourCoach into iDunRx.

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install jose
```

### 2. Generate Keys
```bash
node scripts/generate-yourcoach-keys.js
```

### 3. Configure Environment
Copy `.env.yourcoach.example` to `.env.local` and fill in:
```env
VITE_YOURCOACH_CLIENT_ID=<from YourCoach>
VITE_YOURCOACH_CLIENT_SECRET=<from YourCoach>
VITE_YOURCOACH_PRIVATE_KEY=<from keys/yourcoach.private.pem>
```

### 4. Use in Your Code

#### Generate JWT Token
```typescript
import { generateYourCoachToken } from '@/utils/yourcoach-token';

const token = await generateYourCoachToken(userId);
```

#### Register/Login User
```typescript
import { intelligentUserLogin } from '@/utils/yourcoach-subscription';

const result = await intelligentUserLogin(userId, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  gender: 'male',
  dateOfBirth: '1990-01-15',
  state: 'CA',
  zipcode: '90210',
  phone: '+1234567890',
});
```

#### Embed Widget
```typescript
import { YourCoachWidget } from '@/components/yourcoach/YourCoachWidget';

<YourCoachWidget
  action="SIGNUP"
  token={jwtToken}
  onAuthSuccess={() => console.log('✅ Success!')}
  onAuthError={(error) => console.error('❌ Error:', error)}
  onTermsDeclined={() => console.log('📋 Terms declined')}
/>
```

#### Handle Subscription Events
```typescript
import { cancelUserSubscription, restartUserSubscription } from '@/utils/yourcoach-subscription';

// Cancel subscription
await cancelUserSubscription(userId, 'subscription_canceled');

// Restart subscription
await restartUserSubscription(userId, 'subscription_restarted');

// Handle failed payment
await handleFailedPayment(userId);

// Handle refund
await handleRefund(userId);
```

#### Use the Hook
```typescript
import { useYourCoach } from '@/hooks/useYourCoach';

function MyComponent() {
  const { smartLogin, cancel, isLoading, error } = useYourCoach();

  const handleLogin = async () => {
    const result = await smartLogin(userId, userDemographics);
    if (result.success) {
      console.log(`User ${result.action}ed successfully`);
    }
  };

  return (
    <div>
      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login with YourCoach'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## Common Tasks

### Register a New User
```typescript
import { registerUserWithYourCoach } from '@/utils/yourcoach-subscription';

const result = await registerUserWithYourCoach(
  userId,
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    gender: 'female',
  },
  [
    { question: 'How ready are you?', answer: 'Very ready' }
  ]
);

if (result.success) {
  console.log('✅ User registered');
} else {
  console.error('❌ Registration failed:', result.error);
}
```

### Check User's Program Status
```typescript
import { getUserProgramStatus } from '@/utils/yourcoach-subscription';

const result = await getUserProgramStatus(userId);
if (result.status) {
  console.log('Program status:', result.status);
} else {
  console.error('Error:', result.error);
}
```

### Cancel a Subscription
```typescript
import { cancelUserSubscription } from '@/utils/yourcoach-subscription';

// Simple cancellation
await cancelUserSubscription(userId, 'subscription_canceled', 'User requested');

// Failed payment
await cancelUserSubscription(userId, 'failed_payment', 'Payment declined');

// Refund
await handleRefund(userId);

// Fraud detected
await handleFraudDetected(userId);

// Account deleted
await handleAccountDeletion(userId);
```

### Stop Renewal (Keep Current Access)
```typescript
import { stopSubscriptionRenewal } from '@/utils/yourcoach-subscription';

await stopSubscriptionRenewal(userId, 'subscription_canceled');
```

### Update User Profile
```typescript
import { updateUserProfile } from '@/services/yourcoach';

const token = await generateYourCoachToken(userId);
await updateUserProfile(token, {
  firstName: 'John',
  email: 'newemail@example.com',
  phone: '+1987654321',
});
```

---

## API Methods Reference

### Token Generation
```typescript
generateYourCoachToken(userId, expirationTime?)
// Returns: Promise<string> - JWT token
```

### User Authentication
```typescript
registerUserWithYourCoach(userId, demographics, additionalData?)
loginUserWithYourCoach(userId)
intelligentUserLogin(userId, demographics, additionalData?)
// Returns: Promise<{ success: boolean; error?: string }>
```

### Subscription Management
```typescript
cancelUserSubscription(userId, reason?, description?)
restartUserSubscription(userId, reason?, description?)
stopSubscriptionRenewal(userId, reason?)
handleFailedPayment(userId, description?)
handleRefund(userId, description?)
handleFraudDetected(userId, description?)
handleAccountDeletion(userId)
// Returns: Promise<{ success: boolean; error?: string }>
```

### Status Check
```typescript
getUserProgramStatus(userId)
// Returns: Promise<{ status?: string; error?: string }>
```

### Widget Component
```typescript
<YourCoachWidget
  action="SIGNUP" | "LOGIN"
  token={string}
  onAuthSuccess={() => void}
  onAuthError={(error) => void}
  onTermsDeclined={() => void}
  className?={string}
  style?={CSSProperties}
/>
```

### Hook
```typescript
const {
  isLoading: boolean,
  error: string | null,
  generateToken: (userId) => Promise<string>,
  register: (userId, demographics, additionalData?) => Promise,
  login: (userId) => Promise,
  smartLogin: (userId, demographics, additionalData?) => Promise,
  checkStatus: (userId) => Promise,
  cancel: (userId, reason?, description?) => Promise,
  restart: (userId, reason?, description?) => Promise,
  stopRenewal: (userId, reason?) => Promise,
  clearError: () => void,
} = useYourCoach();
```

---

## Configuration

### Available Environment Variables

```env
# Environment: staging | production | development
VITE_YOURCOACH_ENV=staging

# Credentials (from YourCoach)
VITE_YOURCOACH_CLIENT_ID=client_id
VITE_YOURCOACH_CLIENT_SECRET=client_secret

# Partner ID
VITE_YOURCOACH_PARTNER_ID=idunrx

# Optional: App ID for multi-app deployments
VITE_YOURCOACH_APP_ID=app_id

# Optional: Population IDs (comma-separated)
VITE_YOURCOACH_POPULATION_IDS=dei_ppl,population2

# Private key for JWT signing
VITE_YOURCOACH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

### Change Environment
```typescript
import { YOURCOACH_CONFIG } from '@/config/yourcoach';

// Check current environment
console.log(YOURCOACH_CONFIG.currentEnvironment);

// Get widget URL
const widgetUrl = YOURCOACH_CONFIG.getWidgetUrl();

// Get API URL
const apiUrl = YOURCOACH_CONFIG.getApiUrl();
```

---

## Error Handling

### Handle YourCoach Errors
```typescript
import { handleYourCoachError, isUserNotFoundError } from '@/services/yourcoach';

try {
  await loginUserWithYourCoach(userId);
} catch (error) {
  const { code, message } = handleYourCoachError(error);
  
  if (isUserNotFoundError(error)) {
    console.log('User not found, proceed with registration');
  } else {
    console.error(`${code}: ${message}`);
  }
}
```

### Validate Configuration
```typescript
import { validateYourCoachConfig } from '@/config/yourcoach';

const { isValid, errors } = validateYourCoachConfig();

if (!isValid) {
  console.error('YourCoach configuration errors:', errors);
}
```

---

## Testing

### Test JWT Token Generation
```typescript
import { generateYourCoachToken, decodeYourCoachTokenPayload } from '@/utils/yourcoach-token';

const token = await generateYourCoachToken('user123');
const payload = decodeYourCoachTokenPayload(token);

console.log('Token payload:', payload);
// { user_id: 'user123', iat: ..., exp: ..., iss: 'idunrx' }
```

### Test API Connectivity
```typescript
import { checkUserStatus } from '@/services/yourcoach';

const token = await generateYourCoachToken('test_user');
const response = await checkUserStatus(token);

console.log('API Response:', response);
```

### Test Widget
1. Create a component with `<YourCoachWidget />`
2. Check browser console for any errors
3. Verify postMessage events are received
4. Test all event handlers (SIGNUP, LOGIN, TERMS_DECLINED, AUTH_ERROR, AUTH_SUCCESS)

---

## Troubleshooting

### "Client credentials not configured"
- Verify `VITE_YOURCOACH_CLIENT_ID` and `VITE_YOURCOACH_CLIENT_SECRET` in `.env.local`
- Restart dev server

### "Private key not configured"
- Verify `VITE_YOURCOACH_PRIVATE_KEY` in `.env.local`
- Key should start with `-----BEGIN PRIVATE KEY-----`

### Widget not loading
- Check browser console for CORS errors
- Verify domain is whitelisted with YourCoach
- Check that `VITE_YOURCOACH_ENV` is correct (staging or production)

### "USER_DOES_NOT_EXIST" on login
- This is expected for new users
- Use `intelligentUserLogin()` which handles this automatically

### API errors
- Check `VITE_YOURCOACH_CLIENT_ID` and `VITE_YOURCOACH_CLIENT_SECRET` are correct
- Verify JWT token is valid
- Check API endpoint in config matches your environment

---

## Complete Example

```typescript
import { useYourCoach } from '@/hooks/useYourCoach';
import { YourCoachWidget } from '@/components/yourcoach/YourCoachWidget';
import { generateYourCoachToken } from '@/utils/yourcoach-token';
import { useState, useEffect } from 'react';

export function YourCoachIntegrationPage({ userId, userData }) {
  const [token, setToken] = useState<string>('');
  const [action, setAction] = useState<'SIGNUP' | 'LOGIN'>('LOGIN');
  const { smartLogin, isLoading } = useYourCoach();

  // Generate token on mount
  useEffect(() => {
    generateYourCoachToken(userId).then(setToken);
  }, [userId]);

  // Handle direct API registration
  const handleDirectRegistration = async () => {
    const result = await smartLogin(userId, {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      gender: userData.gender,
      dateOfBirth: userData.dateOfBirth,
      state: userData.state,
      zipcode: userData.zipcode,
    });

    if (result.success) {
      alert(`✅ User ${result.action}ed successfully`);
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>YourCoach Integration</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Method 1: Widget (Recommended)</h2>
        <div style={{ height: '600px', border: '1px solid #ccc' }}>
          <YourCoachWidget
            action={action}
            token={token}
            onAuthSuccess={() => alert('✅ Auth successful!')}
            onAuthError={(error) => alert(`❌ Error: ${error.code}`)}
            onTermsDeclined={() => alert('📋 Terms declined')}
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <label>
            <input
              type="radio"
              value="SIGNUP"
              checked={action === 'SIGNUP'}
              onChange={(e) => setAction(e.target.value as 'SIGNUP' | 'LOGIN')}
            />
            Sign Up
          </label>
          <label>
            <input
              type="radio"
              value="LOGIN"
              checked={action === 'LOGIN'}
              onChange={(e) => setAction(e.target.value as 'SIGNUP' | 'LOGIN')}
            />
            Log In
          </label>
        </div>
      </div>

      <div>
        <h2>Method 2: Direct API Call</h2>
        <button
          onClick={handleDirectRegistration}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Loading...' : 'Register/Login User'}
        </button>
      </div>
    </div>
  );
}
```

---

## Support

- 📖 Full documentation: See `YOURCOACH_INTEGRATION.md`
- 🔗 YourCoach docs: See `YourCoach Technical Documentation (1).md`
- ❓ Questions: Check error messages and logs in browser console

**Happy integrating! 🚀**
