import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { patientsAPI } from '../../services/api';

function PatientCard({ patient, onPress }) {
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();
  const genderColors = { Male: '#1565C0', Female: '#AD1457', Other: '#6A1B9A' };
  const color = genderColors[patient.gender] || '#1565C0';
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.name}>{patient.first_name} {patient.last_name}</Text>
          <Text style={styles.pid}>{patient.patient_id}</Text>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.infoChip}>
            <Ionicons name="call" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{patient.mobile}</Text>
          </View>
          <View style={styles.infoChip}>
            <Ionicons name="person" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{patient.gender || 'N/A'} · {patient.age} yrs</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
    </TouchableOpacity>
  );
}

export default function PatientListScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPatients = async () => {
    try {
      const res = await patientsAPI.getAll();
      setPatients(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadPatients(); }, []));

  const onSearch = (text) => {
    setSearch(text);
    if (!text) { setFiltered(patients); return; }
    const q = text.toLowerCase();
    setFiltered(patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.mobile?.includes(q) || p.patient_id?.toLowerCase().includes(q)
    ));
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, mobile, or ID..."
          value={search}
          onChangeText={onSearch}
          placeholderTextColor={theme.colors.textLight}
        />
        {search ? (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.count}>{filtered.length} patient{filtered.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PatientCard patient={item}
            onPress={() => navigation.navigate('PatientDetails', { id: item.id })} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPatients(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={60} color={theme.colors.border} />
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySubText}>Tap + to register a new patient</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PatientRegistration')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
  },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: theme.fontSizes.md, color: theme.colors.text },
  count: { paddingHorizontal: theme.spacing.md, color: theme.colors.textSecondary, fontSize: theme.fontSizes.sm, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: theme.spacing.md,
    marginVertical: 5,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: theme.fontSizes.md, fontWeight: '700', color: theme.colors.text },
  pid: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', gap: 12, marginTop: 4 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  infoText: { fontSize: 12, color: theme.colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: theme.fontSizes.lg, color: theme.colors.textSecondary, marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: theme.fontSizes.sm, color: theme.colors.textLight, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    backgroundColor: theme.colors.primary,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
});
