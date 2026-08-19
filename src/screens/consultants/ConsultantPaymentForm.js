import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { consultantAPI } from '../../services/api';

const ACCENT = '#2E7D32';
const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'];

export default function ConsultantPaymentFormScreen({ route, navigation }) {
  const { consultant, appointments = [] } = route.params;
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [notes, setNotes] = useState('');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const upcomingAppts = appointments.filter(a => a.status !== 'cancelled');
  const searchQuery = patientSearch.trim().toLowerCase();
  const filteredAppts = searchQuery
    ? upcomingAppts.filter(a =>
        `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().includes(searchQuery))
    : upcomingAppts;

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await consultantAPI.addPayment(consultant.id, {
        appointment_id: selectedAppt?.id || null,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        notes: notes.trim() || null,
      });
      Alert.alert('Success', 'Payment recorded successfully', [
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
        <Text style={styles.sectionTitle}>Record Payment — Dr. {consultant.name}</Text>

        <Text style={styles.label}>Amount (₹) *</Text>
        <TextInput
          style={styles.input} value={amount} onChangeText={setAmount}
          placeholder="Enter amount" keyboardType="numeric"
          placeholderTextColor={theme.colors.textLight} />

        <Text style={styles.label}>Payment Mode</Text>
        <View style={styles.chips}>
          {PAYMENT_MODES.map(m => (
            <TouchableOpacity key={m}
              style={[styles.chip, paymentMode === m && styles.chipActive]}
              onPress={() => setPaymentMode(m)}>
              <Text style={[styles.chipText, paymentMode === m && styles.chipTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Payment Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{paymentDate}</Text>
          <Ionicons name="calendar" size={18} color={ACCENT} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(paymentDate)} mode="date" display="default"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setPaymentDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
            }} />
        )}

        {upcomingAppts.length > 0 && (
          <>
            <Text style={styles.label}>Link to Patient (Optional)</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={theme.colors.textLight} />
              <TextInput
                style={styles.searchInput} value={patientSearch} onChangeText={setPatientSearch}
                placeholder="Search patient by name..."
                placeholderTextColor={theme.colors.textLight} />
              {patientSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPatientSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.apptOption, !selectedAppt && styles.apptOptionActive]}
              onPress={() => setSelectedAppt(null)}>
              <Text style={[styles.apptOptionText, !selectedAppt && styles.apptOptionTextActive]}>None</Text>
            </TouchableOpacity>
            {filteredAppts.map(a => (
              <TouchableOpacity key={a.id}
                style={[styles.apptOption, selectedAppt?.id === a.id && styles.apptOptionActive]}
                onPress={() => setSelectedAppt(a)}>
                <Text style={[styles.apptOptionText, selectedAppt?.id === a.id && styles.apptOptionTextActive]}>
                  {a.first_name} {a.last_name} · {a.appointment_date} {a.appointment_time}
                </Text>
              </TouchableOpacity>
            ))}
            {filteredAppts.length === 0 && (
              <Text style={styles.noResults}>No patients match "{patientSearch}"</Text>
            )}
          </>
        )}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes} onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor={theme.colors.textLight}
          multiline numberOfLines={3} />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>Record Payment</Text>
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
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: ACCENT, marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  label: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text, backgroundColor: '#FAFAFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { color: theme.colors.text },
  textArea: { minHeight: 70, textAlignVertical: 'top', flexDirection: undefined },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FAFAFA', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: theme.fontSizes.md, color: theme.colors.text, padding: 0 },
  apptOption: { padding: 10, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 6, backgroundColor: '#FAFAFA' },
  apptOptionActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  apptOptionText: { fontSize: 13, color: theme.colors.text },
  apptOptionTextActive: { color: '#fff' },
  noResults: { fontSize: 13, color: theme.colors.textLight, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
