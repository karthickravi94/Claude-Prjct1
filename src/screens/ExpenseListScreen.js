import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, deleteExpense, CATEGORIES } from '../utils/storage';
import Shimmer from '../components/ui/Shimmer';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, shadows, radius, typography } from '../theme';

const getCategoryMeta = (label) =>
  CATEGORIES.find(c => c.label === label) || CATEGORIES[CATEGORIES.length - 1];

function groupByDate(expenses) {
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  const yest  = new Date(now); yest.setDate(now.getDate() - 1);
  const wkAgo = new Date(now); wkAgo.setDate(now.getDate() - 7);
  const b = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
  expenses.forEach(e => {
    const d = new Date(e.date + 'T00:00:00');
    if (d >= now)       b.Today.push(e);
    else if (d >= yest) b.Yesterday.push(e);
    else if (d >= wkAgo) b['This Week'].push(e);
    else                b.Earlier.push(e);
  });
  return Object.entries(b)
    .filter(([, v]) => v.length > 0)
    .map(([title, data]) => ({ title, data }));
}

const FILTERS = [
  { key: 'All',   label: 'All' },
  { key: 'Month', label: 'Month' },
  { key: 'Year',  label: 'Year' },
];

function SearchBar({ value, onChangeText }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.violet],
  });

  return (
    <Animated.View style={[S.searchBar, { borderColor }]}>
      <Ionicons name="search" size={17} color={focused ? colors.violet : colors.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        style={S.searchInput}
        placeholder="Search transactions…"
        placeholderTextColor={colors.textDisabled}
        value={value}
        onChangeText={onChangeText}
        selectionColor={colors.violet}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.6}>
          <Ionicons name="close-circle" size={17} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

function ExpenseRow({ item, isLast, onDelete }) {
  const meta   = getCategoryMeta(item.category);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: 0,  duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const fmtDate = (s) => {
    try {
      return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return s; }
  };

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateX: slideX }] }}>
      <View style={[S.cell, !isLast && S.cellBorder]}>
        <View style={[S.cellIcon, { backgroundColor: meta.color + '22' }]}>
          <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
        </View>
        <View style={S.cellBody}>
          <Text style={S.cellTitle} numberOfLines={1}>
            {item.note || item.category}
          </Text>
          <Text style={S.cellSub}>{item.category}</Text>
        </View>
        <View style={S.cellRight}>
          <Text style={S.cellAmt}>${parseFloat(item.amount).toFixed(2)}</Text>
          <Text style={S.cellDate}>{fmtDate(item.date)}</Text>
        </View>
        <TouchableOpacity
          style={S.trashBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function ExpenseListScreen() {
  const [all, setAll]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]  = useState('');
  const [filter, setFilter]  = useState('All');
  const [toast, setToast]    = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      const data = await getExpenses();
      setAll([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    };
    load();
  }, []));

  const performDelete = async (id) => {
    try {
      await deleteExpense(id);
      setAll(prev => prev.filter(item => item.id !== id));
      showToast('Expense deleted.', true);
    } catch {
      showToast('Could not delete.', false);
    }
  };

  const confirmDelete = (id, category, amount) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete $${parseFloat(amount).toFixed(2)} for ${category}?`)) performDelete(id);
      return;
    }
    Alert.alert(
      'Delete Expense',
      `Remove $${parseFloat(amount).toFixed(2)} from ${category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) },
      ]
    );
  };

  const now = new Date();
  const filtered = all.filter(e => {
    if (filter === 'Month') {
      const d = new Date(e.date);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
    } else if (filter === 'Year') {
      if (new Date(e.date).getFullYear() !== now.getFullYear()) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.category.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sections = groupByDate(filtered);
  const total    = filtered.reduce((s, e) => s + e.amount, 0);

  const renderItem = ({ item, index, section }) => (
    <ExpenseRow
      item={item}
      isLast={index === section.data.length - 1}
      onDelete={() => confirmDelete(item.id, item.category, item.amount)}
    />
  );

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={S.sectionHead}>
      <Text style={S.sectionHeadText}>{title}</Text>
      <View style={S.sectionCount}>
        <Text style={S.sectionCountText}>{data.length}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[S.container, { padding: 20, paddingTop: 16 }]}>
        <Shimmer w="100%" h={48} r={radius.md} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {FILTERS.map(f => <Shimmer key={f.key} w={80} h={36} r={radius.md} />)}
        </View>
        {[1,2,3,4,5].map(i => (
          <View key={i} style={[S.cell, { marginBottom: 2 }]}>
            <Shimmer w={44} h={44} r={14} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Shimmer w="50%" h={14} r={7} style={{ marginBottom: 8 }} />
              <Shimmer w="35%" h={11} r={6} />
            </View>
            <Shimmer w={58} h={16} r={8} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={S.container}>

      {toast && (
        <FadeSlideIn dy={-6}>
          <View style={[S.toast, toast.ok ? S.toastOk : S.toastErr]}>
            <Ionicons
              name={toast.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={15}
              color={toast.ok ? colors.success : colors.error}
              style={{ marginRight: 7 }}
            />
            <Text style={[S.toastText, { color: toast.ok ? colors.success : colors.error }]}>{toast.msg}</Text>
          </View>
        </FadeSlideIn>
      )}

      <FadeSlideIn delay={0}>
        <SearchBar value={search} onChangeText={setSearch} />
      </FadeSlideIn>

      {/* Filter chips + total */}
      <FadeSlideIn delay={60}>
        <View style={S.filterBar}>
          <View style={S.filterGroup}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[S.filterBtn, filter === f.key && S.filterBtnOn]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[S.filterText, filter === f.key && S.filterTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={S.totalBadge}>
            <Text style={S.totalBadgeText}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </FadeSlideIn>

      {filtered.length === 0 ? (
        <FadeSlideIn delay={100}>
          <View style={S.empty}>
            <Ionicons name="wallet-outline" size={52} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 16 }} />
            <Text style={S.emptyTitle}>{search ? 'No results' : 'No Transactions'}</Text>
            <Text style={S.emptySub}>
              {search ? 'Try a different search.' : 'Tap + to add your first expense.'}
            </Text>
          </View>
        </FadeSlideIn>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={S.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  toast: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 12, padding: 12,
    borderRadius: radius.md, borderWidth: 1,
  },
  toastOk:  { backgroundColor: colors.successLight, borderColor: colors.successBorder },
  toastErr: { backgroundColor: colors.errorLight,   borderColor: colors.errorBorder },
  toastText:{ ...typography.captionMedium },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: 20, marginTop: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, ...shadows.sm,
  },
  searchInput: {
    flex: 1, ...typography.body,
    color: colors.textPrimary, padding: 0,
  },

  filterBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 12, marginBottom: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md, padding: 3, gap: 2,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  filterBtn:    { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  filterBtnOn:  { backgroundColor: colors.violet },
  filterText:   { ...typography.captionMedium, color: colors.textMuted },
  filterTextOn: { ...typography.captionBold, color: '#0f1117' },

  totalBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.violetTint2,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  totalBadgeText: { ...typography.captionBold, color: colors.violet },

  listContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },

  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 2,
  },
  sectionHeadText: {
    ...typography.captionBold, color: colors.textPrimary,
    textTransform: 'uppercase', letterSpacing: 0.8, flex: 1,
  },
  sectionCount: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionCountText: { ...typography.label, fontSize: 11, color: colors.textMuted },

  cell: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: radius.lg, marginBottom: 2,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  cellBorder: {
    borderBottomWidth: 0,
    borderBottomRightRadius: 0, borderBottomLeftRadius: 0,
    shadowOpacity: 0, elevation: 0,
  },
  cellIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cellBody:  { flex: 1, minWidth: 0 },
  cellTitle: { ...typography.captionMedium, color: colors.textPrimary },
  cellSub:   { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 3 },
  cellRight: { alignItems: 'flex-end', marginRight: 8 },
  cellAmt:   { ...typography.captionBold, color: colors.violet },
  cellDate:  { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 3 },
  trashBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
  emptySub:   { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
