import React from 'react';
import { Stack } from 'expo-router';
import SavedItemsScreen from '../src/screens/SavedItemsScreen';

export default function SavedItemsRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Saved Items',
          headerBackTitle: 'Profile',
          headerStyle: { backgroundColor: '#1A1A1A' },
          headerTintColor: '#D3A625',
          headerTitleStyle: { fontFamily: 'PoppinsSemiBold' }
        }} 
      />
      <SavedItemsScreen />
    </>
  );
}
