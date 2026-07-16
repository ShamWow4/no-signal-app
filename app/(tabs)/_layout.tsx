import React from 'react';
import { Tabs, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { Pressable } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.gold,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: Colors.light.backgroundElement,
          borderTopWidth: 0,
        },
        headerStyle: {
          backgroundColor: Colors.light.backgroundElement,
        },
        headerTintColor: Colors.light.text,
        headerTitleStyle: {
          fontFamily: 'CinzelSemiBold',
        },
        headerRight: () => (
          <Link href="/donors" asChild>
            <Pressable style={{ marginRight: 15 }}>
              {({ pressed }) => (
                <Ionicons
                  name="heart"
                  size={24}
                  color={Colors.light.gold}
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gigs"
        options={{
          title: 'Gigs',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Tech Support',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'AV News',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={size} color={color} />
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
