import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  FlatList, ActivityIndicator, Alert 
} from 'react-native';
import { LogOut, UserCheck, RefreshCw, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const LecturerDashboard = ({ onLogout, lecturerId }) => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const SERVER_URL = 'http://192.168.0.101:3000';

  // 1. Fetch report on mount
  useEffect(() => {
    fetchReport();
  }, []);

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

  // 2. CSV Export Logic
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
          <Text style={styles.subText}>Attendance Reports</Text>
        </View>
        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn}>
          <LogOut color="#065f46" size={24} />
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

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={report}
          keyExtractor={(item) => item.attendance_id.toString()}
          ListEmptyComponent={<Text style={styles.empty}>No attendance records found.</Text>}
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
  header: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#064e3b' },
  subText: { fontSize: 16, color: '#10b981' },
  logoutBtn: { padding: 12, backgroundColor: '#dcfce7', borderRadius: 12 },
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