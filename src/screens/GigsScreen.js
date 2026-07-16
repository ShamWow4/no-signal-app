import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function GigsScreen() {
  const [gigsData, setGigsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const q = query(collection(db, 'av_gigs'), limit(20));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const fetchedGigs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setGigsData(fetchedGigs);
        } else {
          setGigsData([]);
        }
      } catch (error) {
        console.error("Error fetching gigs: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, []);

  const handleApply = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.headerContainer}
    >
      <Text style={styles.pageTitle}>Gig Alerts</Text>
      <Text style={styles.pageSubtitle}>Latest AV, lighting, and video opportunities in New Orleans.</Text>
      {loading && (
        <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
      )}
    </LinearGradient>
  );

  const renderGigItem = ({ item, index }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
        <TouchableOpacity 
          style={[styles.gigCard, Shadows.subtle]} 
          activeOpacity={0.7}
          onPress={() => handleApply(item['Link'])}
        >
          <View style={styles.gigCardContent}>
            <View style={styles.gigCardHeader}>
              <View style={styles.gigTypeContainer}>
                <Ionicons name="briefcase-outline" size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.gigCardType}>
                  {item['Source'] ? item['Source'].toUpperCase() : 'GIG'}
                </Text>
              </View>
            </View>
            <Text style={styles.gigCardTitle}>{item['Job Title']}</Text>
            {(item['Company'] || item['Location']) && (
              <Text style={styles.gigCardCompany}>
                {item['Company']}{item['Company'] && item['Location'] ? ' • ' : ''}{item['Location']}
              </Text>
            )}
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.9)', 'rgba(179, 139, 34, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.applyContainer, { marginTop: 16 }]}
            >
              <Text style={styles.applyText}>View & Apply</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={gigsData}
        keyExtractor={(item) => item.id}
        renderItem={renderGigItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>No gigs found right now.{'\n'}Check back later!</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  pageSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: 'OpenSans',
    marginBottom: 10,
  },
  gigCard: {
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.1)',
    elevation: 4,
  },
  gigCardContent: {
    flex: 1,
  },
  gigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gigTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gigCardType: {
    color: Colors.light.gold,
    fontSize: 11,
    fontFamily: 'PoppinsSemiBold',
    letterSpacing: 1,
  },
  gigCardDate: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'OpenSans',
  },
  gigCardTitle: {
    color: Colors.light.text,
    fontSize: 20,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 4,
  },
  gigCardCompany: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  gigSalaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(133, 187, 101, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(133, 187, 101, 0.3)',
  },
  gigCardSalary: {
    color: '#85bb65',
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
  },
  gigCardExcerpt: {
    color: '#CCC',
    fontSize: 14,
    fontFamily: 'OpenSans',
    lineHeight: 22,
    marginBottom: 16,
  },
  applyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  applyText: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
    marginRight: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: 'OpenSans',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  }
});
