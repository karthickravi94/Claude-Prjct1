import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, deleteExpense, getCategoryMeta } from '../utils/storage';

export default function ExpenseListScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const data = await getExpenses();
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(sorted);
        setLoading(false);
      };
      load();
    }, [])
  );

  const handleDelete = (id, category, amount) => {
    Alert.alert(
      'Delete Expense',
      `Delete $${parseFloat(amount).toFixed(2)} for ${category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteExpense(id);
              const sorted = [...updated].sort((a, b) => new Date(b.date) - new Date(a.date));
              setExpenses(sorted);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (expenses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💸</Text>
        <Text style={styles.emptyTitle}>No Expenses Yet</Text>
        <Text style={styles.emptySubtitle}>Tap "Add Expense" to record your first expense.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const meta = getCategoryMeta(item.category);
    return (
      <View style={styles.item}>
        <View style={styles.itemLeft}>
          <View style={[styles.badge, { backgroundColor: meta.color }]}>
            <Text style={styles.badgeIcon}>{meta.icon}</Text>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          <View style={styles.itemDetails}>
            <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
            {item.note ? <Text style={styles.itemNote} numberOfLines={1}>{item.note}</Text> : null}
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemAmount}>${parseFloat(item.amount).toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.category, item.amount)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.listHeader}>
            {expenses.length} Expense{expenses.length !== 1 ? 's' : ''} Total
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 90,
  },
  badgeIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  itemDetails: {
    flex: 1,
  },
  itemDate: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  itemNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 6,
  },
  deleteButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 10,
  },
});
