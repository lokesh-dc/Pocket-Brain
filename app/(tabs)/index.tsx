import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import InputBar from '../../components/InputBar';

export default function IndexScreen() {
  const handleCapture = (text: string) => {
    console.log('Capturing:', text);
    // AI logic will go here later
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening,</Text>
        <Text style={styles.title}>What's on your mind?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyState}>
          <View style={styles.placeholderCard} />
          <View style={styles.placeholderCard} />
          <View style={styles.placeholderCard} />
          <Text style={styles.emptyText}>Your intelligent timeline will appear here.</Text>
        </View>
      </ScrollView>

      <InputBar onSend={handleCapture} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingTop: 12,
  },
  greeting: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCard: {
    width: '100%',
    height: 100,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    marginBottom: 16,
    opacity: 0.5,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
