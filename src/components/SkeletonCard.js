import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Colors, Shadows } from '../constants/theme';

export default function SkeletonCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1, // infinite loop
      true // reverse
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, Shadows.subtle, animatedStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.titleSkeleton} />
        <View style={styles.badgeSkeleton} />
      </View>
      <View style={styles.lineSkeleton} />
      <View style={[styles.lineSkeleton, { width: '60%' }]} />
      <View style={styles.footerRow}>
        <View style={styles.buttonSkeleton} />
        <View style={styles.buttonSkeleton} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.08)',
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleSkeleton: {
    width: '50%',
    height: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 6,
  },
  badgeSkeleton: {
    width: 60,
    height: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 10,
  },
  lineSkeleton: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 4,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  buttonSkeleton: {
    width: 80,
    height: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 16,
  },
});
