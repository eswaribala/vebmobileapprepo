import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { ownerConsultingAPI } from '../../services/api';

const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'];

export default function MyAppointmentFormScreen({ route, navigation }) {
  const existing = route.params?.appointment;
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    clinic_name: '',
    clinic_address: '',
    appointment_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    appointment_time: '',
    patient_name: '',
    procedure: '',
    income: '',
    payment_mode: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (existing?.id) {
      setForm({
        clinic_name: existing.clinic_name || '',
        clinic_address: existing.clinic_address || '',
        appointment_date: existing.appointment_date || '',
        appointment_time: existing.appointment_time || '',
        patient_name: existing.patient_name || '',
        procedure: existing.procedure || '',
        income: String(existing.income || ''),
        payment_mode: existing.payment_mode || 'cash',
        notes: existing.notes || '',
      });
    }
    navigation.setOptions({ title: existing?.id ? 'Edit Appointment' : 'Add Appointment' });
  }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.clinic_name.trim()) { Alert.alert('Error', 'Clinic name is required'); return; }
    if (!form.appointment_date) { Alert.alert('Error', 'Date is required'); return; }
    setSaving(true);
    try {
      const data = { ...form, income: parseFloat(form.income) || 0 };
      if (existing?.id) {
        await ownerConsultingAPI.updateAppointment(existing.id, data);
      } else {
        await ownerConsultingAPI.addAppointment(data);
      }
      Alert.alert('Saved', `Appointment ${existing?.id ? 'updated' : 'added'} successfully`, [
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
        <Text style={styles.sectionTitle}>Clinic / Hospital Details</Text>

        <Text style={styles.label}>Clinic / Hospital Name *</Text>
        <TextInput style={styles.input} value={form.clinic_name} onChangeText={v => sf('clinic_name', v)}
          placeholder="e.g. Apollo Dental, Chennai" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Address</Text>
        <TextInput style={[styles.input, styles.multiline]} value={form.clinic_address} onChangeText={v => sf('clinic_address', v)}
          placeholder="Clinic address (optional)" placeholderTextColor={theme.colors.textLight} multiline numberOfLines={2} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Appointment Details</Text>

        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{form.appointment_date}</Text>
          <Ionicons name="calendar" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={new Date(form.appointment_date)} mode="date" display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) sf('appointment_date', d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })); }} />
        )}

        <Text style={styles.label}>Time</Text>
        <TextInput style={styles.input} value={form.appointment_time} onChangeText={v => sf('appointment_time', v)}
          placeholder="e.g. 10:30 AM" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Patient Name</Text>
        <TextInput style={styles.input} value={form.patient_name} onChangeText={v => sf('patient_name', v)}
          placeholder="Patient name (optional)" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Procedure / Service</Text>
        <TextInput style={styles.input} value={form.procedure} onChangeText={v => sf('procedure', v)}
          placeholder="e.g. Implant, Root Canal, Consultation" placeholderTextColor={theme.colors.textLight} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Income</Text>

        <Text style={styles.label}>Amount Received (₹)</Text>
        <TextInput style={styles.input} value={form.income} onChangeText={v => sf('income', v)}
          placeholder="0" keyboardType="numeric" placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Payment Mode</Text>
        <View style={styles.chips}>
          {PAYMENT_MODES.map(m => (
            <TouchableOpacity key={m} style={[styles.chip, form.payment_mode === m && styles.chipActive]}
              onPress={() => sf('payment_mode', m)}>
              <Text style={[styles.chipText, form.payment_mode === m && styles.chipTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.multiline]} value={form.notes} onChangeText={v => sf('notes', v)}
          placeholder="Any additional notes…" placeholderTextColor={theme.colors.textLight} multiline numberOfLines={3} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{existing?.id ? 'Update Appointment' : 'Save Appointment'}</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  label: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text, backgroundColor: '#FAFAFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { color: theme.colors.text, flex: 1 },
  multiline: { flexDirection: undefined, minHeight: 60, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.radius.round, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
