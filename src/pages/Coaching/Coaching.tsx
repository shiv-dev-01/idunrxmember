import { useState, useEffect, useMemo, useRef } from 'react';
import { useCartProducts } from '../../hooks/useCartProducts';
import { YourCoachWidget } from '../../components/yourcoach/YourCoachWidget';
import { validateYourCoachConfig } from '../../config/yourcoach';
import { fetchYourCoachSessionToken } from '../../services/api/yourcoach';
import { getYourCoachOfferParams } from '../../utils/yourcoach-offer';
import { storage } from '../../utils/storage';
import type { YourCoachDemographics } from '../../types/yourcoach';

function isUserNotFoundWidgetError(error: { code: string; message: string }): boolean {
  return (
    error.code === 'USER_DOES_NOT_EXIST' ||
    error.message.toLowerCase().includes('user does not exist')
  );
}

export function Coaching() {
  const userData = storage.getUserData();
  const memberId = userData?.userId;
  const { products, isLoading: productsLoading } = useCartProducts();

  const [token, setToken] = useState<string | null>(null);
  const sessionTokenFetchedFor = useRef<number | null>(null);
  const sessionTokenFetchInFlight = useRef(false);
  const [widgetAction, setWidgetAction] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [widgetKey, setWidgetKey] = useState(0);
  const [authStatus, setAuthStatus] = useState<'idle' | 'ready' | 'success' | 'error'>('idle');
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('Initializing...');
  const [authError, setAuthError] = useState<string | null>(null);

  const activeProduct = products[0];
  const { partnerId, externalOfferId } = activeProduct
    ? getYourCoachOfferParams(activeProduct)
    : { partnerId: undefined, externalOfferId: undefined };

  const demographics = useMemo((): YourCoachDemographics | undefined => {
    if (!userData) return undefined;
    return {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phoneNumber || undefined,
      gender: (userData.gender as YourCoachDemographics['gender']) || null,
    };
  }, [memberId, userData?.email, userData?.firstName, userData?.lastName, userData?.phoneNumber, userData?.gender]);

  useEffect(() => {
    const { isValid, errors } = validateYourCoachConfig();
    if (!isValid) {
      setConfigErrors(errors);
      return;
    }

    if (!memberId) {
      setStatusMsg('No user session found.');
      setAuthStatus('error');
      return;
    }

    if (productsLoading) {
      setStatusMsg('Loading your plan...');
      return;
    }

    if (
      sessionTokenFetchedFor.current === memberId ||
      sessionTokenFetchInFlight.current
    ) {
      return;
    }

    let cancelled = false;
    sessionTokenFetchInFlight.current = true;

    const run = async () => {
      setStatusMsg('Preparing coaching session...');
      try {
        const jwt = await fetchYourCoachSessionToken(memberId);
        if (cancelled) return;
        sessionTokenFetchedFor.current = memberId;
        setToken(jwt);
        setAuthStatus('ready');
        setStatusMsg('');
      } catch (e) {
        if (cancelled) return;
        setStatusMsg(`Token error: ${String(e)}`);
        setAuthStatus('error');
      } finally {
        sessionTokenFetchInFlight.current = false;
      }
    };

    run();
    return () => {
      cancelled = true;
      sessionTokenFetchInFlight.current = false;
    };  }, [productsLoading, memberId]);

  const handleAuthError = (error: { code: string; message: string }) => {
    if (widgetAction === 'LOGIN' && isUserNotFoundWidgetError(error)) {
      setWidgetAction('SIGNUP');
      setWidgetKey((k) => k + 1);
      setAuthError(null);
      return;
    }
    setAuthError(error.message || 'Authentication failed');
    setAuthStatus('error');
  };

  if (configErrors.length > 0) {
    return (
      <div className="p-6 space-y-2">
        <h2 className="text-lg font-semibold text-red-600">YourCoach configuration errors</h2>
        <ul className="list-disc list-inside text-sm text-red-500 space-y-1">
          {configErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Health Coaching</h1>
          {activeProduct && (
            <p className="text-sm text-gray-500">
              {activeProduct.product_name}
              {externalOfferId && (
                <>
                  {' '}
                  &middot; <span className="font-mono">{externalOfferId}</span>
                </>
              )}
            </p>
          )}
        </div>
        {authStatus === 'success' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Connected
          </span>
        )}
      </div>

      {statusMsg && authStatus !== 'ready' && authStatus !== 'success' && (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-8 justify-center">
          <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {statusMsg}
        </div>
      )}

      {authError && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{authError}</div>
      )}

      {token && authStatus !== 'error' && (
        <div
          className="rounded-xl overflow-hidden border border-gray-200"
          style={{ height: 'calc(100vh - 180px)', minHeight: '700px' }}
        >
          <YourCoachWidget
            key={widgetKey}
            action={widgetAction}
            token={token}
            authConfig={{
              partnerId,
              externalOfferId,
              demographics: widgetAction === 'SIGNUP' ? demographics : undefined,
            }}
            onAuthSuccess={() => {
              setAuthStatus('success');
              setAuthError(null);
            }}
            onAuthError={handleAuthError}
            onTermsDeclined={() => setAuthError('Terms were declined.')}
          />
        </div>
      )}
    </div>
  );
}
