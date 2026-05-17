import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { ownerAPI } from '../../services/api';

const ROLE_COLORS = {
  doctor: '#1565C0', receptionist: '#00897B', nurse: '#00897B',
  lab_technician: '#F57C00', hygienist: '#7B1FA2', assistant: '#2E7D32',
  manager: '#C62828', other: '#546E7A',
};

function RequestCard({ user, onApprove, onReject }) {
  const color = ROLE_COLORS[user.role] || '#546E7A';
  const roleLabel = user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const date = new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.rolePill}>
            <Text style={[styles.roleText, { color }]}>{roleLabel}</Text>
          </View>
          <Text style={styles.date}>Requested: {date}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Ionicons name="close-circle" size={18} color={theme.colors.error} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SignupRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await ownerAPI.getPending();
      setRequests(res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleApprove = (user) => {
    Alert.alert('Approve Account', `Allow ${user.name} to access the app?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          await ownerAPI.approve(user.id);
          load();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const handleReject = (user) => {
    Alert.alert('Reject Account', `Remove ${user.name}'s signup request? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await ownerAPI.reject(user.id);
          load();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <FlatList
      style={styles.container}
      data={requests}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <RequestCard
          user={item}
          onApprove={() => handleApprove(item)}
          onReject={() => handleReject(item)}
        />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      contentContainerStyle={{ paddingBottom: 30 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerCount}>{requests.length} pending request{requests.length !== 1 ? 's' : ''}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={60} color={theme.colors.border} />
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptyHint}>All signup requests have been reviewed</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: theme.spacing.md, paddingBottom: 4 },
  headerCount: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.lg, padding: theme.spacing.md, ...theme.shadows.sm },
  cardTop: { flexDirection: 'row', marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  email: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  rolePill: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 11, color: theme.colors.textLight, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: theme.colors.error, borderRadius: 10, paddingVertical: 9 },
  rejectText: { color: theme.colors.error, fontWeight: '700', fontSize: 14 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2E7D32', borderRadius: 10, paddingVertical: 9 },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  emptyHint: { color: theme.colors.textLight, fontSize: 13, marginTop: 4 },
});
