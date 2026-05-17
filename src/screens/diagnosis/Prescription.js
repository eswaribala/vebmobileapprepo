import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { diagnosisAPI, doctorsAPI } from '../../services/api';

const COMMON_MEDICATIONS = [
  { name: 'Ibuprofen 400mg', dosage: '1 tablet', frequency: 'TDS', duration: '3 days' },
  { name: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: 'TDS', duration: '5 days' },
  { name: 'Metronidazole 400mg', dosage: '1 tablet', frequency: 'TDS', duration: '5 days' },
  { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'SOS', duration: 'PRN' },
  { name: 'Chlorhexidine Mouthwash', dosage: '10ml', frequency: 'BD', duration: '7 days' },
  { name: 'Diclofenac 50mg', dosage: '1 tablet', frequency: 'BD', duration: '3 days' },
  { name: 'Betadine Mouthwash', dosage: '15ml', frequency: 'OD', duration: '5 days' },
];

function MedicationRow({ med, index, onChange, onDelete }) {
  return (
    <View style={styles.medRow}>
      <View style={styles.medIndex}>
        <Text style={styles.medIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.medContent}>
        <TextInput style={styles.medName} value={med.name} onChangeText={v => onChange('name', v)}
          placeholder="Medicine name" placeholderTextColor={theme.colors.textLight} />
        <View style={styles.medDetails}>
          <TextInput style={styles.medSmall} value={med.dosage} onChangeText={v => onChange('dosage', v)} placeholder="Dose" placeholderTextColor={theme.colors.textLight} />
          <TextInput style={styles.medSmall} value={med.frequency} onChangeText={v => onChange('frequency', v)} placeholder="Freq" placeholderTextColor={theme.colors.textLight} />
          <TextInput style={styles.medSmall} value={med.duration} onChangeText={v => onChange('duration', v)} placeholder="Days" placeholderTextColor={theme.colors.textLight} />
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.medDel}>
        <Ionicons name="close-circle" size={22} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function PrescriptionScreen({ route, navigation }) {
  const { patient, diagnosisId, doctorId } = route.params;
  const [doctor, setDoctor] = useState(null);
  const [medications, setMedications] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [quickModal, setQuickModal] = useState(false);
  const [savedRx, setSavedRx] = useState(null);

  useEffect(() => {
    if (doctorId) {
      doctorsAPI.getById(doctorId).then(res => setDoctor(res.data)).catch(() => {});
    }
  }, [doctorId]);

  const addMedication = (med = null) => {
    setMedications(prev => [...prev, med || { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const updateMed = (index, field, value) => {
    setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const removeMed = (index) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (medications.length === 0) { Alert.alert('Error', 'Add at least one medication'); return; }
    setSaving(true);
    try {
      const res = await diagnosisAPI.addPrescription(diagnosisId, {
        patient_id: patient.id,
        doctor_id: doctorId,
        rx_date: new Date().toISOString().split('T')[0],
        medications: JSON.stringify(medications),
        instructions,
        follow_up_date: followUpDate,
      });
      setSavedRx(res.data);
      Alert.alert('Prescription Saved', 'Share or print the prescription?', [
        { text: 'Close', style: 'cancel' },
        { text: 'Share PDF', onPress: () => handlePrint(res.data) },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const handlePrint = async (rx = savedRx) => {
    if (!rx && !medications.length) { Alert.alert('Info', 'Save prescription first'); return; }
    const meds = medications.length ? medications : JSON.parse(rx?.medications || '[]');
    const html = generateRxHTML(meds);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF: ' + err.message);
    }
  };

  const generateRxHTML = (meds) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a2e; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565C0; padding-bottom: 12px; margin-bottom: 16px; }
        .clinic-name { font-size: 20px; font-weight: bold; color: #1565C0; }
        .clinic-sub { font-size: 12px; color: #666; }
        .doctor-info { text-align: right; font-size: 12px; }
        .doctor-name { font-size: 14px; font-weight: bold; color: #1565C0; }
        .patient-info { background: #f0f4ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 20px; }
        .rx-symbol { font-size: 36px; color: #1565C0; font-weight: bold; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #1565C0; color: white; padding: 8px; font-size: 12px; text-align: left; }
        td { padding: 8px; font-size: 12px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f9f9f9; }
        .instructions { background: #fff9e6; border-left: 3px solid #FFC107; padding: 10px; margin-bottom: 12px; }
        .followup { color: #1565C0; font-weight: bold; font-size: 12px; }
        .footer { text-align: right; margin-top: 40px; }
        .signature-line { border-top: 1px solid #333; width: 180px; display: inline-block; padding-top: 4px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="clinic-name">🦷 VEB DENTAL CARE</div>
          <div class="clinic-sub">Professional Dental Care</div>
        </div>
        <div class="doctor-info">
          <div class="doctor-name">${doctor?.name || ''}</div>
          <div>${doctor?.qualification || ''}</div>
          <div>${doctor?.specialization || ''}</div>
          <div>Reg: ${doctor?.registration_no || ''}</div>
        </div>
      </div>
      <div class="patient-info">
        <div><strong>${patient.first_name} ${patient.last_name}</strong><br>
          ID: ${patient.patient_id} | Age: ${patient.age} | ${patient.gender || ''}<br>
          Mobile: ${patient.mobile}
        </div>
        <div>Date: ${new Date().toLocaleDateString('en-IN')}</div>
      </div>
      <div class="rx-symbol">℞</div>
      <table>
        <tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
        ${meds.map((m, i) => `<tr><td>${i + 1}</td><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}
      </table>
      ${instructions ? `<div class="instructions"><strong>Instructions:</strong><br>${instructions}</div>` : ''}
      ${followUpDate ? `<p class="followup">Follow-up on: ${new Date(followUpDate + 'T00:00:00').toLocaleDateString('en-IN')}</p>` : ''}
      <div class="footer">
        <span class="signature-line">Dr. ${doctor?.name?.replace('Dr. ', '') || ''}<br>Signature & Stamp</span>
      </div>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.rxHeader}>
          <Text style={styles.rxSymbol}>℞</Text>
          <View>
            <Text style={styles.rxTitle}>Prescription</Text>
            <Text style={styles.rxSub}>{patient.first_name} {patient.last_name} · {new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        {/* Doctor info */}
        {doctor && (
          <View style={styles.doctorCard}>
            <Ionicons name="person" size={20} color={theme.colors.primary} />
            <View>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpec}>{doctor.qualification} · {doctor.specialization}</Text>
            </View>
          </View>
        )}

        {/* Medications */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Medications</Text>
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => setQuickModal(true)}>
              <Ionicons name="flash" size={14} color="#fff" />
              <Text style={styles.quickAddText}>Quick Add</Text>
            </TouchableOpacity>
          </View>

          {medications.map((med, i) => (
            <MedicationRow key={i} med={med} index={i}
              onChange={(field, value) => updateMed(i, field, value)}
              onDelete={() => removeMed(i)} />
          ))}

          <TouchableOpacity style={styles.addMedBtn} onPress={() => addMedication()}>
            <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.addMedText}>Add Medication</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions to Patient</Text>
          <TextInput style={styles.textArea}
            value={instructions} onChangeText={setInstructions}
            placeholder="Avoid hard foods, use warm salt water rinse, take medicines after food..."
            placeholderTextColor={theme.colors.textLight}
            multiline numberOfLines={4} />
        </View>

        {/* Follow-up */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Follow-up Date</Text>
          <TextInput style={styles.input}
            value={followUpDate} onChangeText={setFollowUpDate}
            placeholder="YYYY-MM-DD (optional)"
            placeholderTextColor={theme.colors.textLight} />
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.printBtn} onPress={() => handlePrint()}>
            <Ionicons name="share" size={20} color={theme.colors.primary} />
            <Text style={styles.printBtnText}>Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save & Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quick medication modal */}
      <Modal visible={quickModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Common Medications</Text>
              <TouchableOpacity onPress={() => setQuickModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {COMMON_MEDICATIONS.map((med, i) => (
                <TouchableOpacity key={i} style={styles.quickMedOption}
                  onPress={() => { addMedication({ ...med }); setQuickModal(false); }}>
                  <Text style={styles.quickMedName}>{med.name}</Text>
                  <Text style={styles.quickMedDetail}>{med.dosage} · {med.frequency} · {med.duration}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  rxHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.md, gap: 12 },
  rxSymbol: { fontSize: 36, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  rxTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rxSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E3F2FD', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  doctorName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.primary },
  doctorSpec: { fontSize: 12, color: theme.colors.textSecondary },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  cardTitle: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  quickAddText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8F9FF', borderRadius: theme.radius.sm, padding: 10, marginBottom: 8 },
  medIndex: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  medIndexText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  medContent: { flex: 1 },
  medName: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 4, marginBottom: 6, fontSize: theme.fontSizes.md, color: theme.colors.text, fontWeight: '600' },
  medDetails: { flexDirection: 'row', gap: 6 },
  medSmall: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12, color: theme.colors.text, backgroundColor: '#fff' },
  medDel: { marginLeft: 8, marginTop: 2 },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed' },
  addMedText: { color: theme.colors.primary, fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, minHeight: 90, textAlignVertical: 'top', fontSize: theme.fontSizes.md, color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text },
  btnRow: { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.sm },
  printBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.radius.md, borderWidth: 2, borderColor: theme.colors.primary },
  printBtnText: { color: theme.colors.primary, fontWeight: '700' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 14, borderRadius: theme.radius.md },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  modalTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  quickMedOption: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  quickMedName: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text },
  quickMedDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
