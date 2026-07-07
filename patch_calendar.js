const fs = require('fs');

const originalRenderMonthGrid = `
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
        
        <ScrollView bounces={false} style={{ flex: 1 }}>
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
                    if (occupiedLevels[\`\${level}-\${c}\`]) {
                      hasOverlap = true;
                      break;
                    }
                  }
                  if (!hasOverlap) {
                    layout.level = level;
                    for (let c = layout.startCol; c < layout.startCol + layout.duration; c++) {
                      occupiedLevels[\`\${level}-\${c}\`] = true;
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
                      while(occupiedLevels[\`\${l}-\${dIndex}\`]) {
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
                      const left = \`\${layout.startCol * (100 / 7)}%\`;
                      const width = \`\${layout.duration * (100 / 7)}%\`;
                      const top = layout.level * 22 + 28;
                      
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
        </ScrollView>
      </View>
    );
  };`;

const originalGridStyles = `
  // Grid Month Styles
  gridWrapper: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  gridMonthText: {
    fontFamily: 'CinzelSemiBold',
    fontSize: 18,
    color: '#c9a84c',
  },
  gridNavBtn: {
    padding: 4,
  },
  weekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    fontFamily: 'OpenSans',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
  },
  gridBodyContinuous: {
    flexDirection: 'column',
  },
  weekRowContinuous: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    height: 100,
    overflow: 'hidden',
  },
  weekCellsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  gridCellContinuous: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#222',
    padding: 2,
  },
  dateNumberWrap: {
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateNumberWrapToday: {
    backgroundColor: '#c9a84c',
  },
  dateNumberText: {
    fontFamily: 'OpenSans',
    fontSize: 10,
    color: '#aaa',
  },
  dateNumberTextToday: {
    color: '#000',
    fontWeight: 'bold',
  },
  overflowIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overflowText: {
    fontFamily: 'OpenSans',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#aaa',
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
  },
  absoluteEventText: {
    fontFamily: 'OpenSans',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
`;

const fileStr = fs.readFileSync('src/screens/CalendarScreen.js', 'utf8');

// Replace renderMonthGrid
const renderMonthGridStart = fileStr.indexOf('const renderMonthGrid = () => {');
const renderModalStart = fileStr.indexOf('const renderModal = () => {');
if (renderMonthGridStart === -1 || renderModalStart === -1) {
  console.log("Could not find renderMonthGrid bounds");
  process.exit(1);
}

const fileStr2 = fileStr.slice(0, renderMonthGridStart) + originalRenderMonthGrid + '\\n\\n  ' + fileStr.slice(renderModalStart);

// Replace styles
const stylesStart = fileStr2.indexOf('// Month Grid Styles');
const modalStylesStart = fileStr2.indexOf('// Modal styles');
if (stylesStart === -1 || modalStylesStart === -1) {
  console.log("Could not find styles bounds");
  process.exit(1);
}

const fileStr3 = fileStr2.slice(0, stylesStart) + originalGridStyles + '\\n  ' + fileStr2.slice(modalStylesStart);

fs.writeFileSync('src/screens/CalendarScreen.js', fileStr3);
console.log("Successfully restored continuous horizontal bars logic!");
