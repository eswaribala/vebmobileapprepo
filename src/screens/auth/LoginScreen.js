import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login, loginWithBiometric, registerBiometric, removeBiometric, isBiometricRegistered } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);  // device has enrolled biometrics
  const [bioRegistered, setBioRegistered] = useState(false); // user opted in

  const refreshBioStatus = useCallback(async () => {
    const hasHW = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const registered = await isBiometricRegistered();
    setBioAvailable(hasHW && enrolled);
    setBioRegistered(hasHW && enrolled && registered);
  }, []);

  useEffect(() => { refreshBioStatus(); }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // After successful login, offer fingerprint registration if not yet set up
      if (bioAvailable && !bioRegistered) {
        // Ask user before showing the scanner — keeps the flow explicit
        Alert.alert(
          'Enable Fingerprint Login',
          'Log in faster next time using your fingerprint. Scan now to register?',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Register Fingerprint',
              onPress: async () => {
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Scan your fingerprint to register',
                  cancelLabel: 'Cancel',
                  disableDeviceFallback: false,
                });
                if (result.success) {
                  await registerBiometric(email.trim(), password);
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      if (err.pending) {
        navigation.navigate('PendingApproval');
      } else {
        Alert.alert('Login Failed', err.message || 'Invalid credentials');
      }
    }
    setLoading(false);
  };

  const handleSetupFingerprint = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Enter Credentials First', 'Please fill in your email and password, then tap "Set up fingerprint".');
      return;
    }
    setBioLoading(true);
    try {
      // Step 1: Scan fingerprint first — proves device owner before touching credentials
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint to register',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        setBioLoading(false);
        return;
      }
      // Step 2: Fingerprint confirmed — verify credentials via API and log in
      await login(email.trim(), password);
      // Step 3: Store credentials so future fingerprint logins can retrieve them
      await registerBiometric(email.trim(), password);
      setBioRegistered(true);
    } catch (err) {
      if (err.pending) {
        navigation.navigate('PendingApproval');
      } else {
        Alert.alert('Setup Failed', err.message || 'Invalid credentials');
      }
    }
    setBioLoading(false);
  };

  const handleBiometricLogin = async () => {
    setBioLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to VEB Dental Care',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        try {
          await loginWithBiometric();
        } catch (err) {
          if (err.pending) {
            navigation.navigate('PendingApproval');
          } else {
            // Stored credentials may be stale (password changed)
            await removeBiometric();
            setBioRegistered(false);
            Alert.alert(
              'Fingerprint Login Failed',
              'Your credentials may have changed. Please log in with your password and set up fingerprint again.',
            );
          }
        }
      }
    } catch {
      // biometric prompt cancelled or error — do nothing
    }
    setBioLoading(false);
  };

  const handleRemoveBiometric = () => {
    Alert.alert(
      'Remove Fingerprint',
      'Disable fingerprint login for this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeBiometric();
            setBioRegistered(false);
          },
        },
      ]
    );
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

          {/* Setup fingerprint link (shown when hardware available but not yet registered) */}
          {bioAvailable && !bioRegistered && (
            <TouchableOpacity style={styles.bioSetupLink} onPress={handleSetupFingerprint} disabled={loading}>
              <Ionicons name="finger-print-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.bioSetupLinkText}>Set up fingerprint login</Text>
            </TouchableOpacity>
          )}

          {/* Fingerprint login section (shown when registered) */}
          {bioRegistered && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.bioBtn, bioLoading && { opacity: 0.6 }]}
                onPress={handleBiometricLogin}
                disabled={bioLoading}>
                {bioLoading
                  ? <ActivityIndicator color={theme.colors.primary} />
                  : (
                    <>
                      <Ionicons name="finger-print" size={28} color={theme.colors.primary} />
                      <Text style={styles.bioBtnText}>Login with Fingerprint</Text>
                    </>
                  )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.removeLink} onPress={handleRemoveBiometric}>
                <Text style={styles.removeLinkText}>Remove fingerprint</Text>
              </TouchableOpacity>
            </>
          )}

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
  bioSetupLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  bioSetupLinkText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', marginHorizontal: 12 },
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 2, borderColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 14, backgroundColor: '#EEF4FF',
  },
  bioBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  removeLink: { alignItems: 'center', marginTop: 10 },
  removeLinkText: { fontSize: 12, color: theme.colors.error },
  signupLink: { alignItems: 'center', marginTop: 18 },
  signupLinkText: { fontSize: 13, color: theme.colors.textSecondary },
  signupLinkBold: { color: theme.colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', color: theme.colors.textLight, fontSize: 11, marginTop: 24 },
});
