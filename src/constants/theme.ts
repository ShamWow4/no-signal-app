/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#ffffff',
    background: '#0a0a0a',
    backgroundElement: 'rgba(22, 22, 22, 0.8)',
    backgroundSelected: '#2a2a2a',
    textSecondary: 'rgba(255,255,255,0.7)',
    gold: '#D4AF37',
    goldBright: '#F3E5AB',
    border: 'rgba(212, 175, 55, 0.2)', // Gold tint border
    glassBackground: 'rgba(30, 30, 30, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
  },
  dark: {
    text: '#ffffff',
    background: '#0a0a0a',
    backgroundElement: 'rgba(22, 22, 22, 0.8)',
    backgroundSelected: '#2a2a2a',
    textSecondary: 'rgba(255,255,255,0.7)',
    gold: '#D4AF37',
    goldBright: '#F3E5AB',
    border: 'rgba(212, 175, 55, 0.2)',
    glassBackground: 'rgba(30, 30, 30, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Shadows = {
  glow: {
    shadowColor: Colors.light.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  }
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
