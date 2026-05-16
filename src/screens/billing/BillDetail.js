import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';
import { billingAPI } from '../../services/api';

export default function BillDetailScreen({ route }) {
  const { id } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingAPI.getById(id).then(res => setBill(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!bill) return;
    const items = Array.isArray(bill.items) ? bill.items : [];
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:Arial;padding:20px;color:#1a1a2e}.header{background:#1565C0;color:white;padding:16px;border-radius:8px;margin-bottom:16px}h1{font-size:18px}h2{font-size:14px;opacity:.8}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1565C0;color:white;padding:8px;font-size:12px}td{padding:8px;border-bottom:1px solid #eee;font-size:12px}.total{font-size:18px;font-weight:bold;color:#1565C0;text-align:right}</style>
      </head><body>
      <div class="header"><h1>🦷 VEB Dental Care & Implant Centre</h1><h2>Tax Invoice</h2></div>
      <p><strong>Bill No:</strong> ${bill.bill_number}</p>
      <p><strong>Date:</strong> ${bill.bill_date}</p>
      <p><strong>Patient:</strong> ${bill.first_name} ${bill.last_name} (${bill.p_id})</p>
      <p><strong>Mobile:</strong> ${bill.mobile}</p><br>
      <table><tr><th>#</th><th>Description</th><th>Tooth</th><th>Amount</th></tr>
      ${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.description || ''}</td><td>${item.tooth || '—'}</td><td>₹${parseFloat(item.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
      </table>
      <p>Subtotal: ₹${parseFloat(bill.subtotal || 0).toLocaleString('en-IN')}</p>
      ${bill.discount > 0 ? `<p>Discount: ${bill.discount}%</p>` : ''}
      <p class="total">Total: ₹${parseFloat(bill.total_amount || 0).toLocaleString('en-IN')}</p>
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

  const items = Array.isArray(bill.items) ? bill.items : [];
  const sc = bill.payment_status === 'paid' ? { bg: theme.colors.successLight, color: theme.colors.success }
    : { bg: theme.colors.warningLight, color: theme.colors.warning };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.billNo}>{bill.bill_number}</Text>
          <Text style={styles.billDate}>{bill.bill_date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{bill.payment_status?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Patient */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Patient</Text>
        <Text style={styles.patientName}>{bill.first_name} {bill.last_name}</Text>
        <Text style={styles.patientSub}>{bill.p_id} · {bill.mobile}</Text>
      </View>

      {/* Items */}
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

      {/* Totals */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{parseFloat(bill.subtotal || 0).toLocaleString('en-IN')}</Text>
        </View>
        {bill.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.error }]}>Discount ({bill.discount}%)</Text>
            <Text style={[styles.totalValue, { color: theme.colors.error }]}>- ₹{(parseFloat(bill.subtotal || 0) * bill.discount / 100).toLocaleString('en-IN')}</Text>
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
});
