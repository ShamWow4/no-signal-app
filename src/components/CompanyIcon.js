import React from 'react';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export const getSourceLogoUrl = (src, website = null) => {
  if (!src && !website) return null;
  let domain = '';
  
  if (website) {
    let clean = website.toLowerCase().trim();
    clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '');
    domain = clean.split('/')[0];
  } else {
    let s = src.toLowerCase().trim();
    if (s.includes('avnetwork')) domain = 'avnetwork.com';
    else if (s.includes('commercialintegrator')) domain = 'commercialintegrator.com';
    else if (s.includes('mccno')) domain = 'mccno.com';
    else if (s.includes('http://') || s.includes('https://') || s.includes('www.')) {
      const clean = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
      domain = clean.split('/')[0];
    } else {
      domain = s.replace(/\s+/g, '') + '.com';
    }
  }
  
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  return null;
};

export default function CompanyIcon({ name, website, size = 14, fallbackIcon = 'business-outline', style }) {
  const url = getSourceLogoUrl(name, website);
  if (url) {
    return (
      <Image 
        source={{ uri: url }} 
        style={[{ width: size, height: size, borderRadius: 2 }, style]} 
      />
    );
  }
  return (
    <Ionicons 
      name={fallbackIcon} 
      size={size} 
      color={Colors.light.gold} 
      style={style} 
    />
  );
}
