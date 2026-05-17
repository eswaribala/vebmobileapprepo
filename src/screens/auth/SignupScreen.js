import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';

const ROLES = [
  { value: 'doctor',         label: 'Doctor' },
  { value: 'manager',        label: 'Manager' },
  { value: 'receptionist',   label: 'Receptionist' },
  { value: 'nurse',          label: 'Nurse' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'hygienist',      label: 'Hygienist' },
  { value: 'assistant',      label: 'Assistant' },
  { value: 'other',          label: 'Other' },
];

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !role) {
      Alert.alert('Error', 'Please fill in all fields and select a role');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password, role);
    } catch (err) {
      Alert.alert('Signup Failed', err.message || 'Could not create account');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.logoSmall}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>VEB DENTAL CARE Staff Portal</Text>

        <View style={styles.form}>
          {/* Name */}
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Your full name" placeholderTextColor={theme.colors.textLight} />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="Your email address" placeholderTextColor={theme.colors.textLight}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput style={styles.input} value={password} onChangeText={setPassword}
              placeholder="Minimum 6 characters" placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showPass} />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.icon} />
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder="Re-enter password" placeholderTextColor={theme.colors.textLight}
              secureTextEntry={!showPass} />
          </View>

          {/* Role */}
          <Text style={styles.label}>Role *</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(r => (
              <TouchableOpacity key={r.value}
                style={[styles.roleChip, role === r.value && styles.roleChipActive]}
                onPress={() => setRole(r.value)}>
                <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {role ? (
            <View style={styles.accessNote}>
              <Ionicons
                name={['doctor', 'manager'].includes(role) ? 'shield-checkmark' : 'person'}
                size={14}
                color={['doctor', 'manager'].includes(role) ? '#2E7D32' : '#1565C0'}
              />
              <Text style={[styles.accessNoteText, { color: ['doctor', 'manager'].includes(role) ? '#2E7D32' : '#1565C0' }]}>
                {['doctor', 'manager'].includes(role)
                  ? 'Full access · All modules visible'
                  : 'Standard access · Patients, Appointments & Attendance'}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.signupBtn, loading && { opacity: 0.6 }]}
            onPress={handleSignup}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.signupBtnText}>CREATE ACCOUNT</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F4FF' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 50, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  logoSmall: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: { fontSize: 22, fontWeight: '900', color: '#fff' },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 20 },
  form: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 10, backgroundColor: '#FAFAFA', paddingHorizontal: 10,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, height: 46, fontSize: 15, color: theme.colors.text },
  eyeBtn: { padding: 4 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
  },
  roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  accessNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, marginTop: 10,
  },
  accessNoteText: { fontSize: 12, fontWeight: '600', flex: 1 },
  signupBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  signupBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: { fontSize: 13, color: theme.colors.textSecondary },
  loginLinkBold: { color: theme.colors.primary, fontWeight: '700' },
});
