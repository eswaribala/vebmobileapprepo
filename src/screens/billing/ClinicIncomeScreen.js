import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { billingAPI } from '../../services/api';

const BRANCHES   = ['Avadi', 'Thiruninravur'];
const BRANCH_COLOR = { Avadi: '#1565C0', Thiruninravur: '#7B1FA2' };
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PERIODS      = ['yearly', 'monthly', 'weekly'];
const PERIOD_LABEL = { yearly: 'Yearly', monthly: 'Monthly', weekly: 'Weekly' };

function fmt(n) { return parseFloat(n || 0).toLocaleString('en-IN'); }

export default function ClinicIncomeScreen() {
  const [branch, setBranch]     = useState('Avadi');
  const [period, setPeriod]     = useState('monthly');
  const [year, setYear]         = useState(new Date().getFullYear());
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await billingAPI.getIncomeReport({ period, year, branch });
      setData(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [branch, period, year]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const accent = BRANCH_COLOR[branch];
  const {
    trend = [],
    current_month = {}, pending_bills = [], emi_bills = [],
  } = data || {};

  const maxTrend = Math.max(
    ...trend.map(t => parseFloat(t.paid || 0) + parseFloat(t.pending || 0)), 1
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* ── Branch tabs ── */}
      <View style={styles.branchBar}>
        {BRANCHES.map(b => (
          <TouchableOpacity
            key={b}
            style={[styles.branchTab, branch === b && { backgroundColor: BRANCH_COLOR[b], borderColor: BRANCH_COLOR[b] }]}
            onPress={() => setBranch(b)}
          >
            <Ionicons name="business" size={14} color={branch === b ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.branchTabText, branch === b && { color: '#fff' }]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Current Month Hero ── */}
      <View style={[styles.heroCard, { borderLeftColor: accent }]}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>
            <Ionicons name="calendar" size={13} color={accent} />
            {'  '}{current_month.label || 'This Month'}
          </Text>
          <Text style={[styles.heroAmount, { color: accent }]}>₹{fmt(current_month.received)}</Text>
          <Text style={styles.heroSub}>received · {current_month.count || 0} bills</Text>
        </View>
        {parseFloat(current_month.pending || 0) > 0 && (
          <View style={styles.heroPending}>
            <Text style={styles.heroPendingLabel}>Pending</Text>
            <Text style={styles.heroPendingAmt}>₹{fmt(current_month.pending)}</Text>
          </View>
        )}
      </View>

      {/* ── Period + Year controls ── */}
      <View style={styles.controlRow}>
        {period !== 'yearly' ? (
          <View style={styles.yearRow}>
            <TouchableOpacity onPress={() => setYear(y => y - 1)}>
              <Ionicons name="chevron-back" size={20} color={accent} />
            </TouchableOpacity>
            <Text style={[styles.yearText, { color: accent }]}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(y => y + 1)}>
              <Ionicons name="chevron-forward" size={20} color={accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.allTimeLabel, { color: accent }]}>All Years</Text>
        )}
        <View style={styles.periodToggle}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && { backgroundColor: accent }]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && { color: '#fff' }]}>
                {PERIOD_LABEL[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Trend chart — only period-relevant data ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {period === 'yearly' ? 'Year-over-Year Income'
            : period === 'weekly' ? `Weekly Income — ${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`
            : `Monthly Income — ${year}`}
        </Text>
        {trend.length === 0 ? (
          <Text style={styles.empty}>
            No billing data {period !== 'yearly' ? `for ${year}` : 'yet'}
          </Text>
        ) : (
          <>
            {trend.map((t, i) => {
              const paid    = parseFloat(t.paid || 0);
              const pending = parseFloat(t.pending || 0);
              const total   = paid + pending;

              let label = t.period_key;
              if (period === 'monthly') {
                const mIdx = parseInt((t.period_key || '').slice(5), 10) - 1;
                label = MONTH_NAMES[mIdx] || t.period_key;
              } else if (period === 'weekly') {
                label = (t.period_key || '').slice(5);                         // "W20"
              }

              return (
                <View key={i} style={styles.trendRow}>
                  <Text style={styles.trendLabel}>{label}</Text>
                  <View style={styles.barTrack}>
                    {total > 0 && (
                      <View style={{ flexDirection: 'row', flex: total / maxTrend, borderRadius: 4, overflow: 'hidden' }}>
                        {paid > 0 && (
                          <View style={{ flex: paid, height: 14, backgroundColor: '#2E7D32' }} />
                        )}
                        {pending > 0 && (
                          <View style={{ flex: pending, height: 14, backgroundColor: theme.colors.warning }} />
                        )}
                      </View>
                    )}
                    <View style={{ flex: 1 - (total > 0 ? total / maxTrend : 0) }} />
                  </View>
                  <Text style={styles.trendCount}>{t.count}</Text>
                  <Text style={styles.trendIncome}>₹{fmt(paid)}</Text>
                </View>
              );
            })}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
                <Text style={styles.legendText}>Paid</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.legendText}>Pending</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ── Pending bills — monthly tab only ── */}
      {period === 'monthly' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Bills</Text>
            <View style={[styles.countBadge, { backgroundColor: theme.colors.warningLight }]}>
              <Text style={[styles.countBadgeText, { color: theme.colors.warning }]}>{pending_bills.length}</Text>
            </View>
          </View>
          {pending_bills.length === 0 ? (
            <Text style={styles.empty}>No pending bills</Text>
          ) : pending_bills.map((b, i) => (
            <View key={b.id} style={[styles.billRow, i < pending_bills.length - 1 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billNum}>{b.bill_number}</Text>
                <Text style={styles.billPatient}>
                  {b.first_name} {b.last_name}
                  {b.p_id ? <Text style={styles.billPid}> · {b.p_id}</Text> : null}
                </Text>
                <Text style={styles.billDate}>{b.bill_date}</Text>
              </View>
              <View style={styles.billRight}>
                <Text style={styles.billAmt}>₹{fmt(b.total_amount)}</Text>
                <View style={[
                  styles.statusBadge,
                  b.payment_status === 'partial' ? styles.partialBadge : styles.pendingBadge,
                ]}>
                  <Text style={styles.statusText}>{b.payment_status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── EMI receivables — monthly tab only ── */}
      {period === 'monthly' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EMI Receivables</Text>
            <View style={[styles.countBadge, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.countBadgeText, { color: '#7B1FA2' }]}>{emi_bills.length}</Text>
            </View>
          </View>
          {emi_bills.length === 0 ? (
            <Text style={styles.empty}>No active EMI plans</Text>
          ) : emi_bills.map((b, i) => (
            <View key={b.id} style={[styles.billRow, i < emi_bills.length - 1 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billNum}>{b.bill_number}</Text>
                <Text style={styles.billPatient}>
                  {b.first_name} {b.last_name}
                  {b.p_id ? <Text style={styles.billPid}> · {b.p_id}</Text> : null}
                </Text>
                <Text style={styles.billDate}>
                  {b.emi_remaining_count} of {b.emi_months} EMIs left · ₹{fmt(b.emi_amount)}/mo
                </Text>
              </View>
              <View style={styles.billRight}>
                <Text style={[styles.billAmt, { color: '#7B1FA2' }]}>₹{fmt(b.emi_remaining_amount)}</Text>
                <Text style={styles.emiDueLabel}>total due</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  branchBar: {
    flexDirection: 'row', gap: 10, padding: theme.spacing.md,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  branchTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: theme.radius.round,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  branchTabText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },

  // Current month hero
  heroCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
    borderLeftWidth: 5, ...theme.shadows.sm,
  },
  heroLeft:      { flex: 1 },
  heroLabel:     { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4 },
  heroAmount:    { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroSub:       { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  heroPending:   { alignItems: 'flex-end', paddingLeft: 12 },
  heroPendingLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.warning, textTransform: 'uppercase' },
  heroPendingAmt:   { fontSize: 16, fontWeight: '800', color: theme.colors.warning, marginTop: 2 },

  controlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    marginTop: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  yearRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearText:      { fontSize: 17, fontWeight: '800' },
  allTimeLabel:  { fontSize: 15, fontWeight: '800' },
  periodToggle:  {
    flexDirection: 'row', backgroundColor: theme.colors.background,
    borderRadius: theme.radius.round, padding: 3,
  },
  periodBtn:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: theme.radius.round },
  periodText:    { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },

  section: {
    backgroundColor: '#fff', marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, ...theme.shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  countBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.round },
  countBadgeText:{ fontSize: 12, fontWeight: '800' },

  trendRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  trendLabel:  { width: 38, fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  barTrack:    { flex: 1, height: 14, flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  trendCount:  { width: 22, fontSize: 11, color: theme.colors.textLight, textAlign: 'right' },
  trendIncome: { width: 78, fontSize: 12, fontWeight: '700', color: '#2E7D32', textAlign: 'right' },

  legend:      { flexDirection: 'row', gap: 16, marginTop: 10, justifyContent: 'flex-end' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },

  billRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowDivider:  { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  billNum:     { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  billPatient: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  billPid:     { color: theme.colors.textLight },
  billDate:    { fontSize: 11, color: theme.colors.textLight, marginTop: 2 },
  billRight:   { alignItems: 'flex-end', gap: 4 },
  billAmt:     { fontSize: 14, fontWeight: '800', color: theme.colors.text },

  statusBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.round },
  pendingBadge:  { backgroundColor: theme.colors.warningLight },
  partialBadge:  { backgroundColor: '#E3F2FD' },
  statusText:    { fontSize: 10, fontWeight: '700', color: theme.colors.warning, textTransform: 'capitalize' },

  emiDueLabel: { fontSize: 10, color: '#7B1FA2', fontWeight: '600' },
  empty:       { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20, fontSize: 13 },
});
