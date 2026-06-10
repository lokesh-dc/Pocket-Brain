import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
}

export function DigestCalloutCard({ title, value, subtitle, icon: Icon, color }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 200,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#8c8c8c',
  },
});
