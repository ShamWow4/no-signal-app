import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, RefreshControl, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Colors, Shadows } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const FALLBACK_FEED = [
  {
    id: '1',
    type: 'announcement',
    title: 'Fall Courses Registration Open',
    date: 'Oct 1, 2026',
    excerpt: 'Sign up now for our upcoming Live Video Switching and Resolume Arena training modules.',
  },
  {
    id: '2',
    type: 'news',
    title: 'NVA Supports MCCNO Tech Convention',
    date: 'Sep 28, 2026',
    excerpt: 'Our recent graduates successfully ran A/V for the massive 3-day tech convention at the convention center!',
  },
  {
    id: '3',
    type: 'event',
    title: 'Upcoming Community Meetup',
    date: 'Sep 15, 2026',
    excerpt: 'Join us for a networking session and hands-on gear showcase this Friday.',
  },
];

export default function HomeScreen() {

  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchFeed = async (isRefresh = false) => {
    try {
      const q = query(collection(db, 'av_news'), limit(30));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const fetchedNews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        fetchedNews.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
        
        setFeedData(fetchedNews);
      } else {
        setFeedData([]);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(true);
  };

  const getIconForType = (type) => {
    switch (type?.toLowerCase()) {
      case 'announcement': return 'megaphone-outline';
      case 'event': return 'calendar-outline';
      case 'news': return 'newspaper-outline';
      default: return 'flash-outline';
    }
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.8 }}
      style={styles.headerGradient}
    >
      <SafeAreaView edges={['top']} style={{ paddingBottom: 0 }}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleLight}>NO</Text>
          <Text style={styles.headerTitleBold}>SIGNAL</Text>
        </View>
        <Text style={styles.heroSubtitle}>Nola AV Newsletter</Text>
        <Text style={styles.feedHeader}>Latest Transmissions</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {['All', 'News', 'Announcement', 'Event'].map(cat => (
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
  );

  const AnimatedHeroItem = ({ item }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const translateY = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true })
      ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        <TouchableOpacity style={[styles.heroCard, Shadows.subtle]} activeOpacity={0.8} onPress={() => openLink(item.Link)}>
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.2)', 'rgba(0, 0, 0, 0.4)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroCardHeader}>
              <View style={styles.feedTypeContainer}>
                <Ionicons name={getIconForType(item.Source)} size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.feedCardType} numberOfLines={1}>
                  {item.Source ? item.Source.toUpperCase() : 'LATEST'}
                </Text>
              </View>
              <Text style={styles.heroCardDate}>{item.Date}</Text>
            </View>
            <Text style={styles.heroCardTitle}>{item.Title}</Text>
            <Text style={styles.heroCardExcerpt} numberOfLines={4}>{item.Summary}</Text>
            <View style={styles.readMoreRow}>
              <Text style={styles.readMoreText}>Read Full Story</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.light.gold} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const AnimatedFeedItem = ({ item, index }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const translateY = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: Math.min(index * 100, 1000), // Cap delay at 1s
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          delay: Math.min(index * 100, 1000),
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        <TouchableOpacity style={[styles.feedCard, Shadows.subtle]} activeOpacity={0.7} onPress={() => openLink(item.Link)}>
          <View style={styles.watermarkContainer}>
            <Ionicons name={getIconForType(item.Source)} size={120} color="rgba(212, 175, 55, 0.03)" />
          </View>
          <View style={styles.feedCardContent}>
            <View style={styles.feedCardHeader}>
              <View style={styles.feedTypeContainer}>
                <Ionicons name={getIconForType(item.Source)} size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.feedCardType} numberOfLines={1}>
                  {item.Source ? item.Source.toUpperCase() : 'UPDATE'}
                </Text>
              </View>
              <Text style={styles.feedCardDate}>{item.Date}</Text>
            </View>
            <Text style={styles.feedCardTitle}>{item.Title}</Text>
            <Text style={styles.feedCardExcerpt} numberOfLines={3}>{item.Summary}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filteredFeed = feedData.filter(item => {
    if (activeCategory === 'All') return true;
    return (item.Source || '').toLowerCase().includes(activeCategory.toLowerCase());
  });

  const renderFeedItem = ({ item, index }) => {
    if (index === 0 && activeCategory === 'All') {
      return <AnimatedHeroItem item={item} />;
    }
    return <AnimatedFeedItem item={item} index={index} />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredFeed}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>No news matches this filter.</Text>
            </View>
          )
        }
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
  headerGradient: {
    paddingBottom: 10,
  },
  headerTitleContainer: {
    marginLeft: 20,
    marginTop: 0,
    marginBottom: 5,
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
  heroSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontFamily: 'Cinzel',
    letterSpacing: 2,
    marginLeft: 20,
    marginBottom: 20,
  },
  feedHeader: {
    fontSize: 18,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginLeft: 20,
    marginBottom: 10,
    letterSpacing: 1,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.gold,
  },
  feedCardContent: {
    flex: 1,
  },
  feedChevron: {
    marginLeft: 12,
  },
  feedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedCardType: {
    color: Colors.light.gold,
    fontSize: 11,
    fontFamily: 'Poppins',
    letterSpacing: 1,
  },
  feedCardDate: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'OpenSans',
  },
  feedCardTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 6,
  },
  feedCardExcerpt: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'OpenSans',
    lineHeight: 20,
  },
  filtersScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.glassBackground,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: Colors.light.gold,
  },
  filterPillText: {
    fontFamily: 'OpenSans',
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.light.gold,
    fontWeight: 'bold',
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: Colors.light.gold,
    elevation: 8,
  },
  heroGradient: {
    padding: 24,
  },
  heroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroCardDate: {
    color: '#CCC',
    fontSize: 13,
    fontFamily: 'OpenSans',
  },
  heroCardTitle: {
    color: Colors.light.gold,
    fontSize: 26,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 10,
    lineHeight: 32,
  },
  heroCardExcerpt: {
    color: '#EEE',
    fontSize: 15,
    fontFamily: 'OpenSans',
    lineHeight: 22,
    marginBottom: 20,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readMoreText: {
    color: Colors.light.gold,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
    marginRight: 6,
  },
  watermarkContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins',
    color: Colors.light.textSecondary,
  },
});
