import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Rect, Ellipse, Path, Text as SvgText, Circle } from 'react-native-svg';
import { theme, toothConditions } from '../../utils/theme';
import { diagnosisAPI, doctorsAPI, staffAPI } from '../../services/api';

// ─── Dental chart data ────────────────────────────────────────────────────────
// FDI notation: upper right 11-18, upper left 21-28, lower left 31-38, lower right 41-48
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const TOOTH_COLORS = {
  healthy: '#4CAF50',
  caries:  '#F44336',
  filling: '#2196F3',
  rct:     '#FF9800',
  implant: '#9C27B0',
  aligner: '#00BCD4',
  surgery: '#795548',
  crown:   '#FFC107',
  missing: '#9E9E9E',
  bridge:  '#607D8B',
};

// ─── Single Tooth SVG component ───────────────────────────────────────────────
function ToothSVG({ number, condition, isSelected, onPress, isUpper }) {
  const color = TOOTH_COLORS[condition] || '#E0E0E0';
  const strokeColor = isSelected ? '#FF6B35' : '#9E9E9E';
  const strokeWidth = isSelected ? 2.5 : 1;

  // Determine shape based on tooth position
  const isMolar = [6, 7, 8].includes(number % 10) || (number % 10 === 0);
  const isCanine = number % 10 === 3;

  const W = 26, H = isUpper ? 30 : 30;
  const crownH = isCanine ? 14 : isMolar ? 16 : 12;
  const rootH = H - crownH;

  return (
    <TouchableOpacity onPress={onPress} style={styles.toothWrapper}>
      <Svg width={W} height={H + 12} viewBox={`0 0 ${W} ${H + 12}`}>
        {/* Crown */}
        <Rect x={2} y={isUpper ? 0 : rootH}
          width={W - 4} height={crownH}
          rx={isCanine ? 5 : isMolar ? 3 : 4}
          fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />

        {/* Root(s) */}
        {isUpper ? (
          isMolar ? (
            <>
              <Rect x={4} y={crownH} width={6} height={rootH} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
              <Rect x={W/2-3} y={crownH} width={6} height={rootH - 2} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
              <Rect x={W - 10} y={crownH} width={6} height={rootH} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
            </>
          ) : isCanine ? (
            <Rect x={W/2-3} y={crownH} width={6} height={rootH + 4} rx={3} fill={color} stroke={strokeColor} strokeWidth={1} />
          ) : (
            <>
              <Rect x={5} y={crownH} width={5} height={rootH} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
              <Rect x={W - 10} y={crownH} width={5} height={rootH - 2} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
            </>
          )
        ) : (
          isMolar ? (
            <>
              <Rect x={4} y={0} width={7} height={rootH} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
              <Rect x={W - 11} y={0} width={7} height={rootH} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
            </>
          ) : (
            <Rect x={W/2-3} y={0} width={6} height={rootH + (isCanine ? 4 : 0)} rx={2} fill={color} stroke={strokeColor} strokeWidth={1} />
          )
        )}

        {/* Tooth number */}
        <SvgText x={W/2} y={isUpper ? crownH/2 + 4 : rootH + crownH/2 + 4}
          textAnchor="middle" fontSize="7" fontWeight="bold"
          fill={condition && condition !== 'healthy' ? '#fff' : '#555'}>
          {number}
        </SvgText>

        {/* Selected indicator */}
        {isSelected && <Circle cx={W/2} cy={isUpper ? H + 6 : 6} r={3} fill="#FF6B35" />}
      </Svg>
    </TouchableOpacity>
  );
}

