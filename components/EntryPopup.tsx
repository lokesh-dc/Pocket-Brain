import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { format } from 'date-fns';
import { X } from 'lucide-react-native';
import { Entry } from '../types';
import { getCategoryConfig } from '../constants/Categories';

const { height } = Dimensions.get('window');

interface EntryPopupProps {
  entry: Entry | null;
  onClose: () => void;
}

export default function EntryPopup({ entry, onClose }: EntryPopupProps) {
  if (!entry) return null;

  const categoryName = entry.category?.name || 'Misc';
  const config = getCategoryConfig(categoryName);
  const Icon = config.icon;

  return (
    <Modal
      visible={!!entry}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.handle} />
              
              <View style={styles.header}>
                <View style={styles.categoryRow}>
                  <View style={[styles.iconContainer, { backgroundColor: config.accent + '20' }]}>
                    <Icon size={20} color={config.accent} />
                  </View>
                  <Text style={[styles.categoryName, { color: config.accent }]}>
                    {categoryName}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollArea}>
                <Text style={styles.rawText}>{entry.raw_text}</Text>
                
                {entry.entities && entry.entities.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Entities</Text>
                    <View style={styles.entityList}>
                      {entry.entities.map((e) => (
                        <View key={e.id} style={styles.entityTag}>
                          <Text style={styles.entityText}>{e.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {entry.amount && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction</Text>
                    <Text style={styles.amountText}>
                      {entry.currency === 'INR' ? '₹' : entry.currency || ''}{entry.amount}
                    </Text>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Logged At</Text>
                  <Text style={styles.dateText}>
                    {format(new Date(entry.timestamp), 'EEEE, d MMMM yyyy @ p')}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    marginBottom: 16,
  },
  rawText: {
    fontSize: 20,
    color: '#0f172a',
    lineHeight: 28,
    fontWeight: '500',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  entityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  entityTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  entityText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
  dateText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});
