import React, { useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';

const domainMap = {
  'pemba': 'pemba.biz',
  'production resource group': 'prg.com',
  'prg': 'prg.com',
  'encore global': 'encoreglobal.com',
  'encore': 'encoreglobal.com',
  'truconnect': 'truconnect.com',
  'rhino staging': 'rhinostaging.com',
  'mccno': 'mccno.com',
  'nomcc': 'mccno.com',
  'hilton': 'hilton.com',
  'marriott': 'marriott.com',
  'hyatt': 'hyatt.com',
  'sheraton': 'sheraton.com',
  'astor crowne plaza': 'ihg.com',
  'the westin': 'westin.com'
};

export default function CompanyLogo({ companyName, fallbackInitials, style }) {
  const [hasError, setHasError] = useState(false);
  const normalizedKey = (companyName || '').toLowerCase().trim();
  const domain = domainMap[normalizedKey] || null;

  if (domain && !hasError) {
    const logoUrl = `https://cdn.brandfetch.io/${domain}/w/400/h/400?c=optional`;
    return (
      <Image
        source={{ uri: logoUrl }}
        style={[styles.logo, style]}
        resizeMode="contain"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View style={[styles.fallbackBadge, style]}>
      <Text style={styles.fallbackText}>{fallbackInitials || 'AV'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  },
  fallbackBadge: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#0A0A0A',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
