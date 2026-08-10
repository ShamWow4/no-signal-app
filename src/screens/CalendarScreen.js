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

function parseDate(str) {
  if (!str) return null;

  // Handle Date instances
  if (str instanceof Date) {
    return isNaN(str.getTime()) ? null : str;
  }

  // Handle Firestore Timestamp objects (.toDate() method or seconds)
  if (typeof str === 'object') {
    if (typeof str.toDate === 'function') {
      const d = str.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (str.seconds !== undefined) {
      const d = new Date(str.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (str._seconds !== undefined) {
      const d = new Date(str._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  // Handle number timestamps
  if (typeof str === 'number') {
    const d = new Date(str > 1e11 ? str : str * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof str !== 'string') {
    str = String(str);
  }

  let clean = str.trim().replace(/^["']|["']$/g, '');
  if (!clean) return null;

  // 1. ISO string with time (e.g. "2026-08-03T14:30:00" or "2026-08-03T14:30:00Z")
  if (clean.includes('T')) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD (e.g. "2026-08-03" or "2026/08/03") -> Parse as local date to prevent UTC offset day shifts
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return new Date(y, m, d);
    }
  }

  // 3. MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, M-D-YYYY, MM/DD/YY (e.g. "08/03/2026", "8/3/2026", "08/03/26")
  const usMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usMatch) {
    const m = parseInt(usMatch[1], 10) - 1;
    const d = parseInt(usMatch[2], 10);
    let y = parseInt(usMatch[3], 10);
    if (y < 100) {
      y += (y > 50 ? 1900 : 2000);
    }
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return new Date(y, m, d);
    }
  }

  const monthMap = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  // Strip ordinal suffixes (1st, 2nd, 3rd, 4th) and extra punctuation
  const textClean = clean
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Textual format: Month Day Year (e.g. "Aug 3 2026", "August 03 2026", "Aug 3")
  const textMatch = textClean.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
  if (textMatch) {
    const mStr = textMatch[1].toLowerCase();
    if (monthMap[mStr] !== undefined) {
      const m = monthMap[mStr];
      const d = parseInt(textMatch[2], 10);
      let y = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
      if (y < 100) {
        y += (y > 50 ? 1900 : 2000);
      }
      if (d >= 1 && d <= 31) {
        return new Date(y, m, d);
      }
    }
  }

  // 5. Textual format: Day Month Year (e.g. "3 Aug 2026", "03 August 2026", "3 Aug")
  const dayFirstMatch = textClean.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{2,4}))?$/);
  if (dayFirstMatch) {
    const mStr = dayFirstMatch[2].toLowerCase();
    if (monthMap[mStr] !== undefined) {
      const d = parseInt(dayFirstMatch[1], 10);
      const m = monthMap[mStr];
      let y = dayFirstMatch[3] ? parseInt(dayFirstMatch[3], 10) : new Date().getFullYear();
      if (y < 100) {
        y += (y > 50 ? 1900 : 2000);
      }
      if (d >= 1 && d <= 31) {
        return new Date(y, m, d);
      }
    }
  }

  // 6. Native JS Date fallback
  const dNative = new Date(clean);
  if (!isNaN(dNative.getTime())) {
    return dNative;
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

const EventCard = React.memo(({ item, index, onPress, user, savedEvents, toggleSaveEvent }) => {
  const start = parseDate(item.loadIn) || parseDate(item.loadOut);
  const end = parseDate(item.loadOut) || parseDate(item.loadIn);
  const isSaved = savedEvents ? savedEvents.has(item.id) : false;

  const startMonth = start ? start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const startDay = start ? start.getDate() : '';
  
  let durationText = '1 DAY';
  if (start && end) {
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.round((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 1) {
      durationText = `${diffDays} DAYS`;
    }
  }

  const titleText = item.name || item.title || item.Title || 'Untitled Event';
  const venueText = item.venue || item.Venue || 'New Orleans, LA';
  const hallText = item.hall || item['Hall / Room'] || '';
  const locationText = hallText ? `${venueText} (${hallText})` : venueText;
  const sourceTag = item.source || item.Source || item.type || 'EVENT';

  const isSameDay = start && end && start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

  return (
    <Animated.View entering={FadeInDown.delay((index % 10) * 50).duration(500)}>
      <TouchableOpacity 
        style={[styles.eventCard, { overflow: 'hidden' }]} 
        activeOpacity={0.7}
        onPress={() => onPress(item)}
      >
        <Image 
          source={require('../../assets/images/nola-av-logo.png.png')} 
          style={[{ position: 'absolute', right: -20, bottom: -20, transform: [{ rotate: '-15deg' }], zIndex: 0 }, { width: 140, height: 140, opacity: 0.03, tintColor: Colors.light.gold }]} 
          resizeMode="contain"
        />
        
        {/* Left Date Block */}
        <View style={styles.cardDateBlock}>
          <Text style={styles.cardMonth}>{startMonth}</Text>
          <Text style={styles.cardDay}>{startDay}</Text>
          <Text style={styles.cardDuration}>{durationText}</Text>
        </View>

        {/* Center Content Block */}
        <View style={styles.cardContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{titleText}</Text>
            {user && (
              <TouchableOpacity 
                onPress={() => toggleSaveEvent && toggleSaveEvent(item.id)} 
                style={{ padding: 4, zIndex: 10 }}
              >
                <Ionicons 
                  name={isSaved ? "heart" : "heart-outline"} 
                  size={20} 
                  color={isSaved ? "#FF3B30" : Colors.light.textSecondary} 
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardDetailRow}>
            <Ionicons name="location-sharp" size={14} color={Colors.light.gold} />
            <Text style={[styles.cardDetailText, { color: Colors.light.text, fontFamily: 'PoppinsSemiBold' }]} numberOfLines={1}>
              {locationText}
            </Text>
          </View>

          <View style={styles.cardDetailRow}>
            <Ionicons name="calendar-outline" size={14} color="#aaa" />
            <Text style={styles.cardDetailText}>
              {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) : ''}
              {!isSameDay && end ? ` - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}` : (start ? `, ${start.getFullYear()}` : '')}
            </Text>
          </View>

          {sourceTag ? (
            <View style={[styles.typeTag, { borderColor: 'rgba(212, 175, 55, 0.2)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }]}>
              <Text style={[styles.typeTagText, { color: Colors.light.gold }]}>{sourceTag}</Text>
            </View>
          ) : null}
        </View>
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
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
    const venueConfig = dynamicVenues[venueText] || { label: venueText, color: Colors.light.gold };

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
                        color={savedEvents.has(selectedEvent.id) ? "#FF3B30" : Colors.light.gold} 
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: (venueConfig.color || Colors.light.gold) + '1a', borderColor: venueConfig.color || Colors.light.gold }]}>
                <View style={[styles.filterDot, { backgroundColor: venueConfig.color || Colors.light.gold }]} />
                <Text style={[styles.badgeText, { color: venueConfig.color || Colors.light.gold }]}>{venueConfig.label || venueText}</Text>
              </View>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="business" size={20} color={Colors.light.gold} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>VENUE</Text>
                  <Text style={styles.modalValue}>{venueText}</Text>
                </View>
              </View>
              
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="location" size={20} color={Colors.light.gold} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>HALLS / ROOMS</Text>
                  <Text style={styles.modalValue}>{hallText}</Text>
                </View>
              </View>
              
              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.light.gold} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>START DATE</Text>
                  <Text style={styles.modalValue}>{startDateStr}</Text>
                </View>
              </View>

              <View style={styles.modalInfoRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="time-outline" size={20} color={Colors.light.gold} />
                </View>
                <View style={styles.modalInfoContent}>
                  <Text style={styles.modalLabel}>END DATE</Text>
                  <Text style={styles.modalValue}>{endDateStr}</Text>
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
                <Ionicons name="calendar-outline" size={18} color={Colors.light.gold} />
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
    backgroundColor: Colors.light.cardBackground,
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
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
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
    backgroundColor: Colors.light.cardBackground,
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
    backgroundColor: Colors.light.cardBackground,
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
    backgroundColor: Colors.light.cardBackground,
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
    color: Colors.light.gold,
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
    backgroundColor: Colors.light.gold,
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
    fontFamily: 'PoppinsSemiBold',
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
  },
  modalCloseIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.light.glassBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalCloseBtnText: {
    fontFamily: 'OpenSans',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
    color: '#aaa',
  }
});
