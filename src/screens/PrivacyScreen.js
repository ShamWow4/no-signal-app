import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.gold} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleLight}>PRIVACY</Text>
              <Text style={styles.headerTitleBold}>POLICY</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.effectiveDate}>Effective Date: August 6, 2026</Text>
          
          <Text style={styles.paragraph}>
            Welcome to <Text style={styles.boldText}>No Signal</Text> by NOLA Visual Arts & AV Academy (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and handling your personal information responsibly.
          </Text>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.light.gold} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            </View>
            <Text style={styles.paragraph}>
              • <Text style={styles.boldText}>Account Email Address:</Text> When you register or sign in to No Signal, we collect your email address primarily to authenticate your account and securely save your bookmarked gigs, events, and courses.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.boldText}>Device & Notification Tokens:</Text> If enabled, we store anonymous push notification tokens to send relevant gig alerts, industry announcements, and app updates.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="lock-closed" size={18} color={Colors.light.gold} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
            </View>
            <Text style={styles.paragraph}>
              We use your information solely to provide, support, and improve the services offered within No Signal. Specifically:
            </Text>
            <Text style={styles.bulletPoint}>• Authenticating user identity and protecting account security.</Text>
            <Text style={styles.bulletPoint}>• Syncing saved gigs, events, and education modules across your devices.</Text>
            <Text style={styles.bulletPoint}>• Delivering push notifications for upcoming gig alerts and updates.</Text>
          </View>

          <View style={styles.highlightSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="heart" size={18} color="#FF3B30" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>3. We Do NOT Sell Your Data</Text>
            </View>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>We do NOT sell, rent, trade, or monetize your personal information or email address to third parties or advertisers.</Text> Your data is used exclusively to facilitate your app experience and professional AV directory interactions.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="cloud-upload-outline" size={18} color={Colors.light.gold} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
            </View>
            <Text style={styles.paragraph}>
              Your information is stored securely utilizing Google Firebase infrastructure. We employ industry-standard encryption protocols during transit and storage to guard against unauthorized access, disclosure, or alteration.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="mail" size={18} color={Colors.light.gold} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>5. Contact Us</Text>
            </View>
            <Text style={styles.paragraph}>
              If you have any questions, concerns, or requests regarding your data or this Privacy Policy, please reach out to us:
            </Text>
            <Text style={styles.bulletPoint}>• Email: Tech-Support@Nolavisualarts.org</Text>
            <Text style={styles.bulletPoint}>• Phone: (504) 812-0521</Text>
            <Text style={styles.bulletPoint}>• Organization: NOLA Visual Arts & AV Academy</Text>
          </View>

          <TouchableOpacity 
            style={styles.homeBtn} 
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.homeBtnText}>Return to App Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  safeHeader: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleLight: {
    fontSize: 16,
    fontFamily: 'Cinzel',
    color: '#aaa',
    letterSpacing: 4,
    marginBottom: -4,
  },
  headerTitleBold: {
    fontSize: 26,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
  },
  effectiveDate: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    color: Colors.light.gold,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paragraph: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    color: Colors.light.text,
    fontFamily: 'PoppinsSemiBold',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  highlightSection: {
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    color: Colors.light.gold,
  },
  bulletPoint: {
    fontFamily: 'OpenSans',
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginLeft: 8,
    marginBottom: 4,
  },
  homeBtn: {
    backgroundColor: Colors.light.gold,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  homeBtnText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
    color: '#000000',
  },
});
