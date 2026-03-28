import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null); // ADDED: To track the student's DB ID

  // Updated to accept both token and studentId from the LoginScreen
  const handleLoginSuccess = (token, studentId) => {
    console.log("Login Success! Student ID:", studentId);
    setUserToken(token);
    setUserId(studentId); // Store the ID for the attendance record
    setIsAuthenticated(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />
      
      {!isAuthenticated ? (
        // Pass the updated handler to Login
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        // Pass both the token AND the studentId to Attendance
        <AttendanceScreen token={userToken} studentId={userId} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Light Mint Background
  },
});