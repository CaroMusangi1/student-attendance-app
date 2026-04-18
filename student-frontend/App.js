import React, { useState } from 'react'; // <--- THIS FIXES THE ERROR
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LecturerScreen from './src/screens/LecturerDashboard'; // Ensure this file exists!

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const handleLoginSuccess = (token, id, name, role) => {
    console.log(`Login Success! Role: ${role}, ID: ${id}`);
    setUserToken(token);
    setUserId(id);
    setUserRole(role); 
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setUserToken(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fdf4" />
      
      {!isAuthenticated ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        // Switching logic based on the role returned from your server
        userRole === 'lecturer' ? (
          <LecturerScreen 
            onLogout={handleLogout} 
            lecturerId={userId} 
          />
        ) : (
          <AttendanceScreen 
            token={userToken} 
            studentId={userId} 
            onLogout={handleLogout} 
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
});