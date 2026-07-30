import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, limit, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkeletonCard from '../components/SkeletonCard';

export default function GigsScreen() {
  const [gigsData, setGigsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [user, setUser] = useState(null);
  const [savedGigs, setSavedGigs] = useState(new Set());

  const fetchGigs = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        const cachedData = await AsyncStorage.getItem('cache_gigs');
        if (cachedData) {
          setGigsData(JSON.parse(cachedData));
          setLoading(false);
        }
      }

      const q = query(collection(db, 'av_gigs'), limit(20));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const fetchedGigs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const seenGigKeys = new Set();
        const uniqueGigs = [];
        for (const gig of fetchedGigs) {
          const normTitle = (gig['Job Title'] || gig.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const normCompany = (gig['Company'] || gig.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const key = `${normTitle}_${normCompany}`;
          if (normTitle && !seenGigKeys.has(key)) {
            seenGigKeys.add(key);
            uniqueGigs.push(gig);
          }
        }

        setGigsData(uniqueGigs);
        await AsyncStorage.setItem('cache_gigs', JSON.stringify(uniqueGigs));
      } else {
        setGigsData([]);
        await AsyncStorage.setItem('cache_gigs', JSON.stringify([]));
      }
    } catch (err) {
      console.error("Error fetching gigs:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGigs();
    
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSavedGigs(new Set(data.savedGigs || []));
          } else {
            setDoc(userDocRef, { savedGigs: [], savedEvents: [] }, { merge: true });
          }
        });
      } else {
        setSavedGigs(new Set());
        if (unsubDoc) unsubDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const toggleSaveGig = async (gigId) => {
    if (!user) return;
    const isSaved = savedGigs.has(gigId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        savedGigs: isSaved ? arrayRemove(gigId) : arrayUnion(gigId)
      });
      // The onSnapshot will automatically update local state
    } catch (err) {
      console.error("Error toggling save gig:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGigs(true);
  };

  const handleApply = (url) => {
    if (!url) return;
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    if (Platform.OS === 'web') {
      window.open(clean, '_blank');
    } else {
      Linking.openURL(clean).catch(() => {});
    }
  };

  const renderHeroGig = ({ item }) => {
    return (
      <Animated.View entering={FadeInDown.duration(500)}>
        <TouchableOpacity 
          style={[styles.heroCard, Shadows.subtle]} 
          activeOpacity={0.8}
          onPress={() => handleApply(item['Link'])}
        >
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.2)', 'rgba(0, 0, 0, 0.4)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroCardHeader}>
              <View style={styles.gigTypeContainer}>
                <Ionicons name="flame" size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.gigCardType}>HOT GIG</Text>
              </View>
              {user && (
                <TouchableOpacity onPress={() => toggleSaveGig(item.id)} style={{ padding: 4 }}>
                  <Ionicons 
                    name={savedGigs.has(item.id) ? "heart" : "heart-outline"} 
                    size={24} 
                    color={savedGigs.has(item.id) ? "#FF3B30" : Colors.light.gold} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.heroCardTitle}>{item['Job Title']}</Text>
            {(item['Company'] || item['Location']) && (
              <Text style={styles.heroCardCompany}>
                {item['Company']}{item['Company'] && item['Location'] ? ' • ' : ''}{item['Location']}
              </Text>
            )}
            <View style={[styles.applyContainer, { backgroundColor: Colors.light.gold, marginTop: 16 }]}>
              <Text style={[styles.applyText, { color: '#000' }]}>Apply Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={{ paddingBottom: 0 }}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleLight}>GIG</Text>
            <Text style={styles.headerTitleBold}>ALERTS</Text>
          </View>
          <Text style={styles.pageSubtitle}>Latest AV, lighting, and video opportunities in New Orleans.</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {['All', 'Saved', 'Full-Time', 'Freelance'].map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[styles.filterPill, activeCategory === cat && styles.filterPillActive]} 
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.filterPillText, activeCategory === cat && styles.filterPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading && (
            <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
          )}
        </SafeAreaView>
      </LinearGradient>
      {heroGig && (
        <View style={{ paddingTop: 10 }}>
          {renderHeroGig({ item: heroGig })}
        </View>
      )}
    </View>
  );

  const renderGigItem = ({ item, index }) => {
    // Basic remote or salary detection
    const isRemote = (item['Location'] || '').toLowerCase().includes('remote');
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <TouchableOpacity 
          style={[styles.gigCard, Shadows.subtle]} 
          activeOpacity={0.7}
          onPress={() => handleApply(item['Link'])}
        >
          <Image 
            source={require('../../assets/images/nola-av-logo.png.png')} 
            style={[styles.watermarkIcon, { width: 120, height: 120, opacity: 0.04, tintColor: Colors.light.gold }]} 
            resizeMode="contain"
          />
          <View style={styles.gigCardContent}>
            <View style={styles.gigCardHeader}>
              <View style={styles.gigTypeContainer}>
                <Ionicons name="briefcase-outline" size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.gigCardType}>
                  {item['Source'] ? item['Source'].toUpperCase() : 'GIG'}
                </Text>
              </View>
              {user && (
                <TouchableOpacity onPress={() => toggleSaveGig(item.id)} style={{ padding: 4 }}>
                  <Ionicons 
                    name={savedGigs.has(item.id) ? "heart" : "heart-outline"} 
                    size={22} 
                    color={savedGigs.has(item.id) ? "#FF3B30" : Colors.light.textSecondary} 
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.gigCardTitle}>{item['Job Title']}</Text>
            {(item['Company'] || item['Location']) && (
              <Text style={styles.gigCardCompany}>
                {item['Company']}{item['Company'] && item['Location'] ? ' • ' : ''}{item['Location']}
              </Text>
            )}
            
            {isRemote && (
              <View style={styles.gigSalaryBadge}>
                <Ionicons name="globe-outline" size={12} color="#85bb65" style={{marginRight: 4}}/>
                <Text style={styles.gigCardSalary}>Remote</Text>
              </View>
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

  const filteredGigs = gigsData.filter(gig => {
    if (activeCategory === 'Saved') return savedGigs.has(gig.id);
    if (activeCategory === 'Full-Time') {
      const title = (gig['Job Title'] || '').toLowerCase();
      return title.includes('full-time') || title.includes('full time');
    }
    if (activeCategory === 'Freelance') {
      const title = (gig['Job Title'] || '').toLowerCase();
      const source = (gig['Source'] || '').toLowerCase();
      return title.includes('freelance') || title.includes('contract') || source.includes('gig');
    }
    return true; // 'All'
  });

  const heroGig = activeCategory === 'All' && filteredGigs.length > 0 ? filteredGigs[0] : null;
  const remainingGigs = activeCategory === 'All' && filteredGigs.length > 0 ? filteredGigs.slice(1) : filteredGigs;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 10}}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={remainingGigs}
          keyExtractor={(item) => item.id}
          renderItem={renderGigItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
          }
          ListEmptyComponent={!loading && (
            error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color="#888" />
                <Text style={styles.emptyText}>Unable to connect.{'\n'}Please check your network and try again.</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>No gigs found right now.{'\n'}Check back later!</Text>
              </View>
            )
          )}
        />
      )}
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
  headerGradient: {
    paddingBottom: 10,
  },
  headerTitleContainer: {
    marginLeft: 20,
    marginTop: 0,
    marginBottom: 10,
  },
  headerTitleLight: {
    fontSize: 22,
    fontFamily: 'Cinzel',
    color: '#aaa',
    letterSpacing: 4,
    marginBottom: -8,
  },
  headerTitleBold: {
    fontSize: 34,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
    letterSpacing: 2,
  },
  pageSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    marginLeft: 20,
    marginRight: 20,
    fontFamily: 'OpenSans',
    marginBottom: 10,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 5,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillActive: {
    backgroundColor: Colors.light.gold,
    borderColor: Colors.light.gold,
  },
  filterPillText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
  },
  filterPillTextActive: {
    color: '#000',
  },
  heroCard: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 180,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.gold,
  },
  heroGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroCardTitle: {
    color: Colors.light.text,
    fontSize: 22,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 4,
  },
  heroCardCompany: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  watermarkIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
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
