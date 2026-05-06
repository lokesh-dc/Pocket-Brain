import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Brain } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowOtpInput(true);
      Alert.alert('Success', 'OTP sent to your email');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      Alert.alert('Error', error.message);
    }
    // Auth state listener in _layout will handle navigation
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Brain size={48} color="#6366f1" />
          </View>
          <Text style={styles.title}>mind</Text>
          <Text style={styles.subtitle}>Your second brain, simplified.</Text>
        </View>

        {!showOtpInput ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor="#94a3b8"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOtpInput(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Change Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    items: 'center',
    marginBottom: 48,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
