import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import type { Coordinates } from '../types';
import { logger } from '../logger';

export async function getCoordinates(): Promise<Coordinates | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (error) {
    logger.warn('location unavailable', error);
    return null;
  }
}

export async function getLocationPermissionStatus(): Promise<string> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status;
  } catch {
    return 'undetermined';
  }
}

export async function openMaps(address: string): Promise<void> {
  const query = encodeURIComponent(address);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://maps.google.com/?q=${query}`,
  });
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch (error) {
    logger.warn('maps unavailable', error);
  }
}

export async function callPhone(phone: string): Promise<void> {
  const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  try {
    await Linking.openURL(url);
  } catch (error) {
    logger.warn('dialer unavailable', error);
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    logger.warn('settings unavailable', error);
  }
}
