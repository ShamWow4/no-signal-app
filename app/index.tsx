import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
 
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
