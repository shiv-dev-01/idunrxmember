import { useState, useEffect } from 'react';

interface MediaDevicesState {
  hasCamera: boolean;
  hasMicrophone: boolean;
  error: string | null;
}

export function useMediaDevices() {
  const [state, setState] = useState<MediaDevicesState>({
    hasCamera: false,
    hasMicrophone: false,
    error: null,
  });

  useEffect(() => {
    async function checkDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setState({
          hasCamera: devices.some(device => device.kind === 'videoinput'),
          hasMicrophone: devices.some(device => device.kind === 'audioinput'),
          error: null,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Unable to access media devices',
        }));
      }
    }

    checkDevices();
  }, []);

  return state;
}