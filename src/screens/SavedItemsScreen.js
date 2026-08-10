import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Colors, Shadows } from '../constants/theme';
import CompanyIcon from '../components/CompanyIcon';

function parseDate(str) {
  if (!str) return null;
  if (str.includes('T')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const isoStr = str.replace(' ', 'T');
    const fallbackD = new Date(isoStr);
    if (!isNaN(fallbackD.getTime())) return fallbackD;
  }
  return null;
}

export default function SavedItemsScreen() {
  const { tab } = useLocalSearchParams(); // 'gigs' or 'events'
  const [activeTab, setActiveTab] = useState(tab || 'gigs');
  const [loading, setLoading] = useState(true);
  
  // State for Data
  const [gigs, setGigs] = useState([]);
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsub = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const gIds = data.savedGigs || [];
        const eIds = data.savedEvents || [];
        
        try {
          // Fetch Gigs
          if (gIds.length > 0) {
            const fetchedGigs = await Promise.all(
              gIds.map(async id => {
                const d = await getDoc(doc(db, 'av_gigs', id));
                return d.exists() ? { id: d.id, ...d.data() } : null;
              })
            );
            setGigs(fetchedGigs.filter(Boolean));
          } else {
            setGigs([]);
          }
          
          // Fetch Events
          if (eIds.length > 0) {
            const fetchedEvents = await Promise.all(
              eIds.map(async id => {
                const d = await getDoc(doc(db, 'calendar_events', id));
                return d.exists() ? { id: d.id, ...d.data() } : null;
              })
            );
            
            // Map event dates properly
            const mappedEvents = fetchedEvents.filter(Boolean).map(d => {
              let loadIn = d.loadIn;
              let loadOut = d.loadOut;
              if (d['Dates']) {
                const datesStr = d['Dates'];
                if (datesStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                  loadIn = datesStr;
                  if (d.City && d.City.match(/^\d{4}-\d{2}-\d{2}/)) {
                    loadOut = d.City;
                  } else {
                    loadOut = datesStr;
                  }
                } else {
                  const parts = datesStr.split('-').map(s => s.trim());
                  if (parts.length === 2) {
                    loadIn = parts[0];
                    loadOut = parts[1];
                  } else if (parts.length === 1) {
                    loadIn = parts[0];
                    loadOut = parts[0];
                  }
                }
              }
              return {
                id: d.id,
                name: d.Title || d.name,
                venue: d.Venue || d.venue,
                hall: d.hall || '',
                location: (d['City'] && d['City'].match(/^\d{4}-\d{2}-\d{2}/)) ? 'NEW ORLEANS, LA' : (d['City'] || d.location),
                loadIn,
                loadOut,
                type: d.type || 'Event',
                url: d.url || ''
              };
            });
            setEvents(mappedEvents);
          } else {
            setEvents([]);
          }
          
        } catch (error) {
          console.error("Error fetching saved items details:", error);
        }
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  const handleApply = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const renderGig = ({ item }) => (
    <TouchableOpacity 
      style={[styles.gigCard, Shadows.subtle]} 
      activeOpacity={0.7}
      onPress={() => handleApply(item['Link'])}
    >
      <View style={styles.gigCardContent}>
        <View style={styles.gigCardHeader}>
          <View style={styles.gigTypeContainer}>
            <Ionicons name="briefcase-outline" size={14} color={Colors.light.gold} style={{ marginRight: 6 }} />
            <Text style={styles.gigCardType}>
              {item['Source'] ? item['Source'].toUpperCase() : 'GIG'}
            </Text>
          </View>
        </View>
        <Text style={styles.gigCardTitle}>{item['Job Title']}</Text>
        {item['Company'] ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 }}>
            <CompanyIcon name={item['Company']} size={16} fallbackIcon="business-outline" style={{ marginRight: 6 }} />
            <Text style={[styles.gigCardCompany, { marginTop: 0, marginBottom: 0 }]}>{item['Company']}</Text>
          </View>
        ) : null}
        {item['Location'] ? (
          <View style={styles.gigLocationRow}>
            <Ionicons name="location-sharp" size={13} color={Colors.light.gold} style={{ marginRight: 4 }} />
            <Text style={styles.gigCardLocation}>{item['Location']}</Text>
          </View>
        ) : null}
        <View
          style={[styles.applyContainer, { marginTop: 16, backgroundColor: Colors.light.buttonPrimary }]}
        >
          <Text style={styles.applyText}>View & Apply</Text>
          <Ionicons name="arrow-forward" size={14} color="#000" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEvent = ({ item }) => {
    const start = parseDate(item.loadIn);
    const end = parseDate(item.loadOut);
    const month = start ? start.toLocaleString('default', { month: 'short' }).toUpperCase() : '';
    const day = start ? start.getDate() : '';
    
    return (
      <TouchableOpacity 
        style={[styles.eventCard, Shadows.subtle]} 
        activeOpacity={0.7}
        onPress={() => handleApply(item.url)}
      >
        <View style={styles.cardDateBlock}>
          <Text style={styles.cardMonth}>{month}</Text>
          <Text style={styles.cardDay}>{day}</Text>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardDetailRow}>
            <Ionicons name="location" size={12} color={Colors.light.textSecondary} />
            <Text style={styles.cardDetailText} numberOfLines={1}>{item.venue}{item.hall ? ` - ${item.hall}` : ''}</Text>
          </View>
          {start && end && (
            <View style={styles.cardDetailRow}>
              <Ionicons name="calendar" size={12} color="#888" />
              <Text style={styles.cardDetailText}>
                {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
       <View style={styles.tabContainer}>
         <TouchableOpacity 
           style={[styles.tabButton, activeTab === 'gigs' && styles.tabButtonActive]}
           onPress={() => setActiveTab('gigs')}
         >
           <Text style={[styles.tabText, activeTab === 'gigs' && styles.tabTextActive]}>Saved Gigs ({gigs.length})</Text>
         </TouchableOpacity>
         <TouchableOpacity 
           style={[styles.tabButton, activeTab === 'events' && styles.tabButtonActive]}
           onPress={() => setActiveTab('events')}
         >
           <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>Saved Events ({events.length})</Text>
         </TouchableOpacity>
       </View>

       {loading ? (
         <ActivityIndicator color={Colors.light.gold} style={{ marginTop: 20 }} />
       ) : (
         <FlatList
           data={activeTab === 'gigs' ? gigs : events}
           keyExtractor={item => item.id}
           renderItem={activeTab === 'gigs' ? renderGig : renderEvent}
           contentContainerStyle={styles.listContent}
           showsVerticalScrollIndicator={false}
           ListEmptyComponent={
             <Text style={styles.emptyText}>You haven&apos;t saved any {activeTab} yet.</Text>
           }
         />
       )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  tabContainer: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#333' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.gold },
  tabText: { color: '#888', fontFamily: 'PoppinsSemiBold' },
  tabTextActive: { color: Colors.light.gold },
  listContent: { padding: 16 },
  
  // Gig Card Styles
  gigCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  gigCardContent: { flex: 1 },
  gigCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gigTypeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  gigCardType: { color: Colors.light.gold, fontSize: 11, fontFamily: 'PoppinsSemiBold', letterSpacing: 1 },
  gigCardTitle: { color: Colors.light.text, fontSize: 20, fontFamily: 'PoppinsSemiBold', marginBottom: 4 },
  gigCardCompany: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PoppinsSemiBold', letterSpacing: 0.2, marginTop: 2, marginBottom: 2 },
  gigLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gigCardLocation: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: 'OpenSans' },
  applyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, alignSelf: 'flex-start' },
  applyText: { color: '#000', fontSize: 14, fontFamily: 'PoppinsSemiBold', marginRight: 6 },
  
  // Event Card Styles
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardDateBlock: { width: 80, backgroundColor: 'rgba(212, 175, 55, 0.05)', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRightWidth: 1, borderRightColor: Colors.light.cardBorder },
  cardMonth: { fontFamily: 'OpenSans', fontSize: 12, fontWeight: 'bold', color: '#D3A625', letterSpacing: 1 },
  cardDay: { fontFamily: 'PoppinsSemiBold', fontSize: 28, color: '#fff', marginVertical: 4 },
  cardContent: { flex: 1, padding: 16, justifyContent: 'center' },
  cardTitle: { fontFamily: 'PoppinsSemiBold', fontSize: 18, color: Colors.light.gold, marginBottom: 12, lineHeight: 24 },
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  cardDetailText: { fontFamily: 'OpenSans', fontSize: 12, color: '#aaa' },
  
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontFamily: 'OpenSans' }
});
