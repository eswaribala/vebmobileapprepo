import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { patientsAPI } from '../../services/api';

function InfoRow({ icon, label, value, isPhone }) {
  const handlePhoneTap = () => {
    if (!value) return;
    Alert.alert(value, null, [
      { text: 'Call', onPress: () => Linking.openURL(`tel:${value}`) },
      { text: 'Copy', onPress: async () => {
          await Clipboard.setStringAsync(value);
          Alert.alert('Copied', 'Phone number copied to clipboard');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={isPhone && value ? handlePhoneTap : undefined}
      activeOpacity={isPhone && value ? 0.6 : 1}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, isPhone && value && styles.phoneValue]}>
          {value || '—'}
        </Text>
      </View>
      {isPhone && value && (
        <Ionicons name="call-outline" size={16} color={theme.colors.primary} style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

function ActionBtn({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PatientDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState({ appointments: [], diagnoses: [], bills: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('info');

  const loadData = async () => {
    try {
      const [pRes, hRes] = await Promise.all([
        patientsAPI.getById(id),
        patientsAPI.getHistory(id),
      ]);
      setPatient(pRes.data);
      setHistory(hRes.data || { appointments: [], diagnoses: [], bills: [] });
    } catch (err) {
      Alert.alert('Error', 'Could not load patient data');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  const handleDelete = () => {
    Alert.alert('Delete Patient', `Delete ${patient?.first_name} ${patient?.last_name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await patientsAPI.delete(id);
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!patient) return <View style={styles.center}><Text>Patient not found</Text></View>;

  const genderColors = { Male: '#1565C0', Female: '#AD1457', Other: '#6A1B9A' };
  const avatarColor = genderColors[patient.gender] || theme.colors.primary;
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        {/* Header Card */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.patientName}>{patient.first_name} {patient.last_name}</Text>
            <Text style={styles.patientId}>{patient.patient_id}</Text>
            <View style={styles.badges}>
              {patient.gender && <View style={[styles.badge, { backgroundColor: avatarColor }]}><Text style={styles.badgeText}>{patient.gender}</Text></View>}
              {patient.blood_group && <View style={[styles.badge, { backgroundColor: theme.colors.error }]}><Text style={styles.badgeText}>{patient.blood_group}</Text></View>}
              <View style={[styles.badge, { backgroundColor: theme.colors.secondary }]}><Text style={styles.badgeText}>{patient.age} yrs</Text></View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <ActionBtn icon="create" label="Edit" color={theme.colors.primary} onPress={() => navigation.navigate('PatientRegistration', { id })} />
          <ActionBtn icon="card" label="ID Card" color={theme.colors.secondary} onPress={() => navigation.navigate('PatientIDCard', { patient })} />
          <ActionBtn icon="medical" label="Diagnose" color={theme.colors.accent} onPress={() => navigation.navigate('Diagnosis', { patient })} />
          <ActionBtn icon="receipt" label="Bill" color="#7B1FA2" onPress={() => navigation.navigate('Billing', { patient })} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['info', 'appointments', 'diagnosis', 'bills'].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'info' ? 'Info' : t === 'appointments' ? 'Appts' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {tab === 'info' && (
          <View style={styles.card}>
            <InfoRow icon="call" label="Mobile" value={patient.mobile} isPhone />
            <InfoRow icon="calendar" label="Date of Birth" value={patient.dob} />
            <InfoRow icon="location" label="Address" value={patient.address} />
            <InfoRow icon="alert-circle" label="Allergies" value={patient.allergies} />
            <InfoRow icon="document-text" label="Medical History" value={patient.medical_history} />
            <InfoRow icon="call" label="Emergency Contact" value={patient.emergency_contact} isPhone />
          </View>
        )}

        {tab === 'appointments' && (
          <View style={styles.card}>
            {history.appointments.length === 0 ? (
              <Text style={styles.emptyText}>No appointments yet</Text>
            ) : history.appointments.map(a => (
              <View key={a.id} style={styles.historyItem}>
                <Text style={styles.historyDate}>{a.appointment_date} · {a.appointment_time}</Text>
                <Text style={styles.historyTitle}>{a.doctor_name} – {a.purpose || 'Consultation'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: a.status === 'completed' ? theme.colors.successLight : theme.colors.warningLight }]}>
                  <Text style={{ color: a.status === 'completed' ? theme.colors.success : theme.colors.warning, fontSize: 11 }}>{a.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'diagnosis' && (
          <View style={styles.card}>
            {history.diagnoses.length === 0 ? (
              <Text style={styles.emptyText}>No diagnosis records yet</Text>
            ) : history.diagnoses.map(d => (
              <View key={d.id} style={styles.historyItem}>
                <Text style={styles.historyDate}>{d.visit_date}</Text>
                <Text style={styles.historyTitle}>{d.doctor_name}</Text>
                <Text style={styles.historyDetail}>{d.chief_complaint}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'bills' && (
          <View style={styles.card}>
            {history.bills.length === 0 ? (
              <Text style={styles.emptyText}>No bills yet</Text>
            ) : history.bills.map(b => (
              <View key={b.id} style={styles.historyItem}>
                <View style={styles.billRow}>
                  <Text style={styles.billNo}>{b.bill_number}</Text>
                  <Text style={styles.billAmount}>₹{b.total_amount?.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.historyDate}>{b.bill_date} · {b.payment_mode}</Text>
                <View style={[styles.statusBadge, { backgroundColor: b.payment_status === 'paid' ? theme.colors.successLight : theme.colors.warningLight }]}>
                  <Text style={{ color: b.payment_status === 'paid' ? theme.colors.success : theme.colors.warning, fontSize: 11 }}>{b.payment_status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash" size={18} color={theme.colors.error} />
          <Text style={styles.deleteBtnText}>Delete Patient Record</Text>
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  patientId: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  actionText: { fontSize: 11, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    padding: 4,
    ...theme.shadows.sm,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: theme.radius.sm },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  infoValue:  { fontSize: theme.fontSizes.md, color: theme.colors.text },
  phoneValue: { color: theme.colors.primary, textDecorationLine: 'underline' },
  historyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  historyDate: { fontSize: 12, color: theme.colors.textSecondary },
  historyTitle: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  historyDetail: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billNo: { fontSize: theme.fontSizes.sm, color: theme.colors.primary, fontWeight: '600' },
  billAmount: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.success },
  emptyText: { textAlign: 'center', color: theme.colors.textLight, padding: 20 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.md,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 8,
  },
  deleteBtnText: { color: theme.colors.error, fontWeight: '600' },
});
