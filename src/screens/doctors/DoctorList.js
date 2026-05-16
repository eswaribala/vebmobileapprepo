import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { doctorsAPI } from '../../services/api';

function DoctorCard({ doctor, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.spec}>{doctor.specialization}</Text>
          <Text style={styles.qual}>{doctor.qualification} · {doctor.experience} yrs exp</Text>
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
      <View style={styles.cardFooter}>
        {doctor.mobile && (
          <View style={styles.chip}>
            <Ionicons name="call" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.chipText}>{doctor.mobile}</Text>
          </View>
        )}
        {doctor.registration_no && (
          <View style={styles.chip}>
            <Ionicons name="card" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.chipText}>Reg: {doctor.registration_no}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function DoctorListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await doctorsAPI.getAllIncInactive();
      setDoctors(res.data || []);
    } catch (err) {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (doctor) => {
    Alert.alert('Remove Doctor', `Remove ${doctor.name} from active doctors?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await doctorsAPI.delete(doctor.id);
        load();
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <DoctorCard doctor={item}
            onEdit={() => navigation.navigate('DoctorForm', { doctor: item })}
            onDelete={() => handleDelete(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="person-outline" size={60} color={theme.colors.border} /><Text style={styles.emptyText}>No doctors added yet</Text></View>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DoctorForm', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', margin: theme.spacing.md, marginBottom: 0, borderRadius: theme.radius.md, ...theme.shadows.sm, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  spec: { fontSize: theme.fontSizes.sm, color: theme.colors.primary, fontWeight: '600' },
  qual: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cardFooter: { flexDirection: 'row', gap: 8, padding: theme.spacing.md, paddingTop: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 11, color: theme.colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: theme.fontSizes.lg },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, backgroundColor: theme.colors.primary, borderRadius: 29, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});
