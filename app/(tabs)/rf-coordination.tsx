import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function RfCoordinationTool() {
    const [freq1, setFreq1] = useState('');
    const [freq2, setFreq2] = useState('');

    // Calculate 3rd Order Intermodulation Products
    // Formula: 2(f1) - f2 and 2(f2) - f1
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>RF Isolation & IMD</Text>
                    <Text style={styles.headerSubtitle}>3rd-Order Intermodulation Calculator</Text>
                </View>

                <View style={styles.calculatorCard}>
                    <Text style={styles.instructions}>
                        Enter two active frequencies (MHz) to calculate potential 3rd-order intermodulation hits. Avoid placing new wireless units on these resulting frequencies.
                    </Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Frequency 1 (MHz)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 470.125"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={freq1}
                                onChangeText={setFreq1}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Frequency 2 (MHz)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 475.500"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={freq2}
                                onChangeText={setFreq2}
                            />
                        </View>
                    </View>

                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsHeader}>Danger Zones (3rd Order IMD):</Text>
                        <Text style={styles.resultText}>Hit 1: <Text style={styles.bold}>{imd1} MHz</Text></Text>
                        <Text style={styles.resultText}>Hit 2: <Text style={styles.bold}>{imd2} MHz</Text></Text>
                    </View>
                </View>

                <View style={styles.directoryCard}>
                    <Text style={styles.directoryTitle}>Analyzer Software Cheat Sheet</Text>

                    <View style={styles.softwareItem}>
                        <Text style={styles.softwareName}>Shure Wireless Workbench (WWB)</Text>
                        <Text style={styles.softwareDesc}>Free industry standard. Great for offline coordination and real-time monitoring of networkable gear.</Text>
                    </View>

                    <View style={styles.softwareItem}>
                        <Text style={styles.softwareName}>PWS IAS</Text>
                        <Text style={styles.softwareDesc}>Paid professional standard. Massive database of gear and local DTV channels for bulletproof coordination.</Text>
                    </View>

                    <View style={styles.softwareItem}>
                        <Text style={styles.softwareName}>FreqFinder App</Text>
                        <Text style={styles.softwareDesc}>Mobile app dedicated specifically to intermodulation calculations on the fly.</Text>
                    </View>

                    <View style={styles.softwareItem}>
                        <Text style={styles.softwareName}>Signal Hound / RF Explorer Pro</Text>
                        <Text style={styles.softwareDesc}>Excellent hardware/software combinations for physical spectrum analysis and sweep data.</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
        padding: 20,
    },
    headerContainer: {
        marginBottom: 20,
        marginTop: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    calculatorCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    instructions: {
        fontSize: 14,
        color: '#444',
        marginBottom: 15,
        lineHeight: 20,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputGroup: {
        width: '48%',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    resultsContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#ffebee',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    resultsHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#c62828',
        marginBottom: 10,
    },
    resultText: {
        fontSize: 16,
        color: '#c62828',
        marginBottom: 5,
    },
    bold: {
        fontWeight: 'bold',
    },
    directoryCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    directoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    softwareItem: {
        marginBottom: 15,
    },
    softwareName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    softwareDesc: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    }
});