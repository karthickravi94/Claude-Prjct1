import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { addExpense, CATEGORIES } from '../utils/storage';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddExpenseScreen() {
  const [category, setCategory] = useState(CATEGORIES[2].label); // Food
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const resetForm = () => {
    setCategory('Food');
    setAmount('');
    setDate(getTodayString());
    setNote('');
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Invalid Date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({ category, amount: parsedAmount, date, note });
      resetForm();
      showMessage('Expense added successfully!', 'success');
    } catch (error) {
      showMessage('Failed to save expense. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New Expense</Text>
        {message ? (
          <View style={[styles.messageBox, messageType === 'success' ? styles.successBox : styles.errorBox]}>
            <Text style={[styles.messageText, messageType === 'success' ? styles.successText : styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : null}

        {/* Category Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[
                    styles.pill,
                    { borderColor: cat.color },
                    isSelected && { backgroundColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pillIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? '#fff' : cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Amount Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <View style={styles.dollarBox}>
              <Text style={styles.dollarSign}>$</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#bbb"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Date Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2024-01-31"
            placeholderTextColor="#bbb"
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
        </View>

        {/* Note Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Add a note..."
            placeholderTextColor="#bbb"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Saving...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsContainer: {
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
  },
  pillIcon: {
    fontSize: 15,
    marginRight: 5,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  dollarBox: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dollarSign: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  messageBox: {
    backgroundColor: '#EFF7FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C6E0FF',
  },
  successBox: {
    backgroundColor: '#E8F6EF',
    borderColor: '#7FD1A7',
  },
  errorBox: {
    backgroundColor: '#FDECEA',
    borderColor: '#F1A6A0',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successText: {
    color: '#1B6E37',
  },
  errorText: {
    color: '#A33A3A',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
