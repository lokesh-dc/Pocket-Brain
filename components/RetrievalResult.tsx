import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { X, MessageCircleQuestion } from 'lucide-react-native';
import EntryCard from './EntryCard';
import { Entry } from '../types';

const { height } = Dimensions.get('window');

interface RetrievalResultProps {
  results: Entry[];
  query: string;
  onClose: () => void;
  onEntryPress: (entry: Entry) => void;
}

export default function RetrievalResult({ results, query, onClose, onEntryPress }: RetrievalResultProps) {
  return (
    <Modal
      visible={results.length > 0}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MessageCircleQuestion size={20} color="#6366f1" />
              <Text style={styles.title}>Results for "{query}"</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No matches found for your query.</Text>
              </View>
            ) : (
              results.map((item) => (
                <View key={item.id}>
                  <EntryCard 
                    entry={item} 
                    onPress={() => onEntryPress(item)} 
                  />
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#faf9f7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  empty: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
