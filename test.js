Created At: 2026-07-06T08:15:46Z
Completed At: 2026-07-06T08:15:46Z
File Path: `file:///c:/Users/Shime/Desktop/Nola%20Visual%20Arts%20and%20AV%20Academy,%20Org/Web%20Dev/no-signal-app/src/screens/CalendarScreen.js`
Total Lines: 822
Total Bytes: 26898
Showing lines 1 to 800
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: import React, { useEffect, useState } from 'react';
2: import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, ScrollView, Modal, SafeAreaView } from 'react-native';
3: import { collection, getDocs } from 'firebase/firestore';
4: import { db } from '../config/firebase';
5: import { Ionicons } from '@expo/vector-icons';
6: 
7: const VENUES = {
8:   'NOMCC':              { label: 'MCCNO',          color: '#4a90e2' },
9:   'Hyatt Regency':      { label: 'Hyatt Regency',  color: '#50b86c' },
10:   'Sheraton New Orleans':{ label: 'Sheraton',       color: '#e8954a' },
11:   'Hilton Riverside':   { label: 'Hilton',          color: '#c0574a' },
12:   'Marriott':           { label: 'Marriott',        color: '#9b6bb5' },
13: };
14: 
15: function parseDate(str) {
16:   if (!str) return new Date();
17:   return new Date(str.includes('T') ? str : str + 'T00:00');
18: }
19: 
20: function getDurationDays(start, end) {
21:   if (!start || !end) return 1;
22:   const s = parseDate(start);
23:   const e = parseDate(end);
24:   return Math.max(1, Math.round((e - s) / 86400000));
25: }
26: 
27: function formatDateTime(str) {
28:   if (!str) return '';
29:   const d = parseDate(str);
30:   const opts = { month: 'short', day: 'numeric', year: 'numeric' };
31:   return d.toLocaleDateString('en-US', opts);
32: }
33: 
34: function formatGoogleDate(dateStr) {
35:   if (!dateStr) return '';
36:   const d = parseDate(dateStr);
37:   return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
38: }
39: 
40: function generateGoogleCalendarLink(event) {
41:   const text = encodeURIComponent(event.name || "Event");
42:   const dates = `${formatGoogleDate(event.loadIn)}/${formatGoogleDate(event.loadOut)}`;
43:   const details = encodeURIComponent(event.type || "");
44:   const location = encodeURIComponent(event.venue || "");
45:   return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
46: }
47: 
48: export default function CalendarScreen() {
49:   const [events, setEvents] = useState([]);
50:   const [loading, setLoading] = useState(true);
51:   const [activeView, setActiveView] = useState('calendar');
52:   const [activeVenue, setActiveVenue] = useState('all');
53:   
54:   const [selectedEvent, setSelectedEvent] = useState(null);
55:   
56:   // State for Month Grid Navigation
57:   const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
58: 
59:   useEffect(() => {
60:     const fetchEvents = async () => {
61:       try {
62:         const querySnapshot = await getDocs(collection(db, 'calendar_events'));
63:         const eventsList = [];
64:         const today = new Date();
65:         today.setHours(0, 0, 0, 0);
66: 
67:         const twoWeeksAgo = new Date(today);
68:         twoWeeksAgo.setDate(today.getDate() - 14);
69: 
70:         querySnapshot.forEach((doc) => {
71:           const data = doc.data();
72:           const endDate = parseDate(data.loadOut);
73:           // Show upcoming events AND events that ended within the last 14 days
74:           if (endDate >= twoWeeksAgo) {
75:             eventsList.push({ id: doc.id, ...data });
76:           }
77:         });
78:         
79:         eventsList.sort((a, b) => parseDate(a.loadIn) - parseDate(b.loadIn));
80:         setEvents(eventsList);
81:       } catch (error) {
82:         console.error("Error fetching calendar events: ", error);
83:       } finally {
84:         setLoading(false);
85:       }
86:     };
87:     fetchEvents();
88:   }, []);
89: 
90:   const filteredEvents = activeVenue === 'all' ? events : events.filter(e => e.venue === activeVenue);
91: 
92:   const openURL = (url) => {
93:     if (url) {
94:       Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
95:     }
96:   };
97: 
98:   const renderFilters = () => (
99:     <View style={styles.controlsContainer}>
100:       <View style={styles.viewToggle}>
101:         <TouchableOpacity 
102:           style={[styles.viewBtn, activeView === 'calendar' && styles.viewBtnActive]} 
103:           onPress={() => setActiveView('calendar')}
104:         >
105:           <Ionicons name="calendar-outline" size={14} color={activeView === 'calendar' ? '#000' : '#888'} />
106:           <Text style={[styles.viewBtnText, activeView === 'calendar' && styles.viewBtnTextActive]}>CALENDAR</Text>
107:         </TouchableOpacity>
108:         <TouchableOpacity 
109:           style={[styles.viewBtn, activeView === 'table' && styles.viewBtnActive]} 
110:           onPress={() => setActiveView('table')}
111:         >
112:           <Ionicons name="list" size={14} color={activeView === 'table' ? '#000' : '#888'} />
113:           <Text style={[styles.viewBtnText, activeView === 'table' && styles.viewBtnTextActive]}>LIST</Text>
114:         </TouchableOpacity>
115:       </View>
116: 
117:       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
118:         <TouchableOpacity 
119:           style={[styles.filterPill, activeVenue === 'all' && styles.filterPillActive]} 
120:           onPress={() => setActiveVenue('all')}
121:         >
122:           <Text style={[styles.filterPillText, activeVenue === 'all' && styles.filterPillTextActive]}>All Venues</Text>
123:         </TouchableOpacity>
124:         {Object.entries(VENUES).map(([key, config]) => (
125:           <TouchableOpacity 
126:             key={key}
127:             style={[styles.filterPill, activeVenue === key && styles.filterPillActive]} 
128:             onPress={() => setActiveVenue(key)}
129:           >
130:             <View style={[styles.filterDot, { backgroundColor: config.color }]} />
131:             <Text style={[styles.filterPillText, activeVenue === key && styles.filterPillTextActive]}>{config.label}</Text>
132:           </TouchableOpacity>
133:         ))}
134:       </ScrollView>
135:     </View>
136:   );
137: 
138:   const renderTable = () => {
139:     if (filteredEvents.length === 0) return <Text style={styles.emptyText}>No events match the selected filter.</Text>;
140:     
141:     return (
142:       <View style={styles.tableWrapper}>
143:         <ScrollView horizontal bounces={false}>
144:           <View>
145:             <View style={styles.tableHeaderRow}>
146:               <Text style={[styles.th, { width: 220 }]}>EVENT</Text>
147:               <Text style={[styles.th, { width: 140 }]}>VENUE</Text>
148:               <Text style={[styles.th, { width: 140 }]}>HALL / LOCATION</Text>
149:               <Text style={[styles.th, { width: 200 }]}>RUN OF SHOW</Text>
150:               <Text style={[styles.th, { width: 60 }]}>DAYS</Text>
151:               <Text style={[styles.th, { width: 100 }]}>TYPE</Text>
152:             </View>
153:             
154:             <FlatList
155:               data={filteredEvents}
156:               keyExtractor={item => item.id}
157:               scrollEnabled={true}
158:               renderItem={({ item }) => {
159:                 const venueConfig = VENUES[item.venue] || { color: '#888' };
160:                 return (
161:                   <TouchableOpacity style={styles.tableRow} onPress={() => setSelectedEvent(item)}>
162:                     <Text style={[styles.td, styles.tdHighlight, { width: 220 }]} numberOfLines={2}>{item.name}</Text>
163:                     <View style={[styles.td, { width: 140, flexDirection: 'row', alignItems: 'center' }]}>
164:                       <View style={[styles.filterDot, { backgroundColor: venueConfig.color, marginRight: 6 }]} />
165:                       <Text style={styles.tdText} numberOfLines={1}>{item.venue}</Text>
166:                     </View>
167:                     <Text style={[styles.td, styles.tdText, { width: 140 }]} numberOfLines={1}>{item.hall}</Text>
168:                     <Text style={[styles.td, styles.tdText, { width: 200 }]}>{formatDateTime(item.loadIn)} - {formatDateTime(item.loadOut)}</Text>
169:                     <Text style={[styles.td, styles.tdText, { width: 60 }]}>{getDurationDays(item.loadIn, item.loadOut)}</Text>
170:                     <Text style={[styles.td, styles.tdText, { width: 100 }]}>{item.type}</Text>
171:                   </TouchableOpacity>
172:                 );
173:               }}
174:             />
175:           </View>
176:         </ScrollView>
177:       </View>
178:     );
179:   };
180: 
181:   const renderMonthGrid = () => {
182:     const year = currentMonthDate.getFullYear();
183:     const month = currentMonthDate.getMonth();
184:     
185:     // Month navigation
186:     const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
187:     const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));
188:     
189:     const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
190:     const daysInMonth = new Date(year, month + 1, 0).getDate();
191:     const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
192:     
193:     const gridDays = [];
194:     for (let i = 0; i < firstDayIndex; i++) {
195:       gridDays.push(new Date(year, month, i - firstDayIndex + 1));
196:     }
197:     for (let i = 1; i <= daysInMonth; i++) {
198:       gridDays.push(new Date(year, month, i));
199:     }
200:     const rem = gridDays.length % 7;
201:     if (rem !== 0) {
202:       for (let i = 1; i <= 7 - rem; i++) {
203:         gridDays.push(new Date(year, month + 1, i));
204:       }
205:     }
206: 
207:     const weeks = [];
208:     for (let i = 0; i < gridDays.length; i += 7) {
209:       weeks.push(gridDays.slice(i, i + 7));
210:     }
211:     
212:     const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
213:     
214:     return (
215:       <View style={styles.gridWrapper}>
216:         <View style={styles.gridHeader}>
217:           <TouchableOpacity onPress={prevMonth} style={styles.gridNavBtn}>
218:             <Ionicons name="chevron-back" size={20} color="#fff" />
219:           </TouchableOpacity>
220:           <Text style={styles.gridMonthText}>{monthName}</Text>
221:           <TouchableOpacity onPress={nextMonth} style={styles.gridNavBtn}>
222:             <Ionicons name="chevron-forward" size={20} color="#fff" />
223:           </TouchableOpacity>
224:         </View>
225:         
226:         <View style={styles.weekdaysRow}>
227:           {weekdays.map(d => (
228:             <Text key={d} style={styles.weekdayText}>{d}</Text>
229:           ))}
230:         </View>
231:         
232:         <ScrollView bounces={false} style={{ flex: 1 }}>
233:           <View style={styles.gridBodyContinuous}>
234:             {weeks.map((week, wIndex) => {
235:               const weekStart = week[0];
236:               const weekEnd = new Date(week[6]);
237:               weekEnd.setHours(23, 59, 59, 999);
238: 
239:               const weekEvents = filteredEvents.filter(e => {
240:                 const eStart = parseDate(e.loadIn);
241:                 const eEnd = parseDate(e.loadOut);
242:                 eStart.setHours(0,0,0,0);
243:                 eEnd.setHours(23,59,59,999);
244:                 return (eStart <= weekEnd && eEnd >= weekStart);
245:               });
246: 
247:               const eventLayouts = weekEvents.map(e => {
248:                 const eStart = parseDate(e.loadIn);
249:                 eStart.setHours(0,0,0,0);
250:                 const eEnd = parseDate(e.loadOut);
251:                 eEnd.setHours(23,59,59,999);
252:                 
253:                 const drawStart = eStart < weekStart ? weekStart : eStart;
254:                 const drawEnd = eEnd > weekEnd ? weekEnd : eEnd;
255:                 
256:                 // Safely calculate day difference ignoring time/DST
257:                 const utcWeekStart = Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
258:                 const utcDrawStart = Date.UTC(drawStart.getFullYear(), drawStart.getMonth(), drawStart.getDate());
259:                 const utcDrawEnd = Date.UTC(drawEnd.getFullYear(), drawEnd.getMonth(), drawEnd.getDate());
260:                 
261:                 const startCol = Math.floor((utcDrawStart - utcWeekStart) / 86400000);
262:                 const endCol = Math.floor((utcDrawEnd - utcWeekStart) / 86400000);
263:                 const duration = endCol - startCol + 1;
264:                 
265:                 return { event: e, startCol, duration, eStart, eEnd };
266:               });
267: 
268:               eventLayouts.sort((a, b) => a.startCol - b.startCol || b.duration - a.duration);
269: 
270:               // We have fixed height rows now (e.g. 100px) which means we can fit at most 3 levels of events (Level 0, 1, 2)
271:               // We'll limit max levels and simply not render the layout if it exceeds the limit.
272:               const MAX_LEVEL = 2; 
273: 
274:               const occupiedLevels = {};
275:               const visibleLayouts = [];
276:               
277:               eventLayouts.forEach(layout => {
278:                 let level = 0;
279:                 while (true) {
280:                   let hasOverlap = false;
281:                   for (let c = layout.startCol; c < layout.startCol + layout.duration; c++) {
282:                     if (occupiedLevels[`${level}-${c}`]) {
283:                       hasOverlap = true;
284:                       break;
285:                     }
286:                   }
287:                   if (!hasOverlap) {
288:                     layout.level = level;
289:                     for (let c = layout.startCol; c < layout.startCol + layout.duration; c++) {
290:                       occupiedLevels[`${level}-${c}`] = true;
291:                     }
292:                     if (level <= MAX_LEVEL) {
293:                        visibleLayouts.push(layout);
294:                     }
295:                     break;
296:                   }
297:                   level++;
298:                 }
299:               });
300: 
301:               return (
302:                 <View key={wIndex} style={styles.weekRowContinuous}>
303:                   <View style={styles.weekCellsRow}>
304:                     {week.map((dateObj, dIndex) => {
305:                       const isCurrentMonth = dateObj.getMonth() === month;
306:                       const isToday = dateObj.toDateString() === new Date().toDateString();
307:                       
308:                       // Check for overflow
309:                       let overflowCount = 0;
310:                       let l = MAX_LEVEL + 1;
311:                       while(occupiedLevels[`${l}-${dIndex}`]) {
312:                         overflowCount++;
313:                         l++;
314:                       }
315:                       
316:                       return (
317:                         <View key={dIndex} style={styles.gridCellContinuous}>
318:                           <View style={[styles.dateNumberWrap, isToday && styles.dateNumberWrapToday]}>
319:                             <Text style={[styles.dateNumberText, isToday && styles.dateNumberTextToday, !isCurrentMonth && { opacity: 0.3 }]}>
320:                               {dateObj.getDate()}
321:                             </Text>
322:                           </View>
323:                           {overflowCount > 0 && (
324:                             <View style={styles.overflowIndicator}>
325:                               <Text style={styles.overflowText}>+{overflowCount} more</Text>
326:                             </View>
327:                           )}
328:                         </View>
329:                       );
330:                     })}
331:                   </View>
332:                   
333:                   <View style={styles.weekEventsLayer}>
334:                     {visibleLayouts.map(layout => {
335:                       const venueConfig = VENUES[layout.event.venue] || { color: '#888' };
336:                       const left = `${layout.startCol * (100 / 7)}%`;
337:                       const width = `${layout.duration * (100 / 7)}%`;
338:                       const top = layout.level * 22 + 28;
339:                       
340:                       const isContinuesLeft = layout.eStart < weekStart;
341:                       const isContinuesRight = layout.eEnd > weekEnd;
342:                       
343:                       return (
344:                         <TouchableOpacity 
345:                           key={layout.event.id}
346:                           onPress={() => setSelectedEvent(layout.event)}
347:                           style={[
348:                             styles.absoluteEventBar, 
349:                             { 
350:                               backgroundColor: venueConfig.color,
351:                               left, width, top,
352:                               marginLeft: isContinuesLeft ? 0 : 2,
353:                               marginRight: isContinuesRight ? 0 : 2,
354:                               borderTopLeftRadius: isContinuesLeft ? 0 : 4,
355:                               borderBottomLeftRadius: isContinuesLeft ? 0 : 4,
356:                               borderTopRightRadius: isContinuesRight ? 0 : 4,
357:                               borderBottomRightRadius: isContinuesRight ? 0 : 4,
358:                             }
359:                           ]}
360:                         >
361:                           {(!isContinuesLeft || layout.startCol === 0) && (
362:                             <Text style={styles.absoluteEventText} numberOfLines={1}>{layout.event.name}</Text>
363:                           )}
364:                         </TouchableOpacity>
365:                       );
366:                     })}
367:                   </View>
368:                 </View>
369:               );
370:             })}
371:           </View>
372:         </ScrollView>
373:       </View>
374:     );
375:   };
376: 
377:   const renderModal = () => {
378:     if (!selectedEvent) return null;
379:     const venueConfig = VENUES[selectedEvent.venue] || { label: selectedEvent.venue, color: '#888' };
380:     
381:     return (
382:       <Modal visible={!!selectedEvent} animationType="fade" transparent={true} onRequestClose={() => setSelectedEvent(null)}>
383:         <View style={styles.modalBackdrop}>
384:           <View style={styles.modalContainer}>
385:             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedEvent(null)}>
386:               <Ionicons name="close" size={24} color="#fff" />
387:             </TouchableOpacity>
388:             
389:             <View style={styles.modalHeader}>
390:               <Text style={styles.modalTitle}>{selectedEvent.name}</Text>
391:               <View style={[styles.badge, { backgroundColor: venueConfig.color + '33', borderColor: venueConfig.color }]}>
392:                 <View style={[styles.filterDot, { backgroundColor: venueConfig.color }]} />
393:                 <Text style={[styles.badgeText, { color: venueConfig.color }]}>{venueConfig.label}</Text>
394:               </View>
395:             </View>
396:             
397:             <View style={styles.modalBody}>
398:               <View style={styles.modalRow}>
399:                 <Text style={styles.modalLabel}>VENUE</Text>
400:                 <Text style={styles.modalValue}>{selectedEvent.venue}</Text>
401:               </View>
402:               <View style={styles.modalRow}>
403:                 <Text style={styles.modalLabel}>HALL / LOC</Text>
404:                 <Text style={styles.modalValue}>{selectedEvent.hall}</Text>
405:               </View>
406:               <View style={styles.modalRow}>
407:                 <Text style={styles.modalLabel}>DATES</Text>
408:                 <Text style={styles.modalValue}>{formatDateTime(selectedEvent.loadIn)} - {formatDateTime(selectedEvent.loadOut)}</Text>
409:               </View>
410:               <View style={styles.modalRow}>
411:                 <Text style={styles.modalLabel}>TYPE</Text>
412:                 <Text style={styles.modalValue}>{selectedEvent.type}</Text>
413:               </View>
414:             </View>
415:             
416:             <TouchableOpacity style={styles.websiteBtn} onPress={() => {
417:               setSelectedEvent(null);
418:               openURL(selectedEvent.url);
419:             }}>
420:               <Text style={styles.websiteBtnText}>VISIT OFFICIAL WEBSITE</Text>
421:               <Ionicons name="open-outline" size={16} color="#000" />
422:             </TouchableOpacity>
423:             
424:             <TouchableOpacity style={styles.googleCalBtn} onPress={() => {
425:               openURL(generateGoogleCalendarLink(selectedEvent));
426:             }}>
427:               <Text style={styles.googleCalBtnText}>ADD TO GOOGLE CALENDAR</Text>
428:               <Ionicons name="calendar-outline" size={16} color="#c9a84c" />
429:             </TouchableOpacity>
430:             
431:           </View>
432:         </View>
433:       </Modal>
434:     );
435:   };
436: 
437:   return (
438:     <SafeAreaView style={styles.container}>
439:       <Text style={styles.headerTitle}>Convention Calendar</Text>
440:       
441:       {renderFilters()}
442: 
443:       {loading ? (
444:         <View style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator size="large" color="#c9a84c" /></View>
445:       ) : (
446:         <View style={{flex: 1, paddingHorizontal: 16}}>
447:           {activeView === 'table' ? renderTable() : renderMonthGrid()}
448:         </View>
449:       )}
450: 
451:       {renderModal()}
452:     </SafeAreaView>
453:   );
454: }
455: 
456: const styles = StyleSheet.create({
457:   container: {
458:     flex: 1,
459:     backgroundColor: '#0a0a0a',
460:   },
461:   headerTitle: {
462:     fontSize: 24,
463:     fontFamily: 'CinzelSemiBold',
464:     color: '#fff',
465:     marginLeft: 16,
466:     marginTop: 10,
467:     marginBottom: 20,
468:   },
469:   controlsContainer: {
470:     flexDirection: 'column',
471:     paddingHorizontal: 16,
472:     marginBottom: 20,
473:     gap: 15,
474:   },
475:   viewToggle: {
476:     flexDirection: 'row',
477:     backgroundColor: '#141414',
478:     borderWidth: 1,
479:     borderColor: '#333',
480:     borderRadius: 20,
481:     alignSelf: 'flex-start',
482:     overflow: 'hidden',
483:   },
484:   viewBtn: {
485:     flexDirection: 'row',
486:     alignItems: 'center',
487:     paddingVertical: 8,
488:     paddingHorizontal: 16,
489:     gap: 6,
490:   },
491:   viewBtnActive: {
492:     backgroundColor: '#c9a84c',
493:   },
494:   viewBtnText: {
495:     fontFamily: 'OpenSans',
496:     fontSize: 10,
497:     fontWeight: 'bold',
498:     letterSpacing: 1,
499:     color: '#888',
500:   },
501:   viewBtnTextActive: {
502:     color: '#000',
503:   },
504:   filtersScroll: {
505:     flexDirection: 'row',
506:     gap: 8,
507:     alignItems: 'center',
508:   },
509:   filterPill: {
510:     flexDirection: 'row',
511:     alignItems: 'center',
512:     backgroundColor: '#141414',
513:     borderWidth: 1,
514:     borderColor: '#333',
515:     paddingVertical: 6,
516:     paddingHorizontal: 12,
517:     borderRadius: 16,
518:     gap: 6,
519:     marginRight: 8,
520:   },
521:   filterPillActive: {
522:     borderColor: '#c9a84c',
523:   },
524:   filterPillText: {
525:     fontFamily: 'OpenSans',
526:     fontSize: 11,
527:     color: '#888',
528:   },
529:   filterPillTextActive: {
530:     color: '#fff',
531:     fontWeight: 'bold',
532:   },
533:   filterDot: {
534:     width: 6,
535:     height: 6,
536:     borderRadius: 3,
537:   },
538:   
539:   // Table styles
540:   tableWrapper: {
541:     flex: 1,
542:     backgroundColor: '#141414',
543:     borderWidth: 1,
544:     borderColor: '#333',
545:     borderRadius: 8,
546:     overflow: 'hidden',
547:     paddingBottom: 10,
548:   },
549:   tableHeaderRow: {
550:     flexDirection: 'row',
551:     backgroundColor: '#1a1a1a',
552:     borderBottomWidth: 1,
553:     borderBottomColor: '#333',
554:   },
555:   th: {
556:     paddingVertical: 12,
557:     paddingHorizontal: 16,
558:     fontFamily: 'OpenSans',
559:     fontSize: 10,
560:     fontWeight: 'bold',
561:     color: '#666',
562:     letterSpacing: 1,
563:   },
564:   tableRow: {
565:     flexDirection: 'row',
566:     borderBottomWidth: 1,
567:     borderBottomColor: '#222',
568:     alignItems: 'center',
569:   },
570:   td: {
571:     paddingVertical: 12,
572:     paddingHorizontal: 16,
573:     justifyContent: 'center',
574:   },
575:   tdText: {
576:     fontFamily: 'OpenSans',
577:     fontSize: 12,
578:     color: '#aaa',
579:   },
580:   tdHighlight: {
581:     fontFamily: 'CinzelSemiBold',
582:     fontSize: 13,
583:     color: '#e0e0e0',
584:   },
585:   emptyText: {
586:     color: '#666',
587:     textAlign: 'center',
588:     marginTop: 40,
589:     fontFamily: 'OpenSans',
590:   },
591: 
592:   // Grid Month Styles
593:   gridWrapper: {
594:     flex: 1,
595:     backgroundColor: '#141414',
596:     borderWidth: 1,
597:     borderColor: '#333',
598:     borderRadius: 8,
599:     overflow: 'hidden',
600:     paddingBottom: 10,
601:   },
602:   gridHeader: {
603:     flexDirection: 'row',
604:     justifyContent: 'space-between',
605:     alignItems: 'center',
606:     paddingHorizontal: 16,
607:     paddingVertical: 12,
608:     backgroundColor: '#1a1a1a',
609:     borderBottomWidth: 1,
610:     borderBottomColor: '#333',
611:   },
612:   gridMonthText: {
613:     fontFamily: 'CinzelSemiBold',
614:     fontSize: 18,
615:     color: '#c9a84c',
616:   },
617:   gridNavBtn: {
618:     padding: 4,
619:   },
620:   weekdaysRow: {
621:     flexDirection: 'row',
622:     borderBottomWidth: 1,
623:     borderBottomColor: '#333',
624:     backgroundColor: '#111',
625:   },
626:   weekdayText: {
627:     flex: 1,
628:     textAlign: 'center',
629:     paddingVertical: 8,
630:     fontFamily: 'OpenSans',
631:     fontSize: 10,
632:     fontWeight: 'bold',
633:     color: '#666',
634:     letterSpacing: 1,
635:   },
636:   gridBodyContinuous: {
637:     flexDirection: 'column',
638:   },
639:   weekRowContinuous: {
640:     position: 'relative',
641:     borderBottomWidth: 1,
642:     borderBottomColor: '#222',
643:     height: 100,
644:     overflow: 'hidden',
645:   },
646:   weekCellsRow: {
647:     ...StyleSheet.absoluteFillObject,
648:     flexDirection: 'row',
649:   },
650:   gridCellContinuous: {
651:     flex: 1,
652:     borderRightWidth: 1,
653:     borderRightColor: '#222',
654:     padding: 2,
655:   },
656:   dateNumberWrap: {
657:     alignSelf: 'center',
658:     width: 20,
659:     height: 20,
660:     borderRadius: 10,
661:     justifyContent: 'center',
662:     alignItems: 'center',
663:     marginBottom: 2,
664:   },
665:   dateNumberWrapToday: {
666:     backgroundColor: '#c9a84c',
667:   },
668:   dateNumberText: {
669:     fontFamily: 'OpenSans',
670:     fontSize: 10,
671:     color: '#aaa',
672:   },
673:   dateNumberTextToday: {
674:     color: '#000',
675:     fontWeight: 'bold',
676:   },
677:   overflowIndicator: {
678:     position: 'absolute',
679:     bottom: 2,
680:     left: 0,
681:     right: 0,
682:     alignItems: 'center',
683:   },
684:   overflowText: {
685:     fontFamily: 'OpenSans',
686:     fontSize: 9,
687:     fontWeight: 'bold',
688:     color: '#aaa',
689:   },
690:   weekEventsLayer: {
691:     ...StyleSheet.absoluteFillObject,
692:     pointerEvents: 'box-none',
693:   },
694:   absoluteEventBar: {
695:     position: 'absolute',
696:     height: 18,
697:     paddingHorizontal: 4,
698:     justifyContent: 'center',
699:   },
700:   absoluteEventText: {
701:     fontFamily: 'OpenSans',
702:     fontSize: 9,
703:     fontWeight: 'bold',
704:     color: '#fff',
705:   },
706: 
707:   // Modal styles
708:   modalBackdrop: {
709:     flex: 1,
710:     backgroundColor: 'rgba(0,0,0,0.8)',
711:     justifyContent: 'center',
712:     alignItems: 'center',
713:     padding: 20,
714:   },
715:   modalContainer: {
716:     width: '100%',
717:     backgroundColor: '#141414',
718:     borderWidth: 1,
719:     borderColor: '#333',
720:     borderRadius: 12,
721:     padding: 24,
722:     position: 'relative',
723:   },
724:   modalCloseBtn: {
725:     position: 'absolute',
726:     top: 16,
727:     right: 16,
728:     zIndex: 10,
729:   },
730:   modalHeader: {
731:     marginBottom: 24,
732:     paddingRight: 30,
733:   },
734:   modalTitle: {
735:     fontFamily: 'CinzelSemiBold',
736:     fontSize: 20,
737:     color: '#fff',
738:     marginBottom: 10,
739:   },
740:   badge: {
741:     flexDirection: 'row',
742:     alignItems: 'center',
743:     paddingHorizontal: 8,
744:     paddingVertical: 4,
745:     borderRadius: 12,
746:     borderWidth: 1,
747:     alignSelf: 'flex-start',
748:     gap: 6,
749:   },
750:   badgeText: {
751:     fontSize: 10,
752:     fontFamily: 'OpenSans',
753:     fontWeight: 'bold',
754:   },
755:   modalBody: {
756:     backgroundColor: '#1a1a1a',
757:     borderRadius: 8,
758:     padding: 16,
759:     marginBottom: 24,
760:   },
761:   modalRow: {
762:     flexDirection: 'row',
763:     justifyContent: 'space-between',
764:     paddingVertical: 8,
765:     borderBottomWidth: 1,
766:     borderBottomColor: '#222',
767:   },
768:   modalLabel: {
769:     fontFamily: 'OpenSans',
770:     fontSize: 10,
771:     fontWeight: 'bold',
772:     color: '#666',
773:     letterSpacing: 1,
774:   },
775:   modalValue: {
776:     fontFamily: 'OpenSans',
777:     fontSize: 12,
778:     color: '#ddd',
779:     maxWidth: '70%',
780:     textAlign: 'right',
781:   },
782:   websiteBtn: {
783:     backgroundColor: '#c9a84c',
784:     flexDirection: 'row',
785:     justifyContent: 'center',
786:     alignItems: 'center',
787:     paddingVertical: 14,
788:     borderRadius: 8,
789:     gap: 8,
790:     shadowColor: '#c9a84c',
791:     shadowOffset: { width: 0, height: 0 },
792:     shadowOpacity: 0.5,
793:     shadowRadius: 10,
794:   },
795:   websiteBtnText: {
796:     fontFamily: 'OpenSans',
797:     fontWeight: 'bold',
798:     fontSize: 12,
799:     letterSpacing: 1,
800:     color: '#000',
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
