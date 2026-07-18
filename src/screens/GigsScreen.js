import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, RefreshControl } from 'react-native';
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
        setGigsData(fetchedGigs);
        await AsyncStorage.setItem('cache_gigs', JSON.stringify(fetchedGigs));
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
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderHeader = () => (
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
        {loading && (
          <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
        )}
      </SafeAreaView>
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
      {loading ? (
        <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 10}}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={gigsData}
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
