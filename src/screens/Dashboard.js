import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { patientsAPI, appointmentsAPI, billingAPI, consultantAPI } from '../services/api';

function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function AppointmentItem({ item, onPress }) {
  const statusColors = {
    scheduled: theme.colors.primary,
    completed: theme.colors.success,
    cancelled: theme.colors.error,
  };
  return (
    <TouchableOpacity style={styles.apptItem} onPress={onPress}>
      <View style={[styles.apptTime, { backgroundColor: theme.colors.primaryLight }]}>
        <Text style={styles.apptTimeText}>{item.appointment_time}</Text>
      </View>
      <View style={styles.apptInfo}>
        <Text style={styles.apptName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.apptDoctor}>{item.consultant_name || item.doctor_name || '—'} · {item.purpose || 'Consultation'}</Text>
      </View>
      <View style={[styles.apptBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
        <Text style={[styles.apptStatus, { color: statusColors[item.status] }]}>
          {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({ patients: 0, today: 0, revenue: 0, pending: 0 });
  const [todayAppts, setTodayAppts] = useState([]);
  const [branchFilter, setBranchFilter] = useState('All');
  const [reminders, setReminders] = useState([]);
  const [consultantReport, setConsultantReport] = useState({ rows: [], grand_total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, aRes, bRes, rRes, cRes] = await Promise.all([
        patientsAPI.getAll().catch(() => ({ data: [] })),
        appointmentsAPI.getToday().catch(() => ({ data: [] })),
        billingAPI.getStats().catch(() => ({ data: { today_revenue: 0, pending_count: 0 } })),
        appointmentsAPI.getReminders().catch(() => ({ data: [] })),
        consultantAPI.getPaymentsSummary().catch(() => ({ data: [], grand_total: 0 })),
      ]);
      setStats({
        patients: pRes.data?.length || 0,
        today: aRes.data?.length || 0,
        revenue: bRes.data?.today_revenue || 0,
        pending: bRes.data?.pending_count || 0,
      });
      setTodayAppts(aRes.data || []);
      setReminders(rRes.data || []);
      setConsultantReport({ rows: cRes.data || [], grand_total: cRes.grand_total || 0 });
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  const sendPatientReminder = (appt) => {
    if (!appt.mobile) { Alert.alert('No Mobile', 'No mobile number saved for this patient.'); return; }
    const dateStr = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const branch = appt.clinic_branch || 'Avadi';
    const provider = appt.consultant_name || appt.doctor_name || '';
    const message =
      `Dear ${appt.first_name},\n\n` +
      `Reminder: You have an appointment at VEB DENTAL CARE, ${branch}.\n\n` +
      `📅 Date: ${dateStr}\n` +
      `⏰ Time: ${appt.appointment_time}\n` +
      (provider ? `👨‍⚕️ Provider: ${provider}\n` : '') +
      `🦷 Purpose: ${appt.purpose || 'Consultation'}\n\n` +
      `Please arrive 10 minutes early. Contact us if you need to reschedule.\n\nVEB DENTAL CARE, ${branch}`;
    Linking.openURL(`whatsapp://send?phone=91${appt.mobile.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`)
      .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
  };

  const sendProviderReminder = (appt) => {
    const providerMobile = appt.consultant_mobile || appt.doctor_mobile;
    const providerName = appt.consultant_name || appt.doctor_name;
    if (!providerMobile) { Alert.alert('No Mobile', 'No mobile number saved for this provider.'); return; }
    const dateStr = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const branch = appt.clinic_branch || 'Avadi';
    const message =
      `Dear Dr. ${providerName},\n\n` +
      `You have an appointment at VEB DENTAL CARE, ${branch}.\n\n` +
      `👤 Patient: ${appt.first_name} ${appt.last_name}\n` +
      `🦷 Purpose: ${appt.purpose || 'Consultation'}\n` +
      `📅 Date: ${dateStr}\n` +
      `⏰ Time: ${appt.appointment_time}\n\n` +
      `Please be available on time.\n\nVEB DENTAL CARE Management`;
    Linking.openURL(`whatsapp://send?phone=91${providerMobile.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`)
      .catch(() => Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send reminders.'));
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading VEB DENTAL CARE...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Clinic Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>VEB DENTAL CARE</Text>
          <Text style={styles.bannerDate}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.bannerIcon}>
          <Ionicons name="medical" size={48} color="rgba(255,255,255,0.3)" />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Total Patients" value={stats.patients} color={theme.colors.primary} bg="#E3F2FD" />
        <StatCard icon="calendar" label="Today's Appts" value={stats.today} color={theme.colors.secondary} bg="#E0F2F1" />
        <StatCard icon="cash" label="Today Revenue" value={`₹${stats.revenue?.toLocaleString('en-IN')}`} color={theme.colors.success} bg="#E8F5E9" />
        <StatCard icon="time" label="Pending Bills" value={stats.pending} color={theme.colors.warning} bg="#FFF3E0" />
      </View>

      {/* Branch-wise appointment breakdown */}
      {(() => {
        const avadi = todayAppts.filter(a => (a.clinic_branch || 'Avadi') === 'Avadi').length;
        const thiru = todayAppts.filter(a => a.clinic_branch === 'Thiruninravur').length;
        return (
          <View style={styles.branchBar}>
            {[
              { label: 'Avadi', count: avadi, color: theme.colors.primary, bg: '#E3F2FD' },
              { label: 'Thiruninravur', count: thiru, color: '#7B1FA2', bg: '#F3E5F5' },
            ].map(b => (
              <TouchableOpacity key={b.label}
                style={[styles.branchCard, { backgroundColor: b.bg }, branchFilter === b.label && styles.branchCardActive]}
                onPress={() => setBranchFilter(prev => prev === b.label ? 'All' : b.label)}>
                <Ionicons name="business" size={14} color={b.color} />
                <Text style={[styles.branchCardLabel, { color: b.color }]}>{b.label}</Text>
                <Text style={[styles.branchCardCount, { color: b.color }]}>{b.count} appt{b.count !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })()}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {[
          { icon: 'person-add', label: 'New Patient', color: theme.colors.primary, screen: 'Patients', params: { screen: 'PatientRegistration' } },
          { icon: 'calendar-outline', label: 'Book Appt', color: theme.colors.secondary, screen: 'Appointments', params: { screen: 'BookAppointment' } },
          { icon: 'medical', label: 'Diagnosis', color: theme.colors.accent, screen: 'Patients', params: { screen: 'PatientList' } },
          { icon: 'receipt', label: 'Billing', color: '#7B1FA2', screen: 'Bills', params: { screen: 'BillingList' } },
        ].map((action, i) => (
          <TouchableOpacity key={i} style={styles.quickAction}
            onPress={() => navigation.navigate(action.screen, action.params)}>
            <View style={[styles.quickIcon, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={26} color={action.color} />
            </View>
            <Text style={styles.quickLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Appointments */}
      {(() => {
        const filtered = branchFilter === 'All'
          ? todayAppts
          : todayAppts.filter(a => (a.clinic_branch || 'Avadi') === branchFilter);
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Today's Appointments</Text>
                {branchFilter !== 'All' && (
                  <TouchableOpacity onPress={() => setBranchFilter('All')} style={styles.branchFilterTag}>
                    <Ionicons name="business" size={11} color={theme.colors.primary} />
                    <Text style={styles.branchFilterTagText}>{branchFilter}</Text>
                    <Ionicons name="close-circle" size={13} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={40} color={theme.colors.border} />
                <Text style={styles.emptyText}>
                  {branchFilter === 'All' ? 'No appointments today' : `No appointments at ${branchFilter} today`}
                </Text>
              </View>
            ) : (
              filtered.slice(0, 5).map((appt) => (
                <AppointmentItem key={appt.id} item={appt}
                  onPress={() => navigation.navigate('Patients', { screen: 'PatientDetails', params: { id: appt.patient_id } })} />
              ))
            )}
          </View>
        );
      })()}

      {/* Patient Reminders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.reportTitleRow}>
            <View style={[styles.reportIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            </View>
            <View>
              <Text style={styles.sectionTitle2}>Patient Reminders</Text>
              <Text style={styles.reminderSubtitle}>Tomorrow's appointments</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#25D366" />
            <Text style={styles.emptyText}>No reminders due tomorrow</Text>
          </View>
        ) : (
          reminders.map((appt) => (
            <View key={appt.id} style={styles.reminderRow}>
              <View style={styles.reminderTime}>
                <Text style={styles.reminderTimeText}>{appt.appointment_time}</Text>
                <Text style={styles.reminderBranch}>{appt.clinic_branch || 'Avadi'}</Text>
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderName}>{appt.first_name} {appt.last_name}</Text>
                <Text style={styles.reminderPurpose}>{appt.purpose || 'Consultation'} · {appt.doctor_name}</Text>
                <Text style={styles.reminderMobile}>{appt.mobile}</Text>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity style={styles.waSendBtn} onPress={() => sendPatientReminder(appt)}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={styles.waSendText}>Patient</Text>
                </TouchableOpacity>
                {(appt.consultant_mobile || appt.doctor_mobile) ? (
                  <TouchableOpacity style={[styles.waSendBtn, { backgroundColor: theme.colors.primary }]} onPress={() => sendProviderReminder(appt)}>
                    <Ionicons name="person" size={14} color="#fff" />
                    <Text style={styles.waSendText}>Doctor</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Consultant Payment Report */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.reportTitleRow}>
            <View style={styles.reportIconWrap}>
              <Ionicons name="briefcase" size={16} color="#0277BD" />
            </View>
            <Text style={styles.sectionTitle2}>Consultant Payments</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Clinic', { screen: 'ConsultantList' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Grand total bar */}
        <View style={styles.grandTotalBar}>
          <Text style={styles.grandTotalLabel}>Total Paid to Consultants</Text>
          <Text style={styles.grandTotalValue}>₹{consultantReport.grand_total.toLocaleString('en-IN')}</Text>
        </View>

        {consultantReport.rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="briefcase-outline" size={36} color={theme.colors.border} />
            <Text style={styles.emptyText}>No consultant payments recorded</Text>
          </View>
        ) : (
          consultantReport.rows.map((c) => (
            <TouchableOpacity key={c.consultant_id} style={styles.consultantRow}
              onPress={() => navigation.navigate('Clinic', {
                screen: 'ConsultantDetail',
                params: { consultant: { id: c.consultant_id, name: c.name, department: c.department, mobile: c.mobile } },
              })}>
              <View style={styles.consultantAvatar}>
                <Text style={styles.consultantAvatarText}>{c.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.consultantInfo}>
                <Text style={styles.consultantName}>Dr. {c.name}</Text>
                <Text style={styles.consultantMeta}>
                  {c.appointment_count} appt{c.appointment_count !== 1 ? 's' : ''} · {c.payment_count} payment{c.payment_count !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.consultantPaid}>
                <Text style={styles.consultantAmount}>₹{(c.total_paid || 0).toLocaleString('en-IN')}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.border} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Clinic Info */}
      <View style={styles.clinicInfo}>
        <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.clinicInfoText}>VEB DENTAL CARE</Text>
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary },
  banner: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {},
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  bannerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  bannerDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  bannerIcon: { opacity: 0.5 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    ...theme.shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statContent: {},
  statValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text, marginLeft: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  quickLabel: { fontSize: 11, color: theme.colors.text, fontWeight: '600', textAlign: 'center' },
  section: { margin: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.lg, ...theme.shadows.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md },
  viewAll: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.fontSizes.sm },
  apptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  apptTime: {
    width: 58,
    height: 38,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  apptTimeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  apptInfo: { flex: 1 },
  apptName: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text },
  apptDoctor: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  apptBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.round },
  apptStatus: { fontSize: 11, fontWeight: '600' },
  emptyBox: { padding: theme.spacing.xl, alignItems: 'center' },
  emptyText: { color: theme.colors.textLight, marginTop: theme.spacing.sm },
  clinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  clinicInfoText: { color: theme.colors.textSecondary, fontSize: 12, marginLeft: 4 },
  bottomPad: { height: 20 },
  branchBar: { flexDirection: 'row', paddingHorizontal: theme.spacing.sm, gap: theme.spacing.sm, marginBottom: 4 },
  branchCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: theme.radius.md, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  branchCardActive: { borderColor: theme.colors.primary },
  branchCardLabel: { fontSize: 12, fontWeight: '700', flex: 1 },
  branchCardCount: { fontSize: 13, fontWeight: '800' },
  branchFilterTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  branchFilterTagText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  reminderSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.divider, gap: 10,
  },
  reminderTime: {
    width: 52, alignItems: 'center',
    backgroundColor: '#E8F5E9', borderRadius: theme.radius.sm, paddingVertical: 6,
  },
  reminderTimeText: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
  reminderBranch: { fontSize: 9, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  reminderInfo: { flex: 1 },
  reminderName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  reminderPurpose: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  reminderMobile: { fontSize: 11, color: theme.colors.textLight, marginTop: 1 },
  waSendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  waSendText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
  sectionTitle2: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  grandTotalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E3F2FD', marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: 10,
  },
  grandTotalLabel: { fontSize: theme.fontSizes.sm, color: '#0277BD', fontWeight: '600' },
  grandTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#0277BD' },
  consultantRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  consultantAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#0277BD',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  consultantAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  consultantInfo: { flex: 1 },
  consultantName: { fontSize: theme.fontSizes.md, fontWeight: '600', color: theme.colors.text },
  consultantMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  consultantPaid: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  consultantAmount: { fontSize: theme.fontSizes.md, fontWeight: '700', color: '#2E7D32' },
});
