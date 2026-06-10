import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CloudRain } from 'lucide-react-native';

export function DigestEmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <CloudRain size={48} color="#7F77DD" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Nothing logged yet</Text>
      <Text style={styles.subtitle}>Drop a thought to get started and see your daily digest here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  illustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7F77DD10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 22,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    textAlign: 'center',
  },
});
