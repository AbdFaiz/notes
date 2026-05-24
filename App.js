import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const EXPECTED_HASH = "170842"; // Hasil output dari simpleHash("1234")
const CRYPTO_KEY = 42;
const CAESAR_SHIFT = 3;

const DEVICE_IDENTITY = {
  imei: "35824100-XXXX-XXXX",
  imsi: "510-11-XXXX-XXXXX",
  networkType: "4G LTE / GSM Architecture"
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [sessionTime, setSessionTime] = useState(60);

  const [noteInput, setNoteInput] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [isSecureMode, setIsSecureMode] = useState('plaintext');

  const [networkSecurity, setNetworkSecurity] = useState({
    isWifi: true,
    isEncrypted: false,
    signalType: "Public WiFi"
  });

  const simpleHash = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        hash = ((hash << 5) - hash) + string.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
  };

  useEffect(() => {
    let timer;
    if (isAuthenticated && sessionTime > 0) {
      timer = setInterval(() => {
        setSessionTime(prev => prev - 1);
      }, 1000);
    } else if (sessionTime === 0) {
      setIsAuthenticated(false);
      setSessionTime(60);
      Alert.alert("Session Timeout", "Sesi otentikasi berakhir demi menjaga aset data.");
    }
    return () => clearInterval(timer);
  }, [isAuthenticated, sessionTime]);

  useEffect(() => {
    if (failedAttempts >= 3) {
      setIsLocked(true);
      Alert.alert("Proteksi Operasional", "Aplikasi Terkunci! Terdeteksi aktivitas anomali Brute-Force.");
    }
  }, [failedAttempts]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotesFromStorage();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (isLocked) {
      Alert.alert("Error", "Aplikasi terkunci demi menjaga integritas aset data fisik.");
      return;
    }

    if (pinInput.length !== 4 || isNaN(pinInput)) {
      Alert.alert("Validasi Gagal", "Permukaan Serangan: Input harus 4 digit angka!");
      return;
    }

    if (simpleHash(pinInput) === EXPECTED_HASH) {
      setFailedAttempts(0);
      setIsAuthenticated(true);
      setSessionTime(60);
      setPinInput('');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      Alert.alert("Aset Terancam", `PIN Salah! Deteksi Percobaan Intrusi: ${newAttempts}/3`);
      setPinInput('');
    }
  };

  const loadNotesFromStorage = async () => {
    try {
      const existingData = await SecureStore.getItemAsync('vault_notes_list');
      if (existingData) {
        setNotesList(JSON.parse(existingData));
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memuat basis data lokal.");
    }
  };

  const runXORCipher = (text, key) => {
    return text.split('').map(char =>
      String.fromCharCode(char.charCodeAt(0) ^ key)
    ).join('');
  };

  const runCaesarCipher = (text, shift) => {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      return String.fromCharCode(code + shift);
    }).join('');
  };

  const handleSaveData = async () => {
    if (!noteInput.trim()) {
      Alert.alert("Peringatan", "Aset data tidak boleh kosong!");
      return;
    }

    try {
      let finalContent = noteInput;
      let statusType = isSecureMode;

      if (isSecureMode === 'modern') {
        finalContent = btoa(runXORCipher(noteInput, CRYPTO_KEY));
      } else if (isSecureMode === 'classic') {
        finalContent = runCaesarCipher(noteInput, CAESAR_SHIFT);
      }

      const newNote = {
        id: Date.now().toString(),
        content: finalContent,
        status: statusType,
        isDecrypted: false,
        originalContent: noteInput,
        networkContext: networkSecurity.isEncrypted ? "Mitigated (VPN/WPA3)" : "Vulnerable (Open WiFi)"
      };

      const updatedList = [...notesList, newNote];
      setNotesList(updatedList);

      await SecureStore.setItemAsync('vault_notes_list', JSON.stringify(updatedList));

      const title = isSecureMode === 'modern' ? "Mitigasi Sukses" : (isSecureMode === 'classic' ? "Proteksi Dasar" : "Eksperimen Risiko");
      const msg = isSecureMode === 'modern' 
        ? "Integritas Terjaga: Kriptografi Modern (XOR Stream)." 
        : (isSecureMode === 'classic' ? "Data Disamarkan: Kriptografi Klasik (Shift)." : "Risiko Tinggi! Data disimpan Plaintext.");

      Alert.alert(title, msg);
      setNoteInput('');
    } catch (error) {
      Alert.alert("Error", "Gagal mengamankan aset ke physical storage.");
    }
  };

  const handleDecryptItem = (id) => {
    const updatedList = notesList.map(note => {
      if (note.id === id) {
        return { ...note, isDecrypted: !note.isDecrypted };
      }
      return note;
    });
    setNotesList(updatedList);
  };

  const handleDeleteItem = async (id) => {
    const updatedList = notesList.filter(note => note.id !== id);
    setNotesList(updatedList);
    await SecureStore.setItemAsync('vault_notes_list', JSON.stringify(updatedList));
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Notes Apps</Text>
          <Text style={styles.subtitle}>Aplikasi Catatan Rahasia - UTS Keamanan Mobile</Text>

          <TextInput
            style={styles.input}
            placeholder="Masukkan 4-Digit PIN"
            placeholderTextColor="#888"
            keyboardType="numeric"
            secureTextEntry={true}
            maxLength={4}
            value={pinInput}
            onChangeText={setPinInput}
          />

          <TouchableOpacity
            style={[styles.button, isLocked && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLocked}
          >
            <Text style={styles.buttonText}>Otentikasi Token PIN</Text>
          </TouchableOpacity>

          {failedAttempts > 0 && (
            <Text style={styles.dangerText}>Gagal: {failedAttempts} dari maks 3 kali mencoba.</Text>
          )}
          {isLocked && (
            <TouchableOpacity style={styles.resetButton} onPress={() => { setIsLocked(false); setFailedAttempts(0); }}>
              <Text style={styles.resetButtonText}>Reset Simulator Operasional</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>Secure Dashboard</Text>
            <Text style={styles.sessionText}>Sesi Valid: {sessionTime}s</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => { setIsAuthenticated(false); setNotesList([]); }}>
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Status Perangkat & Konektivitas</Text>
          <Text style={styles.infoText}>IMEI: {DEVICE_IDENTITY.imei}</Text>
          <Text style={styles.infoText}>Jaringan: {DEVICE_IDENTITY.networkType}</Text>
          <View style={styles.wifiRow}>
            <Ionicons 
              name={networkSecurity.isEncrypted ? "shield-checkmark" : "warning"} 
              size={16} 
              color={networkSecurity.isEncrypted ? "#249d9f" : "#ef4444"} 
            />
            <Text style={[styles.infoText, { marginLeft: 5 }]}>
              {networkSecurity.isEncrypted ? "WiFi Terenkripsi (WPA3)" : "WiFi Terbuka (Rentan Sniffing)"}
            </Text>
            <Switch
              style={{ scaleX: 0.7, scaleY: 0.7 }}
              value={networkSecurity.isEncrypted}
              onValueChange={(val) => setNetworkSecurity({...networkSecurity, isEncrypted: val})}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Input Aset Data Sensitif</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Contoh: Token API / Password Dummy"
            placeholderTextColor="#888"
            multiline={true}
            value={noteInput}
            onChangeText={setNoteInput}
          />

          <Text style={styles.cryptoLabel}>Opsi Proteksi Data:</Text>
          <View style={styles.cryptoSelector}>
            {['plaintext', 'classic', 'modern'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeButton, isSecureMode === mode && styles.modeButtonActive]}
                onPress={() => setIsSecureMode(mode)}
              >
                <Text style={[styles.modeButtonText, isSecureMode === mode && styles.modeButtonTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isSecureMode === 'modern' ? styles.bgSuccess : (isSecureMode === 'classic' ? styles.bgWarning : styles.bgDanger)]}
            onPress={handleSaveData}
          >
            <Text style={styles.buttonText}>
              Simpan Sebagai {isSecureMode.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginLeft: 5 }]}>Storage Vault ({notesList.length} Aset)</Text>

        {notesList.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada aset data di storage fisik.</Text>
        ) : (
          notesList.map((item) => (
            <View key={item.id} style={[styles.itemCard, item.status === 'modern' ? styles.borderSuccess : (item.status === 'classic' ? styles.borderWarning : styles.borderDanger)]}>
              <View style={styles.itemHeader}>
                <View style={[styles.badge, item.status === 'modern' ? styles.badgeSuccess : (item.status === 'classic' ? styles.badgeWarning : styles.badgeDanger)]}>
                  <Ionicons 
                    name={item.status === 'modern' ? 'shield-checkmark' : (item.status === 'classic' ? 'shield-outline' : 'warning')} 
                    size={12} 
                    color={item.status === 'modern' ? '#1a7577' : (item.status === 'classic' ? '#92400e' : '#991b1b')} 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.badgeText, item.status === 'modern' ? styles.textSuccess : (item.status === 'classic' ? styles.textWarning : styles.textDanger)]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.storageContainerInline}>
                <View style={styles.storageTextFlex}>
                  <Text style={styles.storageLabel}>Isi Ciphertext di Storage Fisik:</Text>
                  <Text style={styles.storageData} numberOfLines={2}>
                    {item.content}
                  </Text>
                </View>

                {item.status !== 'plaintext' && (
                  <TouchableOpacity style={styles.inlineDecryptIcon} onPress={() => handleDecryptItem(item.id)}>
                    <Ionicons name={item.isDecrypted ? "eye-off-outline" : "eye-outline"} size={22} color="#249d9f" />
                  </TouchableOpacity>
                )}
              </View>

              {item.status !== 'plaintext' && item.isDecrypted && (
                <View style={styles.decryptedBox}>
                  <Text style={styles.decryptedLabel}>Hasil Dekripsi (Plaintext Asli):</Text>
                  <Text style={styles.decryptedText}>{item.originalContent}</Text>
                </View>
              )}

              <View style={styles.networkAuditBox}>
                <Text style={styles.auditTitle}>Analisis Keamanan Transmisi:</Text>
                <Text style={styles.auditDescription}>
                  {item.status === 'modern'
                    ? `Aman. Meskipun ditransmisikan via ${item.networkContext}, data XOR Stream ini sangat sulit didekripsi tanpa kunci valid.`
                    : (item.status === 'classic' 
                      ? `Risiko Menengah. Algoritma Shift Cipher sangat mudah dipatahkan. Jalur ${item.networkContext} meningkatkan potensi kebocoran.`
                      : `BAHAYA KRITIS! Data terancam bocor 100% jika di-intercept via ${item.networkContext}.`)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', justifyContent: 'center' },
  scrollContainer: { padding: 20, paddingTop: 60 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e3a8a', marginBottom: 12 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, color: '#333', fontSize: 15, marginBottom: 16 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#249d9f' },
  buttonDisabled: { backgroundColor: '#a5b4fc' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  dangerText: { color: '#dc2626', fontSize: 12, textAlign: 'center', marginTop: 12, fontWeight: '500' },
  resetButton: { marginTop: 15, alignItems: 'center' },
  resetButtonText: { color: '#249d9f', fontSize: 12, textDecorationLine: 'underline' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#1e3a8a' },
  sessionText: { fontSize: 11, color: '#249d9f', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#249d9f', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  infoCard: { backgroundColor: '#eef2f7', borderRadius: 10, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#cbd5e1' },
  infoTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 5 },
  infoText: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },
  wifiRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, justifyContent: 'space-between' },

  cryptoLabel: { fontSize: 12, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 8 },
  cryptoSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modeButton: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, alignItems: 'center', marginHorizontal: 2 },
  modeButtonActive: { backgroundColor: '#249d9f', borderColor: '#249d9f' },
  modeButtonText: { fontSize: 11, color: '#64748b' },
  modeButtonTextActive: { color: '#fff', fontWeight: 'bold' },

  bgDanger: { backgroundColor: '#ef4444' },
  bgWarning: { backgroundColor: '#f59e0b' },
  bgSuccess: { backgroundColor: '#249d9f' },

  itemCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  borderSuccess: { borderColor: '#249d9f' },
  borderWarning: { borderColor: '#f59e0b' },
  borderDanger: { borderColor: '#ef4444' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  badgeSuccess: { backgroundColor: '#e2f7f7' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  textSuccess: { color: '#1a7577' },
  textWarning: { color: '#92400e' },
  textDanger: { color: '#991b1b' },
  emptyText: { textAlign: 'center', color: '#a0aec0', marginTop: 20, fontSize: 13 },

  storageContainerInline: { flexDirection: 'row', backgroundColor: '#1a202c', borderRadius: 8, padding: 12, alignItems: 'center', justifyContent: 'space-between' },
  storageTextFlex: { flex: 1, paddingRight: 10 },
  storageLabel: { fontSize: 10, color: '#a0aec0', fontWeight: 'bold' },
  storageData: { fontSize: 14, color: '#fff', fontFamily: 'monospace', marginTop: 2 },
  inlineDecryptIcon: { padding: 6, justifyContent: 'center', alignItems: 'center' },

  decryptedBox: { marginTop: 10, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  decryptedLabel: { fontSize: 10, color: '#1e40af', fontWeight: 'bold', marginBottom: 2 },
  decryptedText: { fontSize: 14, color: '#1e3a8a', fontWeight: '600' },

  networkAuditBox: { marginTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  auditTitle: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  auditDescription: { fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 15 }
});