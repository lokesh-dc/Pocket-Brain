import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, Users } from 'lucide-react-native';
import { useDigest } from '../../hooks/useDigest';
import { DigestPeriod } from '../../types';
import { DigestSegmentedControl } from '../../components/digest/DigestSegmentedControl';
import { DigestNarrativeCard } from '../../components/digest/DigestNarrativeCard';
import { DigestCategoryRow } from '../../components/digest/DigestCategoryRow';
import { DigestCalloutCard } from '../../components/digest/DigestCalloutCard';
import { DigestEmptyState } from '../../components/digest/DigestEmptyState';

export default function InsightsScreen() {
  const [period, setPeriod] = useState<DigestPeriod>('today');
  const { digest, loading, refresh } = useDigest(period);

  const hasEntries = digest && Object.keys(digest.raw_data.entryCountByCategory).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <DigestSegmentedControl selected={period} onSelect={setPeriod} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#7F77DD" />}
      >
        {loading && !digest ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7F77DD" />
            <Text style={styles.loadingText}>Generating your digest...</Text>
          </View>
        ) : !hasEntries ? (
          <DigestEmptyState />
        ) : (
          <>
            {digest && (
              <DigestNarrativeCard
                narrative={digest.narrative}
                updatedAt={digest.generated_at}
              />
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Breakdown</Text>
              {Object.entries(digest!.raw_data.entryCountByCategory).map(([cat, count]) => (
                <DigestCategoryRow
                  key={cat}
                  category={cat}
                  count={count}
                  amount={digest!.raw_data.totalAmountByCategory[cat]}
                  currency={digest!.raw_data.biggestExpense?.currency}
                />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Highlights</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calloutsContainer}
              >
                {digest!.raw_data.biggestExpense && (
                  <DigestCalloutCard
                    title="Biggest Expense"
                    value={`${digest!.raw_data.biggestExpense.currency} ${digest!.raw_data.biggestExpense.amount}`}
                    subtitle={digest!.raw_data.biggestExpense.summary}
                    icon={Banknote}
                    color="#1D9E75"
                  />
                )}
                {digest!.raw_data.topEntity && (
                  <DigestCalloutCard
                    title="Most Logged"
                    value={digest!.raw_data.topEntity.name}
                    subtitle={`${digest!.raw_data.topEntity.count} entries`}
                    icon={Users}
                    color="#7F77DD"
                  />
                )}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 32,
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  section: {
    marginTop: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#8c8c8c',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  calloutsContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
});

