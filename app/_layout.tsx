import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Cinzel_400Regular, Cinzel_600SemiBold } from '@expo-google-fonts/cinzel';
import { Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { Platform, Linking } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    try {
      if (projectId) {
         token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
         token = (await Notifications.getExpoPushTokenAsync()).data;
      }
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.log('Error getting push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cinzel: Cinzel_400Regular,
    CinzelSemiBold: Cinzel_600SemiBold,
    Poppins: Poppins_400Regular,
    PoppinsSemiBold: Poppins_600SemiBold,
    OpenSans: OpenSans_400Regular,
    OpenSansSemiBold: OpenSans_600SemiBold,
  });

  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();

      // Register for push notifications on app load
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          // Save the token to Firebase
          setDoc(doc(db, 'push_tokens', token), {
            token: token,
            platform: Platform.OS,
            updatedAt: new Date().toISOString(),
          }).catch(err => console.error('Error saving push token to Firebase:', err));
        }
      });

      // Handle notification tapped
      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data && data.apply_link) {
          Linking.openURL(data.apply_link).catch(err => console.error("Error opening link from notification:", err));
        }
      });

      return () => {
        responseListener.remove();
      };
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
