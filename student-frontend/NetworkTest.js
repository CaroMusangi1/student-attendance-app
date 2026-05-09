import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const SERVER_URL = 'http://192.168.0.103:3000'; // USE YOUR CURRENT IP

export default function NetworkTest() {
    const [status, setStatus] = useState('Starting test...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const runTest = async () => {
            try {
                setStatus(`Testing connection to: ${SERVER_URL}/api/class-status/2`);
                
                const response = await fetch(`${SERVER_URL}/api/class-status/2`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    setStatus('✅ SUCCESS! App can talk to Server.');
                } else {
                    setStatus(`❌ SERVER ERROR: Status ${response.status}`);
                }
            } catch (err) {
                setError(err.toString());
                setStatus('❌ NETWORK FAILED');
            }
        };

        runTest();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Network Diagnostic</Text>
            <Text style={styles.text}>{status}</Text>
            {error && <Text style={styles.errorText}>Error Detail: {error}</Text>}
            <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    text: { fontSize: 16, textAlign: 'center' },
    errorText: { color: 'red', marginTop: 10, textAlign: 'center' }
});