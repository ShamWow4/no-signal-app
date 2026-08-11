/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#121212',
    background: '#F9F9F9',
    backgroundElement: 'rgba(240, 240, 240, 0.8)',
    backgroundSelected: '#EAEAEA',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    gold: '#D4AF37',
    goldMuted: '#A88B2A',
    goldBright: '#F3E5AB',
    border: 'rgba(212, 175, 55, 0.25)', // slightly more visible gold border on light
    glassBackground: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(0, 0, 0, 0.05)',
    cardBackground: '#FFFFFF',
    cardBorder: '#E0E0E0',
    buttonPrimary: '#D4AF37',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000', // True OLED black
    backgroundElement: 'rgba(20, 20, 20, 0.8)', // Very dark gray for elements
    backgroundSelected: '#1a1a1a',
    textSecondary: 'rgba(255, 255, 255, 0.65)',
    gold: '#E3C158', // Slightly brighter/neon gold for OLED contrast
    goldMuted: '#A88B2A',
    goldBright: '#FDF1B9',
    border: 'rgba(227, 193, 88, 0.25)', // higher contrast border
    glassBackground: 'rgba(10, 10, 10, 0.75)', // darker glass for OLED
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    cardBackground: '#0a0a0a', // Deepest gray, almost black
    cardBorder: '#222222',
    buttonPrimary: '#E3C158',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  }
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
