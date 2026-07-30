import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { auth, db } from '../firebase';
import { onAuthStateChanged, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedGigsCount, setSavedGigsCount] = useState(0);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  const [prefs, setPrefs] = useState({ gigs: true, calendar: true, news: true });
  
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
              
              setPrefs({
                gigs: data.notificationPrefs?.gigs !== false,
                calendar: data.notificationPrefs?.calendar !== false,
                news: data.notificationPrefs?.news !== false,
              });
            } else {
              // Create doc if it doesn't exist
              setDoc(userDocRef, { savedGigs: [], savedEvents: [], notificationPrefs: { gigs: true, calendar: true, news: true } }, { merge: true });
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
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
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

  const togglePref = async (key, value) => {
    if (!user) return;
    setPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await setDoc(doc(db, 'users', user.uid), {
        notificationPrefs: {
          [key]: value
        }
      }, { merge: true });
    } catch (err) {
      console.error(err);
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

            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Notification Preferences</Text>
              
              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Ionicons name="musical-notes-outline" size={24} color="#D4AF37" style={styles.prefIcon} />
                  <View>
                    <Text style={styles.prefTitle}>Gig Alerts</Text>
                    <Text style={styles.prefDesc}>Be notified when new gigs drop</Text>
                  </View>
                </View>
                <Switch 
                  value={prefs.gigs} 
                  onValueChange={(val) => togglePref('gigs', val)}
                  trackColor={{ false: '#333', true: '#FF3B30' }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Ionicons name="calendar-outline" size={24} color="#00C4B4" style={styles.prefIcon} />
                  <View>
                    <Text style={styles.prefTitle}>Calendar Alerts</Text>
                    <Text style={styles.prefDesc}>Updates on conventions & events</Text>
                  </View>
                </View>
                <Switch 
                  value={prefs.calendar} 
                  onValueChange={(val) => togglePref('calendar', val)}
                  trackColor={{ false: '#333', true: '#FF3B30' }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <Ionicons name="newspaper-outline" size={24} color="#4A90E2" style={styles.prefIcon} />
                  <View>
                    <Text style={styles.prefTitle}>News Alerts</Text>
                    <Text style={styles.prefDesc}>Tourism news & press releases</Text>
                  </View>
                </View>
                <Switch 
                  value={prefs.news} 
                  onValueChange={(val) => togglePref('news', val)}
                  trackColor={{ false: '#333', true: '#FF3B30' }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.adminButton} 
              onPress={() => router.push('/admin')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#D4AF37" style={{marginRight: 8}} />
              <Text style={styles.adminButtonText}>Admin Broadcast</Text>
            </TouchableOpacity>
            
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
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefIcon: {
    marginRight: 16,
  },
  prefTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  prefDesc: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    color: '#AAA',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    width: '100%'
  },
  adminButtonText: {
    color: '#D4AF37',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 14,
  }
});
