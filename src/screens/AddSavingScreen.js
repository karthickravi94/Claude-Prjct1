import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addSaving, SAVINGS_CATEGORIES } from '../utils/storage';
import Button from '../components/ui/Button';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, shadows, radius, typography } from '../theme';

const { width: W } = Dimensions.get('window');
const TILE_SIZE = (W - 40 - 12 * 2) / 3;

const toDateStr = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
};

function CategoryTile({ cat, isSelected, onPress }) {
  const scale = useRef(new Animated.Value(isSelected ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.04 : 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 10,
    }).start();
  }, [isSelected]);

  return (
    <Animated.View style={{ transform: [{ scale }], width: TILE_SIZE }}>
      <TouchableOpacity
        style={[
          S.catTile,
          isSelected && { borderColor: cat.color, backgroundColor: cat.color + '18' },
        ]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={[S.catIconCircle, { backgroundColor: cat.color + (isSelected ? '33' : '1A') }]}>
          <Ionicons name={cat.icon} size={22} color={isSelected ? cat.color : colors.textMuted} />
        </View>
        <Text style={[S.catTileLabel, { color: isSelected ? cat.color : colors.textMuted }]}>
          {cat.short}
        </Text>
        {isSelected && <View style={[S.selDot, { backgroundColor: cat.color }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AddSavingScreen({ navigation }) {
  const [category, setCategory]   = useState(SAVINGS_CATEGORIES[0].label);
  const [amount, setAmount]       = useState('');
  const [name, setName]           = useState('');
  const [date, setDate]           = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const reset = () => {
    setCategory(SAVINGS_CATEGORIES[0].label);
    setAmount('');
    setName('');
    setDate(new Date());
  };

  const submit = async () => {
    const v = parseFloat(amount);
    if (!amount || isNaN(v) || v <= 0) {
      Alert.alert('Invalid Amount', 'Enter an amount greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      await addSaving({ name: name.trim(), category, amount: v, date: toDateStr(date) });
      reset();
      showToast('Saving added!', true);
      setTimeout(() => navigation.goBack(), 900);
    } catch {
      showToast('Failed to save. Try again.', false);
    } finally {
      setSubmitting(false);
    }
  };

  const selMeta = SAVINGS_CATEGORIES.find(c => c.label === category) || SAVINGS_CATEGORIES[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={S.container}
        contentContainerStyle={S.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Toast */}
        {toast && (
          <FadeSlideIn dy={-8}>
            <View style={[S.toast, toast.ok ? S.toastOk : S.toastErr]}>
              <Ionicons
                name={toast.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={16}
                color={toast.ok ? colors.success : colors.error}
                style={{ marginRight: 8 }}
              />
              <Text style={[S.toastText, { color: toast.ok ? colors.success : colors.error }]}>
                {toast.msg}
              </Text>
            </View>
          </FadeSlideIn>
        )}

        {/* Amount */}
        <FadeSlideIn delay={0}>
          <View style={S.amountSection}>
            <Text style={S.eyebrow}>AMOUNT</Text>
            <View style={S.amountRow}>
              <Text style={[S.amountCurrency, { color: amount ? colors.violet : colors.textDisabled }]}>$</Text>
              <TextInput
                style={S.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                selectionColor={colors.violet}
              />
            </View>
            <View style={[S.catBadge, { backgroundColor: selMeta.color + '20' }]}>
              <Ionicons name={selMeta.icon} size={14} color={selMeta.color} />
              <Text style={[S.catBadgeText, { color: selMeta.color }]}>{selMeta.label}</Text>
            </View>
          </View>
        </FadeSlideIn>

        {/* Name / Label */}
        <FadeSlideIn delay={60}>
          <Text style={S.sectionLabel}>NAME / LABEL</Text>
          <TextInput
            style={S.descInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. HDFC FD, Nifty 50 ETF…"
            placeholderTextColor={colors.textDisabled}
            selectionColor={colors.violet}
          />
        </FadeSlideIn>

        {/* Category grid — 3 per row */}
        <FadeSlideIn delay={120}>
          <Text style={S.sectionLabel}>CATEGORY</Text>
          <View style={S.catGrid}>
            {SAVINGS_CATEGORIES.map(cat => (
              <CategoryTile
                key={cat.label}
                cat={cat}
                isSelected={category === cat.label}
                onPress={() => setCategory(cat.label)}
              />
            ))}
          </View>
        </FadeSlideIn>

        {/* Submit */}
        <FadeSlideIn delay={180}>
          <Button
            variant="primary"
            label={submitting ? 'Saving…' : 'Add to Portfolio'}
            onPress={submit}
            loading={submitting}
            disabled={submitting}
          />
        </FadeSlideIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 20, paddingTop: 16, paddingBottom: 48 },

  toast: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, padding: 12, marginBottom: 16, borderWidth: 1,
  },
  toastOk:  { backgroundColor: colors.successLight, borderColor: colors.successBorder },
  toastErr: { backgroundColor: colors.errorLight,   borderColor: colors.errorBorder },
  toastText:{ ...typography.captionMedium },

  amountSection: {
    backgroundColor: colors.surface2,
    borderRadius: radius['2xl'],
    borderWidth: 1, borderColor: colors.border,
    padding: 20, alignItems: 'center',
    marginBottom: 20, ...shadows.sm,
  },
  eyebrow: { ...typography.label, color: colors.textMuted, marginBottom: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  amountCurrency: { ...typography.h1, marginRight: 4, lineHeight: 52 },
  amountInput: {
    fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 52,
    color: colors.textPrimary, minWidth: 120, textAlign: 'center',
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full,
  },
  catBadgeText: { ...typography.captionBold },

  sectionLabel: {
    ...typography.label, color: colors.textMuted,
    marginBottom: 12, marginLeft: 2,
  },

  descInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    ...typography.body, color: colors.textPrimary,
    marginBottom: 20,
    ...shadows.sm,
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  catTile: {
    alignItems: 'center', paddingVertical: 12,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    ...shadows.sm, position: 'relative',
  },
  catIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  catTileLabel: { ...typography.label, fontSize: 10, textAlign: 'center', textTransform: 'none' },
  selDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 3.5,
  },
});
