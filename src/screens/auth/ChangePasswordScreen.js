import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { authAPI } from '../../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPassword) { Alert.alert('Error', 'Please enter your current password'); return; }
    if (!newPassword) { Alert.alert('Error', 'Please enter a new password'); return; }
    if (newPassword.length < 4) { Alert.alert('Error', 'New password must be at least 4 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (currentPassword === newPassword) { Alert.alert('Error', 'New password must be different from current password'); return; }

    setSaving(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to change password');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="key" size={36} color="rgba(255,255,255,0.9)" />
        </View>
        <View>
          <Text style={styles.bannerTitle}>Change Password</Text>
          <Text style={styles.bannerSub}>Admin account security</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.infoText}>
          Default login: username <Text style={styles.bold}>admin</Text> · password <Text style={styles.bold}>admin</Text>
        </Text>

        {/* Current Password */}
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
            <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password (min 4 chars)"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry={!showNew}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
            <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Confirm New Password */}
        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Match indicator */}
        {confirmPassword.length > 0 && (
          <View style={styles.matchRow}>
            <Ionicons
              name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={newPassword === confirmPassword ? theme.colors.success : theme.colors.error}
            />
            <Text style={[styles.matchText, { color: newPassword === confirmPassword ? theme.colors.success : theme.colors.error }]}>
              {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>Change Password</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  banner: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: theme.radius.sm,
    marginBottom: 12,
  },
  bold: { fontWeight: '700', color: theme.colors.primary },
  label: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: '#FAFAFA',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
  },
  eyeBtn: { paddingHorizontal: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  matchText: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    padding: 16,
    borderRadius: theme.radius.lg,
    gap: 8,
    ...theme.shadows.md,
  },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
