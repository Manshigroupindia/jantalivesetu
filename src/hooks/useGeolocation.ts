import { useState } from 'react';
import { LocationRecord } from '../types';

export interface UseGeolocationReturn {
  location: LocationRecord | null;
  loading: boolean;
  error: string | null;
  captureLocation: () => Promise<LocationRecord>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = (): Promise<LocationRecord> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser.';
        setError(err);
        setLoading(false);
        return reject(new Error(err));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationRecord = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date().toISOString(),
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let errorMsg = 'Failed to capture GPS location.';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. Please allow location access to proceed with Duty On/Off.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is unavailable. Please check your device GPS.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'The request to get user location timed out.';
          }
          setError(errorMsg);
          setLoading(false);
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  return { location, loading, error, captureLocation };
}
