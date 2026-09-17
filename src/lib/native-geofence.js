import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

function normalizeNativePosition(position) {
  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
    },
  };
}

export async function getNativeCurrentPosition(options = {}) {
  if (!Capacitor.isNativePlatform()) {
    if (!navigator.geolocation) throw new Error('GEOLOCALIZACAO_NAO_DISPONIVEL');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        ...options,
      });
    });
  }

  const permissions = await Geolocation.checkPermissions();
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    const requested = await Geolocation.requestPermissions();
    if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
      throw new Error('PERMISSION_LOCATION_DENIED');
    }
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
    ...options,
  });
  return normalizeNativePosition(position);
}
