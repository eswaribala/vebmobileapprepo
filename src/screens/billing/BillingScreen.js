import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { billingAPI, patientsAPI, diagnosisAPI } from '../../services/api';

const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash', icon: 'cash', color: '#2E7D32' },
  { key: 'card', label: 'Card', icon: 'card', color: '#1565C0' },
  { key: 'upi', label: 'UPI / Wallet', icon: 'phone-portrait', color: '#7B1FA2' },
  { key: 'emi', label: 'EMI', icon: 'calendar', color: '#E65100' },
];

const EMI_OPTIONS = [3, 6, 9, 12, 18, 24];

// ─── Bill Creation Form ───────────────────────────────────────────────────────
function CreateBillScreen({ route, navigation }) {
  const { patient, plans: initialPlans = [] } = route.params || {};
  const [billItems, setBillItems] = useState(
    initialPlans.map(p => ({
      id: p.id,
      description: p.description || p.treatment_type,
      tooth: p.tooth_number,
      amount: parseFloat(p.cost) || 0,
      included: true,
    }))
  );
  const [loadingPlans, setLoadingPlans] = useState(initialPlans.length === 0 && !!patient);

  // Auto-fetch treatment plans if none were passed (e.g. navigated from patient button)
  useEffect(() => {
    if (initialPlans.length > 0 || !patient) return;
    diagnosisAPI.getPatientTreatments(patient.id)
      .then(res => {
        const plans = (res.data || []).filter(p => p.status !== 'completed');
        setBillItems(plans.map(p => ({
          id: p.id,
          description: p.description || p.treatment_type,
          tooth: p.tooth_number,
          amount: parseFloat(p.cost) || 0,
          included: true,
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);
  const [extraItems, setExtraItems] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [emiMonths, setEmiMonths] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const includedItems = [...billItems.filter(i => i.included), ...extraItems];
  const subtotal = includedItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const discountAmt = (subtotal * (parseFloat(discount) || 0)) / 100;
  const total = subtotal - discountAmt;
  const emiAmount = paymentMode === 'emi' ? total / emiMonths : 0;

  const addExtraItem = () => {
    setExtraItems(prev => [...prev, { description: '', amount: 0, tooth: '', included: true, isExtra: true }]);
  };

  const updateExtra = (index, field, value) => {
    setExtraItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const toggleItem = (index) => {
    setBillItems(prev => prev.map((item, i) => i === index ? { ...item, included: !item.included } : item));
  };

  const handleSave = async () => {
    if (!patient) { Alert.alert('Error', 'No patient selected'); return; }
    if (total <= 0) { Alert.alert('Error', 'Bill total must be greater than 0'); return; }
    setSaving(true);
    try {
      const allItems = [...billItems.filter(i => i.included), ...extraItems];
      const res = await billingAPI.create({
        patient_id: patient.id,
        treatment_ids: billItems.filter(i => i.included && i.id).map(i => i.id),
        items: allItems,
        subtotal,
        discount: parseFloat(discount) || 0,
        tax: 0,
        total_amount: total,
        payment_mode: paymentMode,
        payment_status: 'paid',
        emi_months: paymentMode === 'emi' ? emiMonths : null,
        emi_amount: paymentMode === 'emi' ? emiAmount : null,
        bill_date: new Date().toISOString().split('T')[0],
        notes,
      });
      Alert.alert('Bill Created!', `Bill No: ${res.bill_number}\nTotal: ₹${total.toLocaleString('en-IN')}`, [
        { text: 'Share PDF', onPress: () => shareBillPDF(res, allItems) },
        { text: 'Done', onPress: () => navigation.goBack(), style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const shareBillPDF = async (billData, items) => {
    const html = generateInvoiceHTML(billData, items);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const generateInvoiceHTML = (bill, items) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1565C0; padding-bottom: 12px; margin-bottom: 16px; }
        .clinic h1 { font-size: 20px; color: #1565C0; }
        .invoice-title { font-size: 24px; color: #1565C0; font-weight: bold; }
        .bill-no { font-size: 13px; color: #666; }
        .patient-section { display: flex; justify-content: space-between; background: #f0f4ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #1565C0; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .totals { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 16px; gap: 4px; }
        .total-row { display: flex; gap: 40px; font-size: 13px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #1565C0; }
        .payment-badge { background: #E8F5E9; border: 1px solid #4CAF50; border-radius: 6px; padding: 6px 14px; color: #2E7D32; font-size: 13px; font-weight: bold; display: inline-block; }
        ${bill?.emi_months ? '.emi-info { background: #FFF3E0; border-left: 3px solid #FF9800; padding: 8px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 12px; }' : ''}
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="clinic">
          <h1>🦷 VEB DENTAL CARE</h1>
          <p style="font-size:12px;color:#666">Professional Dental Services</p>
        </div>
        <div style="text-align:right">
          <div class="invoice-title">INVOICE</div>
          <div class="bill-no">Bill No: ${bill?.bill_number || ''}</div>
          <div class="bill-no">Date: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>
      <div class="patient-section">
        <div>
          <strong>${patient?.first_name} ${patient?.last_name}</strong><br>
          ID: ${patient?.patient_id}<br>
          Mobile: ${patient?.mobile}
        </div>
        <div>
          <span class="payment-badge">${paymentMode.toUpperCase()}</span>
        </div>
      </div>
      <table>
        <tr><th>#</th><th>Treatment / Service</th><th>Tooth</th><th style="text-align:right">Amount (₹)</th></tr>
        ${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.description}</td><td>${item.tooth || '—'}</td><td style="text-align:right">₹${parseFloat(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
      </table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
        ${parseFloat(discount) > 0 ? `<div class="total-row" style="color:#c62828"><span>Discount (${discount}%)</span><span>- ₹${discountAmt.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="total-row grand-total"><span>TOTAL</span><span>₹${total.toLocaleString('en-IN')}</span></div>
      </div>
      ${paymentMode === 'emi' ? `<div class="emi-info">EMI Plan: ${emiMonths} months × ₹${emiAmount.toFixed(0)} per month</div>` : ''}
      ${notes ? `<p style="font-size:12px;color:#666;margin-bottom:12px">Notes: ${notes}</p>` : ''}
      <div class="footer">Thank you for choosing VEB DENTAL CARE<br>For queries: contact clinic</div>
    </body>
    </html>
  `;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Patient header */}
      <View style={styles.patientBanner}>
        <Ionicons name="person-circle" size={32} color="rgba(255,255,255,0.6)" />
        <View>
          <Text style={styles.patientName}>{patient?.first_name} {patient?.last_name}</Text>
          <Text style={styles.patientId}>{patient?.patient_id}</Text>
        </View>
      </View>

      {/* Bill Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bill Items</Text>
        {loadingPlans && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 8 }} />}
        {billItems.map((item, i) => (
          <View key={i} style={styles.billItem}>
            <TouchableOpacity style={[styles.checkbox, item.included && styles.checkboxChecked]} onPress={() => toggleItem(i)}>
              {item.included && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
            <View style={styles.billItemContent}>
              <Text style={[styles.billItemName, !item.included && styles.strikethrough]}>{item.description}</Text>
              {item.tooth && <Text style={styles.billItemTooth}>Tooth: {item.tooth}</Text>}
            </View>
            <Text style={[styles.billItemAmt, !item.included && { color: theme.colors.textLight }]}>
              ₹{item.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        {/* Extra items */}
        {extraItems.map((item, i) => (
          <View key={`extra-${i}`} style={styles.billItem}>
            <View style={[styles.checkbox, styles.checkboxChecked]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <View style={styles.billItemContent}>
              <TextInput style={styles.extraInput} value={item.description}
                onChangeText={v => updateExtra(i, 'description', v)} placeholder="Service description" placeholderTextColor={theme.colors.textLight} />
            </View>
            <TextInput style={styles.extraAmtInput} value={String(item.amount || '')}
              onChangeText={v => updateExtra(i, 'amount', parseFloat(v) || 0)}
              placeholder="0" keyboardType="numeric" placeholderTextColor={theme.colors.textLight} />
          </View>
        ))}

        <TouchableOpacity style={styles.addItemBtn} onPress={addExtraItem}>
          <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.addItemText}>Add Extra Item</Text>
        </TouchableOpacity>
      </View>

      {/* Discount */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discount</Text>
        <View style={styles.discountRow}>
          {['0', '5', '10', '15', '20'].map(d => (
            <TouchableOpacity key={d} style={[styles.discountChip, discount === d && styles.discountChipActive]}
              onPress={() => setDiscount(d)}>
              <Text style={[styles.discountText, discount === d && styles.discountTextActive]}>{d}%</Text>
            </TouchableOpacity>
          ))}
          <TextInput style={styles.discountInput} value={discount} onChangeText={setDiscount}
            placeholder="Custom %" keyboardType="numeric" placeholderTextColor={theme.colors.textLight} />
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹ {subtotal.toLocaleString('en-IN')}</Text>
        </View>
        {parseFloat(discount) > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.error }]}>Discount ({discount}%)</Text>
            <Text style={[styles.totalValue, { color: theme.colors.error }]}>- ₹ {discountAmt.toLocaleString('en-IN')}</Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={styles.grandTotalLabel}>TOTAL</Text>
          <Text style={styles.grandTotalValue}>₹ {total.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Payment Mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Mode</Text>
        <View style={styles.paymentGrid}>
          {PAYMENT_MODES.map(pm => (
            <TouchableOpacity key={pm.key}
              style={[styles.paymentOption, paymentMode === pm.key && { borderColor: pm.color, backgroundColor: pm.color + '10' }]}
              onPress={() => setPaymentMode(pm.key)}>
              <Ionicons name={pm.icon} size={24} color={paymentMode === pm.key ? pm.color : theme.colors.textSecondary} />
              <Text style={[styles.paymentLabel, paymentMode === pm.key && { color: pm.color, fontWeight: '700' }]}>{pm.label}</Text>
              {paymentMode === pm.key && <Ionicons name="checkmark-circle" size={16} color={pm.color} />}
            </TouchableOpacity>
          ))}
        </View>

        {paymentMode === 'emi' && (
          <View style={styles.emiSection}>
            <Text style={styles.emiLabel}>EMI Duration</Text>
            <View style={styles.emiChips}>
              {EMI_OPTIONS.map(m => (
                <TouchableOpacity key={m} style={[styles.emiChip, emiMonths === m && styles.emiChipActive]}
                  onPress={() => setEmiMonths(m)}>
                  <Text style={[styles.emiChipText, emiMonths === m && styles.emiChipTextActive]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.emiInfo}>
              <Text style={styles.emiInfoText}>
                {emiMonths} months × ₹{emiAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} per month
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes}
          placeholder="Any additional notes..." placeholderTextColor={theme.colors.textLight} multiline numberOfLines={2} />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="receipt" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>Generate Bill  ·  ₹{total.toLocaleString('en-IN')}</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Bill List Screen ─────────────────────────────────────────────────────────
function BillListScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const res = await billingAPI.getAll(params);
      setBills(res.data || []);
    } catch (err) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [filter]));

  const STATUS_CONFIG = {
    paid: { bg: theme.colors.successLight, text: theme.colors.success },
    pending: { bg: theme.colors.warningLight, text: theme.colors.warning },
    partial: { bg: '#E3F2FD', text: theme.colors.primary },
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {['all', 'paid', 'pending'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); setLoading(true); }}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bills}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.payment_status] || STATUS_CONFIG.pending;
          return (
            <TouchableOpacity style={styles.billCard} onPress={() => navigation.navigate('BillDetail', { id: item.id })}>
              <View style={styles.billTop}>
                <Text style={styles.billNo}>{item.bill_number}</Text>
                <View style={[styles.billStatusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.billStatusText, { color: sc.text }]}>{item.payment_status}</Text>
                </View>
              </View>
              <Text style={styles.billPatient}>{item.first_name} {item.last_name} · {item.p_id}</Text>
              <View style={styles.billBottom}>
                <Text style={styles.billDate}>{item.bill_date} · {item.payment_mode?.toUpperCase()}</Text>
                <Text style={styles.billAmount}>₹{parseFloat(item.total_amount || 0).toLocaleString('en-IN')}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={theme.colors.border} />
            <Text style={styles.emptyText}>No bills found</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

// ─── Export based on route ────────────────────────────────────────────────────
export default function BillingScreen(props) {
  const hasPatient = !!props.route?.params?.patient;
  return hasPatient ? <CreateBillScreen {...props} /> : <BillListScreen {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  patientBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#7B1FA2', padding: theme.spacing.md },
  patientName: { fontSize: theme.fontSizes.lg, fontWeight: 'bold', color: '#fff' },
  patientId: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  cardTitle: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  billItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  billItemContent: { flex: 1 },
  billItemName: { fontSize: theme.fontSizes.md, color: theme.colors.text, fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: theme.colors.textLight },
  billItemTooth: { fontSize: 11, color: theme.colors.textSecondary },
  billItemAmt: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  extraInput: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 2, fontSize: theme.fontSizes.md, color: theme.colors.text },
  extraAmtInput: { width: 70, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4, fontSize: theme.fontSizes.md, textAlign: 'right', color: theme.colors.text },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  addItemText: { color: theme.colors.primary, fontWeight: '600' },
  discountRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  discountChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  discountChipActive: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  discountText: { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '600' },
  discountTextActive: { color: '#fff' },
  discountInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 80, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  totalsCard: { backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, borderRadius: theme.radius.md, padding: theme.spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: theme.fontSizes.md, color: 'rgba(255,255,255,0.8)' },
  totalValue: { fontSize: theme.fontSizes.md, color: '#fff', fontWeight: '600' },
  grandTotal: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  grandTotalValue: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 4,
  },
  paymentLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  emiSection: { marginTop: 12, padding: 12, backgroundColor: '#FFF3E0', borderRadius: theme.radius.md },
  emiLabel: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  emiChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  emiChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.warning, backgroundColor: '#fff' },
  emiChipActive: { backgroundColor: theme.colors.warning, borderColor: theme.colors.warning },
  emiChipText: { fontSize: theme.fontSizes.sm, color: theme.colors.warning, fontWeight: '600' },
  emiChipTextActive: { color: '#fff' },
  emiInfo: { marginTop: 8, backgroundColor: '#fff', padding: 8, borderRadius: 6 },
  emiInfoText: { fontSize: theme.fontSizes.md, color: theme.colors.warning, fontWeight: '700', textAlign: 'center' },
  notesInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, textAlignVertical: 'top', color: theme.colors.text, minHeight: 60 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B1FA2', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, padding: 16, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  saveBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
  filterBar: { flexDirection: 'row', gap: 8, padding: theme.spacing.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  filterChipActive: { backgroundColor: '#7B1FA2', borderColor: '#7B1FA2' },
  filterChipText: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  billCard: { backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.sm, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  billNo: { fontSize: theme.fontSizes.sm, fontWeight: '700', color: theme.colors.primary },
  billStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  billStatusText: { fontSize: 11, fontWeight: '600' },
  billPatient: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  billBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  billDate: { fontSize: 12, color: theme.colors.textSecondary },
  billAmount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.success },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
});
