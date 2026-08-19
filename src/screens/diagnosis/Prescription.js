import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { diagnosisAPI, doctorsAPI, staffAPI } from '../../services/api';

const COMMON_MEDICATIONS = [
  { name: 'Ibuprofen 400mg',        quantity: '10',       dosage: '1 tablet',    morning: true,  afternoon: false, night: true,  duration: '3 days' },
  { name: 'Amoxicillin 500mg',       quantity: '15',       dosage: '1 capsule',   morning: true,  afternoon: true,  night: true,  duration: '5 days' },
  { name: 'Metronidazole 400mg',     quantity: '15',       dosage: '1 tablet',    morning: true,  afternoon: true,  night: true,  duration: '5 days' },
  { name: 'Paracetamol 500mg',       quantity: '10',       dosage: '1 tablet',    morning: false, afternoon: false, night: false, duration: 'As needed' },
  { name: 'Chlorhexidine Mouthwash', quantity: '1 bottle', dosage: '10ml rinse',  morning: true,  afternoon: false, night: true,  duration: '7 days' },
  { name: 'Diclofenac 50mg',         quantity: '6',        dosage: '1 tablet',    morning: true,  afternoon: false, night: true,  duration: '3 days' },
  { name: 'Betadine Mouthwash',      quantity: '1 bottle', dosage: '15ml rinse',  morning: true,  afternoon: false, night: false, duration: '5 days' },
];

const TREATMENT_LABEL = {
  caries: 'Caries Treatment', filling: 'Ceramic Filling', rct: 'Root Canal Treatment',
  implant: 'Dental Implant', aligner: 'Tooth Aligner', surgery: 'Oral Surgery',
  crown: 'Crown / Cap', scaling: 'Scaling & Cleaning', extraction: 'Extraction',
  bridge: 'Dental Bridge', bleaching: 'Teeth Bleaching', consultation: 'Consultation',
};

function getFrequencyText(med) {
  const times = [];
  if (med.morning) times.push('Morning');
  if (med.afternoon) times.push('Afternoon');
  if (med.night) times.push('Night');
  return times.length ? times.join(' + ') : 'As directed';
}

