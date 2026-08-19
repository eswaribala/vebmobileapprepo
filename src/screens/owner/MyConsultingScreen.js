import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { ownerConsultingAPI } from '../../services/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseTimes(str) {
  return (str || '').split(',').map(t => t.trim()).filter(Boolean);
}

function ApptCard({ appt, onEdit, onDelete, hasConflict }) {
  return (
    <View style={[styles.card, hasConflict && styles.cardConflict]}>
      <View style={styles.cardTop}>
        <View style={[styles.dateBox, hasConflict && styles.dateBoxConflict]}>
          <Text style={styles.dateDay}>{appt.appointment_date?.slice(8)}</Text>
          <Text style={styles.dateMon}>{MONTH_NAMES[parseInt(appt.appointment_date?.slice(5, 7)) - 1]}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.clinicName}>{appt.clinic_name}</Text>
          {appt.clinic_address ? <Text style={styles.address}>{appt.clinic_address}</Text> : null}
          {appt.patient_name ? <Text style={styles.patient}>Patient: {appt.patient_name}</Text> : null}
          {appt.procedure ? <Text style={styles.procedure}>{appt.procedure}</Text> : null}
          <View style={styles.metaRow}>
            {appt.appointment_time ? (
              <View style={styles.chip}><Ionicons name="time" size={11} color={theme.colors.textSecondary} /><Text style={styles.chipText}>{appt.appointment_time}</Text></View>
            ) : null}
            {appt.income > 0 ? (
              <View style={[styles.chip, styles.incomeChip]}><Ionicons name="cash" size={11} color="#2E7D32" /><Text style={[styles.chipText, { color: '#2E7D32', fontWeight: '700' }]}>₹{appt.income.toLocaleString('en-IN')}</Text></View>
            ) : null}
            {appt.payment_mode ? <View style={styles.chip}><Text style={styles.chipText}>{appt.payment_mode}</Text></View> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Ionicons name="create" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
            <Ionicons name="trash" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      {appt.notes ? <Text style={styles.notes}>{appt.notes}</Text> : null}
    </View>
  );
}

export default function MyConsultingScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [clinicByDate, setClinicByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-based
  const [selYear]  = useState(now.getFullYear());

  const load = async () => {
    try {
      const res = await ownerConsultingAPI.getAppointments({ month: selMonth + 1, year: selYear });
      setAppointments(res.data || []);
    } catch { setAppointments([]); }

    try {
      const clinicRes = await ownerConsultingAPI.getClinicSlots({ month: selMonth + 1, year: selYear });
      const map = {};
      for (const row of (clinicRes.data || [])) {
        if (!row.appointment_date || !row.appointment_time) continue;
        const times = parseTimes(row.appointment_time);
        map[row.appointment_date] = [...(map[row.appointment_date] || []), ...times];
      }
      setClinicByDate(map);
    } catch { setClinicByDate({}); }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [selMonth]));

  const handleDelete = (appt) => {
    Alert.alert('Delete Appointment', `Remove appointment at ${appt.clinic_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await ownerConsultingAPI.deleteAppointment(appt.id);
        load();
      }},
    ]);
  };

  const totalIncome = appointments.reduce((s, a) => s + (a.income || 0), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Month scroller */}
      <View style={styles.monthBar}>
        {MONTH_NAMES.map((m, i) => (
          <TouchableOpacity key={m} style={[styles.monthBtn, selMonth === i && styles.monthBtnActive]} onPress={() => { setSelMonth(i); setLoading(true); }}>
            <Text style={[styles.monthText, selMonth === i && styles.monthTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLabel}>{MONTH_NAMES[selMonth]} {selYear}</Text>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryCount}>{appointments.length} appt{appointments.length !== 1 ? 's' : ''}</Text>
          <Text style={styles.summaryIncome}>₹{totalIncome.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ApptCard
            appt={item}
            onEdit={() => navigation.navigate('MyAppointmentForm', { appointment: item })}
            onDelete={() => handleDelete(item)}
            hasConflict={(clinicByDate[item.appointment_date] || []).some(
              t => parseTimes(item.appointment_time).includes(t)
            )}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={theme.colors.border} />
            <Text style={styles.emptyText}>No appointments in {MONTH_NAMES[selMonth]}</Text>
            <Text style={styles.emptyHint}>Tap + to add a consulting appointment</Text>
          </View>
        }
      />

      <View style={styles.fabRow}>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={() => navigation.navigate('MyEarnings')}>
          <Ionicons name="bar-chart" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MyAppointmentForm', {})}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  monthBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginHorizontal: 2 },
  monthBtnActive: { backgroundColor: theme.colors.primary },
  monthText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  monthTextActive: { color: '#fff' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  summaryRight: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  summaryCount: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  summaryIncome: { fontSize: 16, fontWeight: '800', color: '#2E7D32' },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  cardConflict: { borderWidth: 1.5, borderColor: '#E53935' },
  conflictBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFEBEE', borderRadius: 6, padding: 6, marginBottom: 8 },
  conflictText: { flex: 1, fontSize: 11, color: '#C62828', fontWeight: '600' },
  cardTop: { flexDirection: 'row' },
  dateBox: { width: 42, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 6, marginRight: 12 },
  dateBoxConflict: { backgroundColor: '#E53935' },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#fff' },
  dateMon: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  info: { flex: 1 },
  clinicName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  address: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  patient: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  procedure: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  incomeChip: { backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 11, color: theme.colors.textSecondary },
  notes: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 6 },
  actions: { gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  emptyHint: { color: theme.colors.textLight, fontSize: 12, marginTop: 4 },
  fabRow: { position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', gap: 12 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
  fabSecondary: { backgroundColor: '#2E7D32' },
});
