import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { appointmentsAPI } from '../../services/api';

const STATUS_COLORS = {
  scheduled: { bg: '#E3F2FD', text: '#1565C0' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
};

function sendReminder(appt) {
  if (!appt.mobile) { Alert.alert('No Mobile', 'No mobile number saved for this patient.'); return; }
  const dateObj = new Date(appt.appointment_date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const branch = appt.clinic_branch || 'Avadi';
  const message =
    `Dear ${appt.first_name},\n\n` +
    `Reminder: You have an appointment at VEB DENTAL CARE, ${branch}.\n\n` +
    `📅 Date: ${dateStr}\n` +
    `⏰ Time: ${appt.appointment_time}\n` +
    `👨‍⚕️ Doctor: ${appt.doctor_name}\n` +
    `🦷 Purpose: ${appt.purpose || 'Consultation'}\n\n` +
    `Please arrive 10 minutes early. Contact us if you need to reschedule.\n\n` +
    `VEB DENTAL CARE, ${branch}`;
  const phone = `91${appt.mobile.replace(/\D/g, '')}`;
  Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`)
    .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
}

function AppointmentCard({ item, onPress, onStatusChange }) {
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.scheduled;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardLeft}>
        <View style={[styles.timeBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.timeText}>{item.appointment_time}</Text>
          <Text style={styles.dateText}>{item.appointment_date?.slice(5)}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.patientName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.patientId}>{item.p_id} · {item.mobile}</Text>
        <Text style={styles.doctor}>{item.doctor_name}</Text>
        <Text style={styles.purpose}>{item.purpose || 'General Consultation'}</Text>
        {item.clinic_branch ? <Text style={styles.branch}>{item.clinic_branch}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
        </View>
        {item.status === 'scheduled' && (
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.waBtn} onPress={() => sendReminder(item)}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeBtn} onPress={() => onStatusChange(item.id, 'completed')}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AppointmentListScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');

  const loadAppointments = async () => {
    try {
      let res;
      if (filter === 'today') {
        res = await appointmentsAPI.getToday();
      } else {
        res = await appointmentsAPI.getAll(filter === 'all' ? {} : { status: filter });
      }
      setAppointments(res.data || []);
    } catch (err) { console.log(err); }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadAppointments(); }, [filter]));

  const handleStatusChange = async (id, status) => {
    try {
      const appt = appointments.find(a => a.id === id);
      await appointmentsAPI.update(id, { ...appt, status });
      loadAppointments();
    } catch (err) {}
  };

  const filters = [
    { key: 'today', label: 'Today' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => { setFilter(f.key); setLoading(true); }}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} /> : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <AppointmentCard item={item}
              onPress={() => {}}
              onStatusChange={handleStatusChange} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={60} color={theme.colors.border} />
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BookAppointment')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
  },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    marginBottom: 0,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    alignItems: 'center',
  },
  cardLeft: { marginRight: theme.spacing.md },
  timeBadge: {
    width: 55,
    height: 55,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  cardContent: { flex: 1 },
  patientName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  patientId: { fontSize: 11, color: theme.colors.textSecondary },
  doctor: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  purpose: { fontSize: 12, color: theme.colors.textSecondary },
  branch: { fontSize: 11, color: '#0277BD', fontWeight: '600', marginTop: 2 },
  cardActions: { alignItems: 'flex-end', gap: 4 },
  actionBtns: { flexDirection: 'row', gap: 6, marginTop: 4 },
  waBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-end' },
  statusText: { fontSize: 11, fontWeight: '600' },
  completeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary, marginTop: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    backgroundColor: theme.colors.primary,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
});
