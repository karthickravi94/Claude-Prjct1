import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@expenses';

export const getExpenses = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
};

export const saveExpenses = async (expenses) => {
  try {
    const json = JSON.stringify(expenses);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('Error saving expenses:', error);
  }
};

export const addExpense = async (expense) => {
  try {
    const expenses = await getExpenses();
    const newExpense = {
      id: Date.now().toString(),
      category: expense.category,
      amount: parseFloat(expense.amount),
      date: expense.date,
      note: expense.note || '',
    };
    const updated = [newExpense, ...expenses];
    await saveExpenses(updated);
    return newExpense;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    const expenses = await getExpenses();
    const updated = expenses.filter((e) => e.id !== id);
    await saveExpenses(updated);
    return updated;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};
