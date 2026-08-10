import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/theme';
import { useRouter } from 'expo-router';
import { functions, db } from '../src/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs } from 'firebase/firestore';
import { sendSmsNotification, broadcastSms } from '../src/utils/smsService';

export default function AdminBroadcastScreen() {
  const [channel, setChannel] = useState('push'); // 'push' | 'sms'
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetPhone, setTargetPhone] = useState(''); // Specific phone or blank for all techs
  const [target, setTarget] = useState('all'); // 'all', 'gigs', 'calendar'
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleSendBroadcast = async () => {
    if (channel === 'push') {
      if (!title || !body) {
        Alert.alert('Error', 'Please provide both a Title and a Message.');
        return;
      }

      setSending(true);
      try {
        const sendBroadcast = httpsCallable(functions, 'sendAdminBroadcast');
        await sendBroadcast({ title, body, target });
        
        Alert.alert('Success', 'Push broadcast sent successfully!');
        setTitle('');
        setBody('');
      } catch (error: any) {
        console.error(error);
        Alert.alert('Error', error.message || 'Failed to send push broadcast');
      } finally {
        setSending(false);
      }
    } else {
      // SMS Dispatch Mode
      if (!body) {
        Alert.alert('Error', 'Please enter SMS body text.');
        return;
      }

      setSending(true);
      try {
        if (targetPhone.trim().length > 0) {
          // Send to specific phone
          const docId = await sendSmsNotification(targetPhone.trim(), body.trim());
          Alert.alert('SMS Queued!', `Single SMS dispatched! (ID: ${docId})`);
        } else {
          // Broadcast to all technicians in Firestore /technicians collection
          const querySnapshot = await getDocs(collection(db, 'technicians'));
          const techList: any[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.phone) {
              techList.push({ name: data.name, phone: data.phone });
            }
          });

          if (techList.length === 0) {
            Alert.alert('No Techs Found', 'No technicians found in database.');
            return;
          }

          const count = await broadcastSms(techList, body.trim());
          Alert.alert('SMS Broadcast Queued!', `Successfully queued ${count} SMS messages for technicians.`);
        }

        setBody('');
        setTargetPhone('');
      } catch (error: any) {
        console.error(error);
        Alert.alert('SMS Dispatch Error', error.message || 'Failed to dispatch SMS');
      } finally {
        setSending(false);
      }
    }
  };

  const renderTargetOption = (value: string, label: string, icon: any, color: string) => (
    <TouchableOpacity
      style={[
        styles.targetOption,
        target === value && { borderColor: color, backgroundColor: `${color}1A` }
      ]}
      onPress={() => setTarget(value)}
    >
      <Ionicons name={icon} size={24} color={target === value ? color : '#666'} />
      <Text style={[styles.targetLabel, target === value && { color: color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dispatch Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Channel Selector */}
          <View style={styles.channelRow}>
            <TouchableOpacity 
              style={[styles.channelTab, channel === 'push' && styles.channelTabActive]}
              onPress={() => setChannel('push')}
            >
              <Ionicons name="notifications" size={18} color={channel === 'push' ? '#D4AF37' : '#888'} />
              <Text style={[styles.channelTabText, channel === 'push' && styles.channelTabTextActive]}>
                Push Notification
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.channelTab, channel === 'sms' && styles.channelTabActive]}
              onPress={() => setChannel('sms')}
            >
              <Ionicons name="chatbox-ellipses" size={18} color={channel === 'sms' ? '#D4AF37' : '#888'} />
              <Text style={[styles.channelTabText, channel === 'sms' && styles.channelTabTextActive]}>
                SMS Dispatch (Twilio)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name={channel === 'push' ? "warning" : "send"} size={24} color="#FF9F0A" />
            <Text style={styles.warningText}>
              {channel === 'push' 
                ? "Warning: This sends real push notifications to app users."
                : "Twilio SMS Dispatch: Sends real SMS messages to technicians via Cloud Function trigger."}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {channel === 'push' ? (
              <>
                <Text style={styles.sectionTitle}>Target Audience</Text>
                <View style={styles.targetRow}>
                  {renderTargetOption('all', 'All Users', 'people', '#FFF')}
                  {renderTargetOption('gigs', 'Gig Alerts', 'musical-notes', '#D4AF37')}
                  {renderTargetOption('calendar', 'Calendar', 'calendar', '#00C4B4')}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Message Details</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Push Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Emergency Alert!"
                    placeholderTextColor="#666"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Push Body</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Type your message here..."
                    placeholderTextColor="#666"
                    value={body}
                    onChangeText={setBody}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>SMS Recipient</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Target Phone Number (Leave blank to alert ALL 176 Techs)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +15045550199 or blank for all techs"
                    placeholderTextColor="#666"
                    value={targetPhone}
                    onChangeText={setTargetPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>SMS Message Content</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Message Text (Supports {"{{name}}"} for tech name)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Hi {{name}}, new gig available: French Quarter Fest Audio Tech needed!"
                    placeholderTextColor="#666"
                    value={body}
                    onChangeText={setBody}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, sending && { opacity: 0.7 }]} 
              onPress={handleSendBroadcast}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#000" style={{marginRight: 8}} />
                  <Text style={styles.primaryButtonText}>
                    {channel === 'push' ? 'Send Push Blast' : 'Dispatch Twilio SMS'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 20,
    color: '#D4AF37',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  channelRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  channelTabActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#D4AF37',
    borderWidth: 1,
  },
  channelTabText: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 13,
    color: '#888',
    marginLeft: 6,
  },
  channelTabTextActive: {
    color: '#D4AF37',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  warningText: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    color: '#FF9F0A',
    marginLeft: 12,
    flex: 1,
  },
  formContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  sectionTitle: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
    color: '#FFF',
    marginBottom: 16,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  targetLabel: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'OpenSansSemiBold',
    fontSize: 14,
    color: '#AAA',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFF',
    fontFamily: 'OpenSans',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#000',
    fontFamily: 'PoppinsSemiBold',
    fontSize: 16,
  },
});
