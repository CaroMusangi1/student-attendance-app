import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as Device from 'expo-device';
import { User, Lock, Smartphone } from 'lucide-react-native';

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  // Capture unique Device ID on component load
  useEffect(() => {
    const fetchDeviceInfo = () => {
      const id = Device.modelName + "_" + (Device.osInternalBuildId || "dev_id_001");
      setDeviceId(id);
    };
    fetchDeviceInfo();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Input Required", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // API call to your backend IP
      const response = await fetch('http://192.168.0.101:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Pass both token and studentId back to App.js
        onLoginSuccess(data.token, data.studentId);
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error("Connection Error:", error);
      Alert.alert("Connection Error", "Ensure server is running and phone is on same Wi-Fi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Student Portal</Text>
          <Text style={styles.subtitle}>Sign in to mark attendance</Text>
        </View>

        <View style={styles.inputContainer}>
          <User color="#064e3b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#064e3b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.deviceInfo}>
          <Smartphone color="#10b981" size={14} />
          <Text style={styles.deviceText}>Hardware ID: {deviceId}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0fdf4' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 32, elevation: 8, shadowColor: '#064e3b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  header: { marginBottom: 35, alignItems: 'center' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#064e3b', letterSpacing: 0.5 },
  subtitle: { color: '#10b981', fontSize: 16, marginTop: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#d1fae5', marginBottom: 25 },
  icon: { marginRight: 12 },
  input: { flex: 1, height: 50, color: '#064e3b', fontSize: 16 },
  deviceInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: '#ecfdf5', padding: 10, borderRadius: 10 },
  deviceText: { fontSize: 12, color: '#059669', marginLeft: 6, fontWeight: '500' },
  button: { backgroundColor: '#10b981', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  buttonDisabled: { backgroundColor: '#a7f3d0' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default LoginScreen;