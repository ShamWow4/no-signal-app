import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function ToolboxScreen() {
  const [activeTab, setActiveTab] = useState('dmx'); // 'dmx' | 'delay' | 'led'

  // ============================================================================
  // 1. DMX 512 CALCULATOR STATE & LOGIC
  // ============================================================================
  const [dmxAddress, setDmxAddress] = useState('147');
  const dmxNum = Math.min(512, Math.max(1, parseInt(dmxAddress, 10) || 1));
  const dipValues = [1, 2, 4, 8, 16, 32, 64, 128, 256];
  
  const getDipState = (val) => (dmxNum & val) !== 0;

  const handleDmxChange = (delta) => {
    const next = Math.min(512, Math.max(1, dmxNum + delta));
    setDmxAddress(next.toString());
  };

  // ============================================================================
  // 2. SPEAKER DELAY CALCULATOR STATE & LOGIC
  // ============================================================================
  const [distance, setDistance] = useState('75');
  const [unit, setUnit] = useState('feet'); // 'feet' | 'meters'
  const [tempF, setTempF] = useState('72'); // Temperature in Fahrenheit

  const distNum = parseFloat(distance) || 0;
  const tempNum = parseFloat(tempF) || 72;
  
  // Speed of sound in feet/sec = 1087 * sqrt(1 + (tempF - 32)/459.67)
  const speedOfSoundFtPerSec = 1087 * Math.sqrt(1 + (tempNum - 32) / 459.67);
  const distInFeet = unit === 'feet' ? distNum : distNum * 3.28084;
  
  // Delay in milliseconds = (Distance in feet / Speed of Sound in ft/s) * 1000
  const delayMs = speedOfSoundFtPerSec > 0 ? (distInFeet / speedOfSoundFtPerSec) * 1000 : 0;
  const samples48k = Math.round(delayMs * 48);
  const samples96k = Math.round(delayMs * 96);

  // ============================================================================
  // 3. LED VIDEO WALL CALCULATOR STATE & LOGIC
  // ============================================================================
  const [tilesWide, setTilesWide] = useState('12');
  const [tilesHigh, setTilesHigh] = useState('7');
  const [pixelPitch, setPixelPitch] = useState('2.6'); // mm
  const [tileDimMm, setTileDimMm] = useState('500'); // 500mm x 500mm

  const wTiles = Math.max(1, parseInt(tilesWide, 10) || 1);
  const hTiles = Math.max(1, parseInt(tilesHigh, 10) || 1);
  const pitch = parseFloat(pixelPitch) || 2.6;
  const tileMm = parseFloat(tileDimMm) || 500;

  // Pixels per tile = tileMm / pitch
  const pixelsPerTileW = Math.round(tileMm / pitch);
  const pixelsPerTileH = Math.round(tileMm / pitch);

  const totalWidthPx = wTiles * pixelsPerTileW;
  const totalHeightPx = hTiles * pixelsPerTileH;
  const megapixels = ((totalWidthPx * totalHeightPx) / 1000000).toFixed(2);

  const totalWidthMeters = (wTiles * tileMm) / 1000;
  const totalHeightMeters = (hTiles * tileMm) / 1000;
  const totalWidthFt = (totalWidthMeters * 3.28084).toFixed(2);
  const totalHeightFt = (totalHeightMeters * 3.28084).toFixed(2);

  // Aspect ratio calculation
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(totalWidthPx, totalHeightPx);
  const aspectW = Math.round(totalWidthPx / divisor);
  const aspectH = Math.round(totalHeightPx / divisor);
  const decimalRatio = (totalWidthPx / totalHeightPx).toFixed(2);

  // Estimated max power draw (~120W per 500x500 tile max)
  const totalWatts = wTiles * hTiles * 120;
  const amps120v = (totalWatts / 120).toFixed(1);
  const amps208v = (totalWatts / 208).toFixed(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="build" size={24} color={Colors.light.gold} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>AV TECH TOOLBOX</Text>
        </View>
        <Text style={styles.headerSubtitle}>0ms Offline Physics & Math Tools</Text>
      </View>

      {/* Selector Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'dmx' && styles.tabButtonActive]}
          onPress={() => setActiveTab('dmx')}
        >
          <Ionicons name="options-outline" size={18} color={activeTab === 'dmx' ? Colors.light.gold : '#aaa'} />
          <Text style={[styles.tabButtonText, activeTab === 'dmx' && styles.tabButtonTextActive]}>DMX DIP</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'delay' && styles.tabButtonActive]}
          onPress={() => setActiveTab('delay')}
        >
          <Ionicons name="volume-high-outline" size={18} color={activeTab === 'delay' ? Colors.light.gold : '#aaa'} />
          <Text style={[styles.tabButtonText, activeTab === 'delay' && styles.tabButtonTextActive]}>Speaker Delay</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'led' && styles.tabButtonActive]}
          onPress={() => setActiveTab('led')}
        >
          <Ionicons name="tv-outline" size={18} color={activeTab === 'led' ? Colors.light.gold : '#aaa'} />
          <Text style={[styles.tabButtonText, activeTab === 'led' && styles.tabButtonTextActive]}>LED Wall</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ============================================================================ */}
        {/* 1. DMX 512 DIP SWITCH CALCULATOR */}
        {/* ============================================================================ */}
        {activeTab === 'dmx' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DMX 512 Start Address</Text>
              
              <View style={styles.dmxInputRow}>
                <TextInput
                  style={styles.dmxTextInput}
                  value={dmxAddress}
                  onChangeText={setDmxAddress}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.dmxUniverseText}>/ 512</Text>
              </View>

              {/* Stepper Buttons */}
              <View style={styles.stepperRow}>
                {[-16, -10, -1, +1, +10, +16].map((step) => (
                  <TouchableOpacity 
                    key={step} 
                    style={styles.stepperBtn}
                    onPress={() => handleDmxChange(step)}
                  >
                    <Text style={styles.stepperBtnText}>{step > 0 ? `+${step}` : step}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Visual DIP Switch Box */}
              <Text style={styles.sectionLabel}>PHYSICAL DIP SWITCH POSITIONS</Text>
              <View style={styles.dipContainer}>
                {dipValues.map((val, idx) => {
                  const isOn = getDipState(val);
                  return (
                    <TouchableOpacity 
                      key={val} 
                      style={styles.dipCol}
                      onPress={() => {
                        const next = isOn ? dmxNum - val : dmxNum + val;
                        if (next >= 1 && next <= 512) setDmxAddress(next.toString());
                      }}
                    >
                      <Text style={[styles.dipStatusText, isOn && styles.dipStatusOn]}>
                        {isOn ? 'ON' : 'OFF'}
                      </Text>
                      <View style={[styles.dipBox, isOn && styles.dipBoxOn]}>
                        <View style={[styles.dipSwitchThumb, isOn ? styles.thumbOn : styles.thumbOff]} />
                      </View>
                      <Text style={styles.dipValueText}>{val}</Text>
                      <Text style={styles.dipNumText}>#{idx + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.infoBadge}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.light.gold} style={{ marginRight: 6 }} />
                <Text style={styles.infoBadgeText}>
                  Active Binary Sum: {dipValues.filter(getDipState).join(' + ')} = {dmxNum}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ============================================================================ */}
        {/* 2. SPEAKER DELAY CALCULATOR */}
        {/* ============================================================================ */}
        {activeTab === 'delay' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Acoustic Speaker Delay</Text>

              {/* Distance Input & Unit Toggle */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Distance from Main Speakers</Text>
                <View style={styles.rowInput}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="numeric"
                    placeholder="Enter distance"
                    placeholderTextColor="#666"
                  />
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity 
                      style={[styles.unitBtn, unit === 'feet' && styles.unitBtnActive]}
                      onPress={() => setUnit('feet')}
                    >
                      <Text style={[styles.unitBtnText, unit === 'feet' && styles.unitBtnTextActive]}>FT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.unitBtn, unit === 'meters' && styles.unitBtnActive]}
                      onPress={() => setUnit('meters')}
                    >
                      <Text style={[styles.unitBtnText, unit === 'meters' && styles.unitBtnTextActive]}>M</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Temperature Adjustment */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Ambient Temperature (°F)</Text>
                <TextInput
                  style={styles.textInput}
                  value={tempF}
                  onChangeText={setTempF}
                  keyboardType="numeric"
                  placeholder="72"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Results Hero Card */}
              <LinearGradient colors={['#2A2616', '#1A180E']} style={styles.resultHero}>
                <Text style={styles.resultLabel}>RECOMMENDED DIGITAL DELAY</Text>
                <Text style={styles.resultBigVal}>{delayMs.toFixed(2)} <Text style={styles.resultUnit}>ms</Text></Text>
                
                <View style={styles.resultDivider} />

                <View style={styles.resultGrid}>
                  <View style={styles.resultGridCol}>
                    <Text style={styles.resultGridLabel}>Samples @ 48 kHz</Text>
                    <Text style={styles.resultGridVal}>{samples48k.toLocaleString()}</Text>
                  </View>
                  <View style={styles.resultGridCol}>
                    <Text style={styles.resultGridLabel}>Samples @ 96 kHz</Text>
                    <Text style={styles.resultGridVal}>{samples96k.toLocaleString()}</Text>
                  </View>
                </View>

                <Text style={styles.speedNote}>
                  Speed of Sound: {speedOfSoundFtPerSec.toFixed(1)} ft/s ({ (speedOfSoundFtPerSec * 0.3048).toFixed(1) } m/s)
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* ============================================================================ */}
        {/* 3. LED VIDEO WALL CALCULATOR */}
        {/* ============================================================================ */}
        {activeTab === 'led' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>LED Video Wall Grid</Text>

              {/* Pixel Pitch Selector */}
              <Text style={styles.fieldLabel}>Pixel Pitch (mm)</Text>
              <View style={styles.pitchRow}>
                {['1.9', '2.6', '2.9', '3.9', '4.8'].map((p) => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.pitchBtn, pixelPitch === p && styles.pitchBtnActive]}
                    onPress={() => setPixelPitch(p)}
                  >
                    <Text style={[styles.pitchBtnText, pixelPitch === p && styles.pitchBtnTextActive]}>P{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Grid Dimensions */}
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Tiles Wide</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tilesWide}
                    onChangeText={setTilesWide}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Tiles High</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tilesHigh}
                    onChangeText={setTilesHigh}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Calculated Specifications Card */}
              <View style={styles.specsContainer}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Total Pixel Canvas:</Text>
                  <Text style={styles.specVal}>{totalWidthPx} × {totalHeightPx} px</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Total Megapixels:</Text>
                  <Text style={styles.specVal}>{megapixels} MP</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Physical Wall Size:</Text>
                  <Text style={styles.specVal}>{totalWidthFt} ft × {totalHeightFt} ft ({totalWidthMeters.toFixed(2)}m × {totalHeightMeters.toFixed(2)}m)</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Aspect Ratio:</Text>
                  <Text style={styles.specVal}>{decimalRatio}:1 ({aspectW}:{aspectH})</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Est. Max Power:</Text>
                  <Text style={styles.specVal}>{totalWatts} W ({amps120v}A @ 120V / {amps208v}A @ 208V)</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'CinzelSemiBold',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2A2616',
    borderColor: Colors.light.gold,
    borderWidth: 1,
  },
  tabButtonText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: Colors.light.gold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.light.glassBackground,
    borderColor: Colors.light.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: Colors.light.gold,
    fontSize: 18,
    fontFamily: 'CinzelSemiBold',
    marginBottom: 16,
  },
  dmxInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dmxTextInput: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 100,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.gold,
  },
  dmxUniverseText: {
    color: '#888',
    fontSize: 20,
    marginLeft: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepperBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  stepperBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  dipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 12,
    borderColor: '#333',
    borderWidth: 1,
  },
  dipCol: {
    alignItems: 'center',
  },
  dipStatusText: {
    color: '#555',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dipStatusOn: {
    color: Colors.light.gold,
  },
  dipBox: {
    width: 22,
    height: 48,
    backgroundColor: '#222',
    borderRadius: 4,
    borderColor: '#444',
    borderWidth: 1,
    justifyContent: 'space-between',
    padding: 2,
  },
  dipBoxOn: {
    borderColor: Colors.light.gold,
  },
  dipSwitchThumb: {
    width: '100%',
    height: 18,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  thumbOn: {
    backgroundColor: Colors.light.gold,
  },
  thumbOff: {
    backgroundColor: '#444',
    marginTop: 'auto',
  },
  dipValueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
  },
  dipNumText: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
  },
  infoBadgeText: {
    color: Colors.light.gold,
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitToggleGroup: {
    flexDirection: 'row',
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  unitBtnActive: {
    backgroundColor: Colors.light.gold,
  },
  unitBtnText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unitBtnTextActive: {
    color: '#000',
  },
  resultHero: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderColor: Colors.light.border,
    borderWidth: 1,
    marginTop: 8,
  },
  resultLabel: {
    color: Colors.light.gold,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resultBigVal: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  resultUnit: {
    fontSize: 20,
    color: Colors.light.gold,
  },
  resultDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  resultGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  resultGridCol: {
    alignItems: 'center',
  },
  resultGridLabel: {
    color: '#888',
    fontSize: 11,
  },
  resultGridVal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  speedNote: {
    color: '#777',
    fontSize: 11,
    marginTop: 14,
  },
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pitchBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pitchBtnActive: {
    backgroundColor: Colors.light.gold,
  },
  pitchBtnText: {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: 13,
  },
  pitchBtnTextActive: {
    color: '#000',
  },
  rowInputsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  specsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 14,
    borderColor: '#333',
    borderWidth: 1,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  specLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  specVal: {
    color: Colors.light.gold,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
