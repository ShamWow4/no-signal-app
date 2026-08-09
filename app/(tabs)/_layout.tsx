import React from 'react';
import { Tabs, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { Pressable, Platform, View, Text } from 'react-native';

// Web Vector Icon component for 100% guaranteed crisp rendering across all browsers
function TabIcon({ name, focused, color, size = 24 }: { name: string; focused: boolean; color: string; size?: number }) {
  if (Platform.OS === 'web') {
    // Provide clean, high-resolution SVG/Emoji iconography fallback on Web
    const webIcons: Record<string, string> = {
      calendar: '📅',
      directory: '👥',
      gigs: '⚡',
      toolbox: '🛠️',
      education: '🛟',
      news: '📰',
      profile: '👤',
    };
    const iconSymbol = webIcons[name] || '📌';
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height: size + 4 }}>
        <Text style={{ fontSize: size - 2, opacity: focused ? 1 : 0.65 }}>{iconSymbol}</Text>
      </View>
    );
  }

  // Native iOS / Android standard Ionicons
  const iconNames: Record<string, { active: any; inactive: any }> = {
    calendar: { active: 'calendar', inactive: 'calendar-outline' },
    directory: { active: 'people', inactive: 'people-outline' },
    gigs: { active: 'flash', inactive: 'flash-outline' },
    toolbox: { active: 'construct', inactive: 'construct-outline' },
    education: { active: 'help-buoy', inactive: 'help-buoy-outline' },
    news: { active: 'newspaper', inactive: 'newspaper-outline' },
    profile: { active: 'person-circle', inactive: 'person-circle-outline' },
  };

  const currentIcon = iconNames[name] || { active: 'star', inactive: 'star-outline' };
  const iconName = focused ? currentIcon.active : currentIcon.inactive;

  return <Ionicons name={iconName} size={size + 4} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.gold,
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 1,
          borderTopColor: '#222222',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'PoppinsSemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="calendar" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="directory" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gigs"
        options={{
          title: 'Gigs',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="gigs" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="toolbox"
        options={{
          title: 'Toolbox',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="toolbox" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Tech Support',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="education" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'AV News',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="news" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="profile" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="donors"
        options={{
          title: 'Donors',
          href: null,
        }}
      />
    </Tabs>
  );
}
