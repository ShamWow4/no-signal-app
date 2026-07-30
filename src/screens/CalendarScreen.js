import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView, Modal, RefreshControl, TextInput, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkeletonCard from '../components/SkeletonCard';

function parseDate(str) {
  if (!str) return null;
  // If it's already an ISO string or includes T, try to parse it
  if (str.includes('T')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // Custom parsing for 'MM/DD/YYYY' etc. Let JS parse it naturally.
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Fallback for YYYY-MM-DD missing T
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const isoStr = str.replace(' ', 'T');
    const fallbackD = new Date(isoStr);
    if (!isNaN(fallbackD.getTime())) return fallbackD;
  }

  return null;
}



function formatGoogleDate(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return '';
  return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

function generateGoogleCalendarLink(event) {
  const text = encodeURIComponent(event.name || "Event");
  const dates = `${formatGoogleDate(event.loadIn)}/${formatGoogleDate(event.loadOut)}`;
  const details = encodeURIComponent(event.type || "");
  const location = encodeURIComponent(event.venue || "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

export default function CalendarScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeView, setActiveView] = useState('calendar'); // Default to calendar view
  const [activeVenue, setActiveVenue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // State for Month Grid Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const [refreshing, setRefreshing] = useState(false);
  
  const [user, setUser] = useState(null);
  const [savedEvents, setSavedEvents] = useState(new Set());

  const dynamicVenues = useMemo(() => {
    let uniqueVenues = Array.from(new Set(events.map(e => e.venue).filter(v => v))).sort();
    
    // Ensure NOMCC is included and exclude standalone room/hall names
    uniqueVenues = uniqueVenues.filter(venue => {
      const v = venue.toLowerCase();
      if (v.includes('hall') || v.includes('theater') || v.includes('ballroom') || v.includes('la nouvelle') || v.includes('auditorium')) {
        return false;
      }
      return true;
    });

    // Make sure NOMCC is always listed first if present
    if (uniqueVenues.includes('NOMCC')) {
      uniqueVenues = ['NOMCC', ...uniqueVenues.filter(v => v !== 'NOMCC')];
    }

    const colors = ['#D3A625', '#4a90e2', '#50b86c', '#e8954a', '#c0574a', '#9b6bb5', '#45b8ac', '#e08283', '#7b90d2', '#f3715c'];
    
    const venueMap = {};
    uniqueVenues.forEach((venue, index) => {
      let label = venue;
      if (venue === 'NOMCC' || venue.includes('Morial') || venue.includes('MCCNO')) {
        label = 'NOMCC';
      } else if (venue.length > 20) {
        label = venue.substring(0, 17) + '...';
      }

      venueMap[venue] = {
        label: label,
        color: (venue === 'NOMCC' || label === 'NOMCC') ? '#D3A625' : colors[index % colors.length]
      };
    });
    return venueMap;
  }, [events]);

  const fetchEvents = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        const cachedData = await AsyncStorage.getItem('cache_calendar');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          const seenCache = new Set();
          const cleanCache = parsed.filter(e => {
            const k = (e.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (k && !seenCache.has(k)) {
              seenCache.add(k);
              return true;
            }
            return false;
          });
          setEvents(cleanCache);
          setLoading(false);
        }
      }

      const querySnapshot = await getDocs(collection(db, 'calendar_events'));
      const eventsList = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        let loadIn = d.loadIn || d['Show Start'] || d['ShowStart'];
        let loadOut = d.loadOut || d['Show End'] || d['ShowEnd'];

        if (!loadIn && d['Dates']) {
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

        if (!loadOut && loadIn) {
          loadOut = loadIn;
        }

        const endDate = parseDate(loadOut);
        if (!endDate || endDate >= twoWeeksAgo) {
          let venueStr = d.Venue || d.venue || 'NOMCC';
          let hallStr = d.hall || '';

          const vLower = venueStr.toLowerCase();
          if (vLower.includes('marriott')) {
            venueStr = 'New Orleans Marriott';
          } else if (vLower.includes('morial') || 
              vLower.includes('mccno') || 
              vLower.includes('nomcc') || 
              vLower.includes('hall') || 
              vLower.includes('ballroom') || 
              vLower.includes('la nouvelle') || 
              vLower.includes('auditorium')) {
            if (!hallStr && (vLower.includes('hall') || vLower.includes('ballroom') || vLower.includes('la nouvelle') || vLower.includes('auditorium'))) {
              hallStr = venueStr;
            }
            venueStr = 'NOMCC';
          }

          eventsList.push({
            id: doc.id,
            name: d.Title || d.name,
            venue: venueStr,
            hall: hallStr,
            location: (d['City'] && d['City'].match(/^\d{4}-\d{2}-\d{2}/)) ? 'NEW ORLEANS, LA' : (d['City'] || d.location),
            loadIn,
            loadOut,
            type: d.type || 'Event',
            url: d.url || '',
            originalData: d
          });
        }
      });
      
      // Deduplicate eventsList by normalized title key
      const seenEventKeys = new Set();
      const uniqueEventsList = [];

      for (const event of eventsList) {
        const normTitle = (event.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normTitle && !seenEventKeys.has(normTitle)) {
          seenEventKeys.add(normTitle);
          uniqueEventsList.push(event);
        }
      }

      uniqueEventsList.sort((a, b) => {
        const dA = parseDate(a.loadIn);
        const dB = parseDate(b.loadIn);
        if (!dA) return 1;
        if (!dB) return -1;
        return dA - dB;
      });
      setEvents(uniqueEventsList);
      await AsyncStorage.setItem('cache_calendar', JSON.stringify(uniqueEventsList));
    } catch (err) {
      console.error("Error fetching calendar:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    
    let unsubDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSavedEvents(new Set(data.savedEvents || []));
          } else {
            setDoc(userDocRef, { savedGigs: [], savedEvents: [] }, { merge: true });
          }
        });
      } else {
        setSavedEvents(new Set());
        if (unsubDoc) unsubDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const toggleSaveEvent = React.useCallback(async (eventId) => {
    if (!user) return;
    const isSaved = savedEvents.has(eventId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        savedEvents: isSaved ? arrayRemove(eventId) : arrayUnion(eventId)
      });
    } catch (err) {
      console.error("Error toggling save event:", err);
    }
  }, [user, savedEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(true);
  };

  const filteredEvents = useMemo(() => {
    let result = events;
    if (activeVenue !== 'all') {
      if (activeVenue === 'saved') {
        result = result.filter(e => savedEvents.has(e.id));
      } else {
        result = result.filter(e => e.venue === activeVenue);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return result;
  }, [events, activeVenue, searchQuery, savedEvents]);

  const openURL = (url) => {
    if (!url) return;
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('tel:') && !clean.startsWith('mailto:')) {
      clean = `https://${clean}`;
    }
    if (Platform.OS === 'web') {
      window.open(clean, '_blank');
    } else {
      Linking.openURL(clean).catch(err => console.error("Couldn't load page", err));
    }
  };

  const renderFilters = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.viewToggle}>
        <TouchableOpacity 
          style={[styles.viewBtn, activeView === 'calendar' && styles.viewBtnActive]} 
          onPress={() => setActiveView('calendar')}
        >
          <Ionicons name="calendar-outline" size={16} color={activeView === 'calendar' ? '#000' : '#888'} />
          <Text style={[styles.viewBtnText, activeView === 'calendar' && styles.viewBtnTextActive]}>MONTH</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewBtn, activeView === 'list' && styles.viewBtnActive]} 
          onPress={() => setActiveView('list')}
        >
          <Ionicons name="list" size={16} color={activeView === 'list' ? '#000' : '#888'} />
          <Text style={[styles.viewBtnText, activeView === 'list' && styles.viewBtnTextActive]}>AGENDA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conventions..."
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
        <TouchableOpacity 
          style={[styles.filterPill, activeVenue === 'all' && styles.filterPillActive]} 
          onPress={() => setActiveVenue('all')}
        >
          <Text style={[styles.filterPillText, activeVenue === 'all' && styles.filterPillTextActive]}>All Venues</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterPill, activeVenue === 'saved' && styles.filterPillActive]} 
          onPress={() => setActiveVenue('saved')}
        >
          <Text style={[styles.filterPillText, activeVenue === 'saved' && styles.filterPillTextActive]}>Saved</Text>
        </TouchableOpacity>
        {Object.entries(dynamicVenues).map(([key, config]) => (
          <TouchableOpacity 
            key={key}
            style={[styles.filterPill, activeVenue === key && styles.filterPillActive]} 
            onPress={() => setActiveVenue(key)}
          >
            <View style={[styles.filterDot, { backgroundColor: config.color }]} />
            <Text style={[styles.filterPillText, activeVenue === key && styles.filterPillTextActive]}>{config.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

const EventCard = React.memo(({ item, index, onPress }) => {
  const start = parseDate(item.loadIn);
  const end = parseDate(item.loadOut);
  
  return (
    <Animated.View entering={FadeInDown.delay((index % 10) * 50).duration(500)}>
      <TouchableOpacity 
        style={[styles.eventCard, Shadows.subtle, { overflow: 'hidden' }]} 
        activeOpacity={0.7}
        onPress={() => onPress(item)}
      >
      <Image 
        source={require('../../assets/images/nola-av-logo.png.png')} 
        style={[{ position: 'absolute', right: -20, bottom: -20, transform: [{ rotate: '-15deg' }], zIndex: 0 }, { width: 140, height: 140, opacity: 0.03, tintColor: Colors.light.gold }]} 
        resizeMode="contain"
      />
        <View style={styles.cardDetailRow}>
          <Ionicons name="calendar" size={12} color="#888" />
          <Text style={styles.cardDetailText}>
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
          </Text>
        </View>
        {item.type && (
          <View style={[styles.typeTag, { borderColor: '#333' }]}>
            <Text style={styles.typeTagText}>{item.type}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});
EventCard.displayName = 'EventCard';

  const handlePressEvent = React.useCallback((item) => {
    setSelectedEvent(item);
  }, []);

  const renderEventItem = React.useCallback(({ item, index }) => (
    <EventCard 
      item={item} 
      index={index} 
      onPress={handlePressEvent} 
      user={user} 
      savedEvents={savedEvents} 
      toggleSaveEvent={toggleSaveEvent} 
    />
  ), [handlePressEvent, user, savedEvents, toggleSaveEvent]);

  const renderAgendaList = () => {
    if (filteredEvents.length === 0) return <Text style={styles.emptyText}>No upcoming events found.</Text>;
    
    return (
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    );
  };

  
  const renderMonthGrid = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    // Month navigation
    const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));
    
    const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const gridDays = [];
    for (let i = 0; i < firstDayIndex; i++) {
      gridDays.push(new Date(year, month, i - firstDayIndex + 1));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      gridDays.push(new Date(year, month, i));
    }
    const rem = gridDays.length % 7;
    if (rem !== 0) {
      for (let i = 1; i <= 7 - rem; i++) {
        gridDays.push(new Date(year, month + 1, i));
      }
    }

    const weeks = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      weeks.push(gridDays.slice(i, i + 7));
    }
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <View style={[styles.gridWrapper, Shadows.subtle]}>
        <LinearGradient 
          colors={['rgba(211, 166, 37, 0.15)', 'transparent']}
          style={styles.gridHeader}
        >
          <TouchableOpacity onPress={prevMonth} style={styles.gridNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.gridMonthText}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.gridNavBtn}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        
        <View style={styles.weekdaysRow}>
          {weekdays.map(d => (
            <Text key={d} style={styles.weekdayText}>{d}</Text>
          ))}
        </View>
        
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={styles.gridBodyContinuous}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
            }
          >
            {(() => {
              const weeksData = weeks.map((week) => {
                const weekStart = week[0];
                const weekEnd = new Date(week[6]);
                weekEnd.setHours(23, 59, 59, 999);

                const weekEvents = filteredEvents.filter(e => {
                  const eStart = parseDate(e.loadIn);
                  const eEnd = parseDate(e.loadOut);
                  if (!eStart || !eEnd) return false;
                  eStart.setHours(0,0,0,0);
                  eEnd.setHours(23,59,59,999);
                  return (eStart <= weekEnd && eEnd >= weekStart);
                });

                const eventLayouts = weekEvents.map(e => {
                  const eStart = parseDate(e.loadIn);
                  eStart.setHours(0,0,0,0);
                  const eEnd = parseDate(e.loadOut);
                  eEnd.setHours(23,59,59,999);
                  
                  const drawStart = eStart < weekStart ? weekStart : eStart;
                  const drawEnd = eEnd > weekEnd ? weekEnd : eEnd;
                  
                  const utcWeekStart = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                  const utcDrawStart = Date.UTC(drawStart.getFullYear(), drawStart.getMonth(), drawStart.getDate());
                  const utcDrawEnd = Date.UTC(drawEnd.getFullYear(), drawEnd.getMonth(), drawEnd.getDate());
                  
                  const startCol = Math.floor((utcDrawStart - utcWeekStart) / 86400000);
                  const endCol = Math.floor((utcDrawEnd - utcWeekStart) / 86400000);
                  const duration = endCol - startCol + 1;
                  
                  return { event: e, startCol, duration, eStart, eEnd };
                });

                eventLayouts.sort((a, b) => a.startCol - b.startCol || b.duration - a.duration);

                const occupiedLevels = {};
                const visibleLayouts = [];
                
                eventLayouts.forEach(layout => {
                  let level = 0;
                  while (level < 4) { // Maximum 4 visible levels per week row to show more events while preventing overflow
                    let hasOverlap = false;
                    for (let c = layout.startCol; c < layout.startCol + layout.duration; c++) {
                      if (occupiedLevels[`${level}-${c}`]) {
                        hasOverlap = true;
                        break;
                      }
                    }
                    if (!hasOverlap) {
                      layout.level = level;
                      for (let c = layout.startCol; c < layout.startCol + layout.duration; c++) {
                        occupiedLevels[`${level}-${c}`] = true;
                      }
                      visibleLayouts.push(layout);
                      break;
                    }
                    level++;
                  }
                });
                return { week, weekStart, weekEnd, visibleLayouts };
              });

              return weeksData.map(({ week, weekStart, weekEnd, visibleLayouts }, wIndex) => (
                <View key={wIndex} style={[styles.weekRowContinuous, { minHeight: 92, maxHeight: 96 }]}>
                  <View style={styles.weekCellsRow}>
                    {week.map((dateObj, dIndex) => {
                      const isCurrentMonth = dateObj.getMonth() === month;
                      const isToday = dateObj.toDateString() === new Date().toDateString();
                      
                      return (
                        <View key={dIndex} style={styles.gridCellContinuous}>
                          <View style={[styles.dateNumberWrap, isToday && styles.dateNumberWrapToday]}>
                            <Text style={[styles.dateNumberText, isToday && styles.dateNumberTextToday, !isCurrentMonth && { opacity: 0.3 }]}>
                              {dateObj.getDate()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  
                  <View style={styles.weekEventsLayer}>
                    {visibleLayouts.map(layout => {
                      const venueConfig = dynamicVenues[layout.event.venue] || { color: '#888' };
                      const left = `${layout.startCol * (100 / 7)}%`;
                      const rightCol = 7 - (layout.startCol + layout.duration);
                      const right = `${rightCol * (100 / 7)}%`;
                      const top = layout.level * 16 + 22; // Controlled spacing under date numbers
                      
                      const isContinuesLeft = layout.eStart < weekStart;
                      const isContinuesRight = layout.eEnd > weekEnd;
                      
                      return (
                        <TouchableOpacity 
                          key={layout.event.id}
                          onPress={() => setSelectedEvent(layout.event)}
                          style={[
                            styles.absoluteEventBar, 
                            { 
                              backgroundColor: venueConfig.color,
                              left, right, top,
                              marginLeft: isContinuesLeft ? 0 : 2,
                              marginRight: isContinuesRight ? 0 : 2,
                              borderTopLeftRadius: isContinuesLeft ? 0 : 4,
                              borderBottomLeftRadius: isContinuesLeft ? 0 : 4,
                              borderTopRightRadius: isContinuesRight ? 0 : 4,
                              borderBottomRightRadius: isContinuesRight ? 0 : 4,
                            }
                          ]}
                        >
                          {(!isContinuesLeft || layout.startCol === 0) && (
                            <Text style={styles.absoluteEventText} numberOfLines={1}>{layout.event.name}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ));
            })()}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderModal = () => {
    if (!selectedEvent) return null;
    const venueConfig = dynamicVenues[selectedEvent.venue] || { label: selectedEvent.venue, color: '#888' };
    const start = parseDate(selectedEvent.loadIn);
    const end = parseDate(selectedEvent.loadOut);
    
    return (
      <Modal visible={!!selectedEvent} animationType="slide" transparent={true} onRequestClose={() => setSelectedEvent(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
            
            <View style={styles.modalDragHandle} />
            
            <LinearGradient 
              colors={['rgba(211, 166, 37, 0.15)', Colors.light.background]} 
              style={styles.modalHeader}
            >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%'}}>
                <Text style={[styles.modalTitle, {flex: 1, paddingRight: 10}]}>{selectedEvent.name}</Text>
                {user && (
                  <TouchableOpacity onPress={() => toggleSaveEvent(selectedEvent.id)} style={{ padding: 4 }}>
                    <Ionicons 
                      name={savedEvents.has(selectedEvent.id) ? "heart" : "heart-outline"} 
                      size={28} 
                      color={savedEvents.has(selectedEvent.id) ? "#FF3B30" : Colors.light.gold} 
                    />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: venueConfig.color + '1a', borderColor: venueConfig.color }]}>
                <View style={[styles.filterDot, { backgroundColor: venueConfig.color }]} />
                <Text style={[styles.badgeText, { color: venueConfig.color }]}>{venueConfig.label}</Text>
              </View>
            </LinearGradient>
            
            <View style={styles.modalBody}>
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="business" size={20} color="#D3A625" />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>VENUE</Text>
                  <Text style={styles.modalValue}>{selectedEvent.venue}</Text>
                </View>
              </View>
              
              {selectedEvent.hall && (
                <View style={styles.modalInfoRow}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="location" size={20} color="#D3A625" />
                  </View>
                  <View style={styles.modalInfoContent}>
                    <Text style={styles.modalLabel}>HALL / LOCATION</Text>
                    <Text style={styles.modalValue}>{selectedEvent.hall}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="calendar" size={20} color="#D3A625" />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>DATES</Text>
                  <Text style={styles.modalValue}>
                    {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})} - 
                    {"\n"}{end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              {selectedEvent.url && (
                <TouchableOpacity style={styles.websiteBtn} onPress={() => openURL(selectedEvent.url)}>
                  <Text style={styles.websiteBtnText}>OFFICIAL WEBSITE</Text>
                  <Ionicons name="open-outline" size={16} color="#000" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.googleCalBtn} onPress={() => openURL(generateGoogleCalendarLink(selectedEvent))}>
                <Ionicons name="calendar-outline" size={18} color="#D3A625" />
                <Text style={styles.googleCalBtnText}>ADD TO CALENDAR</Text>
              </TouchableOpacity>
            </View>
            
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

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
            <Text style={styles.headerTitleLight}>NO</Text>
            <Text style={styles.headerTitleBold}>SIGNAL</Text>
          </View>
          <Text style={styles.heroSubtitle}>Nola AV Newsletter</Text>
          {renderFilters()}
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={{flex: 1, paddingHorizontal: 16, paddingTop: 10}}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#888" />
          <Text style={[styles.emptyText, { marginTop: 16, textAlign: 'center' }]}>Unable to connect.{"\n"}Please check your network and try again.</Text>
        </View>
      ) : (
        <View style={{flex: 1, paddingHorizontal: 16}}>
          {activeView === 'list' ? renderAgendaList() : renderMonthGrid()}
        </View>
      )}

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerGradient: {
    paddingBottom: 10,
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  headerTitleLight: {
    fontSize: 26,
    fontFamily: 'Cinzel',
    color: '#aaa',
    letterSpacing: 6,
    marginBottom: -10,
  },
  headerTitleBold: {
    fontSize: 42,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.gold,
    letterSpacing: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: 'Cinzel',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
  },
  controlsContainer: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    marginBottom: 0,
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.glassBackground,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    borderRadius: 24,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    padding: 4,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 20,
  },
  viewBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  viewBtnText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#888',
  },
  viewBtnTextActive: {
    color: Colors.light.gold,
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginRight: 8,
  },
  filterPillActive: {
    borderColor: Colors.light.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  filterPillText: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.light.gold,
    fontWeight: 'bold',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: Colors.light.text,
    fontFamily: 'Poppins',
    fontSize: 14,
  },
  clearButton: {
    padding: 5,
  },
  
  // Event Cards
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.glassBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    marginBottom: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.08)',
    elevation: 4,
  },
  cardDateBlock: {
    width: 80,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.light.glassBorder,
  },
  cardMonth: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D3A625',
    letterSpacing: 1,
  },
  cardDay: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 28,
    color: '#fff',
    marginVertical: 4,
  },
  cardDuration: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 9,
    color: '#aaa',
    letterSpacing: 1,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 18,
    color: Colors.light.gold,
    marginBottom: 12,
    lineHeight: 24,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  cardDetailText: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    color: '#aaa',
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  typeTagText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 9,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'OpenSans',
    fontSize: 14,
  },

  
  // Grid Month Styles
  gridWrapper: {
    flex: 1,
    backgroundColor: Colors.light.glassBackground,
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 4,
    boxShadow: '0px 4px 12px rgba(212, 175, 55, 0.08)',
    elevation: 4,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.glassBorder,
  },
  gridMonthText: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 20,
    color: Colors.light.gold,
    letterSpacing: 1,
  },
  gridNavBtn: {
    padding: 4,
  },
  weekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.glassBorder,
    backgroundColor: 'rgba(212, 175, 37, 0.03)',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
    fontFamily: 'PoppinsSemiBold',
    fontSize: 10,
    color: '#aaa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  gridBodyContinuous: {
    flex: 1,
    flexDirection: 'column',
  },
  weekRowContinuous: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    overflow: 'hidden',
  },
  weekCellsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  gridCellContinuous: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: Colors.light.glassBorder,
  },
  dateNumberWrap: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNumberWrapToday: {
    backgroundColor: Colors.light.gold,
    boxShadow: '0px 0px 8px rgba(212, 175, 55, 0.6)',
  },
  dateNumberText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 11,
    color: '#888',
  },
  dateNumberTextToday: {
    color: '#000',
    fontWeight: 'bold',
  },

  weekEventsLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  absoluteEventBar: {
    position: 'absolute',
    height: 14,
    paddingHorizontal: 4,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    elevation: 2,
  },
  absoluteEventText: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 9,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: Colors.light.glassBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40, // extra padding for bottom safe area
    borderTopWidth: 1,
    borderColor: Colors.light.glassBorder,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.light.glassBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 24,
    color: Colors.light.text,
    marginBottom: 12,
    lineHeight: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'OpenSans',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalBody: {
    marginBottom: 32,
    gap: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
  },
  modalInfoContent: {
    flex: 1,
  },
  modalLabel: {
    fontFamily: 'OpenSans',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalValue: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  modalActions: {
    gap: 12,
  },
  websiteBtn: {
    backgroundColor: Colors.light.gold,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  websiteBtnText: {
    fontFamily: 'OpenSans',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
    color: '#000',
  },
  googleCalBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  googleCalBtnText: {
    fontFamily: 'OpenSans',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
    color: Colors.light.gold,
  }
});
