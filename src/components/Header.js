import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

export default function SectionHeader({ title, subtitle, action, actionLabel, icon }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={20} color={theme.colors.primary} style={styles.icon} />}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && (
        <TouchableOpacity style={styles.action} onPress={action}>
          <Text style={styles.actionText}>{actionLabel || 'View All'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: theme.spacing.sm },
  title: { fontSize: theme.fontSizes.lg, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  action: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
  },
  actionText: { color: '#fff', fontSize: theme.fontSizes.sm, fontWeight: '600' },
});
