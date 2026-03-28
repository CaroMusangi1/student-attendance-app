import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  Alert, ActivityIndicator, ScrollView, Platform, Image, Modal 
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MapPin, CheckCircle, Navigation, Camera as CameraIcon, X } from 'lucide-react-native';

const AttendanceScreen = ({ token, studentId }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);

  const SERVER_URL = 'http://192.168.0.101:3000';

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('GPS Permission Denied.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    })();
  }, []);

  const handleMarkAttendance = async () => {
    if (!location) {
      Alert.alert("GPS Error", "Wait for coordinates...");
      return;
    }

    setLoading(true);
    try {
      const freshLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      const response = await fetch(`${SERVER_URL}/api/attendance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          studentId: studentId || 4, 
          classId: 1, 
          lat: freshLoc.coords.latitude,
          long: freshLoc.coords.longitude,
          photoUri: capturedImage 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Verified ✅", data.message);
      } else {
        Alert.alert("Access Denied ❌", data.error);
      }
    } catch (error) {
      Alert.alert("Sync Failed", "Server connection error.");
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    const { granted } = await requestPermission();
    if (granted) setCameraVisible(true);
    else Alert.alert("Error", "Camera permission required.");
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
      <View style={styles.header}>
        <Text style={styles.welcome}>Student Dashboard</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.row}>
          <MapPin color="#10b981" size={24} />
          <Text style={styles.statusTitle}>Current Active Session</Text>
        </View>
        <Text style={styles.className}>Advanced Fluid Mechanics</Text>
        
        {/* FIXED: Using View instead of div */}
        <View style={styles.divider} />
        
        <View style={styles.coordRow}>
          <Navigation color="#064e3b" size={16} />
          <Text style={styles.coordText}>
            {location ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}` : "Tracking..."}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.mainButton, (!location || loading) && styles.buttonDisabled]} 
        onPress={handleMarkAttendance}
        disabled={loading || !location}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <CheckCircle color="#fff" size={50} />
            <Text style={styles.buttonText}>Sign In Now</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={openCamera}>
        {capturedImage ? (
          <Image source={{ uri: capturedImage }} style={styles.miniPreview} />
        ) : (
          <CameraIcon color="#059669" size={22} />
        )}
        <Text style={styles.secondaryText}>
          {capturedImage ? "Selfie Attached" : "Optional Selfie Verify"}
        </Text>
      </TouchableOpacity>

      {/* FIXED CAMERA MODAL STRUCTURE */}
      <Modal visible={cameraVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <CameraView style={styles.camera} facing="front" ref={cameraRef}>
            <View style={styles.camControls}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setCameraVisible(false)}>
                <X color="white" size={30} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureInner} />
                </TouchableOpacity>
            </View>
            </CameraView>
        </View>
      </Modal>

      {errorMsg && <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 25, backgroundColor: '#f0fdf4' },
  header: { marginTop: 50, marginBottom: 35 },
  welcome: { fontSize: 26, fontWeight: 'bold', color: '#064e3b' },
  date: { fontSize: 16, color: '#10b981', fontWeight: '500' },
  statusCard: { backgroundColor: '#fff', borderRadius: 24, padding: 25, marginBottom: 35, elevation: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 14, color: '#10b981', marginLeft: 10, fontWeight: '600', textTransform: 'uppercase' },
  className: { fontSize: 22, fontWeight: 'bold', color: '#064e3b', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#f0fdf4', marginBottom: 15 },
  coordRow: { flexDirection: 'row', alignItems: 'center' },
  coordText: { fontSize: 14, color: '#34d399', marginLeft: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  mainButton: { backgroundColor: '#10b981', height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: 180, elevation: 12, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  secondaryButton: { flexDirection: 'row', borderWidth: 2, borderColor: '#10b981', borderRadius: 15, height: 60, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#064e3b', fontWeight: 'bold', marginLeft: 12, fontSize: 16 },
  miniPreview: { width: 40, height: 40, borderRadius: 20 },
  errorBox: { backgroundColor: '#fee2e2', padding: 15, borderRadius: 12, marginTop: 20 },
  errorText: { color: '#dc2626', textAlign: 'center', fontWeight: '500' },
  buttonDisabled: { backgroundColor: '#a7f3d0' },
  camera: { flex: 1 },
  camControls: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'white' },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  closeBtn: { position: 'absolute', top: 50, right: 30 }
});

export default AttendanceScreen;