import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { patientsAPI, appointmentsAPI, billingAPI } from '../services/api';

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
        <Text style={styles.apptDoctor}>{item.doctor_name} · {item.purpose || 'Consultation'}</Text>
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, aRes, bRes] = await Promise.all([
        patientsAPI.getAll().catch(() => ({ data: [] })),
        appointmentsAPI.getToday().catch(() => ({ data: [] })),
        billingAPI.getStats().catch(() => ({ data: { today_revenue: 0, pending_count: 0 } })),
      ]);
      setStats({
        patients: pRes.data?.length || 0,
        today: aRes.data?.length || 0,
        revenue: bRes.data?.today_revenue || 0,
        pending: bRes.data?.pending_count || 0,
      });
      setTodayAppts(aRes.data || []);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading VEB Dental...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Clinic Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>VEB Dental Care</Text>
          <Text style={styles.bannerSubtitle}>& Implant Centre</Text>
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {todayAppts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.border} />
            <Text style={styles.emptyText}>No appointments today</Text>
          </View>
        ) : (
          todayAppts.slice(0, 5).map((appt) => (
            <AppointmentItem key={appt.id} item={appt}
              onPress={() => navigation.navigate('Patients', { screen: 'PatientDetails', params: { id: appt.patient_id } })} />
          ))
        )}
      </View>

      {/* Clinic Info */}
      <View style={styles.clinicInfo}>
        <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.clinicInfoText}>VEB Dental Care & Implant Centre</Text>
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
});
