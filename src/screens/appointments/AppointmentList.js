import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert,
  ScrollView, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { appointmentsAPI, doctorsAPI, staffAPI } from '../../services/api';

const STATUS_COLORS = {
  scheduled: { bg: '#E3F2FD', text: '#1565C0' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
};

function buildPatientMsg(appt) {
  const dateStr = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const branch = appt.clinic_branch || 'Avadi';
  const provider = appt.consultant_name || appt.doctor_name || '';
  return (
    `Dear ${appt.first_name},\n\n` +
    `Reminder: You have an appointment at VEB DENTAL CARE, ${branch}.\n\n` +
    `📅 Date: ${dateStr}\n` +
    `⏰ Time: ${appt.appointment_time}\n` +
    (provider ? `👨‍⚕️ Provider: ${provider}\n` : '') +
    `🦷 Purpose: ${appt.purpose || 'Consultation'}\n\n` +
    `Please arrive 10 minutes early. Contact us if you need to reschedule.\n\n` +
    `VEB DENTAL CARE, ${branch}`
  );
}

function buildProviderMsg(appt) {
  const dateStr = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const branch = appt.clinic_branch || 'Avadi';
  return (
    `Dear Dr. ${appt.consultant_name || appt.doctor_name},\n\n` +
    `You have an appointment at VEB DENTAL CARE, ${branch}.\n\n` +
    `👤 Patient: ${appt.first_name} ${appt.last_name}\n` +
    `🦷 Purpose: ${appt.purpose || 'Consultation'}\n` +
    `📅 Date: ${dateStr}\n` +
    `⏰ Time: ${appt.appointment_time}\n\n` +
    `Please be available on time.\n\nVEB DENTAL CARE Management`
  );
}

function sendReminder(appt) {
  if (!appt.mobile) { Alert.alert('No Mobile', 'No mobile number saved for this patient.'); return; }
  const phone = `91${appt.mobile.replace(/\D/g, '')}`;
  Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(buildPatientMsg(appt))}`)
    .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
}

function sendProviderReminder(appt) {
  const providerMobile = appt.consultant_mobile || appt.doctor_mobile;
  if (!providerMobile) { Alert.alert('No Mobile', 'No mobile number saved for this provider.'); return; }
  const phone = `91${providerMobile.replace(/\D/g, '')}`;
  Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(buildProviderMsg(appt))}`)
    .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
}

// ── Share helpers ──────────────────────────────────────────────────────────────

