import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { theme } from '../../utils/theme';
import { attendanceAPI, staffAPI, doctorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Clinic geofence zones ─────────────────────────────────────────────────────
const CLINIC_ZONES = [
  { label: 'Avadi',         lat: 13.118889, lng: 80.081694 },
  { label: 'Thiruninravur', lat: 13.147389, lng: 80.036833 },
];
const GEOFENCE_RADIUS_M = 500;

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

const getISTDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const getISTHour = () => {
  const h = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  return parseInt(h, 10);
};

const isAttendanceRole = (role) =>
  role && role.toLowerCase() !== 'consultant';

const STATUS_CONFIG = {
  present:  { color: theme.colors.success, bg: theme.colors.successLight, label: 'Present',  icon: 'checkmark-circle' },
  absent:   { color: theme.colors.error,   bg: theme.colors.errorLight,   label: 'Absent',   icon: 'close-circle' },
  half_day: { color: theme.colors.warning, bg: theme.colors.warningLight, label: 'Half Day', icon: 'time' },
};

const LOC_BANNER = {
  checking:  { color: '#1565C0', bg: '#E3F2FD', icon: 'navigate',         text: 'Checking location…' },
  at_clinic: { color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle', text: '' },
  outside:   { color: '#B71C1C', bg: '#FFEBEE', icon: 'location-outline', text: 'Not at clinic location · Check-in disabled' },
  denied:    { color: '#E65100', bg: '#FFF3E0', icon: 'warning',          text: 'Location permission required for check-in' },
  error:     { color: '#B71C1C', bg: '#FFEBEE', icon: 'alert-circle',     text: 'Location check failed · Check-in disabled' },
};

const ROLE_COLORS = {
  Doctor:  '#1565C0',
  Manager: '#6A1B9A',
  default: '#37474F',
};

// ── Session row (Morning / Evening) ──────────────────────────────────────────
function SessionRow({ label, iconName, iconColor, inTime, outTime, onIn, onOut, canCheckIn, sessionClosed }) {
  const hasIn  = !!inTime;
  const hasOut = !!outTime;

  return (
    <View style={styles.sessionRow}>
      <Ionicons name={iconName} size={13} color={iconColor} />
      <Text style={styles.sessionLabel}>{label}</Text>
      <View style={styles.sessionActions}>
        {hasIn ? (
          <View style={styles.sessionTimeChip}>
            <Ionicons name="log-in-outline" size={11} color={theme.colors.success} />
            <Text style={styles.sessionTimeText}>{inTime}</Text>
          </View>
        ) : sessionClosed ? (
          <View style={styles.sessionMissedChip}>
            <Ionicons name="close-circle" size={11} color={theme.colors.error} />
            <Text style={styles.sessionMissedText}>Missed</Text>
          </View>
        ) : canCheckIn ? (
          <TouchableOpacity style={styles.sessionInBtn} onPress={onIn}>
            <Ionicons name="log-in" size={13} color={theme.colors.success} />
            <Text style={[styles.sessionBtnTxt, { color: theme.colors.success }]}>In</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.sessionDash}>—</Text>
        )}

        {hasIn && !hasOut ? (
          <TouchableOpacity style={styles.sessionOutBtn} onPress={onOut}>
            <Ionicons name="log-out" size={13} color={theme.colors.warning} />
            <Text style={[styles.sessionBtnTxt, { color: theme.colors.warning }]}>Out</Text>
          </TouchableOpacity>
        ) : hasOut ? (
          <View style={styles.sessionTimeChip}>
            <Ionicons name="log-out-outline" size={11} color={theme.colors.textSecondary} />
            <Text style={styles.sessionTimeText}>{outTime}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── Attendance row ────────────────────────────────────────────────────────────
function AttendanceRow({ person, record, onCheckIn, onCheckOut, onMarkAbsent, canCheckIn, canEdit, morningClosed, eveningClosed }) {
  const sc        = STATUS_CONFIG[record?.status] || null;
  const hasRecord = !!record;
  const roleColor = ROLE_COLORS[person.role] || ROLE_COLORS.default;

  return (
    <View style={styles.row}>
      {/* Header */}
      <View style={styles.rowHeader}>
        <View style={styles.rowLeft}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{person.name?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.staffName}>{person.name}</Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor + '40' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{person.role}</Text>
              </View>
              {person.department ? <Text style={styles.dept}>{person.department}</Text> : null}
            </View>
          </View>
        </View>
        <View>
          {sc ? (
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Ionicons name={sc.icon} size={14} color={sc.color} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>Pending</Text>
          )}
        </View>
      </View>

      {/* Session rows */}
      <View style={styles.sessionsBlock}>
        <SessionRow
          label="Morning"
          iconName="sunny-outline"
          iconColor="#F59E0B"
          inTime={record?.morning_in}
          outTime={record?.morning_out}
          onIn={() => onCheckIn(person, 'morning')}
          onOut={() => onCheckOut(person, 'morning')}
          canCheckIn={canCheckIn}
          sessionClosed={morningClosed}
        />
        <SessionRow
          label="Evening"
          iconName="moon-outline"
          iconColor="#6366F1"
          inTime={record?.evening_in}
          outTime={record?.evening_out}
          onIn={() => onCheckIn(person, 'evening')}
          onOut={() => onCheckOut(person, 'evening')}
          canCheckIn={canCheckIn}
          sessionClosed={eveningClosed}
        />
      </View>

      {/* Absent button — only when no record at all */}
      {!hasRecord && canEdit && (
        <TouchableOpacity style={styles.absentChip} onPress={() => onMarkAbsent(person)}>
          <Ionicons name="close-circle-outline" size={13} color={theme.colors.error} />
          <Text style={[styles.sessionBtnTxt, { color: theme.colors.error }]}>Mark Absent</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
const normName = (n = '') => n.replace(/^Dr\.?\s*/i, '').trim().toLowerCase();

export default function AttendanceScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = ['owner', 'manager'].includes(user?.role);

  const [personnel, setPersonnel]           = useState([]);
  const [records, setRecords]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [tab, setTab]                       = useState('today');
  const [summary, setSummary]               = useState([]);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [clinicLabel, setClinicLabel]       = useState(null);
  const [expandedIds, setExpandedIds]       = useState(new Set());

  // Month/year for summary tab — default to current IST month
  const nowIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [summaryMonth, setSummaryMonth] = useState(nowIST.split('-')[1]);
  const [summaryYear,  setSummaryYear]  = useState(nowIST.split('-')[0]);

  const checkLocation = async () => {
    setLocationStatus('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setClinicLabel(null); setLocationStatus('denied'); return; }
      const loc  = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const zone = getClinicInRange(loc.coords);
      if (zone) { setClinicLabel(zone.label); setLocationStatus('at_clinic'); }
      else       { setClinicLabel(null);       setLocationStatus('outside'); }
    } catch { setClinicLabel(null); setLocationStatus('error'); }
  };

  const loadData = async () => {
    try {
      const [sRes, dRes, aRes] = await Promise.all([
        staffAPI.getAll(),
        doctorsAPI.getAll(),
        attendanceAPI.getToday(),
      ]);

      const doctorList = (dRes.data || [])
        .filter(d => !d.is_owner)
        .map(d => ({ id: d.id, name: d.name, role: 'Doctor', department: d.specialization || '', mobile: d.mobile, _type: 'doctor' }));

      const staffList = (sRes.data || [])
        .filter(s => isAttendanceRole(s.role))
        .map(s => ({ ...s, _type: 'staff' }));

      setPersonnel([
        ...doctorList,
        ...staffList.filter(s => s.role === 'Manager'),
        ...staffList.filter(s => s.role !== 'Manager'),
      ]);

      // After 8 PM auto-mark anyone with no record as absent, then reload
      let attendanceRecords = aRes.data || [];
      if (getISTHour() >= 20) {
        try {
          const res = await attendanceAPI.autoMarkAbsent();
          if (res?.marked > 0) {
            const fresh = await attendanceAPI.getToday();
            attendanceRecords = fresh.data || [];
          }
        } catch {}
      }
      setRecords(attendanceRecords);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const loadSummary = async (m = summaryMonth, y = summaryYear) => {
    try {
      // Admin: backfill absent for every unmarked past day in the viewed month
      if (isAdmin) {
        try { await attendanceAPI.backfillAbsent(m, y); } catch {}
      }
      const res = await attendanceAPI.getSummary(m, y);
      setSummary(res.data || []);
    } catch {}
  };

  // Reload summary whenever the selected month/year changes
  useEffect(() => { loadSummary(summaryMonth, summaryYear); }, [summaryMonth, summaryYear]);

  const shiftMonth = (dir) => {
    let m = parseInt(summaryMonth, 10) + dir;
    let y = parseInt(summaryYear,  10);
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    setSummaryMonth(String(m).padStart(2, '0'));
    setSummaryYear(String(y));
  };

  const toggleExpand = (key) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useFocusEffect(useCallback(() => {
    checkLocation();
    loadData();
    loadSummary(summaryMonth, summaryYear);
  }, []));

  const getRecord = (person) =>
    person._type === 'doctor'
      ? records.find(r => r.doctor_id === person.id)
      : records.find(r => r.staff_id === person.id);

  const handleCheckIn = async (person, session) => {
    try {
      const res = await attendanceAPI.checkIn(person.id, person._type, session);
      const label = session === 'morning' ? 'Morning' : 'Evening';
      Alert.alert('Checked In', `${label} check-in at ${res.time} IST`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleCheckOut = async (person, session) => {
    try {
      const res = await attendanceAPI.checkOut(person.id, person._type, session);
      const label = session === 'morning' ? 'Morning' : 'Evening';
      Alert.alert('Checked Out', `${label} check-out at ${res.time} IST`);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleMarkAbsent = async (person) => {
    const payload = person._type === 'doctor'
      ? { doctor_id: person.id, date: getISTDate(), status: 'absent' }
      : { staff_id: person.id,  date: getISTDate(), status: 'absent' };
    try {
      await attendanceAPI.save(payload);
      loadData();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const displayPersonnel = isAdmin
    ? personnel
    : personnel.filter(p => normName(p.name) === normName(user?.name));
  const displaySummary = isAdmin
    ? summary
    : summary.filter(p => normName(p.name) === normName(user?.name));

  const myRecord = !isAdmin && displayPersonnel.length ? getRecord(displayPersonnel[0]) : null;
  const presentCount = isAdmin ? records.filter(r => r.status === 'present').length  : (myRecord?.status === 'present'  ? 1 : 0);
  const halfDayCount = isAdmin ? records.filter(r => r.status === 'half_day').length : (myRecord?.status === 'half_day' ? 1 : 0);
  const absentCount  = isAdmin ? records.filter(r => r.status === 'absent').length   : (myRecord?.status === 'absent'   ? 1 : 0);
  const pendingCount = isAdmin
    ? personnel.length - presentCount - halfDayCount - absentCount
    : (displayPersonnel.length && !myRecord ? 1 : 0);
  const canCheckIn    = locationStatus === 'at_clinic';
  const bannerCfg     = LOC_BANNER[locationStatus] || LOC_BANNER.error;
  const bannerText    = locationStatus === 'at_clinic'
    ? `At ${clinicLabel} · Check-in enabled`
    : bannerCfg.text;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.success }]}>{presentCount}</Text>
          <Text style={styles.statLbl}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.warning }]}>{halfDayCount}</Text>
          <Text style={styles.statLbl}>Half Day</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.error }]}>{absentCount}</Text>
          <Text style={styles.statLbl}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.colors.textSecondary }]}>{pendingCount}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Location banner */}
      <View style={[styles.locBanner, { backgroundColor: bannerCfg.bg }]}>
        {locationStatus === 'checking'
          ? <ActivityIndicator size="small" color={bannerCfg.color} style={{ marginRight: 8 }} />
          : <Ionicons name={bannerCfg.icon} size={15} color={bannerCfg.color} style={{ marginRight: 6 }} />
        }
        <Text style={[styles.locText, { color: bannerCfg.color }]}>{bannerText}</Text>
        {(locationStatus === 'outside' || locationStatus === 'error') ? (
          <TouchableOpacity onPress={checkLocation} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clinic timing note */}
      <View style={styles.timingNote}>
        <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
        <Text style={styles.timingText}>Morning 9:00–1:00  ·  Evening 4:00–10:00</Text>
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
          data={displayPersonnel}
          keyExtractor={item => `${item._type}-${item.id}`}
          renderItem={({ item }) => (
            <AttendanceRow
              person={item}
              record={getRecord(item)}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onMarkAbsent={handleMarkAbsent}
              canCheckIn={canCheckIn}
              canEdit={true}
              morningClosed={getISTHour() >= 13}
              eveningClosed={getISTHour() >= 20}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); checkLocation(); loadData(); }}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <Text style={styles.dateHeader}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>No staff or doctors found</Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadSummary(summaryMonth, summaryYear).finally(() => setRefreshing(false)); }}
            />
          }>

          {/* ── Month navigator ── */}
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.monthBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {new Date(`${summaryYear}-${summaryMonth}-01T00:00:00`)
                .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity style={styles.monthBtn} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Person cards ── */}
          {displaySummary.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>No records for this month</Text>
            </View>
          ) : (
            displaySummary.map(person => {
              const key      = `${person.type}-${person.id}`;
              const expanded = expandedIds.has(key);
              const roleColor = ROLE_COLORS[person.role] || ROLE_COLORS.default;

              return (
                <View key={key} style={styles.summaryCard}>
                  {/* Header row — tap to expand */}
                  <TouchableOpacity style={styles.summaryCardHeader} onPress={() => toggleExpand(key)} activeOpacity={0.7}>
                    <View style={[styles.avatar, { backgroundColor: roleColor }]}>
                      <Text style={styles.avatarText}>{person.name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryName}>{person.name}</Text>
                      <Text style={styles.summaryRole}>{person.role}</Text>
                    </View>
                    <View style={styles.summaryStats}>
                      <View style={styles.sumStat}>
                        <Text style={[styles.sumNum, { color: theme.colors.success }]}>{person.present_days}</Text>
                        <Text style={styles.sumLbl}>P</Text>
                      </View>
                      <View style={styles.sumStat}>
                        <Text style={[styles.sumNum, { color: theme.colors.warning }]}>{person.half_days}</Text>
                        <Text style={styles.sumLbl}>H</Text>
                      </View>
                      <View style={styles.sumStat}>
                        <Text style={[styles.sumNum, { color: theme.colors.error }]}>{person.absent_days}</Text>
                        <Text style={styles.sumLbl}>A</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18} color={theme.colors.textSecondary}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>

                  {/* Day-wise table (expanded) */}
                  {expanded && (
                    <View style={styles.dayTable}>
                      {/* Column headers */}
                      <View style={styles.dayTableHead}>
                        <Text style={[styles.dayTableHdr, { width: 48 }]}>Date</Text>
                        <View style={styles.daySessionCol}>
                          <Ionicons name="sunny-outline" size={11} color="#F59E0B" />
                          <Text style={styles.dayTableHdr}> Morning</Text>
                        </View>
                        <View style={styles.daySessionCol}>
                          <Ionicons name="moon-outline" size={11} color="#6366F1" />
                          <Text style={styles.dayTableHdr}> Evening</Text>
                        </View>
                        <Text style={[styles.dayTableHdr, { width: 24, textAlign: 'center' }]}>St</Text>
                      </View>

                      {(person.records || []).length === 0 ? (
                        <Text style={styles.noRecordsText}>No records found</Text>
                      ) : (
                        (person.records || []).map((rec, i) => {
                          const d        = new Date(rec.date + 'T00:00:00');
                          const dayNum   = d.toLocaleDateString('en-IN', { day: '2-digit' });
                          const dayName  = d.toLocaleDateString('en-IN', { weekday: 'short' });
                          const sc       = rec.status === 'present'
                            ? { color: theme.colors.success,  bg: theme.colors.successLight,  label: '✓' }
                            : rec.status === 'half_day'
                              ? { color: theme.colors.warning, bg: theme.colors.warningLight, label: '½' }
                              : { color: theme.colors.error,   bg: theme.colors.errorLight,   label: '✗' };

                          return (
                            <View key={i} style={[styles.dayRow, i % 2 === 0 && styles.dayRowAlt]}>
                              {/* Date */}
                              <View style={styles.dayDateCol}>
                                <Text style={styles.dayNum}>{dayNum}</Text>
                                <Text style={styles.dayName}>{dayName}</Text>
                              </View>

                              {/* Morning */}
                              <View style={styles.daySessionCol}>
                                {rec.morning_in ? (
                                  <>
                                    <Text style={styles.timeIn}>
                                      <Ionicons name="log-in-outline" size={10} color={theme.colors.success} /> {rec.morning_in}
                                    </Text>
                                    <Text style={styles.timeOut}>
                                      <Ionicons name="log-out-outline" size={10} color={theme.colors.textSecondary} /> {rec.morning_out || '—'}
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={styles.absentText}>Absent</Text>
                                )}
                              </View>

                              {/* Evening */}
                              <View style={styles.daySessionCol}>
                                {rec.evening_in ? (
                                  <>
                                    <Text style={styles.timeIn}>
                                      <Ionicons name="log-in-outline" size={10} color={theme.colors.success} /> {rec.evening_in}
                                    </Text>
                                    <Text style={styles.timeOut}>
                                      <Ionicons name="log-out-outline" size={10} color={theme.colors.textSecondary} /> {rec.evening_out || '—'}
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={styles.absentText}>Absent</Text>
                                )}
                              </View>

                              {/* Status chip */}
                              <View style={[styles.dayStatusChip, { backgroundColor: sc.bg }]}>
                                <Text style={[styles.dayStatusText, { color: sc.color }]}>{sc.label}</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.colors.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Stats bar
  statsBar:     { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statItem:     { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  statLbl:      { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
  statDivider:  { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  // Location banner
  locBanner:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  locText:      { fontSize: 12, fontWeight: '600', flex: 1 },
  retryBtn:     { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 8 },
  retryText:    { fontSize: 11, fontWeight: '700', color: '#B71C1C' },

  // Timing note
  timingNote:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#F8F9FA', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  timingText:   { fontSize: 11, color: theme.colors.textSecondary },

  // Tabs
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBtn:       { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText:      { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  tabTextActive:{ color: theme.colors.primary },

  dateHeader:   { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600', padding: theme.spacing.md },

  // Attendance row
  row:          { backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginBottom: 8, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  rowHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  rowLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  staffName:    { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  roleRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  roleBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  roleText:     { fontSize: 10, fontWeight: '700' },
  dept:         { fontSize: 11, color: theme.colors.textSecondary },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText:   { fontSize: 11, fontWeight: '600' },
  pendingText:  { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },

  // Sessions block
  sessionsBlock: { gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 },
  sessionRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionLabel:  { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, width: 58 },
  sessionActions:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionInBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.successLight },
  sessionOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.warningLight },
  sessionBtnTxt: { fontSize: 12, fontWeight: '600' },
  sessionTimeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F3F4F6' },
  sessionTimeText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  sessionDash:        { fontSize: 12, color: theme.colors.border, width: 20, textAlign: 'center' },
  sessionMissedChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: theme.colors.errorLight },
  sessionMissedText:  { fontSize: 12, fontWeight: '600', color: theme.colors.error },

  // Absent chip
  absentChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.errorLight },

  // Month navigator
  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: 4, borderRadius: theme.radius.md, paddingVertical: 10, paddingHorizontal: 14, ...theme.shadows.sm },
  monthBtn:     { padding: 4 },
  monthLabel:   { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },

  // Summary card
  summaryCard:       { backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginBottom: 8, borderRadius: theme.radius.md, overflow: 'hidden', ...theme.shadows.sm },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: 10 },
  summaryName:  { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  summaryRole:  { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  summaryStats: { flexDirection: 'row', gap: 10 },
  sumStat:      { alignItems: 'center', minWidth: 26 },
  sumNum:       { fontSize: 16, fontWeight: 'bold' },
  sumLbl:       { fontSize: 9, color: theme.colors.textSecondary, fontWeight: '600' },

  // Day-wise table
  dayTable:     { borderTopWidth: 1, borderTopColor: theme.colors.border },
  dayTableHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dayTableHdr:  { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  daySessionCol:{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingHorizontal: 4 },
  dayRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7 },
  dayRowAlt:    { backgroundColor: '#FAFBFF' },
  dayDateCol:   { width: 48, alignItems: 'center' },
  dayNum:       { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  dayName:      { fontSize: 9,  color: theme.colors.textSecondary, fontWeight: '600' },
  timeIn:       { fontSize: 11, color: theme.colors.success,       fontWeight: '600', marginBottom: 1 },
  timeOut:      { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  absentText:   { fontSize: 11, color: theme.colors.error, fontWeight: '600', fontStyle: 'italic' },
  dayStatusChip:{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  dayStatusText:{ fontSize: 11, fontWeight: '800' },
  noRecordsText:{ fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', padding: 14 },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 10, marginTop: 20 },
  emptyText:    { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary },
});
