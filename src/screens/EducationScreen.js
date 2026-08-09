import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl, TextInput, ScrollView, Image, Modal, Platform } from 'react-native';
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
  const [, setError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [refreshing, setRefreshing] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [savedCourses, setSavedCourses] = React.useState(new Set());
  const [selectedCourse, setSelectedCourse] = React.useState(null);

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

        const seenCourseKeys = new Set();
        const uniqueCourses = [];
        for (const course of fetchedCourses) {
          const normTitle = (course['Course Title'] || course.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normTitle && !seenCourseKeys.has(normTitle)) {
            seenCourseKeys.add(normTitle);
            uniqueCourses.push(course);
          }
        }

        setCourses(uniqueCourses);
        await AsyncStorage.setItem('cache_education', JSON.stringify(uniqueCourses));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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



  const dynamicCategories = Array.from(new Set(courses.map(c => c['Type']).filter(t => t))).sort();
  const categories = ['All', 'Saved', ...dynamicCategories];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course['Course Title'] || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course['Platform/Instructor'] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'Saved') return matchesSearch && savedCourses.has(course.id);
    if (activeCategory === 'All') return matchesSearch;
    
    return matchesSearch && course['Type'] === activeCategory;
  });

  const renderHeroCourse = (item) => {
    const costText = item['Cost'] || item.cost || 'Free';
    const isFree = costText.toLowerCase().includes('free');
    const descText = item['Description'] || item.description || '';
    const durationText = item['Duration'] || item.duration || 'Self-Paced';

    return (
      <Animated.View entering={FadeInDown.duration(500)}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setSelectedCourse(item)}
        >
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
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(211, 166, 37, 0.2)' }]}>
                  <Text style={[styles.categoryText, { color: Colors.light.gold, fontWeight: 'bold' }]}>FEATURED</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: isFree ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 149, 0, 0.2)', borderColor: isFree ? '#4CD964' : '#FF9500' }]}>
                  <Text style={[styles.categoryText, { color: isFree ? '#4CD964' : '#FF9500', fontWeight: 'bold' }]}>{costText.toUpperCase()}</Text>
                </View>
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
            
            <Text style={[styles.courseTitle, { color: '#FFF', fontSize: 24, marginTop: 10 }]}>{item['Course Title'] || item.title}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="business" size={14} color={Colors.light.gold} style={{ marginRight: 4 }} />
                <Text style={{ color: '#CCC', fontSize: 14, fontFamily: 'Poppins' }}>{item['Platform/Instructor'] || item['Provider'] || 'AV Industry'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={14} color="#aaa" style={{ marginRight: 4 }} />
                <Text style={{ color: '#aaa', fontSize: 13, fontFamily: 'OpenSans' }}>{durationText}</Text>
              </View>
            </View>

            {descText ? (
              <Text style={[styles.courseDescription, { color: '#AAA', marginTop: 10, lineHeight: 20 }]} numberOfLines={3}>
                {descText}
              </Text>
            ) : null}

            <View style={styles.cardActionsRight}>
              <TouchableOpacity 
                style={styles.secondaryCtaBtn}
                onPress={() => setSelectedCourse(item)}
              >
                <Text style={styles.secondaryCtaText}>Course Details</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryCtaBtn}
                onPress={() => openLink(item['Link'] || item.link)}
              >
                <LinearGradient
                  colors={[Colors.light.gold, '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryCtaGradient}
                >
                  <Text style={styles.primaryCtaText}>Start Learning</Text>
                  <Ionicons name="arrow-forward" size={14} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCourse = ({ item, index }) => {
    if (index === 0 && activeCategory === 'All' && !searchQuery) {
      return renderHeroCourse(item);
    }
    
    const costText = item['Cost'] || item.cost || 'Free';
    const isFree = costText.toLowerCase().includes('free');
    const descText = item['Description'] || item.description || '';
    const durationText = item['Duration'] || item.duration || 'Self-Paced';

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setSelectedCourse(item)}
        >
          <View style={[styles.card, Shadows.subtle, { overflow: 'hidden' }]}>
            <Image 
              source={require('../../assets/images/nola-av-logo.png.png')} 
              style={[styles.watermarkIcon, { width: 150, height: 150, opacity: 0.03, tintColor: Colors.light.gold }]} 
              resizeMode="contain"
            />
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{(item['Type'] || 'General AV').toUpperCase()}</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: isFree ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 149, 0, 0.15)', borderColor: isFree ? 'rgba(76, 217, 100, 0.4)' : 'rgba(255, 149, 0, 0.4)' }]}>
                  <Text style={[styles.categoryText, { color: isFree ? '#4CD964' : '#FF9500' }]}>{costText.toUpperCase()}</Text>
                </View>
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

            <Text style={styles.courseTitle}>{item['Course Title'] || item.title}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="business" size={14} color={Colors.light.gold} style={{ marginRight: 4 }} />
                <Text style={styles.instructorText}>{item['Platform/Instructor'] || item['Provider'] || 'AV Industry'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={14} color="#888" style={{ marginRight: 4 }} />
                <Text style={{ color: Colors.light.textSecondary, fontSize: 13, fontFamily: 'OpenSans' }}>{durationText}</Text>
              </View>
            </View>

            {descText ? (
              <Text style={[styles.courseDescription, { lineHeight: 20, marginBottom: 14 }]} numberOfLines={3}>
                {descText}
              </Text>
            ) : null}

            <View style={styles.cardActionsRight}>
              <TouchableOpacity 
                style={styles.secondaryCtaBtn}
                onPress={() => setSelectedCourse(item)}
              >
                <Text style={styles.secondaryCtaText}>View Specs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryCtaBtn}
                onPress={() => openLink(item['Link'] || item.link)}
              >
                <LinearGradient
                  colors={[Colors.light.gold, '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryCtaGradient}
                >
                  <Text style={styles.primaryCtaText}>Launch Course</Text>
                  <Ionicons name="arrow-forward" size={14} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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

      {selectedCourse && (
        <Modal
          visible={!!selectedCourse}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedCourse(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setSelectedCourse(null)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{(selectedCourse['Type'] || 'General AV').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: (selectedCourse['Cost'] || '').toLowerCase().includes('free') ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 149, 0, 0.2)', borderColor: (selectedCourse['Cost'] || '').toLowerCase().includes('free') ? '#4CD964' : '#FF9500' }]}>
                    <Text style={[styles.categoryText, { color: (selectedCourse['Cost'] || '').toLowerCase().includes('free') ? '#4CD964' : '#FF9500' }]}>{(selectedCourse['Cost'] || 'Free').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.modalTitle}>{selectedCourse['Course Title'] || selectedCourse.title}</Text>

                <View style={styles.modalMetaRow}>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="business" size={16} color={Colors.light.gold} />
                    <Text style={styles.modalMetaText}>{selectedCourse['Platform/Instructor'] || selectedCourse['Provider'] || 'AV Industry'}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.light.gold} />
                    <Text style={styles.modalMetaText}>{selectedCourse['Duration'] || selectedCourse.duration || 'Self-Paced'}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Course Overview & Specifications</Text>
                  <Text style={styles.modalDescription}>
                    {selectedCourse['Description'] || selectedCourse.description || 'Comprehensive professional AV training module covering technical fundamentals, hands-on system setup, and industry best practices.'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={{ marginTop: 24, borderRadius: 12, overflow: 'hidden' }}
                  onPress={() => {
                    const link = selectedCourse['Link'] || selectedCourse.link;
                    setSelectedCourse(null);
                    openLink(link);
                  }}
                >
                  <LinearGradient
                    colors={[Colors.light.gold, '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#000', fontFamily: 'PoppinsSemiBold', fontSize: 16 }}>Launch Course Portal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#181818',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    boxShadow: '0px 10px 30px rgba(0,0,0,0.8)',
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
    marginBottom: 12,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalMetaText: {
    color: '#DDD',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginLeft: 6,
  },
  modalSection: {
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: 'OpenSans',
    color: '#CCC',
    lineHeight: 24,
  },
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
  cardActionsRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  secondaryCtaBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  secondaryCtaText: {
    color: Colors.light.gold,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
  },
  primaryCtaBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  primaryCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  primaryCtaText: {
    color: '#000000',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 13,
    marginRight: 6,
  },
});
