import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView, Modal, RefreshControl, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkeletonCard from '../components/SkeletonCard';
import EventCard from '../components/EventCard';

function parseDate(str) {
  if (!str) return null;
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str;

  // Handle Firestore Timestamps
  if (typeof str === 'object') {
    if (typeof str.toDate === 'function') {
      const d = str.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (str.seconds !== undefined) return new Date(str.seconds * 1000);
    if (str._seconds !== undefined) return new Date(str._seconds * 1000);
  }

  // Handle number timestamps (milliseconds vs seconds)
  if (typeof str === 'number') {
    return new Date(str > 1e11 ? str : str * 1000);
  }

  // Handle string timestamps (native JS Date handles ISO and YYYY-MM-DD natively)
  if (typeof str === 'string') {
    const cleanStr = str.replace(/^"|"$/g, '').trim();
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
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
        let loadIn = d.loadIn || d['Load-In Date'] || d['Load-In'] || d['load_in'] || d['Show Start'] || d['ShowStart'] || d['Start Date'] || d.startDate || d.start_date;
        let loadOut = d.loadOut || d['Load-Out Date'] || d['Load-Out'] || d['load_out'] || d['Show End'] || d['ShowEnd'] || d['End Date'] || d.endDate || d.end_date;

        if (!loadIn && d['Dates']) {
          const datesStr = d['Dates'];
          if (typeof datesStr === 'string' && datesStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            loadIn = datesStr;
            if (d.City && typeof d.City === 'string' && d.City.match(/^\d{4}-\d{2}-\d{2}/)) {
              loadOut = d.City;
            } else {
              loadOut = datesStr;
            }
          } else if (typeof datesStr === 'string') {
            const parts = datesStr.split(/[-–—]| to /i).map(s => s.trim());
            if (parts.length === 2) {
              loadIn = parts[0];
              loadOut = parts[1];
            } else if (parts.length === 1) {
              loadIn = parts[0];
              loadOut = parts[0];
            }
          } else {
            loadIn = datesStr;
          }
        }

        // Handle case where loadIn contains a date range string (e.g., "Aug 3, 2026 - Aug 7, 2026")
        if (typeof loadIn === 'string' && (loadIn.includes(' - ') || loadIn.includes(' – ') || loadIn.includes(' — ') || loadIn.includes(' to '))) {
          const parts = loadIn.split(/[-–—]| to /i).map(s => s.trim());
          if (parts.length >= 2) {
            loadIn = parts[0];
            if (!loadOut || loadOut === d.loadIn || loadOut === d['Load-In Date']) {
              loadOut = parts[1];
            }
          }
        }

        if (!loadOut && loadIn) {
          loadOut = loadIn;
        }

        const endDate = parseDate(loadOut) || parseDate(loadIn);
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

          const eventTitle = d.Title || d.title || d.name || d['Event Name'] || d['Event'] || 'Untitled Event';

          eventsList.push({
            id: doc.id,
            name: eventTitle,
            title: eventTitle,
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
        const dA = parseDate(a.loadIn) || parseDate(a.loadOut);
        const dB = parseDate(b.loadIn) || parseDate(b.loadOut);
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
    const seen = new Set();
    return result.filter(e => {
      const key = `${(e.name || e.title || "").trim().toLowerCase()}|${e.startDate || e.loadIn || ""}|${e.venue || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
          <Text style={[styles.viewBtnText, activeView === 'list' && styles.viewBtnTextActive]}>

AGENDA</Text>
        </TouchableOpacity>
      </View>


      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
        <TouchableOpacity 
          style={[styles.filterPill, activeVenue === 'all' && styles.filterPillActive]} 
          onPress={() => setActiveVenue('all')}
        >
          <Text style={[styles.filterPillText, activeVenue === 'all' && styles.filterPillTextActive]}>All Venues</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#FFD700'} />
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
      <View style={styles.gridWrapper}>
        <View style={styles.gridHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.gridNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.gridMonthText}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.gridNavBtn}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#FFD700'} />
            }
          >
            {(() => {
              const weeksData = weeks.map((week) => {
                const weekStart = week[0];
                const weekEnd = new Date(week[6]);
                weekEnd.setHours(23, 59, 59, 999);

                const weekEvents = filteredEvents.filter(e => {
                  const rawStart = parseDate(e.loadIn) || parseDate(e.loadOut);
                  const rawEnd = parseDate(e.loadOut) || parseDate(e.loadIn);
                  if (!rawStart && !rawEnd) return false;

                  const eStart = new Date(rawStart || rawEnd);
                  eStart.setHours(0,0,0,0);
                  const eEnd = new Date(rawEnd || rawStart);
                  eEnd.setHours(23,59,59,999);

                  if (eEnd < eStart) {
                    const tmp = new Date(eStart);
                    eStart.setTime(eEnd.getTime());
                    eEnd.setTime(tmp.getTime());
                  }

                  return (eStart <= weekEnd && eEnd >= weekStart);
                });

                const eventLayouts = weekEvents.map(e => {
                  const rawStart = parseDate(e.loadIn) || parseDate(e.loadOut);
                  const rawEnd = parseDate(e.loadOut) || parseDate(e.loadIn);

                  const eStart = new Date(rawStart || rawEnd);
                  eStart.setHours(0,0,0,0);
                  const eEnd = new Date(rawEnd || rawStart);
                  eEnd.setHours(23,59,59,999);

                  if (eEnd < eStart) {
                    const tmp = new Date(eStart);
                    eStart.setTime(eEnd.getTime());
                    eEnd.setTime(tmp.getTime());
                  }
                  
                  const drawStart = eStart < weekStart ? weekStart : eStart;
                  const drawEnd = eEnd > weekEnd ? weekEnd : eEnd;
                  
                  const utcWeekStart = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                  const utcDrawStart = Date.UTC(drawStart.getFullYear(), drawStart.getMonth(), drawStart.getDate());
                  const utcDrawEnd = Date.UTC(drawEnd.getFullYear(), drawEnd.getMonth(), drawEnd.getDate());
                  
                  const startCol = Math.floor((utcDrawStart - utcWeekStart) / 86400000);
                  const endCol = Math.floor((utcDrawEnd - utcWeekStart) / 86400000);
                  const duration = Math.max(1, endCol - startCol + 1);
                  
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
                <View key={wIndex} style={styles.weekRowContinuous}>
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
                      const leftPct = layout.startCol * (100 / 7);
                      const widthPct = layout.duration * (100 / 7);
                      const top = layout.level * 20 + 26; // 20px pitch vertical stacking
                      
                      const isContinuesLeft = layout.eStart < weekStart;
                      const isContinuesRight = layout.eEnd > weekEnd;
                      
                      return (
                        <TouchableOpacity 
                          key={layout.event.id}
                          onPress={() => setSelectedEvent(layout.event)}
                          activeOpacity={0.8}
                          title={`${layout.event.name || layout.event.title || layout.event.Title || 'Untitled Event'} (${layout.event.venue || ''})`}
                          style={[
                            styles.absoluteEventBar, 
                            { 
                              backgroundColor: venueConfig.color,
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              top: top,
                              height: 18, // 18px bar height
                              borderTopLeftRadius: isContinuesLeft ? 0 : 4,
                              borderBottomLeftRadius: isContinuesLeft ? 0 : 4,
                              borderTopRightRadius: isContinuesRight ? 0 : 4,
                              borderBottomRightRadius: isContinuesRight ? 0 : 4,
                            }
                          ]}
                        >
                          <Text style={styles.absoluteEventText} numberOfLines={1}>
                            {layout.event.name || layout.event.title || layout.event.Title || 'Untitled Event'}
                          </Text>
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
    const titleText = selectedEvent.name || selectedEvent.title || selectedEvent.Title || 'Untitled Event';
    const venueText = selectedEvent.venue || selectedEvent.Venue || 'New Orleans, LA';
    const hallText = selectedEvent.hall || selectedEvent['Hall / Room'] || selectedEvent.room || selectedEvent.location || 'Not specified';
    const venueConfig = dynamicVenues[venueText] || { label: venueText, color: '#FFD700' };

    const start = parseDate(selectedEvent.loadIn) || parseDate(selectedEvent.loadOut);
    const end = parseDate(selectedEvent.loadOut) || parseDate(selectedEvent.loadIn);

    const startDateStr = start 
      ? start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) 
      : 'TBD';
    const endDateStr = end 
      ? end.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) 
      : 'TBD';

    return (
      <Modal visible={!!selectedEvent} animationType="slide" transparent={true} onRequestClose={() => setSelectedEvent(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
            
            <View style={styles.modalDragHandle} />
            
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 12}}>
                <Text style={[styles.modalTitle, {flex: 1, paddingRight: 10}]}>{titleText}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  {user && (
                    <TouchableOpacity onPress={() => toggleSaveEvent(selectedEvent.id)} style={{ padding: 4 }}>
                      <Ionicons 
                        name={savedEvents.has(selectedEvent.id) ? "heart" : "heart-outline"} 
                        size={26} 
                        color={savedEvents.has(selectedEvent.id) ? "#FF3B30" : '#FFD700'} 
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: (venueConfig.color || '#FFD700') + '1a', borderColor: venueConfig.color || '#FFD700' }]}>
                <View style={[styles.filterDot, { backgroundColor: venueConfig.color || '#FFD700' }]} />
                <Text style={[styles.badgeText, { color: venueConfig.color || '#FFD700' }]}>{venueConfig.label || venueText}</Text>
              </View>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="business" size={20} color={'#FFD700'} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>VENUE</Text>
                  <Text style={styles.modalValue}>{venueText}</Text>
                </View>
              </View>
              
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="location" size={20} color={'#FFD700'} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>HALLS / ROOMS</Text>
                  <Text style={styles.modalValue}>{hallText}</Text>
                </View>
              </View>
              
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="calendar-outline" size={20} color={'#FFD700'} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>START DATE</Text>
                  <Text style={styles.modalValue}>{startDateStr}</Text>
                </View>
              </View>

              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="time-outline" size={20} color={'#FFD700'} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>END DATE</Text>
                  <Text style={styles.modalValue}>{endDateStr}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              {Boolean(selectedEvent.url) && (
                <TouchableOpacity style={styles.websiteBtn} onPress={() => openURL(selectedEvent.url)}>
                  <Text style={styles.websiteBtnText}>OFFICIAL WEBSITE</Text>
                  <Ionicons name="open-outline" size={16} color="#000" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.googleCalBtn} onPress={() => openURL(generateGoogleCalendarLink(selectedEvent))}>
                <Ionicons name="calendar-outline" size={18} color={'#FFD700'} />
                <Text style={styles.googleCalBtnText}>ADD TO CALENDAR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedEvent(null)} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={18} color="#aaa" />
                <Text style={styles.modalCloseBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
            
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={{ paddingBottom: 0 }}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleLight}>NO</Text>
            <Text style={styles.headerTitleBold}>SIGNAL!</Text>
          </View>
          <Text style={styles.heroSubtitle}>Nola AV Newsletter</Text>
          {renderFilters()}
        </SafeAreaView>
      </View>

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
    backgroundColor: '#000000',
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
    color: '#FFD700',
    letterSpacing: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'OpenSans',
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
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
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
    color: '#FFD700',
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginRight: 8,
  },
  filterPillActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  filterPillText: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterPillTextActive: {
    color: '#FFD700',
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
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    fontSize: 14,
  },
  clearButton: {
    padding: 5,
  },
  
  // Event Cards
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardDateBlock: {
    width: 80,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.light.cardBorder,
  },
  cardMonth: {
    fontFamily: 'OpenSans',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D3A625',
    letterSpacing: 1,
  },
  cardDay: {
    fontFamily: 'PoppinsSemiBold',
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
    fontFamily: 'PoppinsSemiBold',
    fontSize: 18,
    color: '#FFD700',
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
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  gridMonthText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    color: '#FFD700',
    letterSpacing: 1,
  },
  gridNavBtn: {
    padding: 4,
  },
  weekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
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
    height: 116,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    overflow: 'hidden',
  },
  weekCellsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: 116,
    flexDirection: 'row',
  },
  gridCellContinuous: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: Colors.light.cardBorder,
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
    zIndex: 5,
  },
  dateNumberWrapToday: {
    backgroundColor: '#FFD700',
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 116,
    pointerEvents: 'box-none',
  },
  absoluteEventBar: {
    position: 'absolute',
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  absoluteEventText: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#0B0B0B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#FFD700",
    elevation: 20,
  },
  modalDragHandle: {
    width: 44,
    height: 4,
    backgroundColor: "rgba(255, 215, 0, 0.45)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.18)",
  },
  modalTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 22,
    color: "#FFD700",
    marginBottom: 10,
    lineHeight: 30,
  },
  modalCloseIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1605",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "OpenSans",
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  modalBody: {
    marginBottom: 28,
    gap: 18,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A1505",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  modalInfoContent: {
    flex: 1,
  },
  modalLabel: {
    fontFamily: "OpenSans",
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFD700",
    letterSpacing: 1.2,
    marginBottom: 3,
    opacity: 0.85,
  },
  modalValue: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  modalActions: {
    gap: 12,
  },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  websiteBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#000000",
    letterSpacing: 1,
  },
  googleCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#161204",
    borderWidth: 1.5,
    borderColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  googleCalBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#FFD700",
    letterSpacing: 1,
  },
  modalCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  modalCloseBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
    color: "#BBBBBB",
    letterSpacing: 1,
  },
});
