import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const DONATION_TIERS = [
  {
    id: '1',
    amount: '$25',
    name: 'Supporter',
    description: 'Provides essential tools, cables, and expendables for student workshops.',
    featured: false,
  },
  {
    id: '2',
    amount: '$50',
    name: 'Contributor',
    description: 'Subsidizes hands-on technical training for an aspiring local stagehand.',
    featured: true,
  },
  {
    id: '3',
    amount: '$100',
    name: 'Champion',
    description: 'Fully sponsors one student\'s AV education and industry certification.',
    featured: false,
  },
  {
    id: '4',
    amount: '$250',
    name: 'Patron',
    description: 'Underwrites our working-pro instructors to run an entire 6-week program.',
    featured: false,
  },
];

export default function DonorsScreen() {
  const handleDonate = (tier) => {
    Alert.alert(
      "Donation Pending",
      `Thank you for selecting the ${tier.name} tier (${tier.amount})! Payment integration is coming soon.`,
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SUPPORT NVA</Text>
        <Text style={styles.title}>Invest in NOLA's AV Future</Text>
        <Text style={styles.subtitle}>
          Your contribution directly funds free and low-cost training for New Orleans youth and aspiring professionals who deserve access to the AV industry.
        </Text>
      </View>

      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>Every Dollar at Work</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactItem}>
            <Ionicons name="construct-outline" size={24} color={Colors.light.gold} style={styles.impactIcon} />
            <Text style={styles.impactLabel}>Equipment & Gear</Text>
          </View>
          <View style={styles.impactItem}>
            <Ionicons name="school-outline" size={24} color={Colors.light.gold} style={styles.impactIcon} />
            <Text style={styles.impactLabel}>Student Scholarships</Text>
          </View>
        </View>
      </View>

      <View style={styles.tiersContainer}>
        <Text style={styles.sectionTitle}>Choose Your Support Level</Text>
        {DONATION_TIERS.map((tier) => (
          <View key={tier.id} style={[styles.tierCard, tier.featured && styles.tierCardFeatured]}>
            <View style={styles.tierHeader}>
              <Text style={styles.tierAmount}>{tier.amount}</Text>
              <Text style={[styles.tierName, tier.featured && styles.tierNameFeatured]}>{tier.name}</Text>
            </View>
            <Text style={styles.tierDescription}>{tier.description}</Text>
            <TouchableOpacity
              style={[styles.donateButton, tier.featured && styles.donateButtonFeatured]}
              onPress={() => handleDonate(tier)}
            >
              <Text style={[styles.donateButtonText, tier.featured && styles.donateButtonTextFeatured]}>
                Give {tier.amount}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  eyebrow: {
    color: Colors.light.gold,
    fontSize: 12,
    fontFamily: 'Poppins',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    textAlign: 'center',
    lineHeight: 24,
  },
  impactSection: {
    padding: 20,
    backgroundColor: Colors.light.backgroundElement,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  impactIcon: {
    marginBottom: 8,
  },
  impactLabel: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  tiersContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  tierCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  tierCardFeatured: {
    borderColor: Colors.light.gold,
    backgroundColor: 'rgba(211, 166, 37, 0.05)',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  tierAmount: {
    fontSize: 36,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginRight: 12,
  },
  tierName: {
    fontSize: 18,
    fontFamily: 'Cinzel',
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  tierNameFeatured: {
    color: Colors.light.gold,
  },
  tierDescription: {
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  donateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  donateButtonFeatured: {
    backgroundColor: Colors.light.gold,
  },
  donateButtonText: {
    color: Colors.light.gold,
    fontFamily: 'Poppins',
    fontSize: 16,
  },
  donateButtonTextFeatured: {
    color: Colors.light.background,
  },
});
