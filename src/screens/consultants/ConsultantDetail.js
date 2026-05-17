import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, ScrollView, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { consultantAPI } from '../../services/api';

const ACCENT = '#0277BD';

function getISTDate(offsetDays = 0) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWhatsAppMessage(consultant, appt) {
  const dateObj = new Date(appt.appointment_date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const clinic = appt.clinic_branch
    ? `VEB DENTAL CARE, ${appt.clinic_branch}`
    : 'VEB DENTAL CARE';
  return (
    `Dear Dr. ${consultant.name},\n\n` +
    `You have an appointment scheduled at ${clinic}.\n\n` +
    `👤 Patient: ${appt.first_name} ${appt.last_name}\n` +
    `🦷 Issue: ${appt.purpose || 'Consultation'}\n` +
    `📅 Date: ${dateStr}\n` +
    `⏰ Time: ${appt.appointment_time}\n\n` +
    `Please be available on time.\n\nThank you,\nVEB DENTAL CARE Management`
  );
}

function sendWhatsApp(consultant, appt) {
  if (!consultant.mobile) {
    Alert.alert('No Mobile', 'No mobile number saved for this consultant.');
    return;
  }
  const phone = `91${consultant.mobile.replace(/\D/g, '')}`;
  const msg = encodeURIComponent(buildWhatsAppMessage(consultant, appt));
  Linking.openURL(`whatsapp://send?phone=${phone}&text=${msg}`)
    .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
}

function AppointmentCard({ appt, consultant, tomorrow }) {
  const isUpcoming = appt.appointment_date >= getISTDate();
  const isTomorrow = appt.appointment_date === tomorrow;
  const statusColors = {
    scheduled: { color: ACCENT, bg: '#E3F2FD' },
    completed: { color: '#2E7D32', bg: '#E8F5E9' },
    cancelled: { color: '#B71C1C', bg: '#FFEBEE' },
  };
  const sc = statusColors[appt.status] || statusColors.scheduled;
  return (
    <View style={[styles.apptCard, isTomorrow && styles.apptCardHighlight]}>
      {isTomorrow && (
        <View style={styles.reminderBadge}>
          <Ionicons name="notifications" size={11} color="#fff" />
          <Text style={styles.reminderBadgeText}>Reminder Due</Text>
        </View>
      )}
      <View style={styles.apptRow}>
        <View style={styles.apptLeft}>
          <Text style={styles.apptPatient}>{appt.first_name} {appt.last_name}</Text>
          <Text style={styles.apptPurpose}>{appt.purpose || 'Consultation'}</Text>
          <Text style={styles.apptMeta}>
            {appt.appointment_date} · {appt.appointment_time}
            {appt.clinic_branch ? `  ·  ${appt.clinic_branch}` : ''}
          </Text>
        </View>
        <View style={styles.apptRight}>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{appt.status || 'scheduled'}</Text>
          </View>
          {isUpcoming && (
            <TouchableOpacity
              style={[styles.waBtn, isTomorrow && styles.waBtnActive]}
              onPress={() => sendWhatsApp(consultant, appt)}>
              <Ionicons name="logo-whatsapp" size={16} color={isTomorrow ? '#fff' : '#25D366'} />
              <Text style={[styles.waBtnText, isTomorrow && { color: '#fff' }]}>Remind</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function PaymentCard({ payment, onDelete }) {
  const modeIcons = { cash: 'cash', upi: 'phone-portrait', bank: 'business', cheque: 'document-text' };
  return (
    <View style={styles.payCard}>
      <View style={styles.payLeft}>
        <Text style={styles.payAmount}>₹{(payment.amount || 0).toLocaleString()}</Text>
        <View style={styles.payMeta}>
          <Ionicons name={modeIcons[payment.payment_mode] || 'cash'} size={12} color={theme.colors.textSecondary} />
          <Text style={styles.payMetaText}>{payment.payment_mode} · {payment.payment_date}</Text>
        </View>
        {payment.first_name ? (
          <Text style={styles.payPatient}>
            {payment.first_name} {payment.last_name}
            {payment.appointment_date ? ` · ${payment.appointment_date}` : ''}
          </Text>
        ) : null}
        {payment.notes ? <Text style={styles.payNotes}>{payment.notes}</Text> : null}
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.payDelete}>
        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function ConsultantDetailScreen({ route, navigation }) {
  const { consultant } = route.params;
  const [tab, setTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tomorrow = getISTDate(1);

  const load = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        consultantAPI.getAppointments(consultant.id),
        consultantAPI.getPayments(consultant.id),
      ]);
      setAppointments(aRes.data || []);
      setPayments(pRes.data || []);
      setTotalPaid(pRes.total_paid || 0);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    navigation.setOptions({ title: `Dr. ${consultant.name}` });
    load();
  }, []));

  const handleDeletePayment = (paymentId) => {
    Alert.alert('Delete Payment', 'Remove this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await consultantAPI.deletePayment(paymentId);
        load();
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;

  const upcomingCount = appointments.filter(a => a.appointment_date >= getISTDate() && a.status !== 'cancelled').length;

  return (
    <View style={styles.container}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{consultant.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Dr. {consultant.name}</Text>
          {consultant.department ? <Text style={styles.profileSpec}>{consultant.department}</Text> : null}
          <View style={styles.profileMeta}>
            {consultant.mobile ? (
              <View style={styles.metaChip}>
                <Ionicons name="call" size={12} color={ACCENT} />
                <Text style={styles.metaText}>{consultant.mobile}</Text>
              </View>
            ) : null}
            {consultant.email ? (
              <View style={styles.metaChip}>
                <Ionicons name="mail" size={12} color={ACCENT} />
                <Text style={styles.metaText}>{consultant.email}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{appointments.length}</Text>
          <Text style={styles.statLbl}>Total Appts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: ACCENT }]}>{upcomingCount}</Text>
          <Text style={styles.statLbl}>Upcoming</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#2E7D32' }]}>₹{totalPaid.toLocaleString()}</Text>
          <Text style={styles.statLbl}>Total Paid</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['appointments', 'payments'].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'appointments' ? 'Appointments' : 'Payments'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'appointments' ? (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <AppointmentCard appt={item} consultant={consultant} tomorrow={tomorrow} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={52} color={theme.colors.border} />
              <Text style={styles.emptyText}>No appointments yet</Text>
              <Text style={styles.emptyHint}>Assign this consultant when booking an appointment</Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={payments}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <PaymentCard payment={item} onDelete={() => handleDeletePayment(item.id)} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={52} color={theme.colors.border} />
                <Text style={styles.emptyText}>No payments recorded</Text>
              </View>
            }
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('ConsultantPaymentForm', { consultant, appointments })}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: ACCENT,
    padding: theme.spacing.md, gap: 14,
  },
  profileAvatar: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: '#fff' },
  profileSpec: { fontSize: theme.fontSizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileMeta: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metaText: { fontSize: 11, color: '#fff' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  statLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: ACCENT },
  apptCard: {
    backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0,
    borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm,
  },
  apptCardHighlight: { borderLeftWidth: 3, borderLeftColor: '#25D366' },
  reminderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#25D366', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, marginBottom: 8,
  },
  reminderBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  apptRow: { flexDirection: 'row', alignItems: 'flex-start' },
  apptLeft: { flex: 1 },
  apptRight: { alignItems: 'flex-end', gap: 6 },
  apptPatient: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  apptPurpose: { fontSize: theme.fontSizes.sm, color: ACCENT, fontWeight: '600', marginTop: 2 },
  apptMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 3 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#25D366', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  waBtnActive: { backgroundColor: '#25D366', borderColor: '#25D366' },
  waBtnText: { fontSize: 11, fontWeight: '600', color: '#25D366' },
  payCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.md,
    padding: theme.spacing.md, ...theme.shadows.sm,
  },
  payLeft: { flex: 1 },
  payAmount: { fontSize: 18, fontWeight: '700', color: '#2E7D32' },
  payMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  payMetaText: { fontSize: 12, color: theme.colors.textSecondary },
  payPatient: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  payNotes: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  payDelete: { padding: 6 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    backgroundColor: '#2E7D32', borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', ...theme.shadows.lg,
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  emptyHint: { color: theme.colors.textLight, marginTop: 4, fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },
});
