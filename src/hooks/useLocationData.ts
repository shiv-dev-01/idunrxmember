import { useState, useEffect } from 'react';
import { getStates, getCities, type State } from '../services/locationApi';

export function useLocationData(selectedState?: string) {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Load states on mount
  useEffect(() => {
    let mounted = true;

    const loadStates = async () => {
      try {
        setIsLoadingStates(true);
        const data = await getStates();
        if (mounted) {
          setStates(data);
        }
      } catch (error) {
        console.error('Failed to load states:', error);
        if (mounted) {
          setStates([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingStates(false);
        }
      }
    };

    loadStates();

    return () => {
      mounted = false;
    };
  }, []);

  // Load cities when state changes
  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }

      try {
        setIsLoadingCities(true);
        const data = await getCities(selectedState);
        if (mounted) {
          setCities(data);
        }
      } catch (error) {
        console.error('Failed to load cities:', error);
        if (mounted) {
          setCities([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingCities(false);
        }
      }
    };

    loadCities();

    return () => {
      mounted = false;
    };
  }, [selectedState]);

  return {
    states,
    cities,
    isLoadingStates,
    isLoadingCities
  };
}