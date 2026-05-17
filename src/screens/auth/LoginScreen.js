import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation handled automatically by AppNavigator when user state changes
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Branding */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
          <Text style={styles.clinicName}>VEB DENTAL CARE</Text>
          <Text style={styles.tagline}>Staff Management Portal</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>LOGIN</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLinkText}>
              Don't have an account?{' '}
              <Text style={styles.signupLinkBold}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>VEB DENTAL CARE · Avadi & Thiruninravur</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F4FF' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },
  brand: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 80, height: 80, borderRadius: 22, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  logoLetter: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  clinicName: { fontSize: 20, fontWeight: '900', color: theme.colors.primary, letterSpacing: 1.5 },
  tagline: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  form: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 10, backgroundColor: '#FAFAFA', paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 46, fontSize: 15, color: theme.colors.text },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  signupLink: { alignItems: 'center', marginTop: 18 },
  signupLinkText: { fontSize: 13, color: theme.colors.textSecondary },
  signupLinkBold: { color: theme.colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', color: theme.colors.textLight, fontSize: 11, marginTop: 24 },
});
