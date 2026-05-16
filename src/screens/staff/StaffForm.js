import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { staffAPI } from '../../services/api';

const ROLES = ['Receptionist', 'Nurse', 'Lab Technician', 'Hygienist', 'Assistant', 'Manager', 'Other'];
const DEPARTMENTS = ['Front Desk', 'Dental', 'Lab', 'Administration', 'Sterilization'];

export default function StaffFormScreen({ route, navigation }) {
  const existing = route.params?.member;
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    name: '', role: '', mobile: '', email: '', department: '',
    joining_date: '', salary: '',
  });

  useEffect(() => {
    if (existing?.id) {
      setForm({
        name: existing.name || '',
        role: existing.role || '',
        mobile: existing.mobile || '',
        email: existing.email || '',
        department: existing.department || '',
        joining_date: existing.joining_date || '',
        salary: String(existing.salary || ''),
      });
    }
    navigation.setOptions({ title: existing?.id ? 'Edit Staff' : 'Add Staff' });
  }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!form.role) { Alert.alert('Error', 'Please select a role'); return; }
    setSaving(true);
    try {
      const data = { ...form, salary: parseFloat(form.salary) || 0, is_active: 1 };
      if (existing?.id) {
        await staffAPI.update(existing.id, data);
      } else {
        await staffAPI.create(data);
      }
      Alert.alert('Success', `Staff ${existing?.id ? 'updated' : 'added'} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Staff Information</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={v => sf('name', v)} placeholder="Staff full name" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Role *</Text>
        <View style={styles.chips}>
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[styles.chip, form.role === r && styles.chipActive]} onPress={() => sf('role', r)}>
              <Text style={[styles.chipText, form.role === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Department</Text>
        <View style={styles.chips}>
          {DEPARTMENTS.map(d => (
            <TouchableOpacity key={d} style={[styles.chip, form.department === d && styles.chipActive]} onPress={() => sf('department', d)}>
              <Text style={[styles.chipText, form.department === d && styles.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mobile</Text>
        <TextInput style={styles.input} value={form.mobile} onChangeText={v => sf('mobile', v)} placeholder="Mobile number" keyboardType="phone-pad" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={v => sf('email', v)} placeholder="Email address" keyboardType="email-address" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Joining Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={form.joining_date ? styles.inputText : styles.placeholder}>{form.joining_date || 'Select date'}</Text>
          <Ionicons name="calendar" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={form.joining_date ? new Date(form.joining_date) : new Date()} mode="date" display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) sf('joining_date', d.toISOString().split('T')[0]); }} />
        )}

        <Text style={styles.label}>Monthly Salary (₹)</Text>
        <TextInput style={styles.input} value={form.salary} onChangeText={v => sf('salary', v)} placeholder="0.00" keyboardType="numeric" placeholderTextColor={theme.colors.textLight} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{existing?.id ? 'Update Staff' : 'Add Staff'}</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  label: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text, backgroundColor: '#FAFAFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { color: theme.colors.text },
  placeholder: { color: theme.colors.textLight },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, color: theme.colors.text },
  chipTextActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
