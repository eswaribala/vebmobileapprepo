import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { ownerConsultingAPI } from '../../services/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MyEarningsReport({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = async () => {
    try {
      const res = await ownerConsultingAPI.getEarnings(year);
      setData(res);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [year]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  const { summary, by_clinic = [], by_month = [] } = data || {};

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

      {/* Year selector */}
      <View style={styles.yearBar}>
        <TouchableOpacity onPress={() => { setYear(y => y - 1); setLoading(true); }}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}</Text>
        <TouchableOpacity onPress={() => { setYear(y => y + 1); setLoading(true); }}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#1565C0' }]}>
          <Ionicons name="calendar" size={22} color="#1565C0" />
          <Text style={styles.summaryNum}>{summary?.total_appointments || 0}</Text>
          <Text style={styles.summaryLbl}>Total Appointments</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#2E7D32' }]}>
          <Ionicons name="cash" size={22} color="#2E7D32" />
          <Text style={[styles.summaryNum, { color: '#2E7D32' }]}>₹{(summary?.total_income || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.summaryLbl}>Total Earnings</Text>
        </View>
      </View>

      {/* By clinic */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Clinic / Hospital</Text>
        {by_clinic.length === 0 ? (
          <Text style={styles.empty}>No data for {year}</Text>
        ) : by_clinic.map((c, i) => (
          <View key={i} style={styles.clinicRow}>
            <View style={styles.clinicRank}>
              <Text style={styles.rankNum}>#{i + 1}</Text>
            </View>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{c.clinic_name}</Text>
              {c.clinic_address ? <Text style={styles.clinicAddr}>{c.clinic_address}</Text> : null}
              <Text style={styles.clinicCount}>{c.appointment_count} appointment{c.appointment_count !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.clinicIncome}>₹{(c.total_income || 0).toLocaleString('en-IN')}</Text>
          </View>
        ))}
      </View>

      {/* Monthly trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Trend</Text>
        {by_month.length === 0 ? (
          <Text style={styles.empty}>No data for {year}</Text>
        ) : by_month.map((m, i) => {
          const monthIdx = parseInt(m.month?.slice(5)) - 1;
          const maxIncome = Math.max(...by_month.map(x => x.total_income || 0), 1);
          const barWidth = ((m.total_income || 0) / maxIncome) * 100;
          return (
            <View key={i} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{MONTH_NAMES[monthIdx]}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${barWidth}%` }]} />
              </View>
              <Text style={styles.monthCount}>{m.appointment_count}</Text>
              <Text style={styles.monthIncome}>₹{(m.total_income || 0).toLocaleString('en-IN')}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yearBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  yearText: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, margin: theme.spacing.md },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center', borderLeftWidth: 4, gap: 4, ...theme.shadows.sm },
  summaryNum: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  summaryLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: '#fff', margin: theme.spacing.md, marginTop: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  sectionTitle: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingBottom: 8 },
  clinicRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  clinicRank: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankNum: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  clinicAddr: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  clinicCount: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  clinicIncome: { fontSize: 15, fontWeight: '800', color: '#2E7D32' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  monthLabel: { width: 32, fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  barContainer: { flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 5 },
  monthCount: { width: 22, fontSize: 11, color: theme.colors.textSecondary, textAlign: 'right' },
  monthIncome: { width: 72, fontSize: 12, fontWeight: '700', color: '#2E7D32', textAlign: 'right' },
  empty: { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
});
