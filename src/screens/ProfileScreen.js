import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { auth, db } from '../firebase';
import { onAuthStateChanged, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo-vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedGigsCount, setSavedGigsCount] = useState(0);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  
  const router = useRouter();

  useEffect(() => {
    let unsubDoc = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setSavedGigsCount(data.savedGigs?.length || 0);
            setSavedEventsCount(data.savedEvents?.length || 0);
          } else {
            // Create doc if it doesn't exist
            setDoc(userDocRef, { savedGigs: [], savedEvents: [] }, { merge: true });
          }
          setLoading(false);
        }, (err) => {
          console.error("Error fetching user profile:", err);
          setLoading(false);
        });

      } else {
        // Sign in anonymously if no user is found
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth error", error);
          setLoading(false);
        }
      }
    });
    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 59, 48, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={100} color="#FF3B30" />
            </View>
            <Text style={styles.greetingText}>
              Hello, {user?.displayName || 'Anonymous User'}!
            </Text>
            <Text style={styles.subText}>You are using the app as a guest.</Text>

            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statBox} onPress={() => router.push('/saved-items?tab=gigs')}>
                <Text style={styles.statNumber}>{savedGigsCount}</Text>
                <Text style={styles.statLabel}>Saved Gigs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBox} onPress={() => router.push('/saved-items?tab=events')}>
                <Text style={styles.statNumber}>{savedEventsCount}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Edit Profile</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#888"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  profileContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  greetingText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 24,
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  subText: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: '#AAA',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  statBox: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 32,
    color: '#FF3B30',
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 12,
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    color: '#FFF',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFF',
    fontFamily: 'OpenSans',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#FF3B30',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFF',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
});
