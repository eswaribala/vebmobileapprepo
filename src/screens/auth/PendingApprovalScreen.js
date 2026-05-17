import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

export default function PendingApprovalScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="time" size={52} color="#E65100" />
        </View>
        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.body}>
          Your account has been created and is awaiting approval from the clinic owner.
          {'\n\n'}
          You will be able to log in once the owner approves your request. Please contact the clinic owner if you need urgent access.
        </Text>
        <View style={styles.infoBox}>
          <Ionicons name="business" size={16} color={theme.colors.primary} />
          <Text style={styles.infoText}>VEB DENTAL CARE</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, textAlign: 'center', marginBottom: 14 },
  body: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 20 },
  infoText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
