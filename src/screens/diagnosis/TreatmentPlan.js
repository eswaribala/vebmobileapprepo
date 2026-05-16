import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, toothConditions, TREATMENT_COSTS } from '../../utils/theme';
import { diagnosisAPI } from '../../services/api';

const TREATMENT_TYPES = [
  { key: 'caries', label: 'Caries Treatment', cost: 500 },
  { key: 'filling', label: 'Ceramic Filling', cost: 1500 },
  { key: 'rct', label: 'Root Canal Treatment (RCT)', cost: 5000 },
  { key: 'implant', label: 'Dental Implant', cost: 25000 },
  { key: 'aligner', label: 'Tooth Aligner', cost: 40000 },
  { key: 'surgery', label: 'Oral Surgery', cost: 10000 },
  { key: 'crown', label: 'Crown / Cap', cost: 8000 },
  { key: 'scaling', label: 'Scaling & Cleaning', cost: 800 },
  { key: 'extraction', label: 'Extraction', cost: 600 },
  { key: 'bridge', label: 'Dental Bridge', cost: 12000 },
  { key: 'bleaching', label: 'Teeth Bleaching', cost: 3000 },
  { key: 'consultation', label: 'Consultation', cost: 300 },
];

function TreatmentItem({ item, index, onEdit, onDelete }) {
  const cond = toothConditions.find(c => c.key === item.treatment_type) ||
    TREATMENT_TYPES.find(t => t.key === item.treatment_type);
  const color = cond?.color || theme.colors.primary;

  const statusColors = {
    planned: { bg: '#E3F2FD', text: '#1565C0' },
    'in-progress': { bg: '#FFF3E0', text: '#E65100' },
    completed: { bg: '#E8F5E9', text: '#2E7D32' },
  };
  const sc = statusColors[item.status] || statusColors.planned;

  return (
    <View style={styles.treatmentItem}>
      <View style={[styles.treatIndex, { backgroundColor: color }]}>
        <Text style={styles.treatIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.treatContent}>
        <View style={styles.treatTopRow}>
          <Text style={styles.treatType}>{TREATMENT_TYPES.find(t => t.key === item.treatment_type)?.label || item.treatment_type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
          </View>
        </View>
        {item.tooth_number && (
          <Text style={styles.toothInfo}>Tooth: {item.tooth_number}</Text>
        )}
        {item.description && <Text style={styles.treatDesc}>{item.description}</Text>}
        <Text style={styles.treatCost}>₹ {parseFloat(item.cost || 0).toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.treatActions}>
        <TouchableOpacity onPress={onEdit} style={styles.treatBtn}>
          <Ionicons name="create" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.treatBtn}>
          <Ionicons name="trash" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TreatmentPlanScreen({ route, navigation }) {
  const { patient, diagnosisId, toothChart, doctorId } = route.params;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tooth_number: '', treatment_type: '', description: '', cost: '', editId: null,
  });

  // Pre-populate from dental chart
  useEffect(() => {
    loadPlans();
    if (toothChart && Object.keys(toothChart).length > 0) {
      const initialPlans = Object.entries(toothChart).map(([tooth, data]) => ({
        tooth_number: tooth,
        treatment_type: data.condition,
        description: '',
        cost: TREATMENT_COSTS[data.condition] || 0,
      }));
      // We don't auto-save, just show what to add
    }
  }, []);

  const loadPlans = async () => {
    try {
      const res = await diagnosisAPI.getTreatments(diagnosisId);
      setPlans(res.data || []);
    } catch (err) {}
    setLoading(false);
  };

  const total = plans.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);

  const openAdd = (item = null) => {
    if (item) {
      setForm({ tooth_number: item.tooth_number || '', treatment_type: item.treatment_type || '', description: item.description || '', cost: String(item.cost || ''), editId: item.id });
    } else {
      setForm({ tooth_number: '', treatment_type: '', description: '', cost: '', editId: null });
    }
    setAddModal(true);
  };

  const handleSaveTreatment = async () => {
    if (!form.treatment_type) { Alert.alert('Error', 'Select treatment type'); return; }
    setSaving(true);
    try {
      if (form.editId) {
        await diagnosisAPI.updateTreatment(form.editId, {
          tooth_number: form.tooth_number,
          treatment_type: form.treatment_type,
          description: form.description,
          cost: parseFloat(form.cost) || 0,
          status: 'planned',
        });
      } else {
        await diagnosisAPI.addTreatment(diagnosisId, {
          patient_id: patient.id,
          doctor_id: doctorId,
          tooth_number: form.tooth_number,
          treatment_type: form.treatment_type,
          description: form.description,
          cost: parseFloat(form.cost) || 0,
        });
      }
      setAddModal(false);
      loadPlans();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Remove this treatment from plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await diagnosisAPI.deleteTreatment(id);
        loadPlans();
      }},
    ]);
  };

  const handlePrescription = () => {
    navigation.navigate('Prescription', { patient, diagnosisId, doctorId });
  };

  const handleBill = () => {
    navigation.navigate('Billing', { patient, plans, diagnosisId });
  };

  // Auto-add from chart
  const addFromChart = async () => {
    if (!toothChart || Object.keys(toothChart).length === 0) {
      Alert.alert('Info', 'No conditions marked on dental chart');
      return;
    }
    setSaving(true);
    try {
      for (const [tooth, data] of Object.entries(toothChart)) {
        const treatType = TREATMENT_TYPES.find(t => t.key === data.condition);
        await diagnosisAPI.addTreatment(diagnosisId, {
          patient_id: patient.id,
          doctor_id: doctorId,
          tooth_number: tooth,
          treatment_type: data.condition,
          description: treatType?.label || data.condition,
          cost: TREATMENT_COSTS[data.condition] || 0,
        });
      }
      loadPlans();
      Alert.alert('Done', 'Treatments added from dental chart');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Patient info */}
        <View style={styles.patientBanner}>
          <Ionicons name="person-circle" size={32} color="rgba(255,255,255,0.7)" />
          <View>
            <Text style={styles.patientName}>{patient.first_name} {patient.last_name}</Text>
            <Text style={styles.patientId}>{patient.patient_id} · Treatment Plan</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalAmount}>₹ {total.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.totalItems}>{plans.length} procedure{plans.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {toothChart && Object.keys(toothChart).length > 0 && (
            <TouchableOpacity style={styles.autoBtn} onPress={addFromChart} disabled={saving}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.autoBtnText}>Auto-add from Chart</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd()}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Treatment</Text>
          </TouchableOpacity>
        </View>

        {/* Plan list */}
        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={50} color={theme.colors.border} />
            <Text style={styles.emptyText}>No treatments added yet</Text>
            <Text style={styles.emptySubText}>Add from dental chart or manually</Text>
          </View>
        ) : (
          <View style={styles.planList}>
            {plans.map((plan, i) => (
              <TreatmentItem key={plan.id} item={plan} index={i}
                onEdit={() => openAdd(plan)}
                onDelete={() => handleDelete(plan.id)} />
            ))}
          </View>
        )}

        {/* Next Actions */}
        <View style={styles.nextActions}>
          <TouchableOpacity style={styles.prescriptionBtn} onPress={handlePrescription}>
            <Ionicons name="document-text" size={20} color={theme.colors.secondary} />
            <Text style={styles.prescriptionBtnText}>Write Prescription</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.billBtn} onPress={handleBill}>
            <Ionicons name="receipt" size={20} color="#fff" />
            <Text style={styles.billBtnText}>Generate Bill</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Treatment Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.editId ? 'Edit Treatment' : 'Add Treatment'}</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.mLabel}>Treatment Type *</Text>
              <ScrollView>
                {TREATMENT_TYPES.map(t => (
                  <TouchableOpacity key={t.key}
                    style={[styles.treatOption, form.treatment_type === t.key && styles.treatOptionActive]}
                    onPress={() => setForm(p => ({ ...p, treatment_type: t.key, cost: String(t.cost) }))}>
                    <Text style={[styles.treatOptionText, form.treatment_type === t.key && { color: '#fff' }]}>{t.label}</Text>
                    <Text style={[styles.treatOptionCost, form.treatment_type === t.key && { color: 'rgba(255,255,255,0.8)' }]}>₹{t.cost.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.mLabel}>Tooth Number(s)</Text>
              <TextInput style={styles.mInput} value={form.tooth_number} onChangeText={v => setForm(p => ({ ...p, tooth_number: v }))}
                placeholder="e.g. 16, 26 or Upper jaw" placeholderTextColor={theme.colors.textLight} />

              <Text style={styles.mLabel}>Description / Notes</Text>
              <TextInput style={[styles.mInput, { height: 70, textAlignVertical: 'top' }]}
                value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))}
                placeholder="Treatment details..." multiline placeholderTextColor={theme.colors.textLight} />

              <Text style={styles.mLabel}>Cost (₹)</Text>
              <TextInput style={styles.mInput} value={form.cost} onChangeText={v => setForm(p => ({ ...p, cost: v }))}
                keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.colors.textLight} />

              <TouchableOpacity style={[styles.mSaveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveTreatment} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.mSaveBtnText}>Save Treatment</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  patientBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.secondary, padding: theme.spacing.md },
  patientName: { fontSize: theme.fontSizes.lg, fontWeight: 'bold', color: '#fff' },
  patientId: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, borderRadius: theme.radius.md, padding: theme.spacing.md },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  totalAmount: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  totalItems: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  actionRow: { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.sm },
  autoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md },
  autoBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.fontSizes.sm },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: theme.radius.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.fontSizes.sm },
  planList: { paddingHorizontal: theme.spacing.md, gap: 8 },
  treatmentItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    alignItems: 'flex-start',
  },
  treatIndex: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  treatIndexText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  treatContent: { flex: 1 },
  treatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  treatType: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  toothInfo: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  treatDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  treatCost: { fontSize: 15, fontWeight: '700', color: theme.colors.success, marginTop: 4 },
  treatActions: { gap: 6 },
  treatBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  emptyCard: { backgroundColor: '#fff', margin: theme.spacing.md, borderRadius: theme.radius.md, padding: 40, alignItems: 'center', ...theme.shadows.sm },
  emptyText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: theme.fontSizes.sm, color: theme.colors.textLight, marginTop: 4 },
  nextActions: { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.sm },
  prescriptionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.radius.md, borderWidth: 2, borderColor: theme.colors.secondary },
  prescriptionBtnText: { color: theme.colors.secondary, fontWeight: '700' },
  billBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.success, padding: 14, borderRadius: theme.radius.md },
  billBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  modalTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  modalBody: { padding: theme.spacing.md },
  mLabel: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 12 },
  mInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: theme.fontSizes.md, color: theme.colors.text, backgroundColor: '#FAFAFA' },
  treatOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 4, backgroundColor: '#FAFAFA' },
  treatOptionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  treatOptionText: { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '600' },
  treatOptionCost: { fontSize: 12, color: theme.colors.textSecondary },
  mSaveBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.radius.lg, alignItems: 'center', marginTop: 20 },
  mSaveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
});