function CheckBox({ label, value, onChange }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={() => onChange(!value)}>
      <View style={[styles.checkBox, value && styles.checkBoxOn]}>
        {value && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.checkLabel, value && styles.checkLabelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MedicationRow({ med, index, onChange, onDelete }) {
  return (
    <View style={styles.medRow}>
      <View style={styles.medHeader}>
        <View style={styles.medIndex}>
          <Text style={styles.medIndexText}>{index + 1}</Text>
        </View>
        <TextInput
          style={styles.medName}
          value={med.name}
          onChangeText={v => onChange('name', v)}
          placeholder="Medicine name (e.g. Ibuprofen 400mg)"
          placeholderTextColor={theme.colors.textLight}
        />
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="close-circle" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
      <View style={styles.medGrid}>
        <View style={styles.medField}>
          <Text style={styles.medFieldLabel}>Quantity</Text>
          <TextInput
            style={styles.medInput}
            value={med.quantity}
            onChangeText={v => onChange('quantity', v)}
            placeholder="e.g. 10 tabs"
            placeholderTextColor={theme.colors.textLight}
          />
        </View>
        <View style={styles.medField}>
          <Text style={styles.medFieldLabel}>Dosage</Text>
          <TextInput
            style={styles.medInput}
            value={med.dosage}
            onChangeText={v => onChange('dosage', v)}
            placeholder="e.g. 1 tablet"
            placeholderTextColor={theme.colors.textLight}
          />
        </View>
        <View style={styles.medField}>
          <Text style={styles.medFieldLabel}>Duration</Text>
          <TextInput
            style={styles.medInput}
            value={med.duration}
            onChangeText={v => onChange('duration', v)}
            placeholder="e.g. 5 days"
            placeholderTextColor={theme.colors.textLight}
          />
        </View>
      </View>
      <View style={styles.freqRow}>
        <Text style={styles.freqLabel}>When to take:</Text>
        <CheckBox label="Morning"   value={med.morning}   onChange={v => onChange('morning', v)} />
        <CheckBox label="Afternoon" value={med.afternoon} onChange={v => onChange('afternoon', v)} />
        <CheckBox label="Night"     value={med.night}     onChange={v => onChange('night', v)} />
      </View>
    </View>
  );
}

export default function PrescriptionScreen({ route, navigation }) {
  const { patient, diagnosisId, provider, doctorId } = route.params;
  const effectiveProvider = provider || (doctorId ? { id: doctorId, type: 'doctor' } : null);

  const [providerData, setProviderData]     = useState(null);
  const [diagnosisData, setDiagnosisData]   = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [medications, setMedications]       = useState([]);
  const [instructions, setInstructions]     = useState('');
  const [otherSuggestions, setOtherSuggestions] = useState('');
  const [followUpDate, setFollowUpDate]     = useState('');
  const [saving, setSaving]                 = useState(false);
  const [loading, setLoading]               = useState(true);
  const [quickModal, setQuickModal]         = useState(false);
  const [savedRx, setSavedRx]               = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (effectiveProvider) {
        const fetchProvider = effectiveProvider.type === 'consultant'
          ? staffAPI.getById(effectiveProvider.id).then(r => setProviderData({ ...r.data, isConsultant: true }))
          : doctorsAPI.getById(effectiveProvider.id).then(r => setProviderData(r.data));
        fetchProvider.catch(() => {});
      }
      const [diagRes, treatRes] = await Promise.all([
        diagnosisAPI.getById(diagnosisId).catch(() => null),
        diagnosisAPI.getTreatments(diagnosisId).catch(() => null),
      ]);
      if (diagRes) setDiagnosisData(diagRes.data || diagRes);
      if (treatRes) setTreatmentPlans(treatRes.data || []);
    } catch (_) {}
    setLoading(false);
  };

  const addMedication = (med = null) => {
    setMedications(prev => [...prev, med || {
      name: '', quantity: '', dosage: '', morning: false, afternoon: false, night: false, duration: '',
    }]);
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
      const fullInstructions = [instructions, otherSuggestions ? `Other Suggestions: ${otherSuggestions}` : '']
        .filter(Boolean).join('\n');
      const res = await diagnosisAPI.addPrescription(diagnosisId, {
        patient_id: patient.id,
        doctor_id: effectiveProvider?.type === 'doctor' ? effectiveProvider?.id : null,
        rx_date: new Date().toISOString().split('T')[0],
        medications: JSON.stringify(medications),
        instructions: fullInstructions,
        follow_up_date: followUpDate,
      });
      setSavedRx(res.data);
      Alert.alert('Prescription Saved', 'What would you like to do next?', [
        { text: 'Share PDF', onPress: () => handlePrint(res.data) },
        {
          text: 'Generate Bill',
          onPress: () => navigation.navigate('Billing', {
            patient, plans: treatmentPlans, diagnosisId, provider: effectiveProvider,
          }),
        },
        { text: 'Done', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const handlePrint = async (rx = savedRx) => {
    if (!rx && !medications.length) { Alert.alert('Info', 'Save prescription first'); return; }
    const meds = medications.length ? medications : JSON.parse(rx?.medications || '[]');
    try {
      const { uri } = await Print.printToFileAsync({ html: generateRxHTML(meds) });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF: ' + err.message);
    }
  };

  const generateRxHTML = (meds) => `
    <!DOCTYPE html><html>
    <head><meta charset="UTF-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; padding:20px; color:#1a1a2e; }
      .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1565C0; padding-bottom:12px; margin-bottom:14px; }
      .clinic-name { font-size:20px; font-weight:bold; color:#1565C0; }
      .clinic-sub { font-size:12px; color:#666; }
      .dr-info { text-align:right; font-size:12px; }
      .dr-name { font-size:14px; font-weight:bold; color:#1565C0; }
      .patient-box { background:#f0f4ff; padding:10px; border-radius:8px; margin-bottom:10px; font-size:12px; }
      .diag-box { background:#fff9e6; border-left:3px solid #FFC107; padding:10px; margin-bottom:10px; font-size:12px; }
      .rx-sym { font-size:34px; color:#1565C0; font-weight:bold; margin-bottom:8px; }
      table { width:100%; border-collapse:collapse; margin-bottom:14px; }
      th { background:#1565C0; color:#fff; padding:8px; font-size:12px; text-align:left; }
      td { padding:8px; font-size:12px; border-bottom:1px solid #eee; }
      tr:nth-child(even) { background:#f9f9f9; }
      .instr { background:#e8f5e9; border-left:3px solid #4CAF50; padding:10px; margin-bottom:10px; font-size:12px; }
      .followup { color:#1565C0; font-weight:bold; font-size:13px; margin-bottom:12px; }
      .footer { text-align:right; margin-top:40px; }
      .sig { border-top:1px solid #333; width:180px; display:inline-block; padding-top:4px; font-size:11px; }
    </style></head>
    <body>
      <div class="header">
        <div>
          <div class="clinic-name">VEB DENTAL CARE</div>
          <div class="clinic-sub">Professional Dental Care</div>
        </div>
        <div class="dr-info">
          <div class="dr-name">${providerData?.name || diagnosisData?.doctor_name || ''}</div>
          <div>${providerData?.qualification || ''}</div>
          <div>${providerData?.specialization || providerData?.department || ''}</div>
          ${providerData?.registration_no ? `<div>Reg: ${providerData.registration_no}</div>` : ''}
        </div>
      </div>
      <div class="patient-box">
        <strong>${patient.first_name} ${patient.last_name}</strong> &nbsp;|&nbsp;
        ID: ${patient.patient_id} &nbsp;|&nbsp; Age: ${patient.age} &nbsp;|&nbsp; ${patient.gender || ''}<br>
        Mobile: ${patient.mobile} &nbsp;|&nbsp; Date: ${new Date().toLocaleDateString('en-IN')}
      </div>
      ${diagnosisData?.chief_complaint ? `
      <div class="diag-box">
        <strong>Diagnosis:</strong> ${diagnosisData.chief_complaint}
        ${diagnosisData.clinical_notes ? `<br><strong>Notes:</strong> ${diagnosisData.clinical_notes}` : ''}
        ${treatmentPlans.length ? `<br><strong>Treatment Plan:</strong> ${treatmentPlans.map(t =>
          `${TREATMENT_LABEL[t.treatment_type] || t.treatment_type}${t.tooth_number ? ' (Tooth ' + t.tooth_number + ')' : ''}`
        ).join(', ')}` : ''}
      </div>` : ''}
      <div class="rx-sym">&#8478;</div>
      <table>
        <tr><th>#</th><th>Medicine</th><th>Qty</th><th>Dosage</th><th>When to Take</th><th>Duration</th></tr>
        ${meds.map((m, i) => `<tr>
          <td>${i + 1}</td>
          <td><strong>${m.name}</strong></td>
          <td>${m.quantity || '-'}</td>
          <td>${m.dosage || '-'}</td>
          <td>${getFrequencyText(m)}</td>
          <td>${m.duration || '-'}</td>
        </tr>`).join('')}
      </table>
      ${instructions ? `<div class="instr"><strong>Instructions:</strong><br>${instructions}</div>` : ''}
      ${otherSuggestions ? `<div class="instr"><strong>Other Suggestions:</strong><br>${otherSuggestions}</div>` : ''}
      ${followUpDate ? `<p class="followup">Next Visit: ${new Date(followUpDate + 'T00:00:00').toLocaleDateString('en-IN')}</p>` : ''}
      <div class="footer">
        <span class="sig">${providerData?.name || ''}<br>Signature &amp; Stamp</span>
      </div>
    </body></html>
  `;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.rxHeader}>
          <Text style={styles.rxSymbol}>℞</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rxTitle}>Prescription</Text>
            <Text style={styles.rxSub}>
              {patient.first_name} {patient.last_name} · {new Date().toLocaleDateString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Doctor info */}
        {providerData && (
          <View style={styles.doctorCard}>
            <Ionicons name="person" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{providerData.name}</Text>
              {(providerData.qualification || providerData.specialization) && (
                <Text style={styles.doctorSpec}>
                  {[providerData.qualification, providerData.specialization].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Diagnosis + Treatment Summary (auto-fetched) */}
        {(diagnosisData || treatmentPlans.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="clipboard" size={16} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Diagnosis Summary</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Patient</Text>
              <Text style={styles.summaryValue}>
                {patient.first_name} {patient.last_name} ({patient.patient_id})
              </Text>
            </View>
            {(providerData?.name || diagnosisData?.doctor_name) && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doctor</Text>
                <Text style={styles.summaryValue}>
                  {providerData?.name || diagnosisData.doctor_name}
                </Text>
              </View>
            )}
            {diagnosisData?.chief_complaint && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diagnosis</Text>
                <Text style={styles.summaryValue}>{diagnosisData.chief_complaint}</Text>
              </View>
            )}
            {diagnosisData?.clinical_notes && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Notes</Text>
                <Text style={styles.summaryValue}>{diagnosisData.clinical_notes}</Text>
              </View>
            )}
            {treatmentPlans.length > 0 && (
              <View style={styles.treatSummaryBox}>
                <Text style={styles.summaryLabel}>Treatment Plan</Text>
                {treatmentPlans.map((t, i) => (
                  <View key={i} style={styles.treatSummaryItem}>
                    <Ionicons name="chevron-forward" size={12} color={theme.colors.primary} />
                    <Text style={styles.treatSummaryText}>
                      {TREATMENT_LABEL[t.treatment_type] || t.treatment_type}
                      {t.tooth_number ? ` (Tooth ${t.tooth_number})` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
            <MedicationRow
              key={i} med={med} index={i}
              onChange={(field, value) => updateMed(i, field, value)}
              onDelete={() => removeMed(i)}
            />
          ))}

          <TouchableOpacity style={styles.addMedBtn} onPress={() => addMedication()}>
            <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.addMedText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions to Patient</Text>
          <TextInput
            style={styles.textArea}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Avoid hard foods, use warm salt water rinse, take medicines after food..."
            placeholderTextColor={theme.colors.textLight}
            multiline numberOfLines={3}
          />
        </View>

        {/* Other Suggestions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Other Suggestions</Text>
          <TextInput
            style={styles.textArea}
            value={otherSuggestions}
            onChangeText={setOtherSuggestions}
            placeholder="Any other advice, lifestyle changes, diet restrictions..."
            placeholderTextColor={theme.colors.textLight}
            multiline numberOfLines={3}
          />
        </View>

        {/* Next Visit Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Visit Date</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0 }]}
              value={followUpDate}
              onChangeText={setFollowUpDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textLight}
            />
          </View>
        </View>

        {/* Save / Share buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.printBtn} onPress={() => handlePrint()}>
            <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.printBtnText}>Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Rx</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Generate Bill (shown after save) */}
        {savedRx && (
          <TouchableOpacity
            style={styles.billBtn}
            onPress={() => navigation.navigate('Billing', {
              patient, plans: treatmentPlans, diagnosisId, provider: effectiveProvider,
            })}
          >
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={styles.billBtnText}>Generate Bill</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quick-add modal */}
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
                <TouchableOpacity
                  key={i}
                  style={styles.quickMedOption}
                  onPress={() => { addMedication({ ...med }); setQuickModal(false); }}
                >
                  <Text style={styles.quickMedName}>{med.name}</Text>
                  <Text style={styles.quickMedDetail}>
                    {med.dosage} · {getFrequencyText(med)} · {med.duration}
                  </Text>
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
  container:  { flex: 1, backgroundColor: theme.colors.background },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },

  rxHeader:   { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.md, gap: 12 },
  rxSymbol:   { fontSize: 36, fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' },
  rxTitle:    { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rxSub:      { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E3F2FD', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  doctorName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.primary },
  doctorSpec: { fontSize: 12, color: theme.colors.textSecondary },

  card:         { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  cardTitle:    { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  divider:      { height: 1, backgroundColor: theme.colors.border, marginBottom: 10 },

  summaryRow:       { flexDirection: 'row', gap: 8, marginBottom: 5 },
  summaryLabel:     { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, minWidth: 72 },
  summaryValue:     { fontSize: 12, color: theme.colors.text, flex: 1 },
  treatSummaryBox:  { marginTop: 4 },
  treatSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  treatSummaryText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },

  quickAddBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginLeft: 'auto' },
  quickAddText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  medRow:       { backgroundColor: '#F8F9FF', borderRadius: theme.radius.sm, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  medHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  medIndex:     { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  medIndexText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  medName:      { flex: 1, borderBottomWidth: 1, borderBottomColor: theme.colors.primary, paddingBottom: 4, fontSize: theme.fontSizes.md, color: theme.colors.text, fontWeight: '600' },

  medGrid:       { flexDirection: 'row', gap: 8, marginBottom: 8 },
  medField:      { flex: 1 },
  medFieldLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 3, textTransform: 'uppercase' },
  medInput:      { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 5, fontSize: 12, color: theme.colors.text, backgroundColor: '#fff' },

  freqRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  freqLabel:    { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkBox:     { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkBoxOn:   { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkLabel:   { fontSize: 12, color: theme.colors.textSecondary },
  checkLabelOn: { color: theme.colors.primary, fontWeight: '700' },

  addMedBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', marginTop: 4 },
  addMedText: { color: theme.colors.primary, fontWeight: '600' },

  textArea: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, minHeight: 80, textAlignVertical: 'top', fontSize: theme.fontSizes.md, color: theme.colors.text },
  input:    { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text },
  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 10, paddingVertical: 4 },

  btnRow:       { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.sm },
  printBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.radius.md, borderWidth: 2, borderColor: theme.colors.primary },
  printBtnText: { color: theme.colors.primary, fontWeight: '700' },
  saveBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 14, borderRadius: theme.radius.md },
  saveBtnText:  { color: '#fff', fontWeight: '700' },
  billBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.success, marginHorizontal: theme.spacing.md, padding: 14, borderRadius: theme.radius.md },
  billBtnText:  { color: '#fff', fontWeight: '700', fontSize: theme.fontSizes.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  modalTitle:   { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  quickMedOption: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  quickMedName:   { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text },
  quickMedDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
