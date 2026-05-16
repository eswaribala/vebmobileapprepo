import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { staffAPI } from '../../services/api';

const ROLE_COLORS = {
  Receptionist: '#1565C0', Nurse: '#00897B', 'Lab Technician': '#F57C00',
  Hygienist: '#7B1FA2', Assistant: '#2E7D32', Manager: '#C62828', Other: '#546E7A',
};

function StaffCard({ member, onEdit, onDelete }) {
  const color = ROLE_COLORS[member.role] || '#546E7A';
  return (
    <View style={[styles.card, !member.is_active && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={[styles.role, { color }]}>{member.role}</Text>
        <Text style={styles.dept}>{member.department} · ID: {member.staff_id}</Text>
        {member.mobile && <Text style={styles.mobile}>{member.mobile}</Text>}
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

export default function StaffListScreen({ navigation }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await staffAPI.getAll();
      setStaff(res.data || []);
    } catch (err) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={staff}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <StaffCard member={item}
            onEdit={() => navigation.navigate('StaffForm', { member: item })}
            onDelete={() => {
              Alert.alert('Remove Staff', `Remove ${item.name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: async () => { await staffAPI.delete(item.id); load(); } },
              ]);
            }} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={60} color={theme.colors.border} /><Text style={styles.emptyText}>No staff added yet</Text></View>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('StaffForm', {})}>
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
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  role: { fontSize: theme.fontSizes.sm, fontWeight: '600', marginTop: 2 },
  dept: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  mobile: { fontSize: 11, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, backgroundColor: theme.colors.primary, borderRadius: 29, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});
