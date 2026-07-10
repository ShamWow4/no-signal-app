import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Colors } from '../constants/theme';

export default function GigsScreen() {
  const [gigsData, setGigsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const q = query(collection(db, 'gig_alerts'), orderBy('date_discovered', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const fetchedGigs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setGigsData(fetchedGigs);
        } else {
          setGigsData([]);
        }
      } catch (error) {
        console.error("Error fetching gigs: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, []);

  const handleApply = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.pageTitle}>Gig Alerts</Text>
      <Text style={styles.pageSubtitle}>Latest AV, lighting, and video opportunities in New Orleans.</Text>
      {loading && (
        <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginVertical: 20 }} />
      )}
    </View>
  );

  const renderGigItem = ({ item }) => {
    // Format the date if it's a Firestore timestamp
    let dateStr = '';
    if (item.date_discovered && item.date_discovered.toDate) {
      dateStr = item.date_discovered.toDate().toLocaleDateString();
    }

    return (
      <TouchableOpacity 
        style={styles.gigCard} 
        activeOpacity={0.7}
        onPress={() => handleApply(item.apply_link)}
      >
        <View style={styles.gigCardContent}>
          <View style={styles.gigCardHeader}>
            <View style={styles.gigTypeContainer}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
              <Text style={styles.gigCardType}>
                {item.job_type ? item.job_type.toUpperCase() : 'GIG'}
              </Text>
            </View>
            <Text style={styles.gigCardDate}>{dateStr}</Text>
          </View>
          <Text style={styles.gigCardTitle}>{item.job_title}</Text>
          {(item.company_name || item.location) && (
            <Text style={styles.gigCardCompany}>
              {item.company_name}{item.company_name && item.location ? ' • ' : ''}{item.location}
            </Text>
          )}
          {item.salary && (
            <Text style={styles.gigCardSalary}>
              <Ionicons name="cash-outline" size={12} color={Colors.light.textSecondary} /> {item.salary}
            </Text>
          )}
          <Text style={styles.gigCardExcerpt} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.applyContainer}>
            <Text style={styles.applyText}>View & Apply</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.light.gold} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={gigsData}
        keyExtractor={(item) => item.id}
        renderItem={renderGigItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>No gigs found right now.{'\n'}Check back later!</Text>
          </View>
        )}
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
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  pageSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: 'OpenSans',
    marginBottom: 10,
  },
  gigCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.gold,
  },
  gigCardContent: {
    flex: 1,
  },
  gigCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gigTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gigCardType: {
    color: Colors.light.gold,
    fontSize: 11,
    fontFamily: 'Poppins',
    letterSpacing: 1,
  },
  gigCardDate: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: 'OpenSans',
  },
  gigCardTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 4,
  },
  gigCardCompany: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'Poppins',
    marginBottom: 6,
  },
  gigCardSalary: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: 'OpenSans',
    marginBottom: 8,
  },
  gigCardExcerpt: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: 'OpenSans',
    lineHeight: 20,
    marginBottom: 12,
  },
  applyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  applyText: {
    color: Colors.light.gold,
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontFamily: 'OpenSans',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  }
});
