/**
 * YourCoach Widget Component
 *
 * Embeds the YourCoach widget via iframe and handles auth via postMessage only
 * (no direct browser calls to the YourCoach API).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { getYourCoachWidgetUrl, YOURCOACH_CONFIG } from '../../config/yourcoach';
import type {
  YourCoachWidgetPayload,
  YourCoachWidgetEvent,
  YourCoachDemographics,
  YourCoachAdditionalData,
} from '../../types/yourcoach';
import { toE164 } from '../../utils/yourcoach-phone';

export interface YourCoachWidgetAuthConfig {
  partnerId?: string;
  externalOfferId?: string;
  demographics?: YourCoachDemographics;
  additionalData?: YourCoachAdditionalData[];
}

interface YourCoachWidgetProps {
  action: 'SIGNUP' | 'LOGIN';
  token: string;
  authConfig?: YourCoachWidgetAuthConfig;
  onTermsDeclined?: () => void;
  onAuthError?: (error: { code: string; message: string }) => void;
  onAuthSuccess?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const YourCoachWidget: React.FC<YourCoachWidgetProps> = ({
  action,
  token,
  authConfig,
  onTermsDeclined,
  onAuthError,
  onAuthSuccess,
  className = '',
  style,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const WIDGET_URL = getYourCoachWidgetUrl();

  const sendMessageToWidget = useCallback(
    (data: YourCoachWidgetPayload) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(data, WIDGET_URL);
      }
    },
    [WIDGET_URL]
  );

  const initializeWidget = useCallback(() => {
    if (!iframeRef.current) return;

    setTimeout(() => {
      const basePayload = {
        api: 'core' as const,
        clientId: YOURCOACH_CONFIG.clientId,
        clientSecret: YOURCOACH_CONFIG.clientSecret,
        token,
        appId: YOURCOACH_CONFIG.appId,
        ...(authConfig?.externalOfferId && {
          externalOfferId: authConfig.externalOfferId,
        }),
      };

      let widgetPayload: YourCoachWidgetPayload;

      if (action === 'SIGNUP' && authConfig?.demographics) {
        const { demographics } = authConfig;
        widgetPayload = {
          type: 'SIGNUP',
          payload: {
            ...basePayload,
            userInfo: {
              partnerId: authConfig.partnerId ?? YOURCOACH_CONFIG.partnerId,
              populationIds: YOURCOACH_CONFIG.populationIds.length
                ? YOURCOACH_CONFIG.populationIds
                : undefined,
              demographics: {
                firstName: demographics.firstName,
                lastName: demographics.lastName,
                email: demographics.email,
                phone: toE164(demographics.phone) ?? undefined,
                state: demographics.state,
                zipcode: demographics.zipcode,
                dateOfBirth: demographics.dateOfBirth,
                gender: demographics.gender ?? null,
              },
              additionalData:
                authConfig.additionalData ??
                YOURCOACH_CONFIG.onboardingQuestions.map((q) => ({
                  question: q.question,
                  answer: q.answer,
                })),
            },
          },
        };
      } else {
        widgetPayload = {
          type: 'LOGIN',
          payload: basePayload,
        };
      }

      sendMessageToWidget(widgetPayload);
    }, 300);
  }, [action, token, authConfig, sendMessageToWidget]);

  const handleWidgetMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== WIDGET_URL) {
        return;
      }

      const { type, payload: eventPayload } = event.data as YourCoachWidgetEvent;

      switch (type) {
        case 'TERMS_DECLINED':
          onTermsDeclined?.();
          break;

        case 'AUTH_ERROR':
          onAuthError?.(
            eventPayload?.error ?? { code: 'UNKNOWN', message: 'Unknown error' }
          );
          break;

        case 'AUTH_SUCCESS':
          onAuthSuccess?.();
          break;

        default:
          break;
      }
    },
    [WIDGET_URL, onTermsDeclined, onAuthError, onAuthSuccess]
  );

  useEffect(() => {
    messageListenerRef.current = handleWidgetMessage;
    window.addEventListener('message', messageListenerRef.current);

    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, [handleWidgetMessage]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setTimeout(initializeWidget, 500);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [initializeWidget]);

  return (
    <iframe
      ref={iframeRef}
      src={WIDGET_URL}
      title="YourCoach Widget"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '700px',
        border: 'none',
        display: 'block',
        ...style,
      }}
      allow="camera;microphone;fullscreen;compute-pressure"
    />
  );
};

export default YourCoachWidget;
