import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../utils/theme';
import { patientsAPI } from '../../services/api';

const BRANCHES = ['Avadi', 'Thiruninravur'];
const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function Field({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      {children}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, multiline, ...rest }) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textLight}
      keyboardType={keyboardType}
      multiline={multiline}
      {...rest}
    />
  );
}

function calcAge(dob) {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age.toString() : '';
}

export default function PatientRegistrationScreen({ route, navigation }) {
  const editId = route.params?.id;
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', mobile: '', dob: '',
    gender: '', address: '', blood_group: '',
    medical_history: '', allergies: '', emergency_contact: '',
    clinic_branch: 'Avadi',
  });
  const [age, setAge] = useState('');

  useEffect(() => {
    if (editId) {
      patientsAPI.getById(editId).then(res => {
        const p = res.data;
        setForm({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          mobile: p.mobile || '',
          dob: p.dob || '',
          gender: p.gender || '',
          address: p.address || '',
          blood_group: p.blood_group || '',
          medical_history: p.medical_history || '',
          allergies: p.allergies || '',
          emergency_contact: p.emergency_contact || '',
          clinic_branch: p.clinic_branch || 'Avadi',
        });
        setAge(calcAge(p.dob));
      }).catch(() => Alert.alert('Error', 'Could not load patient data'));
    }
    navigation.setOptions({ title: editId ? 'Edit Patient' : 'New Patient' });
  }, [editId]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'dob') setAge(calcAge(value));
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const iso = selected.toISOString().split('T')[0];
      setField('dob', iso);
    }
  };

  const validate = () => {
    if (!form.first_name.trim()) return 'First name is required';
    if (!form.mobile.trim() || form.mobile.length < 10) return 'Valid 10-digit mobile is required';
    if (!form.dob) return 'Date of birth is required';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Validation Error', err); return; }
    setSaving(true);
    try {
      if (editId) {
        await patientsAPI.update(editId, form);
        Alert.alert('Success', 'Patient updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const res = await patientsAPI.create(form);
        Alert.alert('Patient Registered', `Patient ID: ${res.data.patient_id}`, [
          { text: 'View Details', onPress: () => navigation.replace('PatientDetails', { id: res.data.id }) },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save patient');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Clinic Branch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinic Branch</Text>
        <View style={styles.branchRow}>
          {BRANCHES.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.branchBtn, form.clinic_branch === b && styles.branchBtnActive]}
              onPress={() => setField('clinic_branch', b)}>
              <Ionicons name="business" size={16} color={form.clinic_branch === b ? '#fff' : theme.colors.primary} />
              <Text style={[styles.branchText, form.clinic_branch === b && styles.branchTextActive]}>{b}</Text>
              {form.clinic_branch === b && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Field label="First Name" required>
              <Input value={form.first_name} onChangeText={v => setField('first_name', v)} placeholder="First name" />
            </Field>
          </View>
          <View style={styles.halfField}>
            <Field label="Last Name">
              <Input value={form.last_name} onChangeText={v => setField('last_name', v)} placeholder="Last name" />
            </Field>
          </View>
        </View>

        <Field label="Mobile Number" required>
          <Input value={form.mobile} onChangeText={v => setField('mobile', v)} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
        </Field>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Field label="Date of Birth" required>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={form.dob ? styles.inputText : styles.placeholder}>
                  {form.dob || 'YYYY-MM-DD'}
                </Text>
                <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </Field>
          </View>
          <View style={styles.halfField}>
            <Field label="Age (auto)">
              <View style={[styles.input, styles.readOnly]}>
                <Text style={styles.ageText}>{age ? `${age} years` : '—'}</Text>
              </View>
            </Field>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={form.dob ? new Date(form.dob) : new Date()}
            mode="date"
            display="default"
            minimumDate={new Date(1930, 0, 1)}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        <Field label="Gender">
          <View style={styles.chips}>
            {GENDERS.map(g => (
              <TouchableOpacity key={g} style={[styles.chip, form.gender === g && styles.chipActive]}
                onPress={() => setField('gender', g)}>
                <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Blood Group">
          <View style={styles.chips}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity key={bg} style={[styles.chip, form.blood_group === bg && styles.chipActive]}
                onPress={() => setField('blood_group', bg)}>
                <Text style={[styles.chipText, form.blood_group === bg && styles.chipTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Address">
          <Input value={form.address} onChangeText={v => setField('address', v)} placeholder="Full address" multiline numberOfLines={3} />
        </Field>

        <Field label="Emergency Contact">
          <Input value={form.emergency_contact} onChangeText={v => setField('emergency_contact', v)} placeholder="Name & Mobile" />
        </Field>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical History</Text>

        <Field label="Past Medical History">
          <Input value={form.medical_history} onChangeText={v => setField('medical_history', v)}
            placeholder="Diabetes, Hypertension, Heart disease..." multiline numberOfLines={3} />
        </Field>

        <Field label="Allergies">
          <Input value={form.allergies} onChangeText={v => setField('allergies', v)}
            placeholder="Drug allergies, food allergies..." multiline numberOfLines={2} />
        </Field>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{editId ? 'Update Patient' : 'Register Patient'}</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  section: {
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  branchRow: { flexDirection: 'row', gap: 10 },
  branchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: '#fff',
  },
  branchBtnActive: { backgroundColor: theme.colors.primary },
  branchText: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.primary },
  branchTextActive: { color: '#fff' },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  field: { marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  required: { color: theme.colors.error },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  halfField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: { color: theme.colors.text },
  placeholder: { color: theme.colors.textLight },
  multiline: { height: 80, textAlignVertical: 'top' },
  readOnly: { backgroundColor: '#F5F5F5' },
  ageText: { fontSize: theme.fontSizes.md, color: theme.colors.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.radius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
    padding: 16,
    borderRadius: theme.radius.lg,
    gap: 8,
    ...theme.shadows.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
