import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Linking, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function DirectoryScreen() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [user, setUser] = useState(null);
  const [savedCompanies, setSavedCompanies] = useState(new Set());

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'labor_directory'));
        const companyList = [];
        querySnapshot.forEach((doc) => {
          const d = doc.data();
          companyList.push({ 
            id: doc.id,
            name: d['Company Name'] || d.name,
            website: d['Company Website'] || d.website,
            phone: d['Contact phone number'] || d.phone,
            contact: d['Contact Name'] || d.contact,
            position: d['Position'] || d.position,
            type: d.type || 'COMPANY',
            email: d.email,
            description: d.description
          });
        });
        
        // Sort alphabetically by name
        companyList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        setCompanies(companyList);
      } catch (error) {
        console.error("Error fetching labor directory: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  useEffect(() => {
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSavedCompanies(new Set(data.savedCompanies || []));
          } else {
            setDoc(userDocRef, { savedCompanies: [] }, { merge: true });
          }
        });
      } else {
        setSavedCompanies(new Set());
        if (unsubDoc) unsubDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const toggleSaveCompany = async (companyId) => {
    if (!user) return;
    const isSaved = savedCompanies.has(companyId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        savedCompanies: isSaved ? arrayRemove(companyId) : arrayUnion(companyId)
      });
    } catch (err) {
      console.error("Error toggling save company:", err);
    }
  };

  const dynamicCategories = Array.from(new Set(companies.map(c => c.type).filter(t => t))).sort();
  const categories = ['All', 'Saved', ...dynamicCategories];

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          company.type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'Saved') {
      return savedCompanies.has(company.id) && matchesSearch;
    }
    if (activeCategory !== 'All') {
      return company.type === activeCategory && matchesSearch;
    }
    return matchesSearch;
  });

  const handleLink = (type, value) => {
    if (!value) return;
    
    let url = value;
    if (type === 'phone') {
      url = Platform.OS === 'android' ? `tel:${value}` : `telprompt:${value}`;
    } else if (type === 'email') {
      url = `mailto:${value}`;
    }
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log(`Don't know how to open URI: ${url}`);
      }
    });
  };

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(500)}>
      <View style={[styles.card, Shadows.subtle, { overflow: 'hidden' }]}>
        <Image 
          source={require('../../assets/images/nola-av-logo.png.png')} 
          style={[styles.watermarkIcon, { width: 140, height: 140, opacity: 0.03, tintColor: Colors.light.gold }]} 
          resizeMode="contain"
        />
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.companyName}>{item.name}</Text>
            <Text style={styles.companyType}>{item.type}</Text>
          </View>
          {user && (
            <TouchableOpacity onPress={() => toggleSaveCompany(item.id)} style={{ padding: 4, zIndex: 10 }}>
              <Ionicons 
                name={savedCompanies.has(item.id) ? "heart" : "heart-outline"} 
                size={22} 
                color={savedCompanies.has(item.id) ? "#FF3B30" : Colors.light.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
        
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {(item.contact || item.position) && (
          <View style={styles.contactInfoContainer}>
            {item.contact ? <Text style={styles.contactName}>{item.contact}</Text> : null}
            {item.position ? <Text style={styles.contactPosition}>{item.position}</Text> : null}
          </View>
        )}

        <View style={styles.actionRow}>
          {item.phone && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLink('phone', item.phone)}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="call" size={16} color={Colors.light.gold} />
              </View>
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
          )}
          
          {item.email && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLink('email', item.email)}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="mail" size={16} color={Colors.light.gold} />
              </View>
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
          )}
          
          {item.website && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLink('website', item.website)}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="globe" size={16} color={Colors.light.gold} />
              </View>
              <Text style={styles.actionText}>Website</Text>
            </TouchableOpacity>
          )}
        </View>
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
        <SafeAreaView edges={['top']} style={{ paddingBottom: 0 }}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleLight}>INDUSTRY</Text>
            <Text style={styles.headerTitleBold}>DIRECTORY</Text>
          </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies or types..."
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : (
        <FlatList
          data={filteredCompanies}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>No companies found.</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    marginHorizontal: 20,
    marginBottom: 0,
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
    height: 54,
    color: Colors.light.text,
    fontFamily: 'Poppins',
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 5,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillActive: {
    backgroundColor: Colors.light.gold,
    borderColor: Colors.light.gold,
  },
  filterPillText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
  },
  filterPillTextActive: {
    color: '#000',
  },
  watermarkIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
    zIndex: 0,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.08)',
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 22,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
    marginBottom: 4,
  },
  companyType: {
    fontSize: 12,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  description: {
    fontSize: 14,
    fontFamily: 'OpenSans',
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 20,
  },
  contactInfoContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  contactName: {
    fontSize: 15,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.text,
  },
  contactPosition: {
    fontSize: 13,
    fontFamily: 'Poppins',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.gold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
