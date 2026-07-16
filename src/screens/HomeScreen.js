import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
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
        {loading && (
          <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
        )}
      </SafeAreaView>
    </LinearGradient>
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
});
