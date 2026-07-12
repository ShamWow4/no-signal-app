import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Linking, Platform } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function DirectoryScreen() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredCompanies = companies.filter(company => 
    company.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    company.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.companyName}>{item.name}</Text>
            <Text style={styles.companyType}>{item.type}</Text>
          </View>
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
      <Text style={styles.headerTitle}>INDUSTRY DIRECTORY</Text>
      
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
  headerTitle: {
    fontSize: 28,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    paddingHorizontal: 20,
    paddingTop: 60, // Account for safe area roughly
    paddingBottom: 20,
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#444',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
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
