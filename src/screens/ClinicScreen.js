import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { useAuth, isOwner, canApproveSignups } from '../context/AuthContext';

function ClinicOption({ icon, title, subtitle, color, onPress }) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress}>
      <View style={[styles.optionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
    </TouchableOpacity>
  );
}

export default function ClinicScreen({ navigation }) {
  const { user } = useAuth();
  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="business" size={40} color="rgba(255,255,255,0.3)" />
        <Text style={styles.bannerTitle}>Clinic Management</Text>
        <Text style={styles.bannerSub}>Manage doctors, consultants, managers & staff</Text>
      </View>

      {/* Owner-only section */}
      {canApproveSignups(user?.role) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isOwner(user?.role) ? 'Owner Controls' : 'Admin Controls'}</Text>
          <ClinicOption icon="person-add-sharp" title="Signup Requests" subtitle="Approve or reject pending accounts"
            color="#C62828" onPress={() => navigation.navigate('SignupRequests')} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff Management</Text>
        <ClinicOption icon="person-add" title="Doctors" subtitle="Add and manage clinic doctors"
          color="#1565C0" onPress={() => navigation.navigate('DoctorList')} />
        <ClinicOption icon="briefcase" title="Consultants" subtitle="Visiting and specialist consultants"
          color="#0277BD" onPress={() => navigation.navigate('ConsultantList')} />
        <ClinicOption icon="shield" title="Managers" subtitle="Clinic and department managers"
          color="#C62828" onPress={() => navigation.navigate('ManagerList')} />
        <ClinicOption icon="people" title="Staff" subtitle="Receptionist, nurses and more"
          color="#00897B" onPress={() => navigation.navigate('StaffList')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance</Text>
        <ClinicOption icon="time" title="Today's Attendance" subtitle="Mark and view daily attendance"
          color="#E65100" onPress={() => navigation.navigate('Attendance')} />
        <ClinicOption icon="bar-chart" title="Monthly Report" subtitle="View attendance summaries"
          color="#7B1FA2" onPress={() => navigation.navigate('Attendance', { tab: 'summary' })} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  banner: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  section: {
    backgroundColor: '#fff',
    margin: theme.spacing.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  optionIcon: { width: 52, height: 52, borderRadius: theme.radius.md, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  optionSub: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
});
