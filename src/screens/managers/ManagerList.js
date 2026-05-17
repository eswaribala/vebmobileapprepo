import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { staffAPI } from '../../services/api';

const ACCENT = '#C62828';

function ManagerCard({ member, onEdit, onDelete }) {
  return (
    <View style={[styles.card, !member.is_active && styles.cardInactive]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.role}>Manager</Text>
        {member.department ? (
          <Text style={styles.meta}>{member.department} · ID: {member.staff_id}</Text>
        ) : (
          <Text style={styles.meta}>ID: {member.staff_id}</Text>
        )}
        {member.mobile ? <Text style={styles.meta}>{member.mobile}</Text> : null}
        {member.joining_date ? <Text style={styles.meta}>Since: {member.joining_date}</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="create" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ManagerListScreen({ navigation }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await staffAPI.getAll();
      setManagers((res.data || []).filter(m => m.role === 'Manager'));
    } catch (err) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={managers}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ManagerCard member={item}
            onEdit={() => navigation.navigate('ManagerForm', { member: item })}
            onDelete={() => {
              Alert.alert('Remove Manager', `Remove ${item.name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: async () => { await staffAPI.delete(item.id); load(); } },
              ]);
            }} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={60} color={theme.colors.border} />
            <Text style={styles.emptyText}>No managers added yet</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ManagerForm', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.md, padding: theme.spacing.md, ...theme.shadows.sm },
  cardInactive: { opacity: 0.6 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  role: { fontSize: theme.fontSizes.sm, fontWeight: '600', marginTop: 2, color: ACCENT },
  meta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, backgroundColor: ACCENT, borderRadius: 29, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});
