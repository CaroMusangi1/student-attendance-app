import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  FlatList, ActivityIndicator, Alert 
} from 'react-native';
import { LogOut, UserCheck, RefreshCw, Download, Play, Square } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const LecturerDashboard = ({ onLogout, lecturerId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const SERVER_URL = 'http://192.168.43.103:3000';
  const CLASS_ID = 2; // Assuming Class 2 is Differential Geometry

  // Fetch report and initial session status on mount
  useEffect(() => {
    fetchReport();
    checkSessionStatus();
  }, []);

  // Check if a session is already active in the database
  const checkSessionStatus = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/class-status/${CLASS_ID}`);
      const data = await response.json();
      if (response.ok && data && data.hasOwnProperty('isActive')) {
        setIsSessionActive(data.isActive);
      }
    } catch (error) {
      console.error("Error checking session status:", error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/lecturer/report/${lecturerId}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setReport(data);
      } else {
        setReport([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // Start or End the attendance window session
  const toggleSession = async () => {
    setSessionLoading(true);
    const newStatus = !isSessionActive;
    try {
      const response = await fetch(`${SERVER_URL}/api/lecturer/toggle-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: CLASS_ID, status: newStatus })
      });

      if (response.ok) {
        setIsSessionActive(newStatus);
        Alert.alert(
          newStatus ? "Session Started" : "Session Stopped",
          newStatus ? "Students can now register their attendance." : "Attendance window is closed."
        );
      } else {
        Alert.alert("Error", "Could not update the session status on the server.");
      }
    } catch (error) {
      console.error("Toggle session error:", error);
      Alert.alert("Connection Error", "Could not reach backend to change session state.");
    } finally {
      setSessionLoading(false);
    }
  };

  // CSV Export Logic
  const downloadCSV = async () => {
    if (report.length === 0) {
      Alert.alert("No Data", "There is no attendance data to export.");
      return;
    }

    let csvContent = "Student Name,Class,Date,Time\n";
    report.forEach(item => {
      csvContent += `${item.student_name},${item.class_name},${item.date},${item.time}\n`;
    });

    const filename = `${FileSystem.documentDirectory}Attendance_Report.csv`;

    try {
      await FileSystem.writeAsStringAsync(filename, csvContent, {
        encoding: 'utf8', 
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filename);
      } else {
        Alert.alert("Sharing Not Available", "Could not open the share menu.");
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not generate the CSV file.");
    }
  };

  const handleLogoutPress = () => {
    Alert.alert("Logout", "Sign out of lecturer portal?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => onLogout() }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Lecturer Portal</Text>
          <Text style={styles.subText}>Differential Geometry</Text>
        </View>
        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
          <LogOut color="#065f46" size={24} />
        </TouchableOpacity>
      </View>

      {/* SESSION MANAGER CONTROLLER */}
      <View style={[
        styles.sessionCard, 
        { borderColor: isSessionActive ? '#10b981' : '#ef4444' }
      ]}>
        <View>
          <Text style={styles.sessionTitle}>Attendance Window</Text>
          <Text style={[
            styles.sessionStatus, 
            { color: isSessionActive ? '#10b981' : '#ef4444' }
          ]}>
            Status: {isSessionActive ? "Active & Accepting Signs" : "Closed"}
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.sessionBtn, 
            { backgroundColor: isSessionActive ? '#ef4444' : '#2563eb' }
          ]} 
          onPress={toggleSession}
          disabled={sessionLoading}
        >
          {sessionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              {isSessionActive ? (
                <Square color="#fff" size={16} fill="#fff" />
              ) : (
                <Play color="#fff" size={16} fill="#fff" />
              )}
              <Text style={styles.sessionBtnText}>
                {isSessionActive ? "Stop" : "Start"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchReport}>
          <RefreshCw color="#fff" size={18} />
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.downloadBtn} onPress={downloadCSV}>
          <Download color="#fff" size={18} />
          <Text style={styles.buttonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* FIXED: Wrapped FlatList in a View with flex: 1 to make it visible */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={report}
            // MODIFIED ONLY THIS LINE: Added index fallback to prevent 'toString' of undefined error
            keyExtractor={(item, index) => item.attendance_id ? item.attendance_id.toString() : index.toString()}
            ListEmptyComponent={<Text style={styles.empty}>No attendance records found.</Text>}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.reportCard}>
                <View style={styles.cardRow}>
                  <UserCheck color="#10b981" size={20} />
                  <Text style={styles.studentName}>{item.student_name}</Text>
                </View>
                <Text style={styles.classDetails}>{item.class_name}</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{item.date} | {item.time}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
  header: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#064e3b' },
  subText: { fontSize: 16, color: '#10b981' },
  logoutBtn: { padding: 12, backgroundColor: '#dcfce7', borderRadius: 12 },
  
  sessionCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  sessionStatus: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  sessionBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90
  },
  sessionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  refreshBtn: { 
    backgroundColor: '#10b981', 
    flexDirection: 'row', 
    padding: 12, 
    borderRadius: 10, 
    flex: 0.48, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  downloadBtn: { 
    backgroundColor: '#065f46', 
    flexDirection: 'row', 
    padding: 12, 
    borderRadius: 10, 
    flex: 0.48, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  buttonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  reportCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#064e3b', marginLeft: 10 },
  classDetails: { fontSize: 14, color: '#059669', marginTop: 4, marginLeft: 30 },
  timeRow: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f0fdf4', paddingTop: 8, marginLeft: 30 },
  timeText: { fontSize: 12, color: '#64748b' },
  empty: { textAlign: 'center', marginTop: 50, color: '#64748b' }
});

export default LecturerDashboard;