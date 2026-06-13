import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js/dist/index.cjs';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

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
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data.map((item) => ({
        ...item,
        amount: Number(item.amount),
      }));
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local storage', e);
    }
  }
  try {
    const json = await store.getItem(STORAGE_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

export const saveExpenses = async (expenses) => {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('expenses').delete();
      const rows = expenses.map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
      }));
      const { error } = await supabase.from('expenses').insert(rows);
      if (error) throw error;
    } catch (e) {
      console.warn('Supabase save failed, falling back to local storage', e);
    }
  }
  await store.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

export const addExpense = async (expense) => {
  const expenses = await getExpenses();
  const newExpense = {
    id: Date.now(),
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
  const idString = String(id);
  const updated = expenses.filter((e) => String(e.id) !== idString);
  await saveExpenses(updated);
  return updated;
};
