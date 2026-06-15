import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js/dist/index.cjs';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

const STORAGE_KEY = '@expenses';
const SAVINGS_KEY  = '@savings';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const store = {
  async getItem(key) {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
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

export const SAVINGS_CATEGORIES = [
  { label: 'Fixed Deposit', short: 'FD',     icon: 'business-outline',      color: '#f59e0b' },
  { label: 'Stocks',        short: 'Stocks',  icon: 'trending-up-outline',   color: '#10b981' },
  { label: 'Cash',          short: 'Cash',    icon: 'cash-outline',          color: '#a0a4b8' },
  { label: 'Crypto',        short: 'Crypto',  icon: 'logo-bitcoin',          color: '#6366f1' },
  { label: 'Mutual Funds',  short: 'MF',      icon: 'pie-chart-outline',     color: '#ec4899' },
  { label: 'Bonds',         short: 'Bonds',   icon: 'document-text-outline', color: '#3b82f6' },
  { label: 'Other',         short: 'Other',   icon: 'wallet-outline',        color: '#8E8E93' },
];

export const CATEGORIES = [
  { label: 'Food & Drink',  icon: 'restaurant-outline',  color: '#f59e0b' },
  { label: 'Transport',     icon: 'car-outline',          color: '#6366f1' },
  { label: 'Shopping',      icon: 'bag-handle-outline',   color: '#ec4899' },
  { label: 'Housing',       icon: 'home-outline',         color: '#3b82f6' },
  { label: 'Utilities',     icon: 'flash-outline',        color: '#10b981' },
  { label: 'Health',        icon: 'medical-outline',      color: '#ef4444' },
  { label: 'Entertainment', icon: 'cafe-outline',         color: '#00c9a7' },
  { label: 'Fitness',       icon: 'barbell-outline',      color: '#a855f7' },
  { label: 'Other',         icon: 'grid-outline',         color: '#8E8E93' },
];

export const getCategoryMeta = (label) =>
  CATEGORIES.find((c) => c.label === label) || CATEGORIES[CATEGORIES.length - 1];

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signUp = async (email, password, fullName) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const onAuthStateChange = (callback) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
};

// ── Local storage helpers ─────────────────────────────────────────────────────

const localGetAll = async () => {
  try {
    const json = await store.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

const localSaveAll = async (expenses) => {
  await store.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

// ── Public API ────────────────────────────────────────────────────────────────

export const getExpenses = async () => {
  if (supabase) {
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      if (data.length > 0) {
        return data.map((item) => ({ ...item, amount: Number(item.amount) }));
      }
    } catch (e) {
      console.warn('Supabase getExpenses failed, using local storage:', e.message);
    }
  }
  return localGetAll();
};

export const addExpense = async (expense) => {
  const session = await getSession();
  const userId = session?.user?.id;

  const newExpense = {
    id: Date.now(),
    category: expense.category,
    amount: parseFloat(expense.amount),
    date: expense.date,
    note: expense.note || '',
    user_id: userId || null,
  };

  if (supabase) {
    try {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) throw error;
      const local = await localGetAll();
      await localSaveAll([newExpense, ...local]);
      return newExpense;
    } catch (e) {
      console.warn('Supabase addExpense failed, using local storage:', e.message);
    }
  }

  const local = await localGetAll();
  await localSaveAll([newExpense, ...local]);
  return newExpense;
};

export const deleteExpense = async (id) => {
  const idNum = Number(id);

  if (supabase) {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', idNum);
      if (error) throw error;
      const local = await localGetAll();
      const updated = local.filter((e) => Number(e.id) !== idNum);
      await localSaveAll(updated);
      return updated;
    } catch (e) {
      console.warn('Supabase deleteExpense failed, using local storage:', e.message);
    }
  }

  const local = await localGetAll();
  const updated = local.filter((e) => Number(e.id) !== idNum);
  await localSaveAll(updated);
  return updated;
};

// ── Savings (local AsyncStorage only) ────────────────────────────────────────

const savingsGetAll = async () => {
  try {
    const json = await store.getItem(SAVINGS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

const savingsSaveAll = async (items) => {
  await store.setItem(SAVINGS_KEY, JSON.stringify(items));
};

export const getSavings = async () => {
  return savingsGetAll();
};

export const addSaving = async ({ name, category, amount, date, note }) => {
  const item = {
    id: Date.now(),
    name: name || '',
    category,
    amount: parseFloat(amount),
    date,
    note: note || '',
  };
  const all = await savingsGetAll();
  await savingsSaveAll([item, ...all]);
  return item;
};

export const deleteSaving = async (id) => {
  const idNum = Number(id);
  const all = await savingsGetAll();
  const updated = all.filter((s) => Number(s.id) !== idNum);
  await savingsSaveAll(updated);
  return updated;
};
