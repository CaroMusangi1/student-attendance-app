import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  Alert, ActivityIndicator, ScrollView, Platform, Image, Modal 
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MapPin, CheckCircle, Navigation, Camera as CameraIcon, X, Info, LogOut, ChevronDown } from 'lucide-react-native';

const AttendanceScreen = ({ token, studentId, onLogout }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSignedIn, setHasSignedIn] = useState(false); // Track if user is already signed in
  const [selectedClass, setSelectedClass] = useState({ id: 1, name: 'Advanced Fluid Mechanics' });
  const [showClassPicker, setShowClassPicker] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  const SERVER_URL = 'http://192.168.0.101:3000';

  const classList = [
    { id: 1, name: 'Advanced Fluid Mechanics' },
    { id: 2, name: 'Differential Geometry' },
    { id: 3, name: 'Simulation & Modelling' }
  ];

  // 1. Check Attendance Status when screen loads or Class changes
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/attendance/status/${studentId}/${selectedClass.id}`);
        const data = await response.json();
        setHasSignedIn(Boolean(data.exists));
      } catch (err) {
        console.log("Status check failed. Ensure server is running and /api/attendance/status exists.");
      }
    };
    if (studentId && selectedClass.id) {
        checkStatus();
    }
  }, [studentId, selectedClass.id]);

  // 2. Fetch Location on load
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location access is required for attendance.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    })();
  }, []);

  const handleLogoutPress = () => {
    Alert.alert("Logout", "Return to login screen?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => onLogout() }
    ]);
  };

  const handleMarkAttendance = async () => {
    if (!location) {
      Alert.alert("GPS Error", "Wait for coordinates...");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId, 
          classId: selectedClass.id, 
          lat: location.coords.latitude,
          long: location.coords.longitude,
          photoUri: capturedImage 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Verified ✅", `Attendance marked for ${selectedClass.name}`);
        setHasSignedIn(true); // Update UI immediately
      } else {
        Alert.alert("Access Denied ❌", data.error);
      }
    } catch (error) {
      Alert.alert("Sync Failed", "Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCapturedImage(photo.uri);
      setCameraVisible(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Student Dashboard</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
          <LogOut color="#059669" size={24} />
        </TouchableOpacity>
      </View>

      {/* CLASS SELECTION */}
      <TouchableOpacity style={styles.statusCard} onPress={() => setShowClassPicker(true)}>
        <View style={styles.row}>
          <MapPin color="#10b981" size={24} />
          <Text style={styles.statusTitle}>Active Session (Tap to change)</Text>
          <ChevronDown color="#10b981" size={20} style={{marginLeft: 'auto'}} />
        </View>
        <Text style={styles.className}>{selectedClass.name}</Text>
        <View style={styles.divider} />
        <View style={styles.coordRow}>
          <Navigation color="#064e3b" size={16} />
          <Text style={styles.coordText}>
            {location ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}` : "Tracking GPS..."}
          </Text>
        </View>
      </TouchableOpacity>

      {/* MAIN ATTENDANCE BUTTON */}
      <TouchableOpacity 
        style={[styles.mainButton, (hasSignedIn || !location || loading) && styles.buttonDisabled]} 
        onPress={handleMarkAttendance}
        disabled={loading || !location || hasSignedIn}
      >
        {loading ? <ActivityIndicator color="#fff" size="large" /> : (
          <>
            <CheckCircle color="#fff" size={50} />
            <Text style={styles.buttonText}>{hasSignedIn ? "In Class" : "Sign In"}</Text>
          </>
        )}
      </TouchableOpacity>

      {hasSignedIn && (
        <Text style={styles.successMessage}>
          ✅ You have successfully signed in for this session.
        </Text>
      )}

      {/* SELFIE VERIFY */}
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setCameraVisible(true)}>
        {capturedImage ? <Image source={{ uri: capturedImage }} style={styles.miniPreview} /> : <CameraIcon color="#059669" size={22} />}
        <Text style={styles.secondaryText}>{capturedImage ? "Selfie Verified" : "Add Verification Selfie"}</Text>
      </TouchableOpacity>

      {/* RULES CARD */}
      <View style={styles.rulesCard}>
        <View style={styles.row}>
          <Info color="#065f46" size={18} />
          <Text style={styles.rulesTitle}>Attendance Protocol</Text>
        </View>
        <Text style={styles.ruleItem}>• Facial verification matches background with lecture hall coordinates.</Text>
        <Text style={styles.ruleItem}>• Ensure your device clock is synchronized with network time.</Text>
        <Text style={styles.ruleItem}>• Proxy signatures are detected via unique device hardware ID.</Text>
      </View>

      {/* CLASS PICKER MODAL */}
      <Modal visible={showClassPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Class</Text>
            {classList.map(c => (
              <TouchableOpacity key={c.id} style={styles.pickerItem} onPress={() => { setSelectedClass(c); setShowClassPicker(false); }}>
                <Text style={styles.pickerItemText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowClassPicker(false)} style={styles.closePicker}>
              <Text style={{color: '#dc2626', fontWeight: 'bold', marginTop: 10}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CAMERA MODAL */}
      <Modal visible={cameraVisible} animationType="slide">
        <CameraView style={styles.camera} facing="front" ref={cameraRef}>
          <View style={styles.camControls}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCameraVisible(false)}>
              <X color="white" size={30} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 25, backgroundColor: '#f0fdf4' },
  header: { marginTop: 50, marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#064e3b' },
  logoutBtn: { padding: 10, backgroundColor: '#dcfce7', borderRadius: 12 },
  date: { fontSize: 16, color: '#10b981' },
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, elevation: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusTitle: { fontSize: 12, color: '#10b981', marginLeft: 10, fontWeight: '700' },
  className: { fontSize: 20, fontWeight: 'bold', color: '#064e3b', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#f0fdf4', marginBottom: 10 },
  coordRow: { flexDirection: 'row', alignItems: 'center' },
  coordText: { fontSize: 13, color: '#34d399', marginLeft: 8 },
  mainButton: { backgroundColor: '#10b981', height: 150, borderRadius: 75, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: 150, elevation: 8, marginBottom: 25 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: '#a7f3d0' },
  successMessage: { color: '#059669', fontWeight: 'bold', textAlign: 'center', marginTop: 10, fontSize: 14 },
  secondaryButton: { flexDirection: 'row', borderSize: 2, borderColor: '#10b981', borderRadius: 15, height: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  secondaryText: { color: '#064e3b', fontWeight: 'bold', marginLeft: 10 },
  miniPreview: { width: 30, height: 30, borderRadius: 15 },
  rulesCard: { backgroundColor: '#ecfdf5', padding: 20, borderRadius: 18, marginTop: 20, borderWidth: 1, borderColor: '#a7f3d0' },
  rulesTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46', marginLeft: 8 },
  ruleItem: { fontSize: 13, color: '#065f46', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  pickerContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  pickerItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  pickerItemText: { fontSize: 16, color: '#064e3b' },
  closePicker: { marginTop: 10, alignSelf: 'center' },
  camera: { flex: 1 },
  camControls: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'white' },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  closeBtn: { position: 'absolute', top: 50, right: 30 },
});

export default AttendanceScreen;