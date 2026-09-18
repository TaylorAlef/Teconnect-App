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

function browserCurrentPosition(options = {}) {
  if (!navigator.geolocation) {
    throw new Error('GEOLOCALIZACAO_NAO_DISPONIVEL');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      ...options,
    });
  });
}

async function capacitorCurrentPosition(options = {}) {
  const permissions = await Geolocation.checkPermissions();
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    const requested = await Geolocation.requestPermissions();
    if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
      throw new Error('PERMISSION_LOCATION_DENIED');
    }
  }

  try {
    return await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      ...options,
    });
  } catch (firstError) {
    // Some Android emulator/device configurations can fail the first
    // high-accuracy request even though fused/network location is usable.
    return Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 10000,
      ...options,
      enableHighAccuracy: false,
    }).catch((secondError) => {
      const firstMessage = firstError?.message ? String(firstError.message) : '';
      const secondMessage = secondError?.message ? String(secondError.message) : '';
      const detail = secondMessage || firstMessage || 'Localização indisponível.';
      const code = secondError?.code != null ? ' [' + String(secondError.code) + ']' : '';
      throw new Error('GEOLOCALIZACAO_FALHOU' + code + ': ' + detail);
    });
  }
}

export async function getNativeCurrentPosition(options = {}) {
  if (!Capacitor.isNativePlatform()) {
    return browserCurrentPosition(options);
  }

  try {
    return normalizeNativePosition(await capacitorCurrentPosition(options));
  } catch (nativeError) {
    // Fallback to the WebView geolocation provider. This is useful on
    // emulators where the native fused provider is available to the OS
    // but the plugin request fails transiently.
    try {
      return await browserCurrentPosition({
        timeout: 10000,
        maximumAge: 10000,
        ...options,
      });
    } catch (webError) {
      const nativeMessage = nativeError?.message ? String(nativeError.message) : 'erro nativo';
      const webMessage = webError?.message ? String(webError.message) : 'erro WebView';
      throw new Error('GPS indisponível. Nativo: ' + nativeMessage + ' | WebView: ' + webMessage);
    }
  }
}
