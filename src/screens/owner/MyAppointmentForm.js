import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { ownerConsultingAPI } from '../../services/api';

function parseTimes(str) {
  return (str || '').split(',').map(t => t.trim()).filter(Boolean);
}

const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
];

export default function MyAppointmentFormScreen({ route, navigation }) {
  const existing = route.params?.appointment;
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clinicConflictSlots, setClinicConflictSlots] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState(
    existing?.appointment_time
      ? existing.appointment_time.split(',').map(t => t.trim()).filter(Boolean)
      : []
  );
  const [form, setForm] = useState({
    clinic_name: '',
    clinic_address: '',
    appointment_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
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
        patient_name: existing.patient_name || '',
        procedure: existing.procedure || '',
        income: String(existing.income || ''),
        payment_mode: existing.payment_mode || 'cash',
        notes: existing.notes || '',
      });
    }
    navigation.setOptions({ title: existing?.id ? 'Edit Appointment' : 'Add Appointment' });
  }, []);

  useEffect(() => {
    if (!form.appointment_date) return;
    ownerConsultingAPI.getClinicSlots({ date: form.appointment_date, exclude_id: existing?.id })
      .then(res => {
        const slots = (res.data || []).flatMap(row => parseTimes(row.appointment_time));
        setClinicConflictSlots([...new Set(slots)]);
      })
      .catch(() => setClinicConflictSlots([]));
  }, [form.appointment_date]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.clinic_name.trim()) { Alert.alert('Error', 'Clinic name is required'); return; }
    if (!form.appointment_date) { Alert.alert('Error', 'Date is required'); return; }
    setSaving(true);
    try {
      const data = { ...form, appointment_time: selectedTimes.join(','), income: parseFloat(form.income) || 0 };
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
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) {
                const newDate = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                sf('appointment_date', newDate);
                setSelectedTimes([]); // clear times when date changes
              }
            }} />
        )}

        <Text style={styles.label}>Time Slot(s) — tap multiple for longer procedures</Text>
        {clinicConflictSlots.length > 0 && (
          <View style={styles.conflictNotice}>
            <Ionicons name="warning" size={13} color="#C62828" />
            <Text style={styles.conflictNoticeText}>Red slots = already occupied (clinic patients or other consulting)</Text>
          </View>
        )}
        {selectedTimes.length > 0 && (
          <View style={styles.selectionSummary}>
            <Ionicons name="time-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.selectionSummaryText}>
              {selectedTimes.length === 1
                ? selectedTimes[0]
                : `${selectedTimes[0]} – ${selectedTimes[selectedTimes.length - 1]}  (${selectedTimes.length} slots · ${selectedTimes.length * 30} min)`}
            </Text>
            <TouchableOpacity onPress={() => setSelectedTimes([])}>
              <Ionicons name="close-circle" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map(slot => {
            const isSelected = selectedTimes.includes(slot);
            const isClinicConflict = clinicConflictSlots.includes(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.timeSlot,
                  isClinicConflict && styles.timeSlotConflict,
                  isSelected && !isClinicConflict && styles.timeSlotActive,
                  isSelected && isClinicConflict && styles.timeSlotConflictSelected,
                ]}
                onPress={() =>
                  setSelectedTimes(prev =>
                    prev.includes(slot)
                      ? prev.filter(t => t !== slot)
                      : [...prev, slot].sort()
                  )
                }>
                <Text style={[
                  styles.timeSlotText,
                  isClinicConflict && !isSelected && styles.timeSlotTextConflict,
                  isSelected && styles.timeSlotTextActive,
                ]}>{slot}</Text>
                {isClinicConflict && <Text style={styles.clinicConflictLabel}>Clinic</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

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
  selectionSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', padding: 8, borderRadius: theme.radius.sm, marginBottom: 8, marginTop: 6 },
  selectionSummaryText: { flex: 1, fontSize: theme.fontSizes.sm, fontWeight: '700', color: theme.colors.primary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  conflictNotice: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFEBEE', borderRadius: theme.radius.sm, padding: 8, marginBottom: 6 },
  conflictNoticeText: { flex: 1, fontSize: 11, color: '#C62828', fontWeight: '600' },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA', alignItems: 'center' },
  timeSlotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  timeSlotConflict: { backgroundColor: '#FFEBEE', borderColor: '#E53935' },
  timeSlotConflictSelected: { backgroundColor: '#C62828', borderColor: '#C62828' },
  timeSlotText:            { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '600' },
  timeSlotTextActive:      { color: '#fff' },
  timeSlotTextConflict:    { color: '#E53935' },
  clinicConflictLabel:     { fontSize: 8, color: '#E53935', fontWeight: '700', marginTop: 1 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.radius.round, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
