import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Colors, Shadows } from '../constants/theme';

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

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const q = query(collection(db, 'av_news'), limit(20));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const fetchedNews = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort by date manually if possible, assuming Date is a string
          fetchedNews.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
          
          setFeedData(fetchedNews);
        } else {
          setFeedData([]);
        }
      } catch (error) {
        console.error("Error fetching news feed: ", error);
        setFeedData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

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
      import('react-native').then(({ Linking }) => {
        Linking.openURL(url).catch(() => {});
      });
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.heroSection}>
        <Text style={styles.logoText}>No Signal!</Text>
        <Text style={styles.heroSubtitle}>The New Orleans AV Industry Newsletter</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>100<Text style={styles.statPlus}>+</Text></Text>
          <Text style={styles.statLabel}>Students Trained</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>25<Text style={styles.statPlus}>+</Text></Text>
          <Text style={styles.statLabel}>Events Supported</Text>
        </View>
      </View>

      <Text style={styles.feedHeader}>Latest Transmissions</Text>
      {loading && (
        <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
      )}
    </View>
  );

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
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} style={styles.feedChevron} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFeedItem = ({ item, index }) => (
    <AnimatedFeedItem item={item} index={index} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    paddingTop: 60,
  },
  heroSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: 'OpenSans',
    marginBottom: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.backgroundSelected,
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statPlus: {
    color: Colors.light.gold,
  },
  statLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'Poppins',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Feed Styles
  feedHeader: {
    fontSize: 20,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
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
});
