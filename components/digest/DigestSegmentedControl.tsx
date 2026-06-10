import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DigestPeriod } from '../../types';

interface Props {
  selected: DigestPeriod;
  onSelect: (period: DigestPeriod) => void;
}

const PERIODS: { label: string; value: DigestPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

export function DigestSegmentedControl({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.value}
          style={[styles.tab, selected === p.value && styles.activeTab]}
          onPress={() => onSelect(p.value)}
        >
          <Text style={[styles.label, selected === p.value && styles.activeLabel]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#eeebe6',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: '#666',
  },
  activeLabel: {
    color: '#1a1a1a',
  },
});