function buildScheduleText(appointments, filter, providerFilter) {
  const label = { today: "Today's", scheduled: 'Scheduled', completed: 'Completed', all: 'All' }[filter] || 'All';
  let msg = `📋 *APPOINTMENT SCHEDULE*\n*VEB DENTAL CARE*\n`;
  msg += `Filter: ${label}`;
  if (providerFilter) msg += ` | Dr. ${providerFilter.name}`;
  msg += `\nTotal: ${appointments.length} appointment${appointments.length !== 1 ? 's' : ''}\n\n`;

  appointments.forEach((appt, i) => {
    const date = new Date(appt.appointment_date + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    msg += `${i + 1}. *${appt.first_name} ${appt.last_name}*`;
    if (appt.p_id) msg += ` (${appt.p_id})`;
    msg += `\n   📅 ${date}  ⏰ ${appt.appointment_time}\n`;
    if (!providerFilter && (appt.consultant_name || appt.doctor_name)) {
      msg += `   👨‍⚕️ ${appt.consultant_name || appt.doctor_name}\n`;
    }
    msg += `   🦷 ${appt.purpose || 'Consultation'}\n`;
    if (appt.clinic_branch) msg += `   📍 ${appt.clinic_branch}\n`;
    msg += '\n';
  });

  msg += `_VEB DENTAL CARE Management_`;
  return msg;
}

function buildPdfHtml(appointments, filter, providerFilter) {
  const label = { today: "Today's", scheduled: 'Scheduled', completed: 'Completed', all: 'All' }[filter] || 'All';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const showProvider = !providerFilter;

  const rows = appointments.map((appt, i) => {
    const date = new Date(appt.appointment_date + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const provider = appt.consultant_name || appt.doctor_name || '—';
    const statusColor = appt.status === 'completed' ? '#2E7D32' : appt.status === 'cancelled' ? '#C62828' : '#1565C0';
    return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
        <td style="text-align:center;color:#888">${i + 1}</td>
        <td>
          <b>${appt.first_name} ${appt.last_name}</b>
          <div style="font-size:10px;color:#888">${appt.p_id || ''} · ${appt.mobile || ''}</div>
        </td>
        <td>
          <b style="color:#1565C0">${appt.appointment_time}</b>
          <div style="font-size:10px;color:#666">${date}</div>
        </td>
        ${showProvider ? `<td>${provider}</td>` : ''}
        <td>${appt.purpose || 'Consultation'}</td>
        <td>${appt.clinic_branch || 'Avadi'}</td>
        <td style="color:${statusColor};font-weight:bold;text-transform:capitalize">${appt.status || 'scheduled'}</td>
      </tr>`;
  }).join('');

  return `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;padding:18px;color:#333;font-size:12px}
      .hdr{text-align:center;border-bottom:2px solid #1565C0;padding-bottom:10px;margin-bottom:14px}
      h2{color:#1565C0;margin:0 0 4px;font-size:18px;letter-spacing:1px}
      .meta{font-size:11px;color:#666}
      table{width:100%;border-collapse:collapse}
      th{background:#1565C0;color:#fff;padding:8px 6px;text-align:left;font-size:11px}
      td{padding:6px 5px;border-bottom:1px solid #eee;vertical-align:top}
      .ftr{text-align:center;font-size:9px;color:#aaa;margin-top:16px;border-top:1px solid #eee;padding-top:8px}
    </style></head>
    <body>
      <div class="hdr">
        <h2>VEB DENTAL CARE</h2>
        <div class="meta">
          ${label} Appointments${providerFilter ? ` · Dr. ${providerFilter.name}` : ''}
          · ${appointments.length} record${appointments.length !== 1 ? 's' : ''}
          · Generated on ${today}
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Patient</th><th>Date &amp; Time</th>
          ${showProvider ? '<th>Provider</th>' : ''}
          <th>Purpose</th><th>Branch</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="ftr">VEB DENTAL CARE Management System</div>
    </body></html>`;
}

// ── Appointment card ───────────────────────────────────────────────────────────

function formatTimeDisplay(t) {
  if (!t) return '';
  const slots = t.split(',').map(s => s.trim()).filter(Boolean);
  if (slots.length <= 1) return t;
  return `${slots[0]}-${slots[slots.length - 1]}`;
}

function AppointmentCard({ item, onPress, onStatusChange, onDelete }) {
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.scheduled;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardLeft}>
        <View style={[styles.timeBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.timeText}>{formatTimeDisplay(item.appointment_time)}</Text>
          <Text style={styles.dateText}>{item.appointment_date?.slice(5)}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.patientName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.patientId}>{item.p_id} · {item.mobile}</Text>
        <Text style={styles.doctor}>{item.consultant_name || item.doctor_name || '—'}</Text>
        <Text style={styles.purpose}>{item.purpose || 'General Consultation'}</Text>
        {item.clinic_branch ? <Text style={styles.branch}>{item.clinic_branch}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
        </View>
        <View style={styles.actionBtns}>
          {item.status === 'scheduled' && (
            <>
              <TouchableOpacity style={styles.waBtn} onPress={() => sendReminder(item)}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
              {(item.consultant_mobile || item.doctor_mobile) ? (
                <TouchableOpacity style={[styles.waBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => sendProviderReminder(item)}>
                  <Ionicons name="person" size={15} color={theme.colors.primary} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.completeBtn} onPress={() => onStatusChange(item.id, 'completed')}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function AppointmentListScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');
  const [providerFilter, setProviderFilter] = useState(null); // null = All Providers
  const [providers, setProviders] = useState([]);
  const [sharing, setSharing] = useState(false);

  // Load provider list once on mount
  useEffect(() => {
    Promise.all([doctorsAPI.getAll(), staffAPI.getAll()])
      .then(([dRes, sRes]) => {
        const docs = (dRes.data || []).map(d => ({ id: d.id, name: d.name, type: 'doctor', mobile: d.mobile }));
        const cons = (sRes.data || [])
          .filter(s => s.role === 'Consultant')
          .map(c => ({ id: c.id, name: c.name, type: 'consultant', mobile: c.mobile }));
        setProviders([...docs, ...cons]);
      })
      .catch(() => {});
  }, []);

  const loadAppointments = async () => {
    try {
      let res;
      const params = {};
      if (providerFilter) {
        if (providerFilter.type === 'doctor') params.doctor_id = providerFilter.id;
        else params.consultant_id = providerFilter.id;
      }
      if (filter === 'today') {
        if (providerFilter) {
          // today + provider: filter by date
          params.date = new Date().toISOString().split('T')[0];
          res = await appointmentsAPI.getAll(params);
        } else {
          res = await appointmentsAPI.getToday();
        }
      } else {
        if (filter !== 'all') params.status = filter;
        res = await appointmentsAPI.getAll(params);
      }
      setAppointments(res.data || []);
    } catch (err) { console.log(err); }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadAppointments(); }, [filter, providerFilter]));

  const handleStatusChange = async (id, status) => {
    try {
      const appt = appointments.find(a => a.id === id);
      await appointmentsAPI.update(id, { ...appt, status });
      loadAppointments();
    } catch (err) {}
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Appointment', 'Are you sure you want to delete this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await appointmentsAPI.delete(id);
            loadAppointments();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // ── Share handlers ──────────────────────────────────────────────────────────

  const handleShareWhatsApp = (targetMobile) => {
    const msg = buildScheduleText(appointments, filter, providerFilter);
    if (targetMobile) {
      const phone = `91${targetMobile.replace(/\D/g, '')}`;
      Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`)
        .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp.'));
    } else {
      Share.share({ message: msg }).catch(() => {});
    }
  };

  const handleSharePDF = async () => {
    setSharing(true);
    try {
      const html = buildPdfHtml(appointments, filter, providerFilter);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Appointment List',
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    }
    setSharing(false);
  };

  const handleShare = () => {
    if (appointments.length === 0) {
      Alert.alert('No Appointments', 'There are no appointments to share.');
      return;
    }
    const providerLabel = providerFilter ? `Dr. ${providerFilter.name}` : 'All Providers';
    const buttons = [{ text: 'Cancel', style: 'cancel' }];
    if (providerFilter?.mobile) {
      buttons.push({ text: `📱 Send to Dr. ${providerFilter.name}`, onPress: () => handleShareWhatsApp(providerFilter.mobile) });
    }
    buttons.push({ text: '💬 WhatsApp (choose contact)', onPress: () => handleShareWhatsApp(null) });
    buttons.push({ text: '📄 Share as PDF', onPress: handleSharePDF });

    Alert.alert(
      'Share Appointments',
      `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} · ${providerLabel}`,
      buttons
    );
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  const statusFilters = [
    { key: 'today', label: 'Today' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <View style={styles.container}>
      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {statusFilters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => { setFilter(f.key); setLoading(true); }}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Provider Filter Chips */}
      {providers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.providerRow}
          contentContainerStyle={styles.providerContent}>
          <TouchableOpacity
            style={[styles.providerChip, !providerFilter && styles.providerChipActive]}
            onPress={() => { setProviderFilter(null); setLoading(true); }}>
            <Ionicons name="people" size={12} color={!providerFilter ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.providerChipText, !providerFilter && styles.providerChipTextActive]}>All</Text>
          </TouchableOpacity>
          {providers.map(p => {
            const isSelected = providerFilter?.id === p.id && providerFilter?.type === p.type;
            const isConsultant = p.type === 'consultant';
            return (
              <TouchableOpacity
                key={`${p.type}-${p.id}`}
                style={[
                  styles.providerChip,
                  isConsultant && styles.providerChipConsultant,
                  isSelected && (isConsultant ? styles.providerChipConsultantActive : styles.providerChipActive),
                ]}
                onPress={() => { setProviderFilter(p); setLoading(true); }}>
                <Ionicons
                  name={isConsultant ? 'briefcase' : 'person'}
                  size={12}
                  color={isSelected ? '#fff' : (isConsultant ? '#00796B' : theme.colors.primary)}
                />
                <Text style={[
                  styles.providerChipText,
                  isConsultant && { color: '#00796B' },
                  isSelected && styles.providerChipTextActive,
                ]}>Dr. {p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              onPress={() => {}}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadAppointments(); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={60} color={theme.colors.border} />
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      )}

      {/* Share FAB — shown when there are appointments to share */}
      {appointments.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, styles.shareFab, sharing && { opacity: 0.6 }]}
          onPress={handleShare}
          disabled={sharing}>
          {sharing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="share-social-outline" size={22} color="#fff" />}
        </TouchableOpacity>
      )}

      {/* Book Appointment FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BookAppointment')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Status filter row
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

  // Provider filter row
  providerRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 48,
  },
  providerContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF4FF',
  },
  providerChipConsultant: {
    borderColor: '#00796B',
    backgroundColor: '#E0F2F1',
  },
  providerChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  providerChipConsultantActive: {
    backgroundColor: '#00796B',
    borderColor: '#00796B',
  },
  providerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  providerChipTextActive: { color: '#fff' },

  // Appointment card
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
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary, marginTop: 12 },

  // FABs
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
  shareFab: {
    bottom: 92,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00897B',
  },
});
