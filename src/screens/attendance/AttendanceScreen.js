import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { theme } from '../../utils/theme';
import { attendanceAPI, staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Clinic geofence zones ─────────────────────────────────────────────────────
const CLINIC_ZONES = [
  { label: 'Avadi', lat: 13.1147, lng: 80.1015 },
  { label: 'Thiruninravur', lat: 13.1249, lng: 80.0286 },
];
const GEOFENCE_RADIUS_M = 300; // 300 m radius around each clinic

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getClinicInRange(coords) {
  return CLINIC_ZONES.find(
    z => haversine(coords.latitude, coords.longitude, z.lat, z.lng) <= GEOFENCE_RADIUS_M
  ) || null;
}

// ── IST date helper (mobile side, for absent marking) ─────────────────────────
const getISTDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present:  { color: theme.colors.success, bg: theme.colors.successLight, label: 'Present',  icon: 'checkmark-circle' },
  absent:   { color: theme.colors.error,   bg: theme.colors.errorLight,   label: 'Absent',   icon: 'close-circle' },
  half_day: { color: theme.colors.warning, bg: theme.colors.warningLight, label: 'Half Day', icon: 'time' },
};

const LOC_BANNER = {
  checking:  { color: '#1565C0', bg: '#E3F2FD', icon: 'navigate',        text: 'Checking location…' },
  at_clinic: { color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle', text: '' },
  outside:   { color: '#B71C1C', bg: '#FFEBEE', icon: 'location-outline', text: 'Not at clinic location · Check-in disabled' },
  denied:    { color: '#E65100', bg: '#FFF3E0', icon: 'warning',          text: 'Location permission required for check-in' },
  error:     { color: '#B71C1C', bg: '#FFEBEE', icon: 'alert-circle',     text: 'Location check failed · Check-in disabled' },
};

// ── Attendance row ─────────────────────────────────────────────────────────────
function AttendanceRow({ staffMember, record, onCheckIn, onCheckOut, onMarkAbsent, canCheckIn, canEdit }) {
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
            canCheckIn ? (
              <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.colors.successLight }]} onPress={() => onCheckIn(staffMember.id)}>
                <Ionicons name="log-in" size={14} color={theme.colors.success} />
                <Text style={[styles.chipLabel, { color: theme.colors.success }]}>In</Text>
              </TouchableOpacity>
            ) : null
          ) : !record.check_out ? (
            <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.colors.warningLight }]} onPress={() => onCheckOut(staffMember.id)}>
              <Ionicons name="log-out" size={14} color={theme.colors.warning} />
              <Text style={[styles.chipLabel, { color: theme.colors.warning }]}>Out</Text>
            </TouchableOpacity>
          ) : null}
          {!hasRecord && canEdit && (
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AttendanceScreen({ navigation }) {
  useAuth(); // keeps session context available if needed elsewhere

  const [allStaff, setAllStaff]       = useState([]);
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [tab, setTab]                 = useState('today');
  const [summary, setSummary]         = useState([]);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [clinicLabel, setClinicLabel] = useState(null);

  const checkLocation = async () => {
    setLocationStatus('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setClinicLabel(null);
        setLocationStatus('denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const zone = getClinicInRange(loc.coords);
      if (zone) {
        setClinicLabel(zone.label);
        setLocationStatus('at_clinic');
      } else {
        setClinicLabel(null);
        setLocationStatus('outside');
      }
    } catch {
      setClinicLabel(null);
      setLocationStatus('error');
    }
  };

  const loadData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([staffAPI.getAll(), attendanceAPI.getToday()]);
      setAllStaff(sRes.data || []);
      setRecords(aRes.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const loadSummary = async () => {
    try {
      const res = await attendanceAPI.getSummary();
      setSummary(res.data || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    checkLocation();
    loadData();
    loadSummary();
  }, []));

  const getRecord = (staffId) => records.find(r => r.staff_id === staffId);

  const handleCheckIn = async (staffId) => {
    try {
      const res = await attendanceAPI.checkIn(staffId);
      Alert.alert('Checked In', `Check-in recorded at ${res.time} IST`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleCheckOut = async (staffId) => {
    try {
      const res = await attendanceAPI.checkOut(staffId);
      Alert.alert('Checked Out', `Check-out recorded at ${res.time} IST`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleMarkAbsent = async (staffId) => {
    try {
      await attendanceAPI.save({ staff_id: staffId, date: getISTDate(), status: 'absent' });
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const presentCount  = records.filter(r => r.status === 'present').length;
  const absentCount   = records.filter(r => r.status === 'absent').length;
  // Check-in requires being physically at a clinic location (applies to all roles)
  const canCheckIn    = locationStatus === 'at_clinic';
  const bannerCfg     = LOC_BANNER[locationStatus] || LOC_BANNER.error;
  const bannerText    = locationStatus === 'at_clinic'
    ? `At ${clinicLabel} · Check-in enabled`
    : bannerCfg.text;
  const bannerDisplay = bannerCfg;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
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

      {/* Location banner */}
      <View style={[styles.locBanner, { backgroundColor: bannerDisplay.bg }]}>
        {locationStatus === 'checking'
          ? <ActivityIndicator size="small" color={bannerDisplay.color} style={{ marginRight: 8 }} />
          : <Ionicons name={bannerDisplay.icon} size={15} color={bannerDisplay.color} style={{ marginRight: 6 }} />
        }
        <Text style={[styles.locText, { color: bannerDisplay.color }]}>{bannerText}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['today', 'summary'].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'today' ? "Today's Attendance" : 'Monthly Summary'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'today' ? (
        <FlatList
          data={allStaff}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <AttendanceRow
              staffMember={item}
              record={getRecord(item.id)}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onMarkAbsent={handleMarkAbsent}
              canCheckIn={canCheckIn}
              canEdit={true}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); checkLocation(); loadData(); }} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <Text style={styles.dateHeader}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </Text>
          }
        />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSummary(); }} />}>
          <Text style={styles.dateHeader}>
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} Summary
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
    flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  statLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  locBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  locText: { fontSize: 12, fontWeight: '600', flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  dateHeader: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600', padding: theme.spacing.md },
  row: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: theme.spacing.md,
    marginBottom: 8, borderRadius: theme.radius.md, padding: theme.spacing.md,
    ...theme.shadows.sm, alignItems: 'center',
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
