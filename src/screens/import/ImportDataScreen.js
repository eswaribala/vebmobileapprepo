import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import { theme } from '../../utils/theme';
import { patientsAPI, billingAPI } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

function nk(k) {
  return k.toString().toLowerCase()
    .replace(/[\s\-\/().#%]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
function normRow(raw) {
  const out = {};
  Object.keys(raw).forEach(k => { out[nk(k)] = raw[k]; });
  return out;
}

// DD-MM-YYYY / Excel serial → YYYY-MM-DD
function parseDMY(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d) ? '' : d.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? s : d.toISOString().split('T')[0];
}

// 9.63E+09  →  last 10 digits
function parsePhone(val) {
  if (!val) return '';
  const n = parseFloat(String(val).replace(/[^0-9.eE+\-]/g, ''));
  if (!isNaN(n) && n > 0) return Math.round(n).toString().replace(/\D/g, '').slice(-10);
  return String(val).replace(/\D/g, '').slice(-10);
}

// ₹ prefix / commas → float
function parseAmt(val) {
  if (!val && val !== 0) return 0;
  return parseFloat(String(val).replace(/[₹,\s]/g, '')) || 0;
}

// GPAY / CASH / REVIEW …  → api key
function mapMode(val) {
  const s = String(val || '').toUpperCase().trim();
  if (['GPAY','UPI','GOOGLEPAY','PHONEPE','PAYTM','GPAY/UPI'].includes(s)) return 'upi';
  if (s === 'CASH')   return 'cash';
  if (s === 'CARD')   return 'card';
  if (s === 'EMI')    return 'emi';
  if (s === 'CHEQUE' || s === 'CHECK') return 'cheque';
  if (s === 'BANK')   return 'bank';
  if (['REVIEW','FREE','FOC'].includes(s)) return 'review';
  return s ? s.toLowerCase() : 'cash';
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  return parts.length === 1
    ? { first_name: parts[0], last_name: '' }
    : { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Map a raw register row → normalised object with all fields
function mapRegister(raw) {
  const n = normRow(raw);
  const name        = splitName(n.name || n.patient_name || n.patient || '');
  const consultAmt  = parseAmt(n.amount || n.consultation || n.consult || n.fees || '');
  const medicineAmt = parseAmt(n.medicine || n.medicine_amount || n.med || '');
  const consultMode = mapMode(n.mode || n.payment_mode || n.payment || '');
  const medMode     = mapMode(n.mode_1 || n.medicine_mode || n.med_mode || '');
  const isNew       = String(n.n_o || n.new_old || n.type || '').toUpperCase().trim() === 'N';

  return {
    visit_date:      parseDMY(n.date || n.visit_date || n.dt || ''),
    first_name:      name.first_name,
    last_name:       name.last_name,
    mobile:          parsePhone(n.h_number || n.h_no || n.hnumber || n.phone || n.mobile || n.contact || ''),
    age:             n.age ? String(Math.round(parseFloat(String(n.age)) || 0) || '') : '',
    gender:          String(n.gender || '').trim(),
    is_new:          isNew,
    consult_amount:  consultAmt,
    consult_mode:    consultMode,
    medicine_amount: medicineAmt,
    medicine_mode:   medMode || consultMode,
    notes:           String(n.appt || n.appointment || n.notes || n.remarks || '').trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Import core — returns { patientCreated, billCreated }
// ─────────────────────────────────────────────────────────────────────────────

async function importRow(row, patientCache) {
  if (!row.first_name) throw new Error('Patient name is required');

  // ── Patient master ──────────────────────────────────────────────────────
  let patient   = patientCache.get(row.mobile) || null;
  let patCreated = false;

  if (!patient) {
    if (row.is_new) {
      if (!row.mobile || row.mobile.length < 10)
        throw new Error('10-digit mobile required for new patient');
      const res = await patientsAPI.create({
        first_name: row.first_name, last_name: row.last_name || '',
        mobile: row.mobile, age: row.age ? parseInt(row.age, 10) : null,
        gender: row.gender, clinic_branch: 'Avadi',
      });
      patient    = res.data;
      patCreated = true;
    } else {
      if (row.mobile?.length >= 10) {
        const r = await patientsAPI.getAll(row.mobile);
        patient = (r.data || []).find(p => p.mobile === row.mobile) || null;
      }
      if (!patient) {
        const r = await patientsAPI.getAll(`${row.first_name} ${row.last_name}`.trim());
        patient = (r.data || [])[0] || null;
      }
      if (!patient) {
        // Auto-register unrecognised returning patient
        const res = await patientsAPI.create({
          first_name: row.first_name, last_name: row.last_name || '',
          mobile: row.mobile || '', age: row.age ? parseInt(row.age, 10) : null,
          gender: row.gender || '',
        });
        patient    = res.data;
        patCreated = true;
      }
    }
    if (patient && row.mobile) patientCache.set(row.mobile, patient);
  }

  // ── Bill master ─────────────────────────────────────────────────────────
  let billCreated = false;
  const isReview  = row.consult_mode === 'review';
  const totalAmt  = (row.consult_amount || 0) + (row.medicine_amount || 0);

  if (!isReview && totalAmt > 0) {
    const items = [];
    if (row.consult_amount  > 0) items.push({ description: 'Consultation', amount: row.consult_amount });
    if (row.medicine_amount > 0) items.push({ description: 'Medicine',     amount: row.medicine_amount });

    await billingAPI.create({
      patient_id:     patient.id,
      items,
      subtotal:       totalAmt,
      discount:       0,
      tax:            0,
      total_amount:   totalAmt,
      payment_mode:   row.consult_mode || 'cash',
      payment_status: 'paid',
      bill_date:      row.visit_date || new Date().toISOString().split('T')[0],
      notes:          row.notes || '',
    });
    billCreated = true;
  }

  return { patCreated, billCreated };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small card components
// ─────────────────────────────────────────────────────────────────────────────

const MODE_ICON = { upi: '📱', cash: '💵', card: '💳', emi: '📅', cheque: '📄', bank: '🏦', review: '🔄' };

function PatientCard({ row, index, onEdit, onDelete }) {
  const s   = row._status;
  const bg  = s === 'success' ? '#F1F8E9' : s === 'error' ? '#FFEBEE' : '#fff';
  const brd = s === 'success' ? '#66BB6A' : s === 'error' ? '#EF5350' : theme.colors.border;
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: brd }]}>
      <View style={styles.cardRow}>
        {/* index / status */}
        <View style={[styles.idx, s === 'success' && { backgroundColor: '#66BB6A' }, s === 'error' && { backgroundColor: '#EF5350' }]}>
          {s === 'success' ? <Ionicons name="checkmark" size={12} color="#fff" />
            : s === 'error' ? <Ionicons name="close"    size={12} color="#fff" />
            : <Text style={styles.idxTxt}>{index + 1}</Text>}
        </View>

        <View style={[styles.avatar, { backgroundColor: row.is_new ? '#1565C0' : '#546E7A' }]}>
          <Text style={styles.avatarTxt}>{(row.first_name?.[0] || '?').toUpperCase()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{row.first_name} {row.last_name}</Text>
            <View style={[styles.badge, row.is_new ? styles.badgeNew : styles.badgeOld]}>
              <Text style={[styles.badgeTxt, row.is_new ? styles.badgeTxtNew : styles.badgeTxtOld]}>
                {row.is_new ? 'NEW' : 'OLD'}
              </Text>
            </View>
          </View>
          <Text style={styles.sub}>
            {row.mobile || 'No mobile'}
            {row.age    ? ` · ${row.age} yrs`   : ''}
            {row.gender ? ` · ${row.gender}`     : ''}
          </Text>
          {s === 'success' && <Text style={styles.okTxt}>✓ Patient master created / verified</Text>}
          {s === 'error'   && <Text style={styles.errTxt} numberOfLines={2}>⚠ {row._error}</Text>}
        </View>

        <View style={styles.btns}>
          {s !== 'success' && (
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function BillCard({ row, index, onEdit, onDelete }) {
  const s   = row._status;
  const bg  = s === 'success' ? '#F1F8E9' : s === 'error' ? '#FFEBEE' : '#fff';
  const brd = s === 'success' ? '#66BB6A' : s === 'error' ? '#EF5350' : '#B39DDB';
  const isReview = row.consult_mode === 'review' || (!row.consult_amount && !row.medicine_amount);
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: brd }]}>
      <View style={styles.cardRow}>
        <View style={[styles.idx, s === 'success' && { backgroundColor: '#66BB6A' }, s === 'error' && { backgroundColor: '#EF5350' }, isReview && { backgroundColor: '#9E9E9E' }]}>
          {s === 'success'
            ? <Ionicons name="checkmark" size={12} color="#fff" />
            : s === 'error'
              ? <Ionicons name="close"    size={12} color="#fff" />
              : isReview
                ? <Text style={[styles.idxTxt, { color: '#fff' }]}>R</Text>
                : <Text style={styles.idxTxt}>{index + 1}</Text>}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{row.first_name} {row.last_name}</Text>
            {isReview && (
              <View style={[styles.badge, { backgroundColor: '#ECEFF1' }]}>
                <Text style={[styles.badgeTxt, { color: '#607D8B' }]}>REVIEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.sub}>{row.visit_date ? fmtDate(row.visit_date) : '—'}</Text>
          {isReview ? (
            <Text style={[styles.sub, { color: '#9E9E9E' }]}>Review visit — no bill created</Text>
          ) : (
            <Text style={styles.billAmt}>
              {row.consult_amount > 0
                ? `₹${row.consult_amount.toLocaleString('en-IN')}  ${MODE_ICON[row.consult_mode] || ''} ${(row.consult_mode || '').toUpperCase()}`
                : ''}
              {row.medicine_amount > 0
                ? `  +  ₹${row.medicine_amount.toLocaleString('en-IN')} medicine`
                : ''}
            </Text>
          )}
          {s === 'success' && !isReview && <Text style={styles.okTxt}>✓ Bill master created</Text>}
          {s === 'error'   && <Text style={styles.errTxt} numberOfLines={2}>⚠ {row._error}</Text>}
        </View>

        <View style={styles.btns}>
          {s !== 'success' && !isReview && (
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color="#7B1FA2" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit fields
// ─────────────────────────────────────────────────────────────────────────────

const PATIENT_EDIT_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name',  label: 'Last Name' },
  { key: 'mobile',     label: 'Mobile (10 digits)', keyboardType: 'phone-pad' },
  { key: 'age',        label: 'Age', keyboardType: 'numeric' },
  { key: 'gender',     label: 'Gender' },
  { key: 'is_new',     label: 'New Patient? (true / false)' },
];

const BILL_EDIT_FIELDS = [
  { key: 'visit_date',      label: 'Date (YYYY-MM-DD)', placeholder: '2026-04-01' },
  { key: 'first_name',      label: 'Patient First Name' },
  { key: 'last_name',       label: 'Patient Last Name' },
  { key: 'mobile',          label: 'Mobile', keyboardType: 'phone-pad' },
  { key: 'consult_amount',  label: 'Consultation Amount (₹)', keyboardType: 'numeric' },
  { key: 'consult_mode',    label: 'Mode (upi / cash / card / review)' },
  { key: 'medicine_amount', label: 'Medicine Amount (₹)', keyboardType: 'numeric' },
  { key: 'medicine_mode',   label: 'Medicine Mode' },
  { key: 'notes',           label: 'Notes / APPT ref' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Column format reference
// ─────────────────────────────────────────────────────────────────────────────

const REGISTER_COLS = [
  ['DATE',     'DD-MM-YYYY  (e.g. 01-04-2026)'],
  ['DAY',      'Day name — auto-ignored'],
  ['NAME',     'Full patient name'],
  ['N/O',      'N = New  |  O = Old / returning'],
  ['AGE',      'Age in years'],
  ['GENDER',   'MALE or FEMALE'],
  ['H NUMBER', 'Mobile  (9.63E+09 scientific notation OK)'],
  ['AMOUNT',   'Consultation fee  (₹ prefix OK)'],
  ['MODE',     'GPAY / CASH / CARD / REVIEW'],
  ['MEDICINE', 'Medicine charge — blank if none'],
  ['MODE',     '(2nd) Medicine payment mode'],
  ['APPT',     'Appointment ref — optional'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ImportDataScreen() {
  const workbookRef = useRef(null);

  const [rows,       setRows]       = useState([]);   // all register rows
  const [loading,    setLoading]    = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [fileName,   setFileName]   = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet,setActiveSheet]= useState('');
  const [showTpl,    setShowTpl]    = useState(false);
  const [section,    setSection]    = useState('patients'); // 'patients' | 'bills'
  const [editRow,    setEditRow]    = useState(null);
  const [editData,   setEditData]   = useState({});
  const [progress,   setProgress]   = useState({ cur: 0, total: 0 });
  const [result,     setResult]     = useState(null); // { patientsCreated, patientsDone, billsCreated, reviews }

  // ── Derived lists ──────────────────────────────────────────────────────────

  // Unique patients: one entry per unique mobile (first_name+mobile as key if no mobile)
  const uniquePatients = useMemo(() => {
    const seen = new Map();
    const out  = [];
    rows.forEach(r => {
      const key = r.mobile || `${r.first_name}_${r.last_name}`.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, true);
        out.push(r);
      }
    });
    return out;
  }, [rows]);

  // All rows — shown in "Bills" section (review rows included but greyed)
  const billRows = rows; // show all so user can delete review rows if needed

  // Stats
  const newCount    = uniquePatients.filter(p => p.is_new).length;
  const oldCount    = uniquePatients.length - newCount;
  const chargeCount = rows.filter(r => (r.consult_amount + r.medicine_amount) > 0 && r.consult_mode !== 'review').length;
  const reviewCount = rows.length - chargeCount;

  const patientsPending = uniquePatients.filter(r => r._status === 'pending').length;
  const billsPending    = billRows.filter(r => r._status === 'pending' && r.consult_mode !== 'review' && (r.consult_amount + r.medicine_amount) > 0).length;

  // ── Parse file ─────────────────────────────────────────────────────────────

  const reset = () => {
    setRows([]); setFileName(''); setSheetNames([]); setActiveSheet('');
    setResult(null); setProgress({ cur: 0, total: 0 });
    workbookRef.current = null;
  };

  const doParseSheet = (wb, sheetName) => {
    const ws  = wb.Sheets[sheetName];
    if (!ws) { Alert.alert('Error', `Sheet "${sheetName}" not found.`); return; }
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!raw.length) { Alert.alert('Empty Sheet', 'No data rows found. Check that Row 1 has column headers.'); return; }
    if (raw.length > 2000) { Alert.alert('Too Large', `${raw.length} rows found. Maximum is 2000.`); return; }

    const mapped = raw.map((r, i) => ({
      _id:     String(i),
      _status: 'pending',
      _error:  '',
      ...mapRegister(r),
    }));
    setRows(mapped);
    setResult(null);
  };

  const parseFile = async (uri) => {
    setLoading(true); setRows([]); setSheetNames([]); setActiveSheet(''); setResult(null);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb     = XLSX.read(base64, { type: 'base64', cellDates: false });
      workbookRef.current = wb;
      const names  = wb.SheetNames;
      setSheetNames(names);
      setActiveSheet(names[0]);
      doParseSheet(wb, names[0]);
    } catch (err) {
      Alert.alert('Parse Error', err.message);
      setFileName('');
    }
    setLoading(false);
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets?.[0] ?? res;
      if (!asset?.uri) return;
      setFileName(asset.name || 'file.xlsx');
      await parseFile(asset.uri);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const selectSheet = (name) => {
    setActiveSheet(name); setRows([]); setResult(null);
    if (workbookRef.current) doParseSheet(workbookRef.current, name);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const openEdit = (row) => { setEditRow(row); setEditData({ ...row }); };
  const saveEdit = () => {
    setRows(p => p.map(r =>
      r._id === editRow._id
        ? { ...r, ...editData, _status: r._status === 'error' ? 'pending' : r._status, _error: '' }
        : r
    ));
    setEditRow(null);
  };

  // ── Delete row ─────────────────────────────────────────────────────────────

  const delRow = (id) =>
    Alert.alert('Remove Row', 'Remove this visit row from the import?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setRows(p => p.filter(r => r._id !== id)) },
    ]);

  // ── Import ALL ─────────────────────────────────────────────────────────────

  const startImport = () => {
    const total = rows.filter(r => r._status === 'pending').length;
    if (!total) { Alert.alert('Nothing to Import', 'All rows are already processed.'); return; }
    Alert.alert(
      'Import to Masters',
      `This will:\n\n👥 Create / verify ${uniquePatients.length} Patient Master records\n₹  Create ${chargeCount} Bill Master records\n🔄 Skip ${reviewCount} review visits (no charge)\n\nProceed?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Import All', onPress: runImport }]
    );
  };

  const runImport = async () => {
    setImporting(true);
    setResult(null);

    // Pre-load all existing patients into cache
    const patientCache = new Map();
    try {
      const res = await patientsAPI.getAll('');
      (res.data || []).forEach(p => {
        if (p.mobile)     patientCache.set(p.mobile, p);
        if (p.patient_id) patientCache.set(p.patient_id, p);
      });
    } catch { /* fall back to per-row lookups */ }

    let list = [...rows];
    let patientsCreated = 0, patientsDone = 0, billsCreated = 0, done = 0;
    const total = list.filter(r => r._status === 'pending').length;
    setProgress({ cur: 0, total });

    for (let i = 0; i < list.length; i++) {
      if (list[i]._status !== 'pending') continue;
      try {
        const { patCreated, billCreated } = await importRow(list[i], patientCache);
        list[i] = { ...list[i], _status: 'success', _error: '' };
        if (patCreated)  patientsCreated++;
        patientsDone++;
        if (billCreated) billsCreated++;
      } catch (err) {
        list[i] = { ...list[i], _status: 'error', _error: err.message };
      }
      done++;
      setProgress({ cur: done, total });
      if (done % 20 === 0) setRows([...list]);
    }

    setRows([...list]);
    setImporting(false);
    setProgress({ cur: 0, total: 0 });

    const errCount = list.filter(r => r._status === 'error').length;
    setResult({ patientsCreated, patientsDone, billsCreated, errCount });
  };

  const retryFailed = () => {
    setRows(p => p.map(r => r._status === 'error' ? { ...r, _status: 'pending', _error: '' } : r));
    setResult(null);
  };

  // ── Computed date range ────────────────────────────────────────────────────

  const dateRange = useMemo(() => {
    const dates = rows.map(r => r.visit_date).filter(Boolean).sort();
    if (!dates.length) return null;
    const fmt = d => fmtDate(d);
    return dates[0] === dates[dates.length - 1]
      ? fmt(dates[0])
      : `${fmt(dates[0])}  –  ${fmt(dates[dates.length - 1])}`;
  }, [rows]);

  // ── Edit fields based on section ───────────────────────────────────────────
  const editFields = section === 'patients' ? PATIENT_EDIT_FIELDS : BILL_EDIT_FIELDS;

  const errCount = rows.filter(r => r._status === 'error').length;
  const displayRows = section === 'patients' ? uniquePatients : billRows;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      <FlatList
        data={displayRows}
        keyExtractor={r => `${section}-${r._id}`}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {/* Column format hint */}
            <TouchableOpacity style={styles.tplBtn} onPress={() => setShowTpl(v => !v)}>
              <Ionicons name="help-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.tplBtnTxt}>Expected Column Format  (Daily Register)</Text>
              <Ionicons name={showTpl ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.primary} />
            </TouchableOpacity>

            {showTpl && (
              <View style={styles.tplCard}>
                <Text style={styles.tplTitle}>Your clinic register must have these columns in Row 1:</Text>
                {REGISTER_COLS.map(([col, desc], i) => (
                  <View key={i} style={styles.tplRow}>
                    <View style={styles.tplBadge}><Text style={styles.tplBadgeTxt}>{col}</Text></View>
                    <Text style={styles.tplDesc}>{desc}</Text>
                  </View>
                ))}
                <View style={styles.tplHint}>
                  <Text style={styles.tplHintTxt}>
                    ✓ Scientific notation phones (9.63E+09) auto-converted{'\n'}
                    ✓ DD-MM-YYYY dates auto-converted{'\n'}
                    ✓ ₹ prefix and commas in amounts auto-stripped
                  </Text>
                </View>
              </View>
            )}

            {/* File picker */}
            <View style={styles.pickerBox}>
              {fileName ? (
                <View style={styles.fileBox}>
                  <Ionicons name="document-text" size={28} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileNm} numberOfLines={1}>{fileName}</Text>
                    {dateRange && (
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color="#00897B" />
                        <Text style={styles.dateTxt}>{dateRange}</Text>
                      </View>
                    )}
                    <Text style={styles.fileSub}>{rows.length} rows loaded</Text>
                  </View>
                  <TouchableOpacity onPress={reset}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={loading}>
                  {loading
                    ? <><ActivityIndicator color="#fff" size="large" /><Text style={styles.pickTxt}>Reading file…</Text></>
                    : <><Ionicons name="cloud-upload-outline" size={38} color="#fff" />
                        <Text style={styles.pickTxt}>Select Excel File  (.xlsx / .xls)</Text>
                        <Text style={styles.pickSub}>April 2026, May 2026 or any month — up to 2000 rows</Text></>}
                </TouchableOpacity>
              )}
            </View>

            {/* Sheet selector */}
            {sheetNames.length > 1 && (
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLbl}>Sheets:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {sheetNames.map(name => (
                    <TouchableOpacity key={name}
                      style={[styles.sheetChip, activeSheet === name && styles.sheetChipActive]}
                      onPress={() => selectSheet(name)}>
                      <Text style={[styles.sheetChipTxt, activeSheet === name && { color: '#fff' }]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Masters summary card ── */}
            {rows.length > 0 && (
              <View style={styles.mastersCard}>
                <Text style={styles.mastersTitle}>Records to be created</Text>
                <View style={styles.mastersRow}>
                  {/* Patient master */}
                  <TouchableOpacity
                    style={[styles.masterBox, styles.masterBoxPatient, section === 'patients' && styles.masterBoxActive]}
                    onPress={() => setSection('patients')}>
                    <Ionicons name="people" size={22} color={section === 'patients' ? '#fff' : theme.colors.primary} />
                    <Text style={[styles.masterCount, section === 'patients' && { color: '#fff' }]}>
                      {uniquePatients.length}
                    </Text>
                    <Text style={[styles.masterLabel, section === 'patients' && { color: 'rgba(255,255,255,0.85)' }]}>
                      Patient Master
                    </Text>
                    <Text style={[styles.masterSub, section === 'patients' && { color: 'rgba(255,255,255,0.7)' }]}>
                      {newCount} new · {oldCount} returning
                    </Text>
                    {section === 'patients' && (
                      <View style={styles.masterActiveDot} />
                    )}
                  </TouchableOpacity>

                  {/* Bill master */}
                  <TouchableOpacity
                    style={[styles.masterBox, styles.masterBoxBill, section === 'bills' && styles.masterBoxBillActive]}
                    onPress={() => setSection('bills')}>
                    <Ionicons name="receipt" size={22} color={section === 'bills' ? '#fff' : '#7B1FA2'} />
                    <Text style={[styles.masterCount, { color: section === 'bills' ? '#fff' : '#7B1FA2' }]}>
                      {chargeCount}
                    </Text>
                    <Text style={[styles.masterLabel, section === 'bills' && { color: 'rgba(255,255,255,0.85)' }]}>
                      Bill Master
                    </Text>
                    <Text style={[styles.masterSub, section === 'bills' && { color: 'rgba(255,255,255,0.7)' }]}>
                      {reviewCount} review visits skipped
                    </Text>
                    {section === 'bills' && (
                      <View style={[styles.masterActiveDot, { backgroundColor: '#CE93D8' }]} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Import result banner ── */}
            {result && (
              <View style={[styles.resultBanner, result.errCount > 0 && { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name={result.errCount > 0 ? 'warning' : 'checkmark-circle'} size={20}
                  color={result.errCount > 0 ? '#E65100' : '#2E7D32'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>
                    {result.errCount > 0 ? 'Import Completed with Errors' : 'Import Successful!'}
                  </Text>
                  <Text style={styles.resultSub}>
                    👥 {result.patientsCreated} new patients created  · {result.patientsDone - result.patientsCreated} verified{'\n'}
                    ₹  {result.billsCreated} bills created
                    {result.errCount > 0 ? `\n⚠ ${result.errCount} rows failed` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Import / Retry buttons ── */}
            {rows.length > 0 && (
              <View style={styles.actRow}>
                <TouchableOpacity
                  style={[styles.importBtn, (importing || (!patientsPending && !billsPending)) && { opacity: 0.55 }]}
                  onPress={startImport}
                  disabled={importing || (!patientsPending && !billsPending)}>
                  {importing
                    ? <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.importBtnTxt}>
                          {progress.total > 0
                            ? `Creating masters…  ${progress.cur} / ${progress.total}`
                            : 'Importing…'}
                        </Text>
                      </>
                    : <>
                        <Ionicons name="cloud-upload" size={16} color="#fff" />
                        <Text style={styles.importBtnTxt}>
                          {(patientsPending + billsPending) > 0
                            ? `Import All  ·  ${uniquePatients.length} Patients + ${chargeCount} Bills`
                            : '✓ All Masters Created'}
                        </Text>
                      </>}
                </TouchableOpacity>
                {errCount > 0 && (
                  <TouchableOpacity style={styles.retryBtn} onPress={retryFailed}>
                    <Ionicons name="refresh" size={14} color={theme.colors.error} />
                    <Text style={styles.retryTxt}>Retry {errCount}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Section label */}
            {rows.length > 0 && (
              <Text style={styles.sectionLbl}>
                {section === 'patients'
                  ? `👥 Patient Master Preview  (${uniquePatients.length} unique patients)`
                  : `₹  Bill Master Preview  (${rows.length} visit rows)`}
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) =>
          section === 'patients'
            ? <PatientCard row={item} index={index}
                onEdit={() => openEdit(item)}
                onDelete={() => delRow(item._id)} />
            : <BillCard row={item} index={index}
                onEdit={() => openEdit(item)}
                onDelete={() => delRow(item._id)} />
        }
        ListEmptyComponent={
          !loading && !fileName ? (
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={60} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No file loaded</Text>
              <Text style={styles.emptySub}>
                Upload your daily clinic register{'\n'}
                Patient Master and Bill Master will be{'\n'}
                created automatically from the same file.
              </Text>
            </View>
          ) : null
        }
      />

      {/* ── Edit Modal ── */}
      <Modal visible={!!editRow} animationType="slide" onRequestClose={() => setEditRow(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHdr}>
            <TouchableOpacity onPress={() => setEditRow(null)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {section === 'patients' ? 'Edit Patient Info' : 'Edit Bill Info'}
              {editRow ? `  · Row ${parseInt(editRow._id, 10) + 1}` : ''}
            </Text>
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
              <Text style={styles.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {editFields.map(f => (
              <View key={f.key} style={styles.editField}>
                <Text style={styles.editLbl}>{f.label}</Text>
                <TextInput
                  style={styles.editInput}
                  value={String(editData[f.key] ?? '')}
                  onChangeText={v => setEditData(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder || ''}
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType={f.keyboardType || 'default'}
                />
              </View>
            ))}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  tplBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: theme.spacing.md, marginBottom: 0, padding: 10, backgroundColor: '#EEF4FF', borderRadius: theme.radius.md, borderWidth: 1, borderColor: '#C5D8FF' },
  tplBtnTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  tplCard: { marginHorizontal: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.md, padding: 14, ...theme.shadows.sm },
  tplTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 10 },
  tplRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  tplBadge: { minWidth: 80, backgroundColor: theme.colors.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center' },
  tplBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  tplDesc: { flex: 1, fontSize: 11, color: theme.colors.text, lineHeight: 17 },
  tplHint: { marginTop: 10, backgroundColor: '#E0F2F1', padding: 10, borderRadius: 8 },
  tplHintTxt: { fontSize: 11, color: '#00695C', lineHeight: 18 },

  pickerBox: { margin: theme.spacing.md, borderRadius: theme.radius.lg, overflow: 'hidden', ...theme.shadows.sm },
  pickBtn: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32 },
  pickTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14 },
  fileNm: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  dateTxt: { fontSize: 12, color: '#00897B', fontWeight: '600' },
  fileSub: { fontSize: 11, color: theme.colors.textSecondary },

  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: theme.spacing.md, marginBottom: 4 },
  sheetLbl: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  sheetChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radius.round, borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: '#EEF4FF' },
  sheetChipActive: { backgroundColor: theme.colors.primary },
  sheetChipTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  // Masters summary card
  mastersCard: { marginHorizontal: theme.spacing.md, marginBottom: 4, backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: 14, ...theme.shadows.sm },
  mastersTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  mastersRow: { flexDirection: 'row', gap: 12 },
  masterBox: { flex: 1, alignItems: 'center', padding: 14, borderRadius: theme.radius.md, borderWidth: 2, gap: 3 },
  masterBoxPatient: { borderColor: theme.colors.primary, backgroundColor: '#EEF4FF' },
  masterBoxBill: { borderColor: '#7B1FA2', backgroundColor: '#F3E5F5' },
  masterBoxActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  masterBoxBillActive: { backgroundColor: '#7B1FA2', borderColor: '#7B1FA2' },
  masterActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginTop: 2 },
  masterCount: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  masterLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  masterSub: { fontSize: 10, color: theme.colors.textSecondary },

  // Result banner
  resultBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: theme.spacing.md, marginBottom: 4, backgroundColor: '#E8F5E9', padding: 12, borderRadius: theme.radius.md },
  resultTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
  resultSub: { fontSize: 12, color: theme.colors.text, lineHeight: 18 },

  actRow: { flexDirection: 'row', gap: 10, marginHorizontal: theme.spacing.md, marginBottom: 4 },
  importBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: theme.radius.md, ...theme.shadows.sm },
  importBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 14, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.error, backgroundColor: '#FFEBEE' },
  retryTxt: { color: theme.colors.error, fontWeight: '700', fontSize: 12 },
  sectionLbl: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginHorizontal: theme.spacing.md, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Row cards
  card: { marginHorizontal: theme.spacing.md, marginBottom: 6, borderRadius: theme.radius.md, borderWidth: 1.5, ...theme.shadows.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  idx: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  idxTxt: { fontSize: 9, fontWeight: '800', color: theme.colors.textSecondary },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeNew: { backgroundColor: '#E8F5E9' },
  badgeOld: { backgroundColor: '#ECEFF1' },
  badgeTxt: { fontSize: 9, fontWeight: '800' },
  badgeTxtNew: { color: '#2E7D32' },
  badgeTxtOld: { color: '#546E7A' },
  sub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  billAmt: { fontSize: 12, color: '#7B1FA2', fontWeight: '700', marginTop: 2 },
  okTxt: { fontSize: 10, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  errTxt: { fontSize: 11, color: '#C62828', marginTop: 3 },
  btns: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptySub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Modal
  modal: { flex: 1, backgroundColor: theme.colors.background },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalBody: { flex: 1, padding: theme.spacing.md },
  editField: { marginBottom: theme.spacing.md },
  editLbl: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 5 },
  editInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: '#FAFAFA' },
});
