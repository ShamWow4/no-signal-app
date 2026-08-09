import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function ToolboxScreen() {
  const [activeTab, setActiveTab] = useState('dmx');
  // Tabs: 'dmx' | 'delay' | 'led' | 'power' | 'projection' | 'pag' | 'timecode' | 'spl' | 'photo'

  // ============================================================================
  // 1. DMX 512 CALCULATOR
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
  // 2. SPEAKER DELAY CALCULATOR
  // ============================================================================
  const [distance, setDistance] = useState('75');
  const [unit, setUnit] = useState('feet');
  const [tempF, setTempF] = useState('72');

  const distNum = parseFloat(distance) || 0;
  const tempNum = parseFloat(tempF) || 72;
  const speedOfSoundFtPerSec = 1087 * Math.sqrt(1 + (tempNum - 32) / 459.67);
  const distInFeet = unit === 'feet' ? distNum : distNum * 3.28084;
  const delayMs = speedOfSoundFtPerSec > 0 ? (distInFeet / speedOfSoundFtPerSec) * 1000 : 0;
  const samples48k = Math.round(delayMs * 48);
  const samples96k = Math.round(delayMs * 96);

  // ============================================================================
  // 3. LED VIDEO WALL CALCULATOR
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
  // 4. OHM'S LAW & VOLTAGE DROP
  // ============================================================================
  const [volts, setVolts] = useState('120');
  const [amps, setAmps] = useState('15');
  const [cableFeet, setCableFeet] = useState('150');
  const [wireGauge, setWireGauge] = useState('12');

  const gaugeResMap = { '14': 3.07, '12': 1.93, '10': 1.21, '8': 0.764, '4/0': 0.062 };
  const vIn = parseFloat(volts) || 120;
  const aIn = parseFloat(amps) || 0;
  const lengthIn = parseFloat(cableFeet) || 0;
  const resPer1k = gaugeResMap[wireGauge] || 1.93;

  const powerWatts = vIn * aIn;
  const loadResistance = aIn > 0 ? (vIn / aIn).toFixed(2) : '0';
  const vDrop = ((2 * lengthIn * resPer1k * aIn) / 1000);
  const vEnd = Math.max(0, vIn - vDrop);
  const dropPercent = vIn > 0 ? ((vDrop / vIn) * 100) : 0;

  const getDropStatusColor = (pct) => {
    if (pct < 3) return '#4E9F3D';
    if (pct <= 5) return '#D4AF37';
    return '#E53935';
  };

  // ============================================================================
  // 5. PROJECTION THROW & LUMENS
  // ============================================================================
  const [screenWidthFt, setScreenWidthFt] = useState('16');
  const [lensMin, setLensMin] = useState('1.2');
  const [lensMax, setLensMax] = useState('1.8');
  const [ambientLight, setAmbientLight] = useState('ballroom');

  const sWidth = parseFloat(screenWidthFt) || 16;
  const lMin = parseFloat(lensMin) || 1.2;
  const lMax = parseFloat(lensMax) || 1.8;

  const sHeight = sWidth / 1.7777;
  const screenAreaSqFt = sWidth * sHeight;
  const minThrow = (sWidth * lMin).toFixed(1);
  const maxThrow = (sWidth * lMax).toFixed(1);

  const lumensPerSqFt = { 'dark': 35, 'ballroom': 65, 'stage': 100 }[ambientLight] || 65;
  const recLumens = Math.round(screenAreaSqFt * lumensPerSqFt);

  // ============================================================================
  // 6. PAG / NAG ACOUSTIC GAIN & FEEDBACK
  // ============================================================================
  const [d0, setD0] = useState('30'); // Talker to Listener (ft)
  const [d1, setD1] = useState('25'); // Speaker to Listener (ft)
  const [d2, setD2] = useState('15'); // Speaker to Mic (ft)
  const [ds, setDs] = useState('2');  // Talker to Mic (ft)

  const numD0 = Math.max(0.1, parseFloat(d0) || 30);
  const numD1 = Math.max(0.1, parseFloat(d1) || 25);
  const numD2 = Math.max(0.1, parseFloat(d2) || 15);
  const numDs = Math.max(0.1, parseFloat(ds) || 2);

  const pag = 20 * Math.log10((numD1 * numD0) / (numD2 * numDs));
  const nag = 20 * Math.log10(numD0 / numDs);
  const feedbackMargin = pag - nag;

  const getPagStatusColor = (margin) => {
    if (margin >= 6) return '#4E9F3D'; // Stable
    if (margin >= 0) return '#D4AF37'; // Marginal
    return '#E53935'; // High feedback risk
  };

  // ============================================================================
  // 7. SMPTE TIMECODE CALCULATOR
  // ============================================================================
  const [tc1, setTc1] = useState('01:15:30:12');
  const [tc2, setTc2] = useState('00:45:10:05');
  const [tcOp, setTcOp] = useState('add'); // 'add' | 'sub'
  const [fps, setFps] = useState('30');

  const parseTcToFrames = (tcStr, fpsNum) => {
    const parts = (tcStr || '').split(/[:;]/).map(p => parseInt(p, 10) || 0);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    const f = parts[3] || 0;
    return (h * 3600 + m * 60 + s) * fpsNum + f;
  };

  const formatFramesToTc = (totalFrames, fpsNum) => {
    const isNegative = totalFrames < 0;
    const absFrames = Math.abs(totalFrames);
    const f = absFrames % fpsNum;
    const totalSecs = Math.floor(absFrames / fpsNum);
    const s = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const m = totalMins % 60;
    const h = Math.floor(totalMins / 60) % 24;

    const pad = (n) => n.toString().padStart(2, '0');
    const formatted = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    return isNegative ? `-${formatted}` : formatted;
  };

  const fpsVal = parseInt(fps, 10) || 30;
  const frames1 = parseTcToFrames(tc1, fpsVal);
  const frames2 = parseTcToFrames(tc2, fpsVal);
  const resultFrames = tcOp === 'add' ? frames1 + frames2 : Math.max(0, frames1 - frames2);
  const resultTc = formatFramesToTc(resultFrames, fpsVal);
  const resultSecs = (resultFrames / fpsVal).toFixed(2);

  // ============================================================================
  // 8. SPL INVERSE SQUARE LAW DISTANCE LOSS
  // ============================================================================
  const [sensitivity, setSensitivity] = useState('98'); // dB @ 1m/1W
  const [wattage, setWattage] = useState('500');       // Watts
  const [targetDistFt, setTargetDistFt] = useState('100'); // Feet

  const sensNum = parseFloat(sensitivity) || 98;
  const wattsNum = Math.max(1, parseFloat(wattage) || 500);
  const tDistFt = Math.max(1, parseFloat(targetDistFt) || 100);
  const tDistMeters = tDistFt * 0.3048;

  const powerGainDb = 10 * Math.log10(wattsNum);
  const maxSplAt1m = sensNum + powerGainDb;
  const distLossDb = 20 * Math.log10(tDistMeters);
  const splAtTarget = (maxSplAt1m - distLossDb).toFixed(1);

  // ============================================================================
  // 9. LIGHTING PHOTOMETRICS & BEAM SPREAD
  // ============================================================================
  const [lumensInput, setLumensInput] = useState('10000');
  const [beamAngleDeg, setBeamAngleDeg] = useState('25');
  const [throwDistFt, setThrowDistFt] = useState('30');

  const lumensNum = parseFloat(lumensInput) || 10000;
  const bAngle = parseFloat(beamAngleDeg) || 25;
  const throwFt = Math.max(1, parseFloat(throwDistFt) || 30);

  const angleRad = (bAngle / 2) * (Math.PI / 180);
  const beamDiameterFt = (2 * throwFt * Math.tan(angleRad)).toFixed(1);
  // ============================================================================
  // 10. RF ISOLATION & IMD CALCULATOR
  // ============================================================================
  const [freq1, setFreq1] = useState('470.125');
  const [freq2, setFreq2] = useState('475.500');

  const calculateIMD = () => {
    const f1 = parseFloat(freq1);
    const f2 = parseFloat(freq2);

    if (!f1 || !f2 || isNaN(f1) || isNaN(f2)) {
      return { imd1: '---', imd2: '---' };
    }

    const imd1 = (2 * f1) - f2;
    const imd2 = (2 * f2) - f1;

    return {
      imd1: Math.abs(imd1).toFixed(3),
      imd2: Math.abs(imd2).toFixed(3)
    };
  };

  const { imd1, imd2 } = calculateIMD();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="build" size={24} color={Colors.light.gold} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>AV TECH TOOLBOX</Text>
        </View>
        <Text style={styles.headerSubtitle}>10 Offline Physics & Engineering Tools</Text>
      </View>

      {/* Horizontal Scroll Selector Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'rf' && styles.tabButtonActive]} onPress={() => setActiveTab('rf')}>
            <Ionicons name="radio-outline" size={16} color={activeTab === 'rf' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'rf' && styles.tabButtonTextActive]}>RF & IMD</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'dmx' && styles.tabButtonActive]} onPress={() => setActiveTab('dmx')}>
            <Ionicons name="options-outline" size={16} color={activeTab === 'dmx' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'dmx' && styles.tabButtonTextActive]}>DMX DIP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'delay' && styles.tabButtonActive]} onPress={() => setActiveTab('delay')}>
            <Ionicons name="volume-high-outline" size={16} color={activeTab === 'delay' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'delay' && styles.tabButtonTextActive]}>Audio Delay</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'led' && styles.tabButtonActive]} onPress={() => setActiveTab('led')}>
            <Ionicons name="tv-outline" size={16} color={activeTab === 'led' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'led' && styles.tabButtonTextActive]}>LED Wall</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'power' && styles.tabButtonActive]} onPress={() => setActiveTab('power')}>
            <Ionicons name="flash-outline" size={16} color={activeTab === 'power' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'power' && styles.tabButtonTextActive]}>Ohm / Power</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'projection' && styles.tabButtonActive]} onPress={() => setActiveTab('projection')}>
            <Ionicons name="videocam-outline" size={16} color={activeTab === 'projection' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'projection' && styles.tabButtonTextActive]}>Projection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'pag' && styles.tabButtonActive]} onPress={() => setActiveTab('pag')}>
            <Ionicons name="mic-outline" size={16} color={activeTab === 'pag' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'pag' && styles.tabButtonTextActive]}>PAG / NAG</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'timecode' && styles.tabButtonActive]} onPress={() => setActiveTab('timecode')}>
            <Ionicons name="timer-outline" size={16} color={activeTab === 'timecode' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'timecode' && styles.tabButtonTextActive]}>Timecode</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'spl' && styles.tabButtonActive]} onPress={() => setActiveTab('spl')}>
            <Ionicons name="pulse-outline" size={16} color={activeTab === 'spl' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'spl' && styles.tabButtonTextActive]}>SPL Loss</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabButton, activeTab === 'photo' && styles.tabButtonActive]} onPress={() => setActiveTab('photo')}>
            <Ionicons name="sunny-outline" size={16} color={activeTab === 'photo' ? Colors.light.gold : '#aaa'} />
            <Text style={[styles.tabButtonText, activeTab === 'photo' && styles.tabButtonTextActive]}>Photometrics</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. DMX 512 */}
        {activeTab === 'dmx' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DMX 512 Start Address</Text>
              <View style={styles.dmxInputRow}>
                <TextInput style={styles.dmxTextInput} value={dmxAddress} onChangeText={setDmxAddress} keyboardType="number-pad" maxLength={3} />
                <Text style={styles.dmxUniverseText}>/ 512</Text>
              </View>
              <View style={styles.stepperRow}>
                {[-16, -10, -1, +1, +10, +16].map((step) => (
                  <TouchableOpacity key={step} style={styles.stepperBtn} onPress={() => handleDmxChange(step)}>
                    <Text style={styles.stepperBtnText}>{step > 0 ? `+${step}` : step}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sectionLabel}>PHYSICAL DIP SWITCH POSITIONS</Text>
              <View style={styles.dipContainer}>
                {dipValues.map((val, idx) => {
                  const isOn = getDipState(val);
                  return (
                    <TouchableOpacity key={val} style={styles.dipCol} onPress={() => setDmxAddress((isOn ? dmxNum - val : dmxNum + val).toString())}>
                      <Text style={[styles.dipStatusText, isOn && styles.dipStatusOn]}>{isOn ? 'ON' : 'OFF'}</Text>
                      <View style={[styles.dipBox, isOn && styles.dipBoxOn]}>
                        <View style={[styles.dipSwitchThumb, isOn ? styles.thumbOn : styles.thumbOff]} />
                      </View>
                      <Text style={styles.dipValueText}>{val}</Text>
                      <Text style={styles.dipNumText}>#{idx + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* 2. SPEAKER DELAY */}
        {activeTab === 'delay' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Acoustic Speaker Delay</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Distance from Main Speakers</Text>
                <View style={styles.rowInput}>
                  <TextInput style={[styles.textInput, { flex: 1 }]} value={distance} onChangeText={setDistance} keyboardType="numeric" />
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity style={[styles.unitBtn, unit === 'feet' && styles.unitBtnActive]} onPress={() => setUnit('feet')}><Text style={[styles.unitBtnText, unit === 'feet' && styles.unitBtnTextActive]}>FT</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.unitBtn, unit === 'meters' && styles.unitBtnActive]} onPress={() => setUnit('meters')}><Text style={[styles.unitBtnText, unit === 'meters' && styles.unitBtnTextActive]}>M</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Ambient Temperature (°F)</Text>
                <TextInput style={styles.textInput} value={tempF} onChangeText={setTempF} keyboardType="numeric" />
              </View>
              <LinearGradient colors={['#2A2616', '#1A180E']} style={styles.resultHero}>
                <Text style={styles.resultLabel}>RECOMMENDED DIGITAL DELAY</Text>
                <Text style={styles.resultBigVal}>{delayMs.toFixed(2)} <Text style={styles.resultUnit}>ms</Text></Text>
                <View style={styles.resultDivider} />
                <View style={styles.resultGrid}>
                  <View style={styles.resultGridCol}><Text style={styles.resultGridLabel}>Samples @ 48 kHz</Text><Text style={styles.resultGridVal}>{samples48k.toLocaleString()}</Text></View>
                  <View style={styles.resultGridCol}><Text style={styles.resultGridLabel}>Samples @ 96 kHz</Text><Text style={styles.resultGridVal}>{samples96k.toLocaleString()}</Text></View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* 3. LED VIDEO WALL */}
        {activeTab === 'led' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>LED Video Wall Grid</Text>
              <Text style={styles.fieldLabel}>Pixel Pitch (mm)</Text>
              <View style={styles.pitchRow}>
                {['1.9', '2.6', '2.9', '3.9', '4.8'].map((p) => (
                  <TouchableOpacity key={p} style={[styles.pitchBtn, pixelPitch === p && styles.pitchBtnActive]} onPress={() => setPixelPitch(p)}>
                    <Text style={[styles.pitchBtnText, pixelPitch === p && styles.pitchBtnTextActive]}>P{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>Tiles Wide</Text><TextInput style={styles.textInput} value={tilesWide} onChangeText={setTilesWide} keyboardType="number-pad" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Tiles High</Text><TextInput style={styles.textInput} value={tilesHigh} onChangeText={setTilesHigh} keyboardType="number-pad" /></View>
              </View>
              <View style={styles.specsContainer}>
                <View style={styles.specRow}><Text style={styles.specLabel}>Total Canvas:</Text><Text style={styles.specVal}>{totalWidthPx} × {totalHeightPx} px ({megapixels} MP)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Physical Size:</Text><Text style={styles.specVal}>{totalWidthFt} ft × {totalHeightFt} ft ({totalWidthMeters.toFixed(2)}m × {totalHeightMeters.toFixed(2)}m)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Aspect Ratio:</Text><Text style={styles.specVal}>{decimalRatio}:1</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Est. Max Power:</Text><Text style={styles.specVal}>{totalWatts} W ({amps120v}A @ 120V / {amps208v}A @ 208V)</Text></View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 4. OHM'S LAW */}
        {activeTab === 'power' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ohm's Law & Voltage Drop</Text>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>Voltage (V)</Text><TextInput style={styles.textInput} value={volts} onChangeText={setVolts} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Current (Amps)</Text><TextInput style={styles.textInput} value={amps} onChangeText={setAmps} keyboardType="numeric" /></View>
              </View>
              <Text style={styles.fieldLabel}>Cable Wire Gauge (AWG)</Text>
              <View style={styles.pitchRow}>
                {['14', '12', '10', '8', '4/0'].map((g) => (
                  <TouchableOpacity key={g} style={[styles.pitchBtn, wireGauge === g && styles.pitchBtnActive]} onPress={() => setWireGauge(g)}>
                    <Text style={[styles.pitchBtnText, wireGauge === g && styles.pitchBtnTextActive]}>{g} AWG</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Cable Run Length (Feet)</Text><TextInput style={styles.textInput} value={cableFeet} onChangeText={setCableFeet} keyboardType="numeric" /></View>
              <View style={styles.specsContainer}>
                <View style={styles.specRow}><Text style={styles.specLabel}>Power Load:</Text><Text style={styles.specVal}>{powerWatts} W ({(powerWatts / 1000).toFixed(2)} kW)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Voltage Drop:</Text><Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>-{vDrop.toFixed(2)} V ({dropPercent.toFixed(1)}%)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>End of Line:</Text><Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>{vEnd.toFixed(1)} V</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Safety Status:</Text><Text style={[styles.specVal, { color: getDropStatusColor(dropPercent) }]}>{dropPercent < 3 ? 'SAFE (<3% Drop)' : (dropPercent <= 5 ? 'CAUTION' : 'DANGER')}</Text></View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 5. PROJECTION */}
        {activeTab === 'projection' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Projection Throw & Lumens</Text>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Screen Width (Feet)</Text><TextInput style={styles.textInput} value={screenWidthFt} onChangeText={setScreenWidthFt} keyboardType="numeric" /></View>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>Lens Min Ratio</Text><TextInput style={styles.textInput} value={lensMin} onChangeText={setLensMin} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Lens Max Ratio</Text><TextInput style={styles.textInput} value={lensMax} onChangeText={setLensMax} keyboardType="numeric" /></View>
              </View>
              <View style={styles.specsContainer}>
                <View style={styles.specRow}><Text style={styles.specLabel}>Throw Distance:</Text><Text style={styles.specVal}>{minThrow} ft – {maxThrow} ft</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>16:9 Screen Area:</Text><Text style={styles.specVal}>{sWidth} ft × {sHeight.toFixed(1)} ft ({screenAreaSqFt.toFixed(0)} sq ft)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Rec. Lumens:</Text><Text style={styles.specVal}>{recLumens.toLocaleString()} ANSI Lumens</Text></View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 6. PAG / NAG ACOUSTIC GAIN */}
        {activeTab === 'pag' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PAG / NAG Acoustic Gain & Feedback</Text>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>D0 (Talker to Listener ft)</Text><TextInput style={styles.textInput} value={d0} onChangeText={setD0} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>D1 (Speaker to Listener ft)</Text><TextInput style={styles.textInput} value={d1} onChangeText={setD1} keyboardType="numeric" /></View>
              </View>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>D2 (Speaker to Mic ft)</Text><TextInput style={styles.textInput} value={d2} onChangeText={setD2} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Ds (Talker to Mic ft)</Text><TextInput style={styles.textInput} value={ds} onChangeText={setDs} keyboardType="numeric" /></View>
              </View>
              <View style={styles.specsContainer}>
                <View style={styles.specRow}><Text style={styles.specLabel}>Potential Acoustic Gain (PAG):</Text><Text style={styles.specVal}>{pag.toFixed(1)} dB</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Needed Acoustic Gain (NAG):</Text><Text style={styles.specVal}>{nag.toFixed(1)} dB</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Feedback Stability Margin:</Text><Text style={[styles.specVal, { color: getPagStatusColor(feedbackMargin) }]}>{feedbackMargin.toFixed(1)} dB</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Mic Headroom Status:</Text><Text style={[styles.specVal, { color: getPagStatusColor(feedbackMargin) }]}>{feedbackMargin >= 6 ? 'STABLE (Good Headroom)' : (feedbackMargin >= 0 ? 'MARGINAL' : 'FEEDBACK RISK')}</Text></View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 7. SMPTE TIMECODE */}
        {activeTab === 'timecode' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SMPTE Timecode Math</Text>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Timecode 1 (HH:MM:SS:FF)</Text><TextInput style={styles.textInput} value={tc1} onChangeText={setTc1} /></View>
              <View style={styles.pitchRow}>
                <TouchableOpacity style={[styles.pitchBtn, tcOp === 'add' && styles.pitchBtnActive, { flex: 1, marginRight: 4, alignItems: 'center' }]} onPress={() => setTcOp('add')}><Text style={[styles.pitchBtnText, tcOp === 'add' && styles.pitchBtnTextActive]}>Add (+)</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pitchBtn, tcOp === 'sub' && styles.pitchBtnActive, { flex: 1, marginLeft: 4, alignItems: 'center' }]} onPress={() => setTcOp('sub')}><Text style={[styles.pitchBtnText, tcOp === 'sub' && styles.pitchBtnTextActive]}>Subtract (-)</Text></TouchableOpacity>
              </View>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Timecode 2 (HH:MM:SS:FF)</Text><TextInput style={styles.textInput} value={tc2} onChangeText={setTc2} /></View>
              <Text style={styles.fieldLabel}>Frame Rate (FPS)</Text>
              <View style={styles.pitchRow}>
                {['24', '25', '30'].map((f) => (
                  <TouchableOpacity key={f} style={[styles.pitchBtn, fps === f && styles.pitchBtnActive]} onPress={() => setFps(f)}><Text style={[styles.pitchBtnText, fps === f && styles.pitchBtnTextActive]}>{f} FPS</Text></TouchableOpacity>
                ))}
              </View>
              <LinearGradient colors={['#2A2616', '#1A180E']} style={styles.resultHero}>
                <Text style={styles.resultLabel}>RESULTING TIMECODE</Text>
                <Text style={styles.resultBigVal}>{resultTc}</Text>
                <Text style={styles.speedNote}>{resultFrames.toLocaleString()} Total Frames ({resultSecs} sec)</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* 8. SPL LOSS */}
        {activeTab === 'spl' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SPL Inverse Square Law Loss</Text>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Speaker Sensitivity (dB SPL @ 1m/1W)</Text><TextInput style={styles.textInput} value={sensitivity} onChangeText={setSensitivity} keyboardType="numeric" /></View>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>Amp Power (Watts)</Text><TextInput style={styles.textInput} value={wattage} onChangeText={setWattage} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Distance (Feet)</Text><TextInput style={styles.textInput} value={targetDistFt} onChangeText={setTargetDistFt} keyboardType="numeric" /></View>
              </View>
              <LinearGradient colors={['#2A2616', '#1A180E']} style={styles.resultHero}>
                <Text style={styles.resultLabel}>EXPECTED SPL AT {tDistFt} FT</Text>
                <Text style={styles.resultBigVal}>{splAtTarget} <Text style={styles.resultUnit}>dB SPL</Text></Text>
                <View style={styles.resultDivider} />
                <View style={styles.resultGrid}>
                  <View style={styles.resultGridCol}><Text style={styles.resultGridLabel}>Max SPL @ 1 Meter</Text><Text style={styles.resultGridVal}>{maxSplAt1m.toFixed(1)} dB</Text></View>
                  <View style={styles.resultGridCol}><Text style={styles.resultGridLabel}>Distance Loss (-dB)</Text><Text style={styles.resultGridVal}>-{distLossDb.toFixed(1)} dB</Text></View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* 9. LIGHTING PHOTOMETRICS */}
        {activeTab === 'photo' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lighting Photometrics & Beam Spread</Text>
              <View style={styles.inputGroup}><Text style={styles.fieldLabel}>Fixture Output (Lumens)</Text><TextInput style={styles.textInput} value={lumensInput} onChangeText={setLumensInput} keyboardType="numeric" /></View>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}><Text style={styles.fieldLabel}>Beam Angle (°)</Text><TextInput style={styles.textInput} value={beamAngleDeg} onChangeText={setBeamAngleDeg} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}><Text style={styles.fieldLabel}>Throw Distance (ft)</Text><TextInput style={styles.textInput} value={throwDistFt} onChangeText={setThrowDistFt} keyboardType="numeric" /></View>
              </View>
              <View style={styles.specsContainer}>
                <View style={styles.specRow}><Text style={styles.specLabel}>Beam Pool Diameter:</Text><Text style={styles.specVal}>{beamDiameterFt} ft ({(parseFloat(beamDiameterFt) * 0.3048).toFixed(2)} m)</Text></View>
                <View style={styles.specRow}><Text style={styles.specLabel}>Surface Illuminance:</Text><Text style={styles.specVal}>{footCandles} Fc ({lux} Lux)</Text></View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 10. RF ISOLATION & IMD CALCULATOR */}
        {activeTab === 'rf' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>RF Isolation & 3rd-Order IMD</Text>
              <Text style={[styles.fieldLabel, { marginBottom: 14, lineHeight: 18 }]}>
                Enter two active frequencies (MHz) to calculate potential 3rd-order intermodulation hits. Avoid placing new wireless units on these resulting frequencies.
              </Text>
              <View style={styles.rowInputsContainer}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Frequency 1 (MHz)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={freq1}
                    onChangeText={setFreq1}
                    keyboardType="numeric"
                    placeholder="e.g., 470.125"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Frequency 2 (MHz)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={freq2}
                    onChangeText={setFreq2}
                    keyboardType="numeric"
                    placeholder="e.g., 475.500"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <LinearGradient colors={['#2A2616', '#1A180E']} style={styles.resultHero}>
                <Text style={styles.resultLabel}>DANGER ZONES (3RD ORDER IMD)</Text>
                <View style={{ marginVertical: 8, alignItems: 'center' }}>
                  <Text style={styles.resultGridLabel}>Hit 1: <Text style={{ color: Colors.light.gold, fontWeight: 'bold', fontSize: 18 }}>{imd1} MHz</Text></Text>
                  <Text style={[styles.resultGridLabel, { marginTop: 6 }]}>Hit 2: <Text style={{ color: Colors.light.gold, fontWeight: 'bold', fontSize: 18 }}>{imd2} MHz</Text></Text>
                </View>
              </LinearGradient>

              <View style={[styles.specsContainer, { marginTop: 16 }]}>
                <Text style={[styles.specVal, { color: Colors.light.gold, fontSize: 14, marginBottom: 12 }]}>
                  ANALYZER SOFTWARE CHEAT SHEET
                </Text>

                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.specVal}>Shure Wireless Workbench (WWB)</Text>
                  <Text style={styles.specLabel}>Free industry standard. Great for offline coordination & real-time monitoring of networkable gear.</Text>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.specVal}>PWS IAS</Text>
                  <Text style={styles.specLabel}>Paid professional standard. Massive database of gear and local DTV channels for bulletproof coordination.</Text>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.specVal}>FreqFinder App</Text>
                  <Text style={styles.specLabel}>Mobile app dedicated specifically to intermodulation calculations on the fly.</Text>
                </View>

                <View>
                  <Text style={styles.specVal}>Signal Hound / RF Explorer Pro</Text>
                  <Text style={styles.specLabel}>Excellent hardware/software combinations for physical spectrum analysis and sweep data.</Text>
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
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#ffffff', fontSize: 20, fontFamily: 'CinzelSemiBold', letterSpacing: 1 },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
    tabBarContainer: { marginBottom: 12 },
    tabBarScroll: { paddingHorizontal: 16 },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginRight: 8 },
    tabButtonActive: { backgroundColor: '#2A2616', borderColor: Colors.light.gold, borderWidth: 1 },
    tabButtonText: { color: '#aaa', fontSize: 12, fontWeight: '600', marginLeft: 6 },
    tabButtonTextActive: { color: Colors.light.gold },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    card: { backgroundColor: Colors.light.glassBackground, borderColor: Colors.light.glassBorder, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
    cardTitle: { color: Colors.light.gold, fontSize: 18, fontFamily: 'CinzelSemiBold', marginBottom: 16 },
    dmxInputRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
    dmxTextInput: { color: '#ffffff', fontSize: 42, fontWeight: 'bold', textAlign: 'center', minWidth: 100, borderBottomWidth: 2, borderBottomColor: Colors.light.gold },
    dmxUniverseText: { color: '#888', fontSize: 20, marginLeft: 8 },
    stepperRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    stepperBtn: { backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
    stepperBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    sectionLabel: { color: '#aaa', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    dipContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#111', padding: 12, borderRadius: 12, borderColor: '#333', borderWidth: 1 },
    dipCol: { alignItems: 'center' },
    dipStatusText: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
    dipStatusOn: { color: Colors.light.gold },
    dipBox: { width: 22, height: 48, backgroundColor: '#222', borderRadius: 4, borderColor: '#444', borderWidth: 1, justifyContent: 'space-between', padding: 2 },
    dipBoxOn: { borderColor: Colors.light.gold },
    dipSwitchThumb: { width: '100%', height: 18, backgroundColor: '#666', borderRadius: 2 },
    thumbOn: { backgroundColor: Colors.light.gold },
    thumbOff: { backgroundColor: '#444', marginTop: 'auto' },
    dipValueText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 6 },
    dipNumText: { color: '#666', fontSize: 9, marginTop: 2 },
    inputGroup: { marginBottom: 16 },
    fieldLabel: { color: '#aaa', fontSize: 13, marginBottom: 6 },
    textInput: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderRadius: 8, color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
    rowInput: { flexDirection: 'row', alignItems: 'center' },
    unitToggleGroup: { flexDirection: 'row', marginLeft: 8, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 8, padding: 2 },
    unitBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
    unitBtnActive: { backgroundColor: Colors.light.gold },
    unitBtnText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
    unitBtnTextActive: { color: '#000' },
    resultHero: { borderRadius: 14, padding: 20, alignItems: 'center', borderColor: Colors.light.border, borderWidth: 1, marginTop: 8 },
    resultLabel: { color: Colors.light.gold, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    resultBigVal: { color: '#ffffff', fontSize: 42, fontWeight: 'bold', marginVertical: 4 },
    resultUnit: { fontSize: 20, color: Colors.light.gold },
    resultDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginVertical: 12 },
    resultGrid: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
    resultGridCol: { alignItems: 'center' },
    resultGridLabel: { color: '#888', fontSize: 11 },
    resultGridVal: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
    speedNote: { color: '#777', fontSize: 11, marginTop: 14 },
    pitchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    pitchBtn: { backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    pitchBtnActive: { backgroundColor: Colors.light.gold },
    pitchBtnText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },
    pitchBtnTextActive: { color: '#000' },
    rowInputsContainer: { flexDirection: 'row', marginBottom: 16 },
    specsContainer: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 12, padding: 14, borderColor: '#333', borderWidth: 1 },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
    specLabel: { color: '#aaa', fontSize: 13 },
    specVal: { color: Colors.light.gold, fontSize: 13, fontWeight: 'bold' },
  });
