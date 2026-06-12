import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ExpenseTable({ expenses }) {
  const currentYear = new Date().getFullYear();

  const monthlyData = MONTHS.map((month, index) => {
    const monthExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === index;
    });
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      month,
      total,
      count: monthExpenses.length,
    };
  });

  return (
    <ScrollView horizontal={false} style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.monthCell]}>Month</Text>
        <Text style={[styles.headerCell, styles.totalCell]}>Total</Text>
        <Text style={[styles.headerCell, styles.countCell]}>Items</Text>
      </View>

      {monthlyData.map((item, index) => (
        <View
          key={item.month}
          style={[
            styles.row,
            index % 2 === 0 ? styles.rowEven : styles.rowOdd,
          ]}
        >
          <Text style={[styles.cell, styles.monthCell]}>{item.month}</Text>
          <Text style={[styles.cell, styles.totalCell, item.total > 0 && styles.totalAmount]}>
            ${item.total.toFixed(2)}
          </Text>
          <Text style={[styles.cell, styles.countCell]}>{item.count}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: '#fff',
  },
  rowOdd: {
    backgroundColor: '#F8F7FF',
  },
  cell: {
    fontSize: 14,
    color: '#333',
  },
  monthCell: {
    flex: 2,
  },
  totalCell: {
    flex: 2,
    textAlign: 'right',
  },
  countCell: {
    flex: 1,
    textAlign: 'center',
  },
  totalAmount: {
    color: '#6C63FF',
    fontWeight: '600',
  },
});
