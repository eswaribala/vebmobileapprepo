import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { billingAPI } from '../../services/api';

const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash', color: '#2E7D32' },
  { key: 'card', label: 'Card', color: '#1565C0' },
  { key: 'upi', label: 'UPI', color: '#7B1FA2' },
  { key: 'emi', label: 'EMI', color: '#E65100' },
];

export default function BillDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState('0');
  const [editPaymentMode, setEditPaymentMode] = useState('cash');
  const [editPaymentStatus, setEditPaymentStatus] = useState('paid');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadBill();
  }, [id]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, marginRight: 14 }}>
          {!isEditing && bill?.payment_status !== 'voided' && (
            <TouchableOpacity onPress={startEdit}>
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {bill?.payment_status !== 'voided' && (
            <TouchableOpacity onPress={handleVoid}>
              <Ionicons name="ban-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [isEditing, bill]);

  const loadBill = () => {
    setLoading(true);
    billingAPI.getById(id)
      .then(res => setBill(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const startEdit = () => {
    if (!bill) return;
    const items = Array.isArray(bill.items) ? bill.items : [];
    setEditItems(items.map(item => ({ ...item, amount: String(item.amount || '0') })));
    setEditDiscount(String(bill.discount || '0'));
    setEditPaymentMode(bill.payment_mode || 'cash');
    setEditPaymentStatus(bill.payment_status || 'paid');
    setEditNotes(bill.notes || '');
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = editItems.map(i => ({ ...i, amount: parseFloat(i.amount) || 0 }));
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const discountAmt = subtotal * (parseFloat(editDiscount) || 0) / 100;
      const total_amount = subtotal - discountAmt;
      await billingAPI.update(id, {
        items,
        subtotal,
        discount: parseFloat(editDiscount) || 0,
        total_amount,
        payment_mode: editPaymentMode,
        payment_status: editPaymentStatus,
        emi_months: editPaymentMode === 'emi' ? bill.emi_months : null,
        emi_amount: editPaymentMode === 'emi' ? (total_amount / (bill.emi_months || 1)) : null,
        bill_date: bill.bill_date,
        notes: editNotes,
        emi_paid: bill.emi_paid,
      });
      setIsEditing(false);
      loadBill();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const handleVoid = () => {
    Alert.alert(
      'Void Bill',
      'This will mark the bill as voided. The record is kept for audit purposes but excluded from all income calculations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void Bill', style: 'destructive', onPress: async () => {
            try {
              await billingAPI.voidBill(id);
              loadBill();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!bill) return;
    const items = Array.isArray(bill.items) ? bill.items : [];
    const subtotal = parseFloat(bill.subtotal || 0);
    const discount = bill.discount || 0;
    const total = parseFloat(bill.total_amount || 0);
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:Arial;padding:20px;color:#1a1a2e}.header{background:#1565C0;color:white;padding:16px;border-radius:8px;margin-bottom:16px}h1{font-size:18px}h2{font-size:14px;opacity:.8}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1565C0;color:white;padding:8px;font-size:12px}td{padding:8px;border-bottom:1px solid #eee;font-size:12px}.total{font-size:18px;font-weight:bold;color:#1565C0;text-align:right}</style>
      </head><body>
      <div class="header"><h1>🦷 VEB DENTAL CARE</h1><h2>Tax Invoice</h2></div>
      <p><strong>Bill No:</strong> ${bill.bill_number}</p>
      <p><strong>Date:</strong> ${bill.bill_date}</p>
      <p><strong>Patient:</strong> ${bill.first_name} ${bill.last_name} (${bill.p_id})</p>
      <p><strong>Mobile:</strong> ${bill.mobile}</p><br>
      <table><tr><th>#</th><th>Description</th><th>Tooth</th><th>Amount</th></tr>
      ${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.description || ''}</td><td>${item.tooth || '—'}</td><td>₹${parseFloat(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
      </table>
      <p>Subtotal: ₹${subtotal.toLocaleString('en-IN')}</p>
      ${discount > 0 ? `<p>Discount: ${discount}%</p>` : ''}
      <p class="total">Total: ₹${total.toLocaleString('en-IN')}</p>
      <p><strong>Payment:</strong> ${bill.payment_mode?.toUpperCase()} — ${bill.payment_status?.toUpperCase()}</p>
      ${bill.emi_months ? `<p>EMI: ${bill.emi_months} months × ₹${parseFloat(bill.emi_amount || 0).toFixed(0)} per month</p>` : ''}
      </body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!bill) return <View style={styles.center}><Text>Bill not found</Text></View>;

  const sc = bill.payment_status === 'paid'
    ? { bg: theme.colors.successLight, color: theme.colors.success }
    : bill.payment_status === 'voided'
      ? { bg: '#EEEEEE', color: '#757575' }
      : { bg: theme.colors.warningLight, color: theme.colors.warning };

  // ── Edit Mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    const subtotal = editItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const discountAmt = subtotal * (parseFloat(editDiscount) || 0) / 100;
    const total = subtotal - discountAmt;

    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: '#E65100' }]}>
          <View>
            <Text style={styles.billNo}>{bill.bill_number}</Text>
            <Text style={styles.billDate}>Editing Bill</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={cancelEdit}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.headerActionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerActionBtn, { backgroundColor: 'rgba(255,255,255,0.3)' }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.headerActionText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services</Text>
          {editItems.map((item, i) => (
            <View key={i} style={styles.editItemRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.editItemDesc}
                  value={item.description}
                  onChangeText={v => setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: v } : it))}
                  placeholder="Description"
                  placeholderTextColor={theme.colors.textLight}
                />
                {item.tooth ? <Text style={styles.itemTooth}>Tooth: {item.tooth}</Text> : null}
              </View>
              <TextInput
                style={styles.editItemAmt}
                value={String(item.amount)}
                onChangeText={v => setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, amount: v } : it))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textLight}
              />
              <TouchableOpacity onPress={() => setEditItems(prev => prev.filter((_, idx) => idx !== i))}>
                <Ionicons name="remove-circle" size={22} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={() => setEditItems(prev => [...prev, { description: '', amount: '0', tooth: '' }])}>
            <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Discount */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Discount (%)</Text>
          <View style={styles.discountRow}>
            {['0', '5', '10', '15', '20'].map(d => (
              <TouchableOpacity key={d}
                style={[styles.discountChip, editDiscount === d && styles.discountChipActive]}
                onPress={() => setEditDiscount(d)}>
                <Text style={[styles.discountText, editDiscount === d && styles.discountTextActive]}>{d}%</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.discountInput}
              value={editDiscount}
              onChangeText={setEditDiscount}
              keyboardType="numeric"
              placeholder="Custom"
              placeholderTextColor={theme.colors.textLight}
            />
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          {parseFloat(editDiscount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#FFCDD2' }]}>Discount ({editDiscount}%)</Text>
              <Text style={[styles.totalValue, { color: '#FFCDD2' }]}>- ₹{discountAmt.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={styles.grandLabel}>TOTAL</Text>
            <Text style={styles.grandValue}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payment Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Mode</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PAYMENT_MODES.map(pm => (
              <TouchableOpacity key={pm.key}
                style={[styles.modeChip, editPaymentMode === pm.key && { backgroundColor: pm.color, borderColor: pm.color }]}
                onPress={() => setEditPaymentMode(pm.key)}>
                <Text style={[styles.modeChipText, editPaymentMode === pm.key && { color: '#fff' }]}>{pm.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Status</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['paid', 'pending', 'partial'].map(s => (
              <TouchableOpacity key={s}
                style={[styles.modeChip, editPaymentStatus === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                onPress={() => setEditPaymentStatus(s)}>
                <Text style={[styles.modeChipText, editPaymentStatus === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Additional notes..."
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
          />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────
  const items = Array.isArray(bill.items) ? bill.items : [];

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, bill.payment_status === 'voided' && { backgroundColor: '#616161' }]}>
        <View>
          <Text style={styles.billNo}>{bill.bill_number}</Text>
          <Text style={styles.billDate}>{bill.bill_date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{bill.payment_status?.toUpperCase()}</Text>
        </View>
      </View>
      {bill.payment_status === 'voided' && (
        <View style={styles.voidedBanner}>
          <Ionicons name="ban" size={16} color="#757575" />
          <Text style={styles.voidedBannerText}>This bill has been voided. It is kept for records but excluded from all income reports.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Patient</Text>
        <Text style={styles.patientName}>{bill.first_name} {bill.last_name}</Text>
        <Text style={styles.patientSub}>{bill.p_id} · {bill.mobile}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Services</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemNum}>{i + 1}</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>{item.description}</Text>
              {item.tooth && <Text style={styles.itemTooth}>Tooth: {item.tooth}</Text>}
            </View>
            <Text style={styles.itemAmt}>₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{parseFloat(bill.subtotal || 0).toLocaleString('en-IN')}</Text>
        </View>
        {bill.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#FFCDD2' }]}>Discount ({bill.discount}%)</Text>
            <Text style={[styles.totalValue, { color: '#FFCDD2' }]}>- ₹{(parseFloat(bill.subtotal || 0) * bill.discount / 100).toLocaleString('en-IN')}</Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>TOTAL</Text>
          <Text style={styles.grandValue}>₹{parseFloat(bill.total_amount || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.payRow}>
          <Ionicons name="card" size={16} color="#fff" />
          <Text style={styles.payText}>{bill.payment_mode?.toUpperCase()}</Text>
        </View>
        {bill.emi_months && (
          <Text style={styles.emiText}>EMI: {bill.emi_months} months × ₹{parseFloat(bill.emi_amount || 0).toFixed(0)} per month</Text>
        )}
      </View>

      {bill.notes ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <Text style={{ color: theme.colors.text, fontSize: theme.fontSizes.md }}>{bill.notes}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>Share Invoice PDF</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#7B1FA2', padding: theme.spacing.lg },
  billNo: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  billDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontWeight: '700', fontSize: theme.fontSizes.sm },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  cardTitle: { fontSize: theme.fontSizes.sm, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  patientName: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  patientSub: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  itemNum: { width: 24, fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  itemContent: { flex: 1 },
  itemName: { fontSize: theme.fontSizes.md, color: theme.colors.text, fontWeight: '500' },
  itemTooth: { fontSize: 11, color: theme.colors.textSecondary },
  itemAmt: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  totalsCard: { backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, borderRadius: theme.radius.md, padding: theme.spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: theme.fontSizes.md },
  totalValue: { color: '#fff', fontSize: theme.fontSizes.md, fontWeight: '600' },
  grandRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', paddingTop: 8, marginTop: 4 },
  grandLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  grandValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  payText: { color: '#fff', fontSize: theme.fontSizes.md, fontWeight: '600' },
  emiText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B1FA2', margin: theme.spacing.md, padding: 14, borderRadius: theme.radius.lg, gap: 8, ...theme.shadows.md },
  shareBtnText: { color: '#fff', fontSize: theme.fontSizes.lg, fontWeight: '700' },
  voidedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F5F5F5', borderLeftWidth: 4, borderLeftColor: '#9E9E9E', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radius.sm },
  voidedBannerText: { flex: 1, fontSize: 12, color: '#616161', lineHeight: 18 },
  // Edit mode styles
  editItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  editItemDesc: { fontSize: theme.fontSizes.md, color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 2 },
  editItemAmt: { width: 70, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, textAlign: 'right', fontSize: theme.fontSizes.md, color: theme.colors.text },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10 },
  addItemText: { color: theme.colors.primary, fontWeight: '600' },
  discountRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  discountChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  discountChipActive: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  discountText: { fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: '600' },
  discountTextActive: { color: '#fff' },
  discountInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#FAFAFA' },
  modeChipText: { fontSize: theme.fontSizes.sm, fontWeight: '600', color: theme.colors.text },
  notesInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, textAlignVertical: 'top', color: theme.colors.text, minHeight: 70 },
});