// ─── Dental Chart ─────────────────────────────────────────────────────────────
function DentalChart({ toothChart, selectedTooth, onToothPress }) {
  const renderRow = (teeth, isUpper) => (
    <View style={styles.toothRow}>
      {teeth.map(num => (
        <ToothSVG
          key={num}
          number={num}
          condition={toothChart[num]?.condition}
          isSelected={selectedTooth === num}
          isUpper={isUpper}
          onPress={() => onToothPress(num)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.chart}>
      {/* Upper jaw label */}
      <View style={styles.jawLabelRow}>
        <Text style={styles.jawLabel}>Upper Right</Text>
        <View style={styles.midLine} />
        <Text style={styles.jawLabel}>Upper Left</Text>
      </View>

      {/* Upper jaw */}
      <View style={styles.jawRow}>
        {renderRow(UPPER_RIGHT, true)}
        <View style={styles.midDivider} />
        {renderRow(UPPER_LEFT, true)}
      </View>

      {/* Center divider */}
      <View style={styles.centerDivider}><Text style={styles.centerText}>— Occlusal Plane —</Text></View>

      {/* Lower jaw */}
      <View style={styles.jawRow}>
        {renderRow(LOWER_RIGHT, false)}
        <View style={styles.midDivider} />
        {renderRow(LOWER_LEFT, false)}
      </View>

      <View style={styles.jawLabelRow}>
        <Text style={styles.jawLabel}>Lower Right</Text>
        <View style={styles.midLine} />
        <Text style={styles.jawLabel}>Lower Left</Text>
      </View>
    </View>
  );
}

// ─── Main Diagnosis Screen ────────────────────────────────────────────────────
export default function DiagnosisScreen({ route, navigation }) {
  const { patient } = route.params;
  const [providers, setProviders] = useState([]); // combined doctors + consultants
  const [selectedProvider, setSelectedProvider] = useState(null); // { id, name, type, ...}
  const [toothChart, setToothChart] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [conditionModal, setConditionModal] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([doctorsAPI.getAll(), staffAPI.getAll()]).then(([dRes, sRes]) => {
      const docs = (dRes.data || []).map(d => ({ ...d, type: 'doctor' }));
      const cons = (sRes.data || []).filter(s => s.role === 'Consultant').map(c => ({ ...c, type: 'consultant' }));
      const all = [...docs, ...cons];
      setProviders(all);
      if (all.length) setSelectedProvider(all[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToothPress = (toothNum) => {
    setSelectedTooth(toothNum);
    setConditionModal(true);
  };

  const handleConditionSelect = (conditionKey) => {
    setToothChart(prev => ({
      ...prev,
      [selectedTooth]: { condition: conditionKey, tooth: selectedTooth },
    }));
    setConditionModal(false);
  };

  const handleClearTooth = () => {
    setToothChart(prev => {
      const next = { ...prev };
      delete next[selectedTooth];
      return next;
    });
    setConditionModal(false);
  };

  const markedCount = Object.keys(toothChart).length;

  const handleSave = async () => {
    if (!selectedProvider) { Alert.alert('Error', 'Please select a doctor or consultant'); return; }
    setSaving(true);
    try {
      const res = await diagnosisAPI.create({
        patient_id: patient.id,
        doctor_id: selectedProvider.type === 'doctor' ? selectedProvider.id : null,
        consultant_id: selectedProvider.type === 'consultant' ? selectedProvider.id : null,
        visit_date: new Date().toISOString().split('T')[0],
        chief_complaint: complaint,
        clinical_notes: notes,
        tooth_chart: toothChart,
      });
      Alert.alert('Diagnosis Saved', 'Proceed to create treatment plan?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Treatment Plan', onPress: () => navigation.navigate('TreatmentPlan', {
            patient,
            diagnosisId: res.data.id,
            toothChart,
            provider: selectedProvider,
          })
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save diagnosis');
    }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Patient Header */}
        <View style={styles.patientHeader}>
          <Ionicons name="person-circle" size={36} color="rgba(255,255,255,0.7)" />
          <View>
            <Text style={styles.patientName}>{patient.first_name} {patient.last_name}</Text>
            <Text style={styles.patientId}>{patient.patient_id} · Age {patient.age}</Text>
          </View>
        </View>

        {/* Provider Selection (Doctor or Consultant) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Treating Provider</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorScroll}>
            {providers.map(p => {
              const isSelected = selectedProvider?.id === p.id && selectedProvider?.type === p.type;
              const isConsultant = p.type === 'consultant';
              return (
                <TouchableOpacity key={`${p.type}-${p.id}`}
                  style={[styles.doctorPill, isSelected && styles.doctorPillActive, isConsultant && !isSelected && { borderColor: '#0277BD' }]}
                  onPress={() => setSelectedProvider(p)}>
                  <Ionicons name={isConsultant ? 'briefcase' : 'person'} size={14} color={isSelected ? '#fff' : isConsultant ? '#0277BD' : theme.colors.primary} />
                  <Text style={[styles.doctorPillText, { color: isSelected ? '#fff' : isConsultant ? '#0277BD' : theme.colors.primary }]}>
                    {isConsultant ? `${p.name} (C)` : p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Chief Complaint */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chief Complaint</Text>
          <TextInput style={styles.textArea}
            value={complaint} onChangeText={setComplaint}
            placeholder="Patient's chief complaint / reason for visit..."
            placeholderTextColor={theme.colors.textLight}
            multiline numberOfLines={3} />
        </View>

        {/* Dental Chart */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Dental Chart</Text>
            <Text style={styles.markedCount}>{markedCount} tooth/teeth marked</Text>
          </View>
          <Text style={styles.chartHint}>Tap any tooth to mark condition</Text>
          <DentalChart
            toothChart={toothChart}
            selectedTooth={selectedTooth}
            onToothPress={handleToothPress}
          />
        </View>

        {/* Legend */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Condition Legend</Text>
          <View style={styles.legend}>
            {toothConditions.map(c => (
              <View key={c.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                <Text style={styles.legendText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Marked Teeth Summary */}
        {markedCount > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Marked Conditions</Text>
            {Object.entries(toothChart).map(([tooth, data]) => {
              const cond = toothConditions.find(c => c.key === data.condition);
              return (
                <View key={tooth} style={styles.markedItem}>
                  <View style={[styles.toothNum, { backgroundColor: TOOTH_COLORS[data.condition] || '#E0E0E0' }]}>
                    <Text style={styles.toothNumText}>{tooth}</Text>
                  </View>
                  <Text style={styles.markedCondition}>{cond?.label || data.condition}</Text>
                  <TouchableOpacity onPress={() => {
                    setToothChart(prev => { const n = { ...prev }; delete n[tooth]; return n; });
                  }}>
                    <Ionicons name="close" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Clinical Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clinical Notes</Text>
          <TextInput style={styles.textArea}
            value={notes} onChangeText={setNotes}
            placeholder="Doctor's clinical notes and observations..."
            placeholderTextColor={theme.colors.textLight}
            multiline numberOfLines={4} />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="save" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Save Diagnosis & Continue</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Condition Selection Modal */}
      <Modal visible={conditionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tooth {selectedTooth} — Select Condition</Text>
              <TouchableOpacity onPress={() => setConditionModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {toothConditions.map(c => (
                <TouchableOpacity key={c.key} style={styles.conditionOption} onPress={() => handleConditionSelect(c.key)}>
                  <View style={[styles.conditionDot, { backgroundColor: c.color }]} />
                  <Text style={styles.conditionLabel}>{c.label}</Text>
                  {toothChart[selectedTooth]?.condition === c.key && (
                    <Ionicons name="checkmark-circle" size={20} color={c.color} />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.clearOption} onPress={handleClearTooth}>
                <Ionicons name="trash" size={20} color={theme.colors.error} />
                <Text style={styles.clearOptionText}>Clear / Remove marking</Text>
              </TouchableOpacity>
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
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
  },
  patientName: { fontSize: theme.fontSizes.lg, fontWeight: 'bold', color: '#fff' },
  patientId: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  card: {
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    marginBottom: 0,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  markedCount: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  chartHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12, textAlign: 'center' },
  doctorScroll: { marginHorizontal: -4 },
  doctorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.round,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  doctorPillActive: { backgroundColor: theme.colors.primary },
  doctorPillText: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.fontSizes.sm },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
  },

  // Chart styles
  chart: { backgroundColor: '#F8F9FF', borderRadius: theme.radius.md, padding: 8 },
  jawLabelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginVertical: 2 },
  jawLabel: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: '600', width: 60 },
  midLine: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  jawRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  toothRow: { flexDirection: 'row', gap: 1 },
  midDivider: { width: 2, backgroundColor: '#BDBDBD', marginHorizontal: 4, alignSelf: 'stretch' },
  centerDivider: { alignItems: 'center', paddingVertical: 4 },
  centerText: { fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.5 },
  toothWrapper: { alignItems: 'center', margin: 1 },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: theme.colors.text },

  // Marked teeth
  markedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  toothNum: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  toothNumText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  markedCondition: { flex: 1, fontSize: theme.fontSizes.md, color: theme.colors.text },

  // Buttons
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: 16,
    borderRadius: theme.radius.lg,
    gap: 8,
    ...theme.shadows.md,
  },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  conditionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  conditionDot: { width: 20, height: 20, borderRadius: 10, marginRight: 14 },
  conditionLabel: { flex: 1, fontSize: theme.fontSizes.md, color: theme.colors.text, fontWeight: '500' },
  clearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorLight,
  },
  clearOptionText: { color: theme.colors.error, fontWeight: '600', fontSize: theme.fontSizes.md },
});
