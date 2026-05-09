import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  Alert, ActivityIndicator, ScrollView, Platform, Image, Modal 
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MapPin, CheckCircle, Navigation, Camera as CameraIcon, X, Info, LogOut, ChevronDown } from 'lucide-react-native';

const AttendanceScreen = ({ studentId, onLogout }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSignedIn, setHasSignedIn] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false); 
  const [selectedClass, setSelectedClass] = useState({ id: 1, name: 'Advanced Fluid Mechanics' });
  const [showClassPicker, setShowClassPicker] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); 
  const cameraRef = useRef(null);

  const SERVER_URL = 'http://192.168.0.103:3000'; 

  const classList = [
    { id: 1, name: 'Advanced Fluid Mechanics' },
    { id: 2, name: 'Differential Geometry' },
    { id: 3, name: 'Simulation & Modelling' }
  ];

  // 1. Sync Status (Check if class is active)
  useEffect(() => {
    const syncStatus = async () => {
      if (!studentId || !selectedClass.id) return;
      try {
        const statusReq = await fetch(`${SERVER_URL}/api/class-status/${selectedClass.id}`);
        const statusData = await statusReq.json();
        // FORCE state update based on server
        setIsSessionActive(!!statusData.isActive);

        const attReq = await fetch(`${SERVER_URL}/api/attendance/status/${studentId}/${selectedClass.id}`);
        const attData = await attReq.json();
        setHasSignedIn(!!attData.exists);
      } catch (err) {
        setIsSessionActive(false);
      }
    };
    syncStatus();
  }, [studentId, selectedClass.id]);

  // 2. Location Tracking
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, base64: true });
      setCapturedImage(`data:image/jpg;base64,${photo.base64}`);
      setCameraVisible(false);
    }
  };

  const handleMarkAttendance = async () => {
    // CHECK 1: SESSION STATUS (The absolute priority)
    if (!isSessionActive) {
      Alert.alert("Access Denied ❌", `The session for ${selectedClass.name} has not been started yet.`);
      return;
    }

    // CHECK 2: GPS
    if (!location) {
      Alert.alert("GPS Error", "Tracking location...");
      return;
    }

    // CHECK 3: SELFIE (Only reached if Session is Active)
    if (!capturedImage) {
      Alert.alert("Verification Required", "Please take a selfie first to verify your identity.");
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
        setHasSignedIn(true);
      } else {
        Alert.alert("Access Denied ❌", data.error || "Attendance denied.");
      }
    } catch (error) {
      Alert.alert("Sync Failed", "Check server connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View style={styles.container}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Student Dashboard</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <LogOut color="#059669" size={24} />
        </TouchableOpacity>
      </View>

      {/* CLASS SELECTION */}
      <TouchableOpacity style={styles.statusCard} onPress={() => setShowClassPicker(true)}>
        <View style={styles.row}>
          <MapPin color="#10b981" size={24} />
          <Text style={styles.statusTitle}>Current Unit (Tap to change)</Text>
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

      {/* MAIN BUTTON */}
      <TouchableOpacity 
        style={[
          styles.mainButton, 
          (hasSignedIn || !location || loading || !isSessionActive) && styles.buttonDisabled
        ]} 
        onPress={handleMarkAttendance}
        disabled={loading || hasSignedIn}
      >
        {loading ? <ActivityIndicator color="#fff" size="large" /> : (
          <View style={{ alignItems: 'center' }}>
            <CheckCircle color="#fff" size={50} />
            <Text style={styles.buttonText}>
              {!isSessionActive ? "Locked" : (hasSignedIn ? "Verified" : "Sign In")}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {hasSignedIn && (
        <Text style={styles.successMessage}>✅ Attendance successfully recorded.</Text>
      )}

      {!isSessionActive && !hasSignedIn && (
        <Text style={[styles.successMessage, {color: '#991b1b'}]}>
          ⚠️ This session has not been started yet.
        </Text>
      )}

      {/* SELFIE */}
      <TouchableOpacity 
        style={[styles.secondaryButton, (hasSignedIn || !isSessionActive) && {opacity: 0.6}]} 
        onPress={() => !hasSignedIn && isSessionActive && setCameraVisible(true)}
        disabled={hasSignedIn || !isSessionActive}
      >
        {capturedImage ? <Image source={{ uri: capturedImage }} style={styles.miniPreview} /> : <CameraIcon color="#059669" size={22} />}
        <Text style={styles.secondaryText}>{capturedImage ? "Selfie Captured" : "Take Verification Selfie"}</Text>
      </TouchableOpacity>

      {/* RULES CARD - RESTORED ORIGINAL RULES */}
      <View style={styles.rulesCard}>
        <View style={styles.row}>
          <Info color="#065f46" size={18} />
          <Text style={styles.rulesTitle}>System Integrity</Text>
        </View>
        <Text style={styles.ruleItem}>• Facial verification matches background with lecture hall coordinates.</Text>
        <Text style={styles.ruleItem}>• Ensure your device clock is synchronized with network time.</Text>
        <Text style={styles.ruleItem}>• Proxy signatures are detected via unique device hardware ID.</Text>
      </View>

      {/* PICKER MODAL */}
      <Modal visible={showClassPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Unit</Text>
            {classList.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={styles.pickerItem} 
                onPress={() => { 
                  // CRITICAL: Reset states immediately upon selection
                  setSelectedClass(c); 
                  setIsSessionActive(false); 
                  setCapturedImage(null); 
                  setShowClassPicker(false); 
                }}
              >
                <Text style={styles.pickerItemText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowClassPicker(false)} style={styles.closePicker}>
              <Text style={{color: '#dc2626', fontWeight: 'bold', marginTop: 15}}>Cancel</Text>
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
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  successMessage: { color: '#059669', fontWeight: 'bold', textAlign: 'center', marginTop: 10, fontSize: 14 },
  secondaryButton: { flexDirection: 'row', borderColor: '#10b981', borderRadius: 15, height: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginTop: 10 },
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