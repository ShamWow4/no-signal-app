import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Link, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If user landed on legacy routes like /contact, /contact.html, /about, /volunteer, /home
    // automatically redirect to main app tabs on web/mobile
    const lowerPath = (pathname || '').toLowerCase();
    if (
      lowerPath.includes('contact') || 
      lowerPath.includes('about') || 
      lowerPath.includes('volunteer') || 
      lowerPath.includes('home')
    ) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, router]);

  return (
    <View style={styles.container}>
      <Ionicons name="compass-outline" size={64} color={Colors.light.gold} style={{ marginBottom: 16 }} />
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.subtitle}>
        The page you looking for doesn&apos;t exist or has moved.
      </Text>
      <Link href="/(tabs)" replace style={styles.button}>
        <Text style={styles.buttonText}>Return to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 24,
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.light.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    color: '#000',
  },
});
