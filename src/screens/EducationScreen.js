import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function EducationScreen() {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTraining = async () => {
      try {
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
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error("Error fetching training: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTraining();
  }, []);

  const openLink = (url) => {
    if (url) {
      import('react-native').then(({ Linking }) => {
        Linking.openURL(url).catch(() => {});
      });
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
        <Text style={styles.headerTitle}>Past Courses & Materials</Text>
        <Text style={styles.headerSubtitle}>
          Enjoy our library of Audio/Visual educational materials including courses on Audio, Video, and Lighting.
        </Text>
      </LinearGradient>
      {loading ? (
        <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingTop: 60, // Account for safe area
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    marginHorizontal: 20,
    marginBottom: 0,
    lineHeight: 20,
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
});
