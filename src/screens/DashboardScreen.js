import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, CATEGORIES, getCategoryMeta } from '../utils/storage';
import ExpenseTable from '../components/ExpenseTable';

export default function DashboardScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const data = await getExpenses();
        setExpenses(data);
        setLoading(false);
      };
      load();
    }, [])
  );

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthCount = thisMonthExpenses.length;
  const yearTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const highestExpense = expenses.reduce((max, e) => (e.amount > max ? e.amount : max), 0);

  const categorySummary = CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category.label);
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    return {
      ...category,
      total,
      count: items.length,
    };
  })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  const latestExpenses = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRowTop}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Track your spending and see insights at a glance.</Text>
      </View>

      <View style={styles.cardsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statValue}>${thisMonthTotal.toFixed(2)}</Text>
          <Text style={styles.statDetail}>{thisMonthCount} expense{thisMonthCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statCardSecondary}>
          <Text style={styles.statLabel}>This Year</Text>
          <Text style={styles.statValue}>${yearTotal.toFixed(2)}</Text>
          <Text style={styles.statDetail}>Top expense ${highestExpense.toFixed(2)}</Text>
        </View>
      </View>

      {categorySummary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <View style={styles.categoryRow}>
            {categorySummary.map((item) => (
              <View key={item.label} style={[styles.categoryCard, { backgroundColor: item.color + '22' }]}> 
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={styles.categoryLabel}>{item.label}</Text>
                <Text style={styles.categoryTotal}>${item.total.toFixed(2)}</Text>
                <Text style={styles.categoryCount}>{item.count} expense{item.count !== 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Expenses</Text>
        {latestExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet. Add one to see details here.</Text>
        ) : latestExpenses.map((item) => {
          const meta = getCategoryMeta(item.category);
          const displayDate = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          return (
            <View key={item.id} style={styles.latestItem}>
              <View style={styles.latestLeft}>
                <Text style={[styles.latestBadge, { backgroundColor: meta.color + '22', color: meta.color }]}>{meta.icon}</Text>
                <View style={styles.latestText}>
                  <Text style={styles.latestCategory}>{item.category}</Text>
                  <Text style={styles.latestDate}>{displayDate}</Text>
                </View>
              </View>
              <Text style={styles.latestAmount}>${item.amount.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Summary — {currentYear}</Text>
        <ExpenseTable expenses={expenses} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardMonth: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: 12,
  },
  cardAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  headerRowTop: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2041',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6A6A86',
    lineHeight: 20,
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    padding: 20,
    marginRight: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  statCardSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  statLabel: {
    color: '#D6DAFF',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statDetail: {
    marginTop: 10,
    color: '#E7E9FF',
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 16,
    padding: 16,
  },
  categoryIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F2D52',
    marginBottom: 6,
  },
  categoryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F2D52',
  },
  categoryCount: {
    fontSize: 12,
    color: '#74738D',
    marginTop: 4,
  },
  latestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFFB',
  },
  latestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  latestBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  latestText: {
    flex: 1,
  },
  latestCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2F2D52',
  },
  latestDate: {
    fontSize: 12,
    color: '#7D7A9E',
    marginTop: 2,
  },
  latestAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  emptyText: {
    color: '#767490',
    fontSize: 14,
  },
});
