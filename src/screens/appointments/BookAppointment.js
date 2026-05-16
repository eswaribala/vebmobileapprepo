import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { appointmentsAPI, patientsAPI, doctorsAPI } from '../../services/api';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

const PURPOSES = [
  'General Consultation', 'Dental Checkup', 'Cleaning / Scaling',
  'Extraction', 'Filling', 'Root Canal', 'Implant Consultation',
  'Crown / Bridge', 'Tooth Aligner', 'Follow-up', 'Emergency',
];

export default function BookAppointmentScreen({ route, navigation }) {
  const prefPatient = route.params?.patient;
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(prefPatient || null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([patientsAPI.getAll(), doctorsAPI.getAll()]).then(([pRes, dRes]) => {
      setPatients(pRes.data || []);
      setDoctors(dRes.data || []);
      if (dRes.data?.length > 0) setSelectedDoctor(dRes.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredPatients = patients.filter(p =>
    !patientSearch || `${p.first_name} ${p.last_name} ${p.mobile}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedPatient) { Alert.alert('Error', 'Please select a patient'); return; }
    if (!selectedDoctor) { Alert.alert('Error', 'Please select a doctor'); return; }
    if (!time) { Alert.alert('Error', 'Please select an appointment time'); return; }
    if (!purpose) { Alert.alert('Error', 'Please select appointment purpose'); return; }
    setSaving(true);
    try {
      await appointmentsAPI.create({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor.id,
        appointment_date: date,
        appointment_time: time,
        purpose,
        notes,
      });
      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to book appointment');
    }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Patient Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Patient</Text>
        {selectedPatient ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>{selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}</Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>
              <Text style={styles.selectedSub}>{selectedPatient.patient_id} · {selectedPatient.mobile}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPatient(null)}>
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput style={styles.searchInput} placeholder="Search patient by name or mobile..."
              value={patientSearch} onChangeText={setPatientSearch}
              placeholderTextColor={theme.colors.textLight} />
            <View style={styles.patientList}>
              {filteredPatients.slice(0, 6).map(p => (
                <TouchableOpacity key={p.id} style={styles.patientItem} onPress={() => { setSelectedPatient(p); setPatientSearch(''); }}>
                  <Text style={styles.patientItemName}>{p.first_name} {p.last_name}</Text>
                  <Text style={styles.patientItemSub}>{p.mobile} · {p.patient_id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Doctor Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Doctor</Text>
        {doctors.map(d => (
          <TouchableOpacity key={d.id} style={[styles.doctorCard, selectedDoctor?.id === d.id && styles.doctorCardActive]}
            onPress={() => setSelectedDoctor(d)}>
            <View style={[styles.doctorAvatar, selectedDoctor?.id === d.id && styles.doctorAvatarActive]}>
              <Ionicons name="person" size={20} color={selectedDoctor?.id === d.id ? '#fff' : theme.colors.primary} />
            </View>
            <View style={styles.doctorInfo}>
              <Text style={[styles.doctorName, selectedDoctor?.id === d.id && { color: theme.colors.primary }]}>{d.name}</Text>
              <Text style={styles.doctorSpec}>{d.specialization}</Text>
            </View>
            {selectedDoctor?.id === d.id && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color={theme.colors.primary} />
          <Text style={styles.dateBtnText}>{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d.toISOString().split('T')[0]); }}
          />
        )}

        <Text style={styles.subLabel}>Select Time Slot</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map(slot => (
            <TouchableOpacity key={slot} style={[styles.timeSlot, time === slot && styles.timeSlotActive]}
              onPress={() => setTime(slot)}>
              <Text style={[styles.timeSlotText, time === slot && styles.timeSlotTextActive]}>{slot}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Purpose */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Purpose</Text>
        <View style={styles.purposeGrid}>
          {PURPOSES.map(p => (
            <TouchableOpacity key={p} style={[styles.purposeChip, purpose === p && styles.purposeChipActive]}
              onPress={() => setPurpose(p)}>
              <Text style={[styles.purposeText, purpose === p && styles.purposeTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.notesInput} placeholder="Additional notes (optional)..."
          value={notes} onChangeText={setNotes} multiline numberOfLines={3}
          placeholderTextColor={theme.colors.textLight} />
      </View>

      <TouchableOpacity style={[styles.bookBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="calendar-sharp" size={22} color="#fff" />
            <Text style={styles.bookBtnText}>Book Appointment</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', margin: theme.spacing.md, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, marginBottom: 10, fontSize: theme.fontSizes.md, color: theme.colors.text },
  patientList: {},
  patientItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  patientItemName: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text },
  patientItemSub: { fontSize: 12, color: theme.colors.textSecondary },
  selectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 12, borderRadius: theme.radius.md },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  selectedAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  selectedSub: { fontSize: 12, color: theme.colors.textSecondary },
  doctorCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  doctorCardActive: { borderColor: theme.colors.primary, backgroundColor: '#E3F2FD' },
  doctorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  doctorAvatarActive: { backgroundColor: theme.colors.primary },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  doctorSpec: { fontSize: 12, color: theme.colors.textSecondary },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E3F2FD', padding: 12, borderRadius: theme.radius.md, marginBottom: 12 },
  dateBtnText: { fontSize: theme.fontSizes.md, color: theme.colors.primary, fontWeight: '600', flex: 1 },
  subLabel: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  timeSlotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  timeSlotText: { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '600' },
  timeSlotTextActive: { color: '#fff' },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  purposeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  purposeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  purposeText: { fontSize: 12, color: theme.colors.text },
  purposeTextActive: { color: '#fff' },
  notesInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, height: 80, textAlignVertical: 'top', color: theme.colors.text },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  bookBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
