import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function ToolboxScreen() {
  const [activeTab, setActiveTab] = useState('dmx'); // 'dmx' | 'delay' | 'led' | 'power' | 'projection'

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
  const [tempF, setTempF] = useState('72'); // Fahrenheit

  const distNum = parseFloat(distance) || 0;
  const tempNum = parseFloat(tempF) || 72;
  
  const speedOfSoundFtPerSec = 1087 * Math.sqrt(1 + (tempNum - 32) / 459.67);
  const distInFeet = unit === 'feet' ? distNum : distNum * 3.28084;
  const delayMs = speedOfSoundFtPerSec > 0 ? (distInFeet / speedOfSoundFtPerSec) * 1000 : 0;
  const samples48k = Math.round(delayMs * 48);
  const samples96k = Math.round(delayMs * 96);

  // ============================================================================
  // 3. LED VIDEO WALL CALCULATOR STATE & LOGIC
  // ============================================================================
  const [tilesWide, setTilesWide] = useState('12');
  const [tilesHigh, setTilesHigh] = useState('7');
  const [pixelPitch, setPixelPitch] = useState('2.6');
  const [tileDimMm] = useState('500');

  const wTiles = Math.max(1, parseInt(tilesWide, 10) || 1);
  const hTiles = Math.max(1, parseInt(tilesHigh, 10) || 1);
  const pitch = parseFloat(pixelPitch) || 2.6;
  const tileMm = parseFloat(tileDimMm) || 500;

  const pixelsPerTileW = Math.round(tileMm / pitch);
  const pixelsPerTileH = Math.round(tileMm / pitch);
  const totalWidthPx = wTiles * pixelsPerTileW;
  const totalHeightPx = hTiles * pixelsPerTileH;
  const megapixels = ((totalWidthPx * totalHeightPx) / 1000000).toFixed(2);

  const totalWidthMeters = (wTiles * tileMm) / 1000;
  const totalHeightMeters = (hTiles * tileMm) / 1000;
  const totalWidthFt = (totalWidthMeters * 3.28084).toFixed(2);
  const totalHeightFt = (totalHeightMeters * 3.28084).toFixed(2);

  const decimalRatio = (totalWidthPx / totalHeightPx).toFixed(2);
  const totalWatts = wTiles * hTiles * 120;
  const amps120v = (totalWatts / 120).toFixed(1);
  const amps208v = (totalWatts / 208).toFixed(1);

  // ============================================================================
  // 4. OHM'S LAW & CABLE VOLTAGE DROP LOGIC
  // ============================================================================
  const [volts, setVolts] = useState('120');
  const [amps, setAmps] = useState('15');
  const [cableFeet, setCableFeet] = useState('150');
  const [wireGauge, setWireGauge] = useState('12'); // '14' | '12' | '10' | '8' | '4/0'

  // Copper resistance per 1000 ft
  const gaugeResMap = {
    '14': 3.07,
    '12': 1.93,
    '10': 1.21,
    '8': 0.764,
    '4/0': 0.062
  };

  const vIn = parseFloat(volts) || 120;
  const aIn = parseFloat(amps) || 0;
  const lengthIn = parseFloat(cableFeet) || 0;
  const resPer1k = gaugeResMap[wireGauge] || 1.93;

  const powerWatts = vIn * aIn;
  const loadResistance = aIn > 0 ? (vIn / aIn).toFixed(2) : '0';

  // 2-way circuit distance multiplier (2 * length)
  const vDrop = ((2 * lengthIn * resPer1k * aIn) / 1000);
  const vEnd = Math.max(0, vIn - vDrop);
  const dropPercent = vIn > 0 ? ((vDrop / vIn) * 100) : 0;

  const getDropStatusColor = (pct) => {
    if (pct < 3) return '#4E9F3D'; // Green (Safe)
    if (pct <= 5) return '#D4AF37'; // Gold/Yellow (Warning)
    return '#E53935'; // Red (Danger)
  };

  // ============================================================================
  // 5. PROJECTION THROW & LUMENS LOGIC
  // ============================================================================
  const [screenWidthFt, setScreenWidthFt] = useState('16');
  const [lensMin, setLensMin] = useState('1.2');
  const [lensMax, setLensMax] = useState('1.8');
  const [ambientLight, setAmbientLight] = useState('ballroom'); // 'dark' | 'ballroom' | 'stage'

  const sWidth = parseFloat(screenWidthFt) || 16;
  const lMin = parseFloat(lensMin) || 1.2;
  const lMax = parseFloat(lensMax) || 1.8;

  // Assuming 16:9 ratio -> Screen Height = Screen Width / 1.777
  const sHeight = sWidth / 1.7777;
  const screenAreaSqFt = sWidth * sHeight;

  const minThrow = (sWidth * lMin).toFixed(1);
  const maxThrow = (sWidth * lMax).toFixed(1);

  // Recommended ANSI Lumens per sq ft based on ambient light
  const lumensPerSqFt = {
    'dark': 35,      // Cinema / Dark auditorium
    'ballroom': 65,  // Hotel Ballroom / Conference
    'stage': 100     // Bright Stage / Trade Show
  }[ambientLight] || 65;

  const recLumens = Math.round(screenAreaSqFt * lumensPerSqFt);

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

      {/* Horizontal Scroll Selector Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'dmx' && styles.tabButtonActive]}
            onPress={() => setActiveTab('dmx')}
          >
            <Ionicons name="options-outline" size={16} color={activeTab === 'dmx' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'dmx' && styles.tabButtonTextActive]}>DMX DIP</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'delay' && styles.tabButtonActive]}
            onPress={() => setActiveTab('delay')}
          >
            <Ionicons name="volume-high-outline" size={16} color={activeTab === 'delay' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'delay' && styles.tabButtonTextActive]}>Audio Delay</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'led' && styles.tabButtonActive]}
            onPress={() => setActiveTab('led')}
          >
            <Ionicons name="tv-outline" size={16} color={activeTab === 'led' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'led' && styles.tabButtonTextActive]}>LED Wall</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'power' && styles.tabButtonActive]}
            onPress={() => setActiveTab('power')}
          >
            <Ionicons name="flash-outline" size={16} color={activeTab === 'power' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'power' && styles.tabButtonTextActive]}>Ohm / Power</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'projection' && styles.tabButtonActive]}
            onPress={() => setActiveTab('projection')}
          >
            <Ionicons name="videocam-outline" size={16} color={activeTab === 'projection' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'projection' && styles.tabButtonTextActive]}>Projection</Text>
          </TouchableOpacity>
        </ScrollView>
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

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Distance from Main Speakers</Text>
                <View style={styles.rowInput}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="numeric"
                    placeholder="75"
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
                  <Text style={styles.specVal}>{decimalRatio}:1</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Est. Max Power:</Text>
                  <Text style={styles.specVal}>{totalWatts} W ({amps120v}A @ 120V / {amps208v}A @ 208V)</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ============================================================================ */}
        {/* 4. OHM'S LAW & CABLE VOLTAGE DROP */}
        {/* ============================================================================ */}
        {activeTab === 'power' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ohm's Law & Voltage Drop</Text>

              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Circuit Voltage (V)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={volts}
                    onChangeText={setVolts}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Load Current (Amps)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={amps}
                    onChangeText={setAmps}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>SOOW Cable Wire Gauge (AWG)</Text>
              <View style={styles.pitchRow}>
                {['14', '12', '10', '8', '4/0'].map((g) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.pitchBtn, wireGauge === g && styles.pitchBtnActive]}
                    onPress={() => setWireGauge(g)}
                  >
                    <Text style={[styles.pitchBtnText, wireGauge === g && styles.pitchBtnTextActive]}>{g} AWG</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Cable Run Length (Feet)</Text>
                <TextInput
                  style={styles.textInput}
                  value={cableFeet}
                  onChangeText={setCableFeet}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.specsContainer}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Calculated Power Load:</Text>
                  <Text style={styles.specVal}>{powerWatts} Watts ({(powerWatts / 1000).toFixed(2)} kW)</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Equivalent Resistance:</Text>
                  <Text style={styles.specVal}>{loadResistance} Ω</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Total Voltage Drop:</Text>
                  <Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>
                    -{vDrop.toFixed(2)} V ({dropPercent.toFixed(1)}%)
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>End of Line Voltage:</Text>
                  <Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>
                    {vEnd.toFixed(1)} V
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Circuit Safety Status:</Text>
                  <Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>
                    {dropPercent < 3 ? 'SAFE (<3% Drop)' : (dropPercent <= 5 ? 'CAUTION (3-5% Drop)' : 'DANGER (>5% Drop)')}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ============================================================================ */}
        {/* 5. PROJECTION THROW DISTANCE & LUMENS */}
        {/* ============================================================================ */}
        {activeTab === 'projection' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Projection Throw & Lumens</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Screen Width (Feet)</Text>
                <TextInput
                  style={styles.textInput}
                  value={screenWidthFt}
                  onChangeText={setScreenWidthFt}
                  keyboardType="numeric"
                  placeholder="16"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Lens Ratio Min</Text>
                  <TextInput
                    style={styles.textInput}
                    value={lensMin}
                    onChangeText={setLensMin}
                    keyboardType="numeric"
                    placeholder="1.2"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Lens Ratio Max</Text>
                  <TextInput
                    style={styles.textInput}
                    value={lensMax}
                    onChangeText={setLensMax}
                    keyboardType="numeric"
                    placeholder="1.8"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Venue Ambient Light Level</Text>
              <View style={styles.pitchRow}>
                {[
                  { key: 'dark', label: 'Dark Room' },
                  { key: 'ballroom', label: 'Ballroom' },
                  { key: 'stage', label: 'Trade Show' }
                ].map((b) => (
                  <TouchableOpacity 
                    key={b.key} 
                    style={[styles.pitchBtn, ambientLight === b.key && styles.pitchBtnActive, { flex: 1, marginHorizontal: 2, alignItems: 'center' }]}
                    onPress={() => setAmbientLight(b.key)}
                  >
                    <Text style={[styles.pitchBtnText, ambientLight === b.key && styles.pitchBtnTextActive]}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.specsContainer}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Required Throw Distance:</Text>
                  <Text style={styles.specVal}>{minThrow} ft – {maxThrow} ft</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Screen Size (16:9):</Text>
                  <Text style={styles.specVal}>{sWidth} ft × {sHeight.toFixed(1)} ft ({screenAreaSqFt.toFixed(0)} sq ft)</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Recommended Lumens:</Text>
                  <Text style={styles.specVal}>{recLumens.toLocaleString()} ANSI Lumens</Text>
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
    paddingBottom: 8,
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  tabBarContainer: {
    marginBottom: 12,
  },
  tabBarScroll: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
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
