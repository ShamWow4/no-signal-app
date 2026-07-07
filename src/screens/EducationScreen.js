import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const COURSES = [
  {
    id: '1',
    category: 'Audio',
    title: 'Audio Fundamentals for Breakout Rooms',
    instructor: 'Chris Medders',
    description: 'This hands-on training workshop focuses on live audio setups in breakout rooms, commonly used in conferences, meetings, and corporate events.',
    icon: 'mic-outline',
  },
  {
    id: '2',
    category: 'Video',
    title: 'Basic Camera Operation',
    instructor: 'Andrew Savage & JC Harris',
    description: 'Learn the fundamentals of professional camera operation. This introductory session covers the basics of setting up and operating cameras for live events and broadcast.',
    icon: 'videocam-outline',
  },
  {
    id: '3',
    category: 'Lighting',
    title: 'Basic Stage Lighting',
    instructor: 'Rin Medico',
    description: 'This hands-on workshop introduces the core principles of stage lighting for live events. Perfect for beginners and working AV techs.',
    icon: 'bulb-outline',
  },
  {
    id: '4',
    category: 'Networking',
    title: 'NVA Winter Meetup',
    instructor: 'NVA Community',
    description: 'Kick off the new year with the Nola Visual Arts & AV Academy! Join us at the New Orleans Jazz Museum Education Center.',
    icon: 'people-outline',
  }
];

export default function EducationScreen() {
  const renderCourse = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        <Ionicons name={item.icon} size={24} color={Colors.light.gold} />
      </View>
      <Text style={styles.courseTitle}>{item.title}</Text>
      <View style={styles.instructorRow}>
        <Ionicons name="person" size={14} color="#888" />
        <Text style={styles.instructorText}>w/ {item.instructor}</Text>
      </View>
      <Text style={styles.courseDescription}>{item.description}</Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>View Course</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Past Courses & Materials</Text>
      <Text style={styles.headerSubtitle}>
        Enjoy our library of Audio/Visual educational materials including courses on Audio, Video, and Lighting.
      </Text>
      <FlatList
        data={COURSES}
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
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
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: 'OpenSans',
    marginHorizontal: 20,
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
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
