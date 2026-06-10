import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  narrative: string;
  updatedAt: string;
}

export function DigestNarrativeCard({ narrative, updatedAt }: Props) {
  const timeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <View style={styles.card}>
      <Text style={styles.narrative}>{narrative}</Text>
      <Text style={styles.timestamp}>Updated {timeAgo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  narrative: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 18,
    lineHeight: 26,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  timestamp: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#8c8c8c',
  },
});
