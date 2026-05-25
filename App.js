import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

const EXPECTED_HASH = "170842";
const CRYPTO_KEY = 42;

const DEVICE_IDENTITY = {
  imei: "35824100-XXXX-XXXX",
  imsi: "510-11-XXXX-XXXXX",
  networkType: "4G LTE / GSM Architecture",
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [sessionTime, setSessionTime] = useState(120);

  const [noteInput, setNoteInput] = useState("");
  const [notesList, setNotesList] = useState([]);
  const [isSecureMode, setIsSecureMode] = useState(false);

  const [networkSecurity, setNetworkSecurity] = useState({
    isWifi: true,
    isEncrypted: false,
    signalType: "Public WiFi",
  });

  const simpleHash = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = (hash << 5) - hash + string.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  };

  useEffect(() => {
    let timer;
    if (isAuthenticated && sessionTime > 0) {
      timer = setInterval(() => {
        setSessionTime((prev) => prev - 1);
      }, 1000);
    } else if (sessionTime === 0) {
      setIsAuthenticated(false);
      setSessionTime(120);
      Alert.alert(
        "Sesi Berakhir",
        "Waktu sesi habis demi keamanan data.",
      );
    }
    return () => clearInterval(timer);
  }, [isAuthenticated, sessionTime]);

  useEffect(() => {
    if (failedAttempts >= 3) {
      setIsLocked(true);
      Alert.alert(
        "Aplikasi Terkunci",
        "Terdeteksi aktivitas mencurigakan (Salah PIN 3 kali).",
      );
    }
  }, [failedAttempts]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotesFromStorage();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (isLocked) {
      Alert.alert(
        "Error",
        "Aplikasi masih terkunci. Silakan reset simulator terlebih dahulu.",
      );
      return;
    }

    if (pinInput.length !== 4 || isNaN(pinInput)) {
      Alert.alert("Gagal", "Format salah! PIN harus berupa 4 digit angka.");
      return;
    }

    if (simpleHash(pinInput) === EXPECTED_HASH) {
      setFailedAttempts(0);
      setIsAuthenticated(true);
      setSessionTime(120);
      setPinInput("");
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      Alert.alert(
        "Akses Ditolak",
        `PIN yang Anda masukkan salah! Percobaan: ${newAttempts}/3`,
      );
      setPinInput("");
    }
  };

  const loadNotesFromStorage = async () => {
    try {
      const existingData = await SecureStore.getItemAsync("vault_notes_list");
      if (existingData) {
        setNotesList(JSON.parse(existingData));
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memuat catatan dari memori.");
    }
  };

  const runXORCipher = (text, key) => {
    return text
      .split("")
      .map((char) => {
        const xorValue = char.charCodeAt(0) ^ key;
        return xorValue.toString(16).padStart(2, "0");
      })
      .join("");
  };

  const handleSaveData = async () => {
    if (!noteInput.trim()) {
      Alert.alert("Peringatan", "Isi catatan tidak boleh kosong!");
      return;
    }

    try {
      let finalContent = noteInput;
      let statusType = isSecureMode ? "modern" : "plaintext";

      if (isSecureMode) {
        finalContent = runXORCipher(noteInput, CRYPTO_KEY);
      }

      const newNote = {
        id: Date.now().toString(),
        content: finalContent,
        status: statusType,
        isDecrypted: false,
        originalContent: noteInput,
        networkContext: networkSecurity.isEncrypted
          ? "Mitigated (VPN/WPA3)"
          : "Vulnerable (Open WiFi)",
      };

      const updatedList = [...notesList, newNote];
      setNotesList(updatedList);

      await SecureStore.setItemAsync(
        "vault_notes_list",
        JSON.stringify(updatedList),
      );

      const title = isSecureMode ? "Berhasil Disimpan" : "Catatan Disimpan";
      const msg = isSecureMode
        ? "Catatan berhasil diamankan menggunakan Kriptografi Modern (XOR Stream)."
        : "Catatan disimpan tanpa enkripsi (Plaintext).";

      Alert.alert(title, msg);
      setNoteInput("");
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan catatan.");
    }
  };

  const handleDecryptItem = (id) => {
    const updatedList = notesList.map((note) => {
      if (note.id === id) {
        return { ...note, isDecrypted: !note.isDecrypted };
      }
      return note;
    });
    setNotesList(updatedList);
  };

  const handleDeleteItem = async (id) => {
    const updatedList = notesList.filter((note) => note.id !== id);
    setNotesList(updatedList);
    await SecureStore.setItemAsync(
      "vault_notes_list",
      JSON.stringify(updatedList),
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Notes Apps</Text>
          <Text style={styles.subtitle}>
            Aplikasi Catatan Rahasia - UTS Keamanan Mobile
          </Text>

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
            <Text style={styles.buttonText}>Masuk Ke Dashboard</Text>
          </TouchableOpacity>

          {failedAttempts > 0 && (
            <Text style={styles.dangerText}>
              Gagal: {failedAttempts} dari maks 3 kali mencoba.
            </Text>
          )}
          {isLocked && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setIsLocked(false);
                setFailedAttempts(0);
              }}
            >
              <Text style={styles.resetButtonText}>
                Reset Simulator Operasional
              </Text>
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
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              setIsAuthenticated(false);
              setNotesList([]);
            }}
          >
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Status Perangkat & Konektivitas</Text>
          <Text style={styles.infoText}>IMEI: {DEVICE_IDENTITY.imei}</Text>
          <Text style={styles.infoText}>
            Jaringan: {DEVICE_IDENTITY.networkType}
          </Text>
          <View style={styles.wifiRow}>
            <Ionicons
              name={
                networkSecurity.isEncrypted ? "shield-checkmark" : "warning"
              }
              size={16}
              color={networkSecurity.isEncrypted ? "#249d9f" : "#ef4444"}
            />
            <Text style={[styles.infoText, { marginLeft: 5 }]}>
              {networkSecurity.isEncrypted
                ? "WiFi Terenkripsi (WPA3)"
                : "WiFi Terbuka (Rentan Sniffing)"}
            </Text>
            <Switch
              style={{ scaleX: 0.7, scaleY: 0.7 }}
              value={networkSecurity.isEncrypted}
              onValueChange={(val) =>
                setNetworkSecurity({ ...networkSecurity, isEncrypted: val })
              }
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tulis Catatan Rahasia</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Ketik isi catatan/password rahasia di sini..."
            placeholderTextColor="#888"
            multiline={true}
            value={noteInput}
            onChangeText={setNoteInput}
          />

          <Text style={styles.cryptoLabel}>Opsi Proteksi Catatan:</Text>
          <View style={styles.cryptoSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                !isSecureMode && styles.modeButtonActive,
              ]}
              onPress={() => setIsSecureMode(false)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  !isSecureMode && styles.modeButtonTextActive,
                ]}
              >
                Plaintext
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                isSecureMode && styles.modeButtonActive,
              ]}
              onPress={() => setIsSecureMode(true)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  isSecureMode && styles.modeButtonTextActive,
                ]}
              >
                Modern (XOR)
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              isSecureMode ? styles.bgSuccess : styles.bgDanger,
            ]}
            onPress={handleSaveData}
          >
            <Text style={styles.buttonText}>
              Simpan Sebagai {isSecureMode ? "MODERN" : "PLAINTEXT"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginLeft: 5 }]}>
          Daftar Catatan ({notesList.length})
        </Text>

        {notesList.length === 0 ? (
          <Text style={styles.emptyText}>
            Belum ada catatan yang tersimpan.
          </Text>
        ) : (
          notesList.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                item.status === "modern"
                  ? styles.borderSuccess
                  : styles.borderDanger,
              ]}
            >
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.badge,
                    item.status === "modern"
                      ? styles.badgeSuccess
                      : styles.badgeDanger,
                  ]}
                >
                  <Ionicons
                    name={
                      item.status === "modern" ? "shield-checkmark" : "warning"
                    }
                    size={12}
                    color={item.status === "modern" ? "#1a7577" : "#991b1b"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      item.status === "modern"
                        ? styles.textSuccess
                        : styles.textDanger,
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.storageContainerInline}>
                <View style={styles.storageTextFlex}>
                  <Text style={styles.storageLabel}>
                    Isi Catatan di Memori Perangkat:
                  </Text>
                  <Text style={styles.storageData} numberOfLines={2}>
                    {item.content}
                  </Text>
                </View>

                {item.status !== "plaintext" && (
                  <TouchableOpacity
                    style={styles.inlineDecryptIcon}
                    onPress={() => handleDecryptItem(item.id)}
                  >
                    <Ionicons
                      name={
                        item.isDecrypted ? "eye-off-outline" : "eye-outline"
                      }
                      size={22}
                      color="#249d9f"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {item.status !== "plaintext" && item.isDecrypted && (
                <View style={styles.decryptedBox}>
                  <Text style={styles.decryptedLabel}>
                    Hasil Dekripsi (Teks Asli):
                  </Text>
                  <Text style={styles.decryptedText}>
                    {item.originalContent}
                  </Text>
                </View>
              )}

              <View style={styles.networkAuditBox}>
                <Text style={styles.auditTitle}>
                  Analisis Jaringan Nirkabel:
                </Text>
                <Text style={styles.auditDescription}>
                  {item.status === 'modern'
                    ? item.networkContext.includes('Mitigated')
                      ? "Sangat Aman. Data sudah dienkripsi dengan XOR dan dikirim melalui jaringan Wi-Fi yang aman (VPN/WPA3)."
                      : "Aman. Meskipun Wi-Fi terbuka dan rentan, data tidak bisa dibaca karena berbentuk ciphertext XOR."
                    : item.networkContext.includes('Mitigated')
                      ? "Cukup Aman. Data berupa plaintext biasa, namun terlindungi oleh enkripsi jaringan (VPN/WPA3)."
                      : "Bahaya! Data berupa plaintext biasa dan dikirim via Wi-Fi terbuka. Sangat mudah disadap/sniffing!"
                  }
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
  container: { flex: 1, backgroundColor: "#f4f6f9", justifyContent: "center" },
  scrollContainer: { padding: 20, paddingTop: 60 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e3a8a",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    color: "#333",
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#249d9f",
  },
  buttonDisabled: { backgroundColor: "#a5b4fc" },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  dangerText: {
    color: "#dc2626",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },
  resetButton: { marginTop: 15, alignItems: "center" },
  resetButtonText: {
    color: "#249d9f",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  welcomeText: { fontSize: 20, fontWeight: "bold", color: "#1e3a8a" },
  sessionText: { fontSize: 11, color: "#249d9f", fontWeight: "bold" },
  logoutButton: {
    backgroundColor: "#249d9f",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  infoCard: {
    backgroundColor: "#eef2f7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 5,
  },
  infoText: { fontSize: 10, color: "#475569", fontFamily: "monospace" },
  wifiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    justifyContent: "space-between",
  },

  cryptoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 8,
  },
  cryptoSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modeButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  modeButtonActive: { backgroundColor: "#249d9f", borderColor: "#249d9f" },
  modeButtonText: { fontSize: 11, color: "#64748b" },
  modeButtonTextActive: { color: "#fff", fontWeight: "bold" },

  bgDanger: { backgroundColor: "#ef4444" },
  bgSuccess: { backgroundColor: "#249d9f" },

  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  borderSuccess: { borderColor: "#249d9f" },
  borderDanger: { borderColor: "#ef4444" },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeSuccess: { backgroundColor: "#e2f7f7" },
  badgeDanger: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  textSuccess: { color: "#1a7577" },
  textDanger: { color: "#991b1b" },
  emptyText: {
    textAlign: "center",
    color: "#a0aec0",
    marginTop: 20,
    fontSize: 13,
  },

  storageContainerInline: {
    flexDirection: "row",
    backgroundColor: "#1a202c",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  storageTextFlex: { flex: 1, paddingRight: 10 },
  storageLabel: { fontSize: 10, color: "#a0aec0", fontWeight: "bold" },
  storageData: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "monospace",
    marginTop: 2,
  },
  inlineDecryptIcon: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  decryptedBox: {
    marginTop: 10,
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  decryptedLabel: {
    fontSize: 10,
    color: "#1e40af",
    fontWeight: "bold",
    marginBottom: 2,
  },
  decryptedText: { fontSize: 14, color: "#1e3a8a", fontWeight: "600" },

  networkAuditBox: {
    marginTop: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  auditTitle: { fontSize: 11, fontWeight: "bold", color: "#475569" },
  auditDescription: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
    lineHeight: 15,
  },
});
