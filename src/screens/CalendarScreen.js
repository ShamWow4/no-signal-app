import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, ScrollView, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const VENUES = {
  'NOMCC':              { label: 'MCCNO',          color: '#4a90e2' },
  'Hyatt Regency':      { label: 'Hyatt Regency',  color: '#50b86c' },
  'Sheraton New Orleans':{ label: 'Sheraton',       color: '#e8954a' },
  'Hilton Riverside':   { label: 'Hilton',          color: '#c0574a' },
  'Marriott':           { label: 'Marriott',        color: '#9b6bb5' },
};

function parseDate(str) {
  if (!str) return new Date();
  return new Date(str.includes('T') ? str : str + 'T00:00');
}

function getDurationDays(start, end) {
  if (!start || !end) return 1;
  const s = parseDate(start);
  const e = parseDate(end);
  return Math.max(1, Math.round((e - s) / 86400000));
}

function formatGoogleDate(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
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
  const [activeView, setActiveView] = useState('list'); // Default to list view
  const [activeVenue, setActiveVenue] = useState('all');
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // State for Month Grid Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'calendar_events'));
        const eventsList = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);

        querySnapshot.forEach((doc) => {
          const d = doc.data();
          let loadIn = d.loadIn;
          let loadOut = d.loadOut;

          // Parse 'Dates' field from scraper (e.g. '07/10/2026 - 07/12/2026' or '07/10/2026')
          if (d['Dates']) {
            const parts = d['Dates'].split('-').map(s => s.trim());
            if (parts.length === 2) {
              loadIn = parts[0];
              loadOut = parts[1];
            } else if (parts.length === 1) {
              loadIn = parts[0];
              loadOut = parts[0];
            }
          }

          const endDate = parseDate(loadOut);
          if (endDate >= twoWeeksAgo) {
            eventsList.push({ 
              id: doc.id,
              name: d['Title'] || d.name,
              venue: d['Venue'] || d.venue,
              location: d['City'] || d.location,
              loadIn,
              loadOut,
              type: d.type || 'CONVENTION'
            });
          }
        });
        
        eventsList.sort((a, b) => parseDate(a.loadIn) - parseDate(b.loadIn));
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching calendar events: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = activeVenue === 'all' ? events : events.filter(e => e.venue === activeVenue);

  const openURL = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const renderFilters = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.viewToggle}>
        <TouchableOpacity 
          style={[styles.viewBtn, activeView === 'list' && styles.viewBtnActive]} 
          onPress={() => setActiveView('list')}
        >
          <Ionicons name="list" size={16} color={activeView === 'list' ? '#000' : '#888'} />
          <Text style={[styles.viewBtnText, activeView === 'list' && styles.viewBtnTextActive]}>AGENDA</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewBtn, activeView === 'calendar' && styles.viewBtnActive]} 
          onPress={() => setActiveView('calendar')}
        >
          <Ionicons name="calendar-outline" size={16} color={activeView === 'calendar' ? '#000' : '#888'} />
          <Text style={[styles.viewBtnText, activeView === 'calendar' && styles.viewBtnTextActive]}>MONTH</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
        <TouchableOpacity 
          style={[styles.filterPill, activeVenue === 'all' && styles.filterPillActive]} 
          onPress={() => setActiveVenue('all')}
        >
          <Text style={[styles.filterPillText, activeVenue === 'all' && styles.filterPillTextActive]}>All Venues</Text>
        </TouchableOpacity>
        {Object.entries(VENUES).map(([key, config]) => (
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
  const venueConfig = VENUES[item.venue] || { label: item.venue, color: '#888' };
  const start = parseDate(item.loadIn);
  const end = parseDate(item.loadOut);
  const month = start.toLocaleString('default', { month: 'short' }).toUpperCase();
  const day = start.getDate();
  const duration = getDurationDays(item.loadIn, item.loadOut);
  
  return (
    <Animated.View entering={FadeInDown.delay((index % 10) * 50).duration(500)}>
      <TouchableOpacity 
        style={[styles.eventCard, Shadows.subtle]} 
        activeOpacity={0.7}
        onPress={() => onPress(item)}
      >
      <View style={styles.cardDateBlock}>
        <Text style={styles.cardMonth}>{month}</Text>
        <Text style={styles.cardDay}>{day}</Text>
        <Text style={styles.cardDuration}>{duration} {duration === 1 ? 'DAY' : 'DAYS'}</Text>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardDetailRow}>
          <Ionicons name="location" size={12} color={venueConfig.color} />
          <Text style={styles.cardDetailText} numberOfLines={1}>{venueConfig.label}{item.hall ? ` - ${item.hall}` : ''}</Text>
        </View>
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
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
});

  const handlePressEvent = React.useCallback((item) => {
    setSelectedEvent(item);
  }, []);

  const renderEventItem = React.useCallback(({ item, index }) => (
    <EventCard item={item} index={index} onPress={handlePressEvent} />
  ), [handlePressEvent]);

  const renderAgendaList = () => {
    if (filteredEvents.length === 0) return <Text style={styles.emptyText}>No upcoming events found.</Text>;
    
    return (
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={{ paddingBottom: 40 }}
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
          <View style={styles.gridBodyContinuous}>
            {weeks.map((week, wIndex) => {
              const weekStart = week[0];
              const weekEnd = new Date(week[6]);
              weekEnd.setHours(23, 59, 59, 999);

              const weekEvents = filteredEvents.filter(e => {
                const eStart = parseDate(e.loadIn);
                const eEnd = parseDate(e.loadOut);
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
                
                // Safely calculate day difference ignoring time/DST
                const utcWeekStart = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
                const utcDrawStart = Date.UTC(drawStart.getFullYear(), drawStart.getMonth(), drawStart.getDate());
                const utcDrawEnd = Date.UTC(drawEnd.getFullYear(), drawEnd.getMonth(), drawEnd.getDate());
                
                const startCol = Math.floor((utcDrawStart - utcWeekStart) / 86400000);
                const endCol = Math.floor((utcDrawEnd - utcWeekStart) / 86400000);
                const duration = endCol - startCol + 1;
                
                return { event: e, startCol, duration, eStart, eEnd };
              });

              eventLayouts.sort((a, b) => a.startCol - b.startCol || b.duration - a.duration);

              // We have fixed height rows now (e.g. 100px) which means we can fit at most 3 levels of events (Level 0, 1, 2)
              // We'll limit max levels and simply not render the layout if it exceeds the limit.
              const MAX_LEVEL = 2; 

              const occupiedLevels = {};
              const visibleLayouts = [];
              
              eventLayouts.forEach(layout => {
                let level = 0;
                while (true) {
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
                    if (level <= MAX_LEVEL) {
                       visibleLayouts.push(layout);
                    }
                    break;
                  }
                  level++;
                }
              });

              return (
                <View key={wIndex} style={styles.weekRowContinuous}>
                  <View style={styles.weekCellsRow}>
                    {week.map((dateObj, dIndex) => {
                      const isCurrentMonth = dateObj.getMonth() === month;
                      const isToday = dateObj.toDateString() === new Date().toDateString();
                      
                      // Check for overflow
                      let overflowCount = 0;
                      let l = MAX_LEVEL + 1;
                      while(occupiedLevels[`${l}-${dIndex}`]) {
                        overflowCount++;
                        l++;
                      }
                      
                      return (
                        <View key={dIndex} style={styles.gridCellContinuous}>
                          <View style={[styles.dateNumberWrap, isToday && styles.dateNumberWrapToday]}>
                            <Text style={[styles.dateNumberText, isToday && styles.dateNumberTextToday, !isCurrentMonth && { opacity: 0.3 }]}>
                              {dateObj.getDate()}
                            </Text>
                          </View>
                          {overflowCount > 0 && (
                            <View style={styles.overflowIndicator}>
                              <Text style={styles.overflowText}>+{overflowCount} more</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  
                  <View style={styles.weekEventsLayer}>
                    {visibleLayouts.map(layout => {
                      const venueConfig = VENUES[layout.event.venue] || { color: '#888' };
                      const left = `${layout.startCol * (100 / 7)}%`;
                      const width = `${layout.duration * (100 / 7)}%`;
                      const top = layout.level * 20 + 26;
                      
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
                              left, width, top,
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
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderModal = () => {
    if (!selectedEvent) return null;
    const venueConfig = VENUES[selectedEvent.venue] || { label: selectedEvent.venue, color: '#888' };
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
              <Text style={styles.modalTitle}>{selectedEvent.name}</Text>
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
          <Text style={styles.headerTitle}>CONVENTION CALENDAR</Text>
          {renderFilters()}
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#D3A625" /></View>
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'CinzelSemiBold',
    color: Colors.light.text,
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 20,
    letterSpacing: 1,
  },
  controlsContainer: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    marginBottom: 0,
    gap: 15,
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
    paddingVertical: 14,
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
    borderBottomColor: Colors.light.glassBorder,
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
    padding: 2,
  },
  dateNumberWrap: {
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    marginTop: 2,
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
  overflowIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 1,
  },
  overflowText: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 8,
    color: '#ccc',
  },
  weekEventsLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  absoluteEventBar: {
    position: 'absolute',
    height: 18,
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
