import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../utils/theme';

export default function PatientIDCardScreen({ route }) {
  const { patient } = route.params;

  const getCardHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f0f4ff; padding: 20px; }
        .card {
          width: 350px; background: white; border-radius: 16px;
          overflow: hidden; box-shadow: 0 4px 20px rgba(21,101,192,0.2);
          margin: auto;
        }
        .header {
          background: linear-gradient(135deg, #1565C0, #1E88E5);
          color: white; padding: 20px; text-align: center;
        }
        .clinic-name { font-size: 16px; font-weight: bold; }
        .clinic-sub { font-size: 11px; opacity: 0.8; margin-top: 2px; }
        .avatar {
          width: 70px; height: 70px; border-radius: 35px;
          background: rgba(255,255,255,0.2); margin: 12px auto;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: bold; color: white;
        }
        .patient-name { font-size: 18px; font-weight: bold; margin-top: 6px; }
        .patient-id {
          background: rgba(255,255,255,0.2); display: inline-block;
          padding: 3px 12px; border-radius: 12px; font-size: 13px;
          margin-top: 6px;
        }
        .body { padding: 16px; }
        .row { display: flex; padding: 7px 0; border-bottom: 1px solid #eee; }
        .label { font-size: 11px; color: #666; width: 110px; font-weight: 600; }
        .value { font-size: 13px; color: #1a1a2e; flex: 1; }
        .footer {
          background: #1565C0; color: white; text-align: center;
          padding: 10px; font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="clinic-name">🦷 VEB Dental Care</div>
          <div class="clinic-sub">& Implant Centre</div>
          <div class="avatar">${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}</div>
          <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
          <div class="patient-id">ID: ${patient.patient_id}</div>
        </div>
        <div class="body">
          <div class="row"><span class="label">Mobile</span><span class="value">${patient.mobile}</span></div>
          <div class="row"><span class="label">Date of Birth</span><span class="value">${patient.dob}</span></div>
          <div class="row"><span class="label">Age</span><span class="value">${patient.age} years</span></div>
          <div class="row"><span class="label">Gender</span><span class="value">${patient.gender || '—'}</span></div>
          <div class="row"><span class="label">Blood Group</span><span class="value">${patient.blood_group || '—'}</span></div>
          <div class="row"><span class="label">Address</span><span class="value">${patient.address || '—'}</span></div>
          <div class="row"><span class="label">Allergies</span><span class="value">${patient.allergies || 'None known'}</span></div>
          <div class="row"><span class="label">Emergency</span><span class="value">${patient.emergency_contact || '—'}</span></div>
          <div class="row"><span class="label">Registered</span><span class="value">${new Date(patient.created_at).toLocaleDateString('en-IN')}</span></div>
        </div>
        <div class="footer">VEB Dental Care & Implant Centre · Patient Record</div>
      </div>
    </body>
    </html>
  `;

  const handlePrint = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: getCardHTML() });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not generate ID card: ' + err.message);
    }
  };

  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.previewTitle}>Patient ID Card Preview</Text>

      {/* Card Preview */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.clinicName}>🦷 VEB Dental Care</Text>
          <Text style={styles.clinicSub}>& Implant Centre</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.patientName}>{patient.first_name} {patient.last_name}</Text>
          <View style={styles.pidBadge}><Text style={styles.pidText}>ID: {patient.patient_id}</Text></View>
        </View>

        <View style={styles.cardBody}>
          {[
            ['Mobile', patient.mobile],
            ['Date of Birth', patient.dob],
            ['Age', `${patient.age} years`],
            ['Gender', patient.gender || '—'],
            ['Blood Group', patient.blood_group || '—'],
            ['Address', patient.address || '—'],
            ['Allergies', patient.allergies || 'None known'],
            ['Emergency Contact', patient.emergency_contact || '—'],
          ].map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>VEB Dental Care & Implant Centre</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
        <Ionicons name="share" size={22} color="#fff" />
        <Text style={styles.printBtnText}>Download / Share PDF</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Tap above to download as PDF or share</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EAF6' },
  content: { padding: theme.spacing.md, alignItems: 'center' },
  previewTitle: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
    marginBottom: 20,
  },
  cardHeader: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  clinicName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  clinicSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  pidBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  pidText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cardBody: { padding: 16 },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { width: 120, fontSize: 12, color: '#666', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#1a1a2e' },
  cardFooter: { backgroundColor: theme.colors.primary, padding: 10, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: theme.radius.lg,
    gap: 10,
    ...theme.shadows.md,
  },
  printBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 10 },
});
