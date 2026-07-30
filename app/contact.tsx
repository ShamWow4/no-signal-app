import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail" size={56} color={Colors.light.gold} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Contact NOLA Visual Arts & AV Academy</Text>
        <Text style={styles.subtitle}>Empowering the New Orleans audio/visual industry through education and mentorship.</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:Tech-Support@Nolavisualarts.org')}>
            <Ionicons name="mail-outline" size={20} color={Colors.light.gold} style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>Tech-Support@Nolavisualarts.org</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('tel:5048120521')}>
            <Ionicons name="call-outline" size={20} color={Colors.light.gold} style={{ marginRight: 12 }} />
            <Text style={styles.linkText}>(504) 812-0521</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.homeBtnText}>Go to App Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 22,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    marginBottom: 24,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontFamily: 'Poppins',
    fontSize: 15,
    color: Colors.light.gold,
  },
  homeBtn: {
    backgroundColor: Colors.light.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  homeBtnText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    color: '#000',
  },
});
