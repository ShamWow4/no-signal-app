import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Pressable, Linking, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

function ActionButton({ icon, label, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered }) => [
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
        !disabled && hovered && styles.actionButtonHovered,
      ]}
    >
      {({ hovered }) => (
        <>
          <Ionicons
            name={icon}
            size={13}
            color={disabled ? 'rgba(255, 255, 255, 0.2)' : (hovered ? '#000000' : Colors.light.gold)}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.actionText,
              disabled && styles.actionTextDisabled,
              !disabled && hovered && styles.actionTextHovered,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

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
            name: d['Company Name'] || d['Company'] || d.name,
            website: d['Website'] || d['Company Website'] || d.website || d.url,
            phone: d['Contact Phone'] || d['Contact phone number'] || d['Contact Phon'] || d['Contact phone numt'] || d.phone || d.phoneNumber || d.contactPhone,
            contact: d['Contact Name'] || d.contact,
            position: d['Position'] || d.position,
            type: d.type || 'COMPANY',
            email: d.email,
            description: d.description
          });
        });
        
        // Deduplicate companyList by normalized company name
        const seenCompanies = new Set();
        const uniqueCompanies = [];

        for (const comp of companyList) {
          const normName = (comp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normName && !seenCompanies.has(normName)) {
            seenCompanies.add(normName);
            uniqueCompanies.push(comp);
          }
        }
        
        // Sort alphabetically by name
        uniqueCompanies.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        setCompanies(uniqueCompanies);
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
    
    let url = value.trim();
    if (type === 'phone') {
      const cleanPhone = value.replace(/[^0-9+]/g, '');
      url = `tel:${cleanPhone}`;
      if (Platform.OS === 'web') {
        window.open(url, '_self');
        return;
      }
    } else if (type === 'email') {
      url = `mailto:${value.trim()}`;
    } else if (type === 'website') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
    }

    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(err => console.log(`Error opening URI: ${url}`, err));
    }
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={styles.tableHeaderLabel}>COMPANY / CATEGORY</Text>
      <Text style={styles.tableHeaderActionsLabel}>CONTACT OPTIONS</Text>
    </View>
  );

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(400)}>
      <Pressable
        style={({ hovered }) => [
          styles.tableRow,
          Shadows.subtle,
          hovered && styles.tableRowHovered,
        ]}
      >
        <View style={styles.rowInfoContainer}>
          <View style={styles.rowTitleCategory}>
            <Text style={styles.companyName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.companyType}>{item.type}</Text>
            </View>
          </View>

          {(item.contact || item.position || item.description) && (
            <View style={styles.rowSubContainer}>
              {item.contact ? (
                <Text style={styles.contactDetails} numberOfLines={1}>
                  <Ionicons name="person-outline" size={12} color={Colors.light.gold} /> {item.contact}
                  {item.position ? ` • ${item.position}` : ''}
                </Text>
              ) : item.description ? (
                <Text style={styles.descriptionSnippet} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.rowActionsRight}>
          <ActionButton
            icon="call"
            label="Call"
            disabled={!item.phone}
            onPress={() => handleLink('phone', item.phone)}
          />
          <ActionButton
            icon="mail"
            label="Email"
            disabled={!item.email}
            onPress={() => handleLink('email', item.email)}
          />
          <ActionButton
            icon="globe"
            label="Website"
            disabled={!item.website}
            onPress={() => handleLink('website', item.website)}
          />
          {user && (
            <TouchableOpacity onPress={() => toggleSaveCompany(item.id)} style={styles.heartButton}>
              <Ionicons 
                name={savedCompanies.has(item.id) ? "heart" : "heart-outline"} 
                size={20} 
                color={savedCompanies.has(item.id) ? "#FF3B30" : Colors.light.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
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
          ListHeaderComponent={renderTableHeader}
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  tableHeaderLabel: {
    fontSize: 11,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.textSecondary,
    letterSpacing: 1.5,
  },
  tableHeaderActionsLabel: {
    fontSize: 11,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.textSecondary,
    letterSpacing: 1.5,
    marginRight: 50,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
  },
  tableRowHovered: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
    boxShadow: '0px 4px 16px rgba(212, 175, 55, 0.15)',
  },
  rowInfoContainer: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  rowTitleCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
  },
  typeBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  companyType: {
    fontSize: 10,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.goldBright,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowSubContainer: {
    marginTop: 4,
  },
  contactDetails: {
    fontSize: 12,
    fontFamily: 'Poppins',
    color: Colors.light.textSecondary,
  },
  descriptionSnippet: {
    fontSize: 12,
    fontFamily: 'OpenSans',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  rowActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 78,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  actionButtonHovered: {
    backgroundColor: Colors.light.gold,
    borderColor: Colors.light.goldBright,
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'PoppinsSemiBold',
    color: Colors.light.gold,
  },
  actionTextHovered: {
    color: '#000000',
  },
  actionTextDisabled: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  heartButton: {
    padding: 6,
    marginLeft: 2,
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

