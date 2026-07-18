import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, TextInput, ScrollView, Image } from 'react-native';
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

export default function EducationScreen() {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [refreshing, setRefreshing] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [savedCourses, setSavedCourses] = React.useState(new Set());

  const fetchTraining = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        const cachedData = await AsyncStorage.getItem('cache_education');
        if (cachedData) {
          setCourses(JSON.parse(cachedData));
          setLoading(false);
        }
      }

      const q = query(collection(db, 'av_training'), limit(30));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const fetchedCourses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCourses(fetchedCourses);
        await AsyncStorage.setItem('cache_education', JSON.stringify(fetchedCourses));
      } else {
        setCourses([]);
        await AsyncStorage.setItem('cache_education', JSON.stringify([]));
      }
    } catch (err) {
      console.error("Error fetching education:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchTraining();
  }, []);

  React.useEffect(() => {
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSavedCourses(new Set(data.savedCourses || []));
          } else {
            setDoc(userDocRef, { savedCourses: [] }, { merge: true });
          }
        });
      } else {
        setSavedCourses(new Set());
        if (unsubDoc) unsubDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const toggleSaveCourse = async (courseId) => {
    if (!user) return;
    const isSaved = savedCourses.has(courseId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        savedCourses: isSaved ? arrayRemove(courseId) : arrayUnion(courseId)
      });
    } catch (err) {
      console.error("Error toggling save course:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTraining(true);
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const getIconForCategory = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('audio') || lower.includes('sound')) return 'mic-outline';
    if (lower.includes('video') || lower.includes('camera')) return 'videocam-outline';
    if (lower.includes('light')) return 'bulb-outline';
    if (lower.includes('network') || lower.includes('it')) return 'globe-outline';
    return 'school-outline';
  };

  const dynamicCategories = Array.from(new Set(courses.map(c => c['Type']).filter(t => t))).sort();
  const categories = ['All', 'Saved', ...dynamicCategories];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course['Course Title'] || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course['Platform/Instructor'] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'Saved') return matchesSearch && savedCourses.has(course.id);
    if (activeCategory === 'All') return matchesSearch;
    
    return matchesSearch && course['Type'] === activeCategory;
  });

  const renderHeroCourse = (item) => (
    <Animated.View entering={FadeInDown.duration(500)}>
      <LinearGradient
        colors={['#1F1F1F', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.heroCard, Shadows.medium, { overflow: 'hidden' }]}
      >
        <Image 
          source={require('../../assets/images/nola-av-logo.png.png')} 
          style={[styles.watermarkIcon, { width: 220, height: 220, opacity: 0.05, tintColor: Colors.light.gold, right: -40, bottom: -40 }]} 
          resizeMode="contain"
        />
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.categoryBadge, { backgroundColor: 'rgba(211, 166, 37, 0.2)' }]}>
              <Text style={[styles.categoryText, { color: Colors.light.gold, fontWeight: 'bold' }]}>FEATURED</Text>
            </View>
            <Ionicons name={getIconForCategory(item['Type'] || item['Course Title'])} size={16} color={Colors.light.gold} style={{ marginLeft: 8 }} />
          </View>
          {user && (
            <TouchableOpacity onPress={() => toggleSaveCourse(item.id)} style={{ padding: 4, zIndex: 10 }}>
              <Ionicons 
                name={savedCourses.has(item.id) ? "heart" : "heart-outline"} 
                size={28} 
                color={savedCourses.has(item.id) ? "#FF3B30" : "rgba(255,255,255,0.5)"} 
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.courseTitle, { color: '#FFF', fontSize: 26, marginTop: 10 }]}>{item['Course Title']}</Text>
        <View style={[styles.instructorRow, { marginTop: 10 }]}>
          <Ionicons name="person" size={14} color="#888" />
          <Text style={[styles.instructorText, { color: '#CCC', fontSize: 16 }]}>{item['Platform/Instructor']}</Text>
        </View>
        {item['Duration'] && (
          <Text style={[styles.courseDescription, { color: '#AAA' }]}>Duration: {item['Duration']}</Text>
        )}
        <TouchableOpacity onPress={() => openLink(item['Link'])}>
          <LinearGradient
            colors={[Colors.light.gold, '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.actionButton, { marginTop: 10, borderWidth: 0 }]}
          >
            <Text style={[styles.actionButtonText, { color: '#000', fontFamily: 'PoppinsSemiBold' }]}>Start Learning</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderCourse = ({ item, index }) => {
    if (index === 0 && activeCategory === 'All' && !searchQuery) {
      return renderHeroCourse(item);
    }
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
        <View style={[styles.card, Shadows.subtle, { overflow: 'hidden' }]}>
          <Image 
            source={require('../../assets/images/nola-av-logo.png.png')} 
            style={[styles.watermarkIcon, { width: 150, height: 150, opacity: 0.03, tintColor: Colors.light.gold }]} 
            resizeMode="contain"
          />
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{(item['Type'] || 'General').toUpperCase()}</Text>
              </View>
              <Ionicons name={getIconForCategory(item['Type'] || item['Course Title'])} size={16} color={Colors.light.gold} style={{ marginLeft: 8 }} />
            </View>
            {user && (
              <TouchableOpacity onPress={() => toggleSaveCourse(item.id)} style={{ padding: 4, zIndex: 10 }}>
                <Ionicons 
                  name={savedCourses.has(item.id) ? "heart" : "heart-outline"} 
                  size={24} 
                  color={savedCourses.has(item.id) ? "#FF3B30" : Colors.light.textSecondary} 
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.courseTitle}>{item['Course Title']}</Text>
          <View style={styles.instructorRow}>
            <Ionicons name="person" size={14} color="#888" />
            <Text style={styles.instructorText}>{item['Platform/Instructor']}</Text>
          </View>
          {item['Duration'] && (
            <Text style={styles.courseDescription}>Duration: {item['Duration']}</Text>
          )}
          <TouchableOpacity onPress={() => openLink(item['Link'])}>
            <LinearGradient
              colors={[Colors.light.gold, '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.actionButton, { borderWidth: 0 }]}
            >
              <Text style={[styles.actionButtonText, { color: '#000' }]}>View Course</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleLight}>TECH</Text>
            <Text style={styles.headerTitleBold}>SUPPORT</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Enjoy our library of Audio/Visual educational materials including courses on Audio, Video, and Lighting.
          </Text>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses or providers..."
              placeholderTextColor={Colors.light.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[styles.filterPill, activeCategory === cat && styles.filterPillActive]} 
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.filterPillText, activeCategory === cat && styles.filterPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      {loading ? (
        <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 10}}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>No courses match your search.</Text>
            </View>
          }
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
    padding: 20,
    paddingBottom: 40,
  },
  headerGradient: {
    paddingBottom: 20,
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
  headerSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 10,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.08)',
    elevation: 4,
  },
  heroCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    boxShadow: '0px 8px 24px rgba(212, 175, 55, 0.15)',
    elevation: 6,
  },
  watermarkIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
    zIndex: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(211, 166, 37, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(211, 166, 37, 0.3)',
  },
  categoryText: {
    color: Colors.light.gold,
    fontSize: 10,
    fontFamily: 'Poppins',
    letterSpacing: 1,
  },
  courseTitle: {
    fontSize: 20,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructorText: {
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    fontSize: 14,
    marginLeft: 6,
  },
  courseDescription: {
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.gold,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.light.gold,
    fontFamily: 'Poppins',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: Colors.light.text,
    fontFamily: 'Poppins',
    fontSize: 15,
  },
  clearButton: {
    padding: 5,
  },
  filtersScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
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
