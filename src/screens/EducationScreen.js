import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const fetchTraining = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        const cachedData = await AsyncStorage.getItem('cache_education');
        if (cachedData) {
          setCourses(JSON.parse(cachedData));
          setLoading(false);
        }
      }

      const { collection, getDocs, query, limit } = await import('firebase/firestore');
      const { db } = await import('../firebase');
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course['Course Title'] || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (course['Platform/Instructor'] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    
    const courseType = (course['Type'] || 'General').toLowerCase();
    const isIT = courseType.includes('network') || courseType.includes('it');
    
    if (activeCategory === 'Audio') return matchesSearch && courseType.includes('audio');
    if (activeCategory === 'Video') return matchesSearch && (courseType.includes('video') || courseType.includes('camera'));
    if (activeCategory === 'Lighting') return matchesSearch && courseType.includes('light');
    if (activeCategory === 'IT') return matchesSearch && isIT;
    if (activeCategory === 'General') return matchesSearch && (!courseType.includes('audio') && !courseType.includes('video') && !courseType.includes('light') && !isIT);
    
    return matchesSearch;
  });

  const renderCourse = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <View style={[styles.card, Shadows.subtle]}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{(item['Type'] || 'General').toUpperCase()}</Text>
          </View>
          <Ionicons name={getIconForCategory(item['Type'] || item['Course Title'])} size={24} color={Colors.light.gold} />
        </View>
        <Text style={styles.courseTitle}>{item['Course Title']}</Text>
        <View style={styles.instructorRow}>
          <Ionicons name="person" size={14} color="#888" />
          <Text style={styles.instructorText}>{item['Platform/Instructor']}</Text>
        </View>
        {item['Duration'] && (
          <Text style={styles.courseDescription}>Duration: {item['Duration']}</Text>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={() => openLink(item['Link'])}>
          <Text style={styles.actionButtonText}>View Course</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

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
            {['All', 'Audio', 'Video', 'Lighting', 'IT', 'General'].map(cat => (
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
