import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { X, Sparkles } from 'lucide-react-native';

interface RetrievalResultProps {
  answer: string;
  entryCount: number;
  onClose: () => void;
  onPress: () => void;
}

export default function RetrievalResult({ answer, entryCount, onClose, onPress }: RetrievalResultProps) {
  if (!answer) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Sparkles size={16} color="#6366f1" />
            <Text style={styles.title}>Memory Assistant</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.answer}>{answer}</Text>
        
        <Text style={styles.footer}>
          Based on {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f5f3ff', // Light purple
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 2,
  },
  answer: {
    fontSize: 15,
    color: '#1e1b4b',
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
