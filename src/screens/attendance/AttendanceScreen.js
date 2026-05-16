import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { attendanceAPI, staffAPI } from '../../services/api';

const STATUS_CONFIG = {
  present: { color: theme.colors.success, bg: theme.colors.successLight, label: 'Present', icon: 'checkmark-circle' },
  absent: { color: theme.colors.error, bg: theme.colors.errorLight, label: 'Absent', icon: 'close-circle' },
  half_day: { color: theme.colors.warning, bg: theme.colors.warningLight, label: 'Half Day', icon: 'time' },
};

function AttendanceRow({ staffMember, record, onCheckIn, onCheckOut, onMarkAbsent }) {
  const sc = STATUS_CONFIG[record?.status] || STATUS_CONFIG.absent;
  const hasRecord = !!record;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>{staffMember.name?.[0]}</Text>
        </View>
        <View>
          <Text style={styles.staffName}>{staffMember.name}</Text>
          <Text style={styles.staffRole}>{staffMember.role} · {staffMember.department}</Text>
          {hasRecord && (
            <Text style={styles.timeLine}>
              {record.check_in ? `In: ${record.check_in}` : 'Not checked in'}
              {record.check_out ? `  Out: ${record.check_out}` : ''}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.rowRight}>
        {hasRecord ? (
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon} size={14} color={sc.color} />
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        ) : null}
        <View style={styles.btnGroup}>
          {!hasRecord || !record.check_in ? (
            <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.colors.successLight }]} onPress={() => onCheckIn(staffMember.id)}>
              <Ionicons name="log-in" size={14} color={theme.colors.success} />
              <Text style={[styles.chipLabel, { color: theme.colors.success }]}>In</Text>
            </TouchableOpacity>
          ) : !record.check_out ? (
            <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.colors.warningLight }]} onPress={() => onCheckOut(staffMember.id)}>
              <Ionicons name="log-out" size={14} color={theme.colors.warning} />
              <Text style={[styles.chipLabel, { color: theme.colors.warning }]}>Out</Text>
            </TouchableOpacity>
          ) : null}
          {!hasRecord && (
            <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.colors.errorLight }]} onPress={() => onMarkAbsent(staffMember.id)}>
              <Ionicons name="close" size={14} color={theme.colors.error} />
              <Text style={[styles.chipLabel, { color: theme.colors.error }]}>Absent</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen({ navigation }) {
  const [allStaff, setAllStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('today');
  const [summary, setSummary] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        staffAPI.getAll(),
        attendanceAPI.getToday(),
      ]);
      setAllStaff(sRes.data || []);
      setRecords(aRes.data || []);
    } catch (err) {}
    setLoading(false);
    setRefreshing(false);
  };

  const loadSummary = async () => {
    try {
      const res = await attendanceAPI.getSummary();
      setSummary(res.data || []);
    } catch (err) {}
  };

  useFocusEffect(useCallback(() => {
    loadData();
    loadSummary();
  }, []));

  const getRecord = (staffId) => records.find(r => r.staff_id === staffId);

  const handleCheckIn = async (staffId) => {
    try {
      const res = await attendanceAPI.checkIn(staffId);
      Alert.alert('Checked In', `Check-in recorded at ${res.time}`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleCheckOut = async (staffId) => {
    try {
      const res = await attendanceAPI.checkOut(staffId);
      Alert.alert('Checked Out', `Check-out recorded at ${res.time}`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleMarkAbsent = async (staffId) => {
    try {
      await attendanceAPI.save({ staff_id: staffId, date: today, status: 'absent' });
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{allStaff.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.success }]}>{presentCount}</Text>
          <Text style={styles.statLbl}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.error }]}>{absentCount}</Text>
          <Text style={styles.statLbl}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.warning }]}>{allStaff.length - presentCount - absentCount}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['today', 'summary'].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'today' ? "Today's Attendance" : 'Monthly Summary'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'today' ? (
        <FlatList
          data={allStaff}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <AttendanceRow staffMember={item} record={getRecord(item.id)}
              onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onMarkAbsent={handleMarkAbsent} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <Text style={styles.dateHeader}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          }
        />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSummary(); }} />}>
          <Text style={styles.dateHeader}>
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Summary
          </Text>
          {summary.map(s => (
            <View key={s.id} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryName}>{s.name}</Text>
                <Text style={styles.summaryRole}>{s.role}</Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.sumStat}>
                  <Text style={[styles.sumNum, { color: theme.colors.success }]}>{s.present_days}</Text>
                  <Text style={styles.sumLbl}>Present</Text>
                </View>
                <View style={styles.sumStat}>
                  <Text style={[styles.sumNum, { color: theme.colors.error }]}>{s.absent_days}</Text>
                  <Text style={styles.sumLbl}>Absent</Text>
                </View>
                <View style={styles.sumStat}>
                  <Text style={[styles.sumNum, { color: theme.colors.warning }]}>{s.half_days}</Text>
                  <Text style={styles.sumLbl}>Half</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  statLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  dateHeader: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600', padding: theme.spacing.md },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    alignItems: 'center',
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  staffName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  staffRole: { fontSize: 11, color: theme.colors.textSecondary },
  timeLine: { fontSize: 11, color: theme.colors.primary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  btnGroup: { flexDirection: 'row', gap: 4 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginBottom: 8, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  summaryLeft: { flex: 1 },
  summaryName: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  summaryRole: { fontSize: 12, color: theme.colors.textSecondary },
  summaryStats: { flexDirection: 'row', gap: 12 },
  sumStat: { alignItems: 'center' },
  sumNum: { fontSize: 18, fontWeight: 'bold' },
  sumLbl: { fontSize: 10, color: theme.colors.textSecondary },
});
