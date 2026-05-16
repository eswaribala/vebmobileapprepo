import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { doctorsAPI } from '../../services/api';

function Field({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={{ color: theme.colors.error }}> *</Text>}</Text>
      {children}
    </View>
  );
}

export default function DoctorFormScreen({ route, navigation }) {
  const existingDoctor = route.params?.doctor;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', specialization: '', qualification: '', experience: '',
    mobile: '', email: '', schedule: '', registration_no: '',
  });

  useEffect(() => {
    if (existingDoctor?.id) {
      setForm({
        name: existingDoctor.name || '',
        specialization: existingDoctor.specialization || '',
        qualification: existingDoctor.qualification || '',
        experience: String(existingDoctor.experience || ''),
        mobile: existingDoctor.mobile || '',
        email: existingDoctor.email || '',
        schedule: existingDoctor.schedule || '',
        registration_no: existingDoctor.registration_no || '',
      });
    }
    navigation.setOptions({ title: existingDoctor?.id ? 'Edit Doctor' : 'Add Doctor' });
  }, []);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inp = (value, key, opts = {}) => (
    <TextInput style={styles.input} value={value} onChangeText={v => setField(key, v)}
      placeholderTextColor={theme.colors.textLight} {...opts} />
  );

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Doctor name is required'); return; }
    setSaving(true);
    try {
      if (existingDoctor?.id) {
        await doctorsAPI.update(existingDoctor.id, { ...form, experience: parseInt(form.experience) || 0, is_active: 1 });
      } else {
        await doctorsAPI.create({ ...form, experience: parseInt(form.experience) || 0 });
      }
      Alert.alert('Success', `Doctor ${existingDoctor?.id ? 'updated' : 'added'} successfully`, [
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
        <Field label="Doctor Name" required>
          {inp(form.name, 'name', { placeholder: 'Dr. Full Name' })}
        </Field>
        <Field label="Specialization">
          {inp(form.specialization, 'specialization', { placeholder: 'e.g. Dental Surgeon & Implantologist' })}
        </Field>
        <Field label="Qualification">
          {inp(form.qualification, 'qualification', { placeholder: 'e.g. BDS, MDS' })}
        </Field>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Experience (years)">
              {inp(form.experience, 'experience', { keyboardType: 'numeric', placeholder: '0' })}
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="Registration No.">
              {inp(form.registration_no, 'registration_no', { placeholder: 'DCI Reg. No.' })}
            </Field>
          </View>
        </View>
        <Field label="Mobile">
          {inp(form.mobile, 'mobile', { keyboardType: 'phone-pad', placeholder: '10-digit mobile' })}
        </Field>
        <Field label="Email">
          {inp(form.email, 'email', { keyboardType: 'email-address', placeholder: 'doctor@email.com' })}
        </Field>
        <Field label="Schedule / Availability">
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.schedule} onChangeText={v => setField('schedule', v)}
            placeholder="Mon-Sat 9AM-6PM, Closed Sunday..."
            placeholderTextColor={theme.colors.textLight} multiline numberOfLines={3} />
        </Field>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{existingDoctor?.id ? 'Update Doctor' : 'Add Doctor'}</Text>
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
  field: { marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text, backgroundColor: '#FAFAFA' },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
