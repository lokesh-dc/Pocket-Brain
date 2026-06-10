import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCategoryConfig } from '../../constants/Categories';

interface Props {
  category: string;
  count: number;
  amount?: number;
  currency?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  expense: '#1D9E75',
  reading: '#BA7517',
  travel: '#185FA5',
  idea: '#7F77DD',
  shopping: '#D4537E',
  health: '#D85A30',
  misc: '#8c8c8c',
};

export function DigestCategoryRow({ category, count, amount, currency }: Props) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  const normalizedCat = category.toLowerCase().includes('expense') ? 'expense' : 
                         category.toLowerCase().includes('read') ? 'reading' :
                         category.toLowerCase().includes('travel') ? 'travel' :
                         category.toLowerCase().includes('idea') ? 'idea' :
                         category.toLowerCase().includes('shop') ? 'shopping' :
                         category.toLowerCase().includes('health') ? 'health' : 'misc';
  
  const accentColor = CATEGORY_COLORS[normalizedCat] || CATEGORY_COLORS.misc;

  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
            <Icon size={20} color={accentColor} />
          </View>
          <Text style={styles.name}>{category}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.count}>{count} logs</Text>
          {amount !== undefined && (
            <Text style={styles.amount}>
              {currency} {amount.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  accentBar: {
    width: 4,
    height: '100%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  right: {
    alignItems: 'flex-end',
  },
  count: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#666',
  },
  amount: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#1D9E75',
    marginTop: 2,
  },
});
