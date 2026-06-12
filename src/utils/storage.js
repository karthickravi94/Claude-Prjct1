import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@expenses';

// Web uses localStorage, native uses AsyncStorage
const store = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
};

export const CATEGORIES = [
  { label: 'Milk',          icon: '🥛', color: '#4ECDC4' },
  { label: 'House',         icon: '🏠', color: '#FF6B6B' },
  { label: 'Food',          icon: '🍔', color: '#F4A261' },
  { label: 'Transport',     icon: '🚗', color: '#6C63FF' },
  { label: 'Entertainment', icon: '🎬', color: '#FF8C42' },
  { label: 'Health',        icon: '💊', color: '#52B788' },
  { label: 'Other',         icon: '📦', color: '#ADB5BD' },
];

export const getCategoryMeta = (label) =>
  CATEGORIES.find((c) => c.label === label) || CATEGORIES[CATEGORIES.length - 1];

export const getExpenses = async () => {
  try {
    const json = await store.getItem(STORAGE_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

export const saveExpenses = async (expenses) => {
  await store.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

export const addExpense = async (expense) => {
  const expenses = await getExpenses();
  const newExpense = {
    id: Date.now().toString(),
    category: expense.category,
    amount: parseFloat(expense.amount),
    date: expense.date,
    note: expense.note || '',
  };
  await saveExpenses([newExpense, ...expenses]);
  return newExpense;
};

export const deleteExpense = async (id) => {
  const expenses = await getExpenses();
  const updated = expenses.filter((e) => e.id !== id);
  await saveExpenses(updated);
  return updated;
};
