import axios from 'axios';

const api = axios.create({
  baseURL: 'https://countriesnow.space/api/v0.1/countries',
});

export interface State {
  name: string;
  state_code: string;
}

interface LocationApiResponse<T> {
  error: boolean;
  msg: string;
  data: T;
}

interface StatesResponse extends LocationApiResponse<{
  name: string;
  iso3: string;
  iso2: string;
  states: State[];
}> {}

interface CitiesResponse extends LocationApiResponse<string[]> {}

// Cache implementation with serializable data
const CACHE_PREFIX = 'location_cache_';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const getCache = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const cached = JSON.parse(item) as CacheItem<T>;
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
};

const setCache = <T>(key: string, data: T): void => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch {
    // Ignore cache errors
  }
};

export const getStates = async (): Promise<State[]> => {
  try {
    // Check cache first
    const cached = getCache<State[]>('states');
    if (cached) return cached;

    const response = await api.post<StatesResponse>('/states', {
      country: 'United States'
    });

    const states = response.data.data.states.map(state => ({
      name: state.name,
      state_code: state.state_code
    }));

    setCache('states', states);
    return states;
  } catch (error) {
    console.error('Failed to fetch states:', error);
    return [];
  }
};

export const getCities = async (state: string): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = `cities_${state}`;
    const cached = getCache<string[]>(cacheKey);
    if (cached) return cached;

    const response = await api.post<CitiesResponse>('/state/cities', {
      country: 'United States',
      state
    });

    // Ensure we only store serializable string array
    const cities = (response.data.data || []).map(city => String(city));
    setCache(cacheKey, cities);
    return cities;
  } catch (error) {
    console.error('Failed to fetch cities:', error);
    return [];
  }
};