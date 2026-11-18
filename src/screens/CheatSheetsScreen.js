import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const CHEAT_SHEETS_DATA = [
  {
    id: 'dante',
    title: 'Dante / IP Networking',
    category: 'Audio',
    summary: 'Primary IP settings, QoS requirements, and latency tiers.',
    details: '• Default IP Range: 169.254.x.x (Auto-IP) or static 192.168.0.x\n• QoS DSCP Settings: Audio Clock (CS6), Audio Stream (EF - DSCP 46)\n• Latency Tiers: 1ms (small switched network), 2ms or 5ms (large multi-switch systems)\n• Switch Requirements: Gigabit switches with QoS enabled, EEE (Energy Efficient Ethernet) DISABLED.'
  },
  {
    id: 'dmx',
    title: 'DMX512 & RDM Pinouts',
    category: 'Lighting / LED',
    summary: '5-pin and 3-pin XLR wiring, universe channel limits.',
    details: '• XLR 5-Pin Pinout:\n  Pin 1: Shield / Common Drain\n  Pin 2: Data 1 Negative (Cold)\n  Pin 3: Data 1 Positive (Hot)\n  Pin 4: Data 2 Negative (Optional)\n  Pin 5: Data 2 Positive (Optional)\n• Channel Limit: 512 channels per universe.\n• Cable: 110-120 ohm impedance twisted pair data cable (Never use audio mic cable!).'
  },
  {
    id: 'edid',
    title: 'Common Resolution Timings',
    category: 'Video / LED',
    summary: 'Standard aspect ratios, pixel grids, and refresh rates.',
    details: '• 4K UHD: 3840 x 2160 @ 60Hz (16:9)\n• 1080p Full HD: 1920 x 1080 @ 60Hz / 59.94Hz\n• WUXGA: 1920 x 1200 @ 60Hz (16:10)\n• 720p HD: 1280 x 720 @ 60Hz\n• LED Wall Rule: Always match processor output exact frame rate to source (avoid 59.94 vs 60Hz mismatch stutter).'
  },
  {
    id: 'serial',
    title: 'RS-232 & Control Pinouts',
    category: 'Control',
    summary: 'DB9 pinouts for projector and switcher serial commands.',
    details: '• DB9 Null Modem (Crossed Rx/Tx):\n  Pin 2 (RXD) <---> Pin 3 (TXD)\n  Pin 3 (TXD) <---> Pin 2 (RXD)\n  Pin 5 (GND) <---> Pin 5 (GND)\n• Common Baud Rates: 9600, 38400, 115200 (8-N-1).'
  }
];

export default function CheatSheetsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cachedSheets, setCachedSheets] = useState(CHEAT_SHEETS_DATA);
  const [selectedSheet, setSelectedSheet] = useState(null);

  useEffect(() => {
    // Load local offline cache if available, otherwise seed it
    async function loadCache() {
      try {
        const saved = await AsyncStorage.getItem('@nosignal_cheatsheets');
        if (saved) {
          setCachedSheets(JSON.parse(saved));
        } else {
          await AsyncStorage.setItem('@nosignal_cheatsheets', JSON.stringify(CHEAT_SHEETS_DATA));
        }
      } catch (e) {
        console.log('Error loading offline cheat sheets', e);
      }
    }
    loadCache();
  }, []);

  const filteredSheets = cachedSheets.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FIELD CHEAT SHEETS</Text>
        <Text style={styles.headerSubtitle}>Offline-First AV Reference Guide</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#E6C587" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Dante, DMX, EDID, Pinouts..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedSheet ? (
          <View style={styles.detailCard}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedSheet(null)}
            >
              <Ionicons name="arrow-back" size={18} color="#000" />
              <Text style={styles.backButtonText}>Back to List</Text>
            </TouchableOpacity>
            
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{selectedSheet.category}</Text>
            </View>
            <Text style={styles.detailTitle}>{selectedSheet.title}</Text>
            <Text style={styles.detailSummary}>{selectedSheet.summary}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.detailBody}>{selectedSheet.details}</Text>
          </View>
        ) : (
          filteredSheets.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.card}
              onPress={() => setSelectedSheet(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
              </View>
              <Text style={styles.cardSummary}>{item.summary}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.offlineTag}>
                  <Ionicons name="cloud-done" size={12} color="#4CD964" /> Cached Offline
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#E6C587" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E6C587',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12100B',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    height: 40,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#090806',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardCategory: {
    fontSize: 11,
    color: '#E6C587',
    backgroundColor: '#221D0A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardSummary: {
    fontSize: 13,
    color: '#AAA',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 8,
  },
  offlineTag: {
    fontSize: 11,
    color: '#4CD964',
  },
  detailCard: {
    backgroundColor: '#090806',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6C587',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#221D0A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: '#E6C587',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  detailSummary: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginBottom: 16,
  },
  detailBody: {
    fontSize: 14,
    color: '#DDD',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
