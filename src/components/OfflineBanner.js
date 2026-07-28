import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Basic network connectivity check for React Native
    const checkConnection = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsOffline(!navigator.onLine);
        } else {
          // On mobile, attempt a fast lightweight ping to check network connectivity
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          await fetch('https://nola-visual-arts-1f3cf.firebaseapp.com/favicon.png', { 
            method: 'HEAD',
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          setIsOffline(false);
        }
      } catch (_err) {
        setIsOffline(true);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);

    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)} style={styles.container}>
      <Ionicons name="cellular-outline" size={16} color="#D4AF37" style={styles.icon} />
      <Text style={styles.text}>NO SIGNAL MODE • Saved to Offline Cache</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
