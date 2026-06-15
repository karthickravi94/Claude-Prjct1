import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, TextInput, Alert, Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getExpenses, deleteExpense, CATEGORIES, signOut, getCurrentUser } from '../utils/storage';
import Shimmer from '../components/ui/Shimmer';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, radius, typography } from '../theme';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const fmtCompact = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

const fmtDate = (s) => {
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return s; }
};

const getCatMeta = (label) =>
  CATEGORIES.find(c => c.label === label) || CATEGORIES[CATEGORIES.length - 1];

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ data, size = 110, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.total, 0);
  let cumulative = 0;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={thickness}
      />
      {data.map((item, i) => {
        const segLen = (item.total / total) * circumference;
        const angle = (cumulative / circumference) * 360 - 90;
        cumulative += segLen;
        return (
          <Circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={item.color}
            strokeWidth={thickness}
            strokeDasharray={[segLen - 1.5, circumference]}
            strokeDashoffset={0}
            rotation={angle}
            originX={cx}
            originY={cy}
          />
        );
      })}
    </Svg>
  );
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function SpendingBar({ total, maxBar, label, isCurrent, delay }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const target = total > 0 ? Math.max((total / maxBar) * 80, 6) : 4;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: target, duration: 600, delay, useNativeDriver: false,
    }).start();
  }, [total, maxBar]);

  return (
    <View style={S.barCol}>
      <Text style={S.barAmt}>{total > 0 ? fmtCompact(total) : ''}</Text>
      <View style={S.barTrack}>
        <Animated.View style={[S.barFill, {
          height: heightAnim,
          backgroundColor: isCurrent ? colors.violet : 'rgba(0,201,167,0.18)',
        }]} />
      </View>
      <Text style={[S.barLabel, isCurrent && S.barLabelOn]}>{label}</Text>
    </View>
  );
}

// ─── Category Progress Bar ────────────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0 }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 700, delay, useNativeDriver: false,
    }).start();
  }, [pct]);
  const width = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: 3, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ item, onDelete, showBorder }) {
  const meta = getCatMeta(item.category);
  return (
    <View style={[S.txRow, showBorder && S.txBorder]}>
      <View style={[S.txIcon, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon} size={17} color={meta.color} />
      </View>
      <View style={S.txBody}>
        <Text style={S.txTitle} numberOfLines={1}>{item.note || item.category}</Text>
        <Text style={S.txSub}>{item.category}</Text>
      </View>
      <View style={S.txRight}>
        <Text style={S.txAmt}>{fmt(item.amount)}</Text>
        <Text style={S.txDate}>{fmtDate(item.date)}</Text>
      </View>
      <TouchableOpacity style={S.txClose} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={13} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChangeText }) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const onFocus = () => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start(); };
  const onBlur  = () => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(); };
  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.violet] });
  return (
    <Animated.View style={[S.searchBar, { borderColor }]}>
      <Ionicons name="search-outline" size={16} color={focused ? colors.violet : colors.textMuted} style={{ marginRight: 8 }} />
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
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Month', 'Year'];

export default function DashboardScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      const [exp] = await Promise.all([getExpenses(), getCurrentUser()]);
      setExpenses([...exp].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
      setFocusKey(k => k + 1);
    };
    load();
  }, []));

  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();

  const monthly = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === cy && d.getMonth() === cm;
  });
  const total   = monthly.reduce((s, e) => s + e.amount, 0);
  const txCount = monthly.length;

  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(cy, cm - (5 - i), 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const t = expenses
      .filter(e => { const ed = new Date(e.date); return ed.getFullYear() === y && ed.getMonth() === m; })
      .reduce((s, e) => s + e.amount, 0);
    return { label: MONTH_SHORT[m], total: t, isCurrent: m === cm && y === cy };
  });
  const maxBar = Math.max(...last6.map(m => m.total), 1);

  const byCategory = CATEGORIES.map(c => ({
    ...c, total: monthly.filter(e => e.category === c.label).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const maxCat = byCategory[0]?.total || 1;

  const handleDelete = async (id) => {
    const confirm = () => deleteExpense(id)
      .then(() => setExpenses(prev => prev.filter(e => e.id !== id)))
      .catch(() => {});

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this expense?')) confirm();
      return;
    }
    Alert.alert('Delete', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirm },
    ]);
  };

  // Transactions tab filtered list
  const txFiltered = expenses.filter(e => {
    if (filter === 'Month') {
      const d = new Date(e.date);
      if (d.getFullYear() !== cy || d.getMonth() !== cm) return false;
    } else if (filter === 'Year') {
      if (new Date(e.date).getFullYear() !== cy) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.category.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q);
    }
    return true;
  });
  const txTotal = txFiltered.reduce((s, e) => s + e.amount, 0);

  const monthLabel = MONTH_SHORT[cm] + ' ' + cy;

  if (loading) {
    return (
      <ScrollView style={S.container} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20, paddingTop: 56 }}>
          <Shimmer w={180} h={16} r={8} style={{ marginBottom: 24 }} />
          <Shimmer w="100%" h={148} r={24} style={{ marginBottom: 16 }} />
          <Shimmer w="100%" h={36} r={12} style={{ marginBottom: 16 }} />
          <Shimmer w="100%" h={180} r={20} style={{ marginBottom: 16 }} />
          <Shimmer w="100%" h={160} r={20} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={S.container}
      contentContainerStyle={S.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <FadeSlideIn delay={0} trigger={focusKey}>
        <View style={S.header}>
          <View style={S.headerLeft}>
            <View style={S.walletBadge}>
              <Ionicons name="wallet" size={15} color={colors.violet} />
            </View>
            <Text style={S.appName}>EXPNS</Text>
            <Text style={S.headerSlash}>/ {monthLabel.toLowerCase()}</Text>
          </View>
          <View style={S.headerRight}>
            <TouchableOpacity
              style={S.savingsBtn}
              onPress={() => navigation.navigate('Savings')}
              activeOpacity={0.75}
            >
              <Ionicons name="trending-up-outline" size={17} color={colors.violet} />
            </TouchableOpacity>
            <TouchableOpacity
              style={S.addBtn}
              onPress={() => navigation.navigate('AddExpense')}
              activeOpacity={0.82}
            >
              <Ionicons name="add" size={20} color="#08090d" />
            </TouchableOpacity>
            <TouchableOpacity style={S.signOutBtn} onPress={signOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </FadeSlideIn>

      {/* ── Hero Card ── */}
      <FadeSlideIn delay={60} trigger={focusKey}>
        <LinearGradient
          colors={['#0f1117', '#161a26']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.heroCard}
        >
          <Text style={S.heroLabel}>Total Spent · {monthLabel}</Text>
          <Text style={S.heroAmt}>{fmt(total)}</Text>
          <Text style={S.heroCount}>{txCount} transactions</Text>
          {byCategory.length > 0 && (
            <View style={S.catDots}>
              {byCategory.map(c => (
                <View key={c.label} style={[S.catDot, { backgroundColor: c.color + '22' }]}>
                  <Ionicons name={c.icon} size={11} color={c.color} />
                  <Text style={[S.catDotText, { color: c.color }]}>{fmtCompact(c.total)}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </FadeSlideIn>

      {/* ── Tab Selector ── */}
      <FadeSlideIn delay={100} trigger={focusKey}>
        <View style={S.tabRow}>
          {(['overview', 'transactions']).map(t => (
            <TouchableOpacity
              key={t}
              style={[S.tabBtn, tab === t && S.tabBtnOn]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[S.tabText, tab === t && S.tabTextOn]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FadeSlideIn>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {tab === 'overview' && (
        <>
          {/* 6-Month Trend */}
          <FadeSlideIn delay={140} trigger={focusKey}>
            <View style={S.card}>
              <Text style={S.cardEye}>6-MONTH TREND</Text>
              <View style={S.barsWrap}>
                {last6.map((m, i) => (
                  <SpendingBar
                    key={m.label} total={m.total} maxBar={maxBar}
                    label={m.label} isCurrent={m.isCurrent} delay={i * 60}
                  />
                ))}
              </View>
            </View>
          </FadeSlideIn>

          {/* By Category */}
          {byCategory.length > 0 && (
            <FadeSlideIn delay={200} trigger={focusKey}>
              <View style={S.card}>
                <Text style={S.cardEye}>BY CATEGORY</Text>
                <View style={S.catSection}>
                  <DonutChart data={byCategory} size={110} thickness={22} />
                  <View style={S.catList}>
                    {byCategory.map(cat => (
                      <View key={cat.label} style={S.catListRow}>
                        <View style={[S.catDotSmall, { backgroundColor: cat.color }]} />
                        <Text style={S.catListName} numberOfLines={1}>{cat.label}</Text>
                        <Text style={S.catListAmt}>{fmtCompact(cat.total)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {/* Category bars */}
                <View style={{ marginTop: 16 }}>
                  {byCategory.map((cat, idx) => (
                    <View key={cat.label} style={[S.catBarRow, idx < byCategory.length - 1 && S.catBarBorder]}>
                      <View style={[S.catBarIcon, { backgroundColor: cat.color + '22' }]}>
                        <Ionicons name={cat.icon} size={16} color={cat.color} />
                      </View>
                      <View style={S.catBarBody}>
                        <View style={S.catBarHead}>
                          <Text style={S.catBarName}>{cat.label}</Text>
                          <Text style={S.catBarAmt}>{fmtCompact(cat.total)}</Text>
                        </View>
                        <AnimatedBar pct={cat.total / maxCat} color={cat.color} delay={idx * 80 + 200} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </FadeSlideIn>
          )}

          {/* Recent */}
          <FadeSlideIn delay={260} trigger={focusKey}>
            <View style={[S.card, { padding: 0 }]}>
              <View style={S.recentHead}>
                <Text style={S.cardEye}>RECENT</Text>
                {expenses.length > 5 && (
                  <TouchableOpacity onPress={() => setTab('transactions')} activeOpacity={0.7}>
                    <Text style={S.viewAll}>View all {expenses.length} →</Text>
                  </TouchableOpacity>
                )}
              </View>
              {expenses.length === 0 ? (
                <View style={S.emptyWrap}>
                  <Ionicons name="wallet-outline" size={28} color={colors.textMuted} style={{ opacity: 0.35 }} />
                  <Text style={S.emptyText}>No expenses yet</Text>
                </View>
              ) : (
                expenses.slice(0, 5).map((item, idx) => (
                  <TxRow
                    key={String(item.id)}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                    showBorder={idx > 0}
                  />
                ))
              )}
            </View>
          </FadeSlideIn>
        </>
      )}

      {/* ══════════ TRANSACTIONS TAB ══════════ */}
      {tab === 'transactions' && (
        <FadeSlideIn delay={120} trigger={tab}>
          {/* Search */}
          <SearchBar value={search} onChangeText={setSearch} />

          {/* Filters + total */}
          <View style={S.filterRow}>
            <View style={S.filterGroup}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[S.filterBtn, filter === f && S.filterBtnOn]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[S.filterText, filter === f && S.filterTextOn]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={S.totalPill}>
              <Text style={S.totalPillText}>{fmt(txTotal)}</Text>
            </View>
          </View>

          {txFiltered.length === 0 ? (
            <View style={S.emptyWrap}>
              <Ionicons name="wallet-outline" size={42} color={colors.textMuted} style={{ opacity: 0.35, marginBottom: 12 }} />
              <Text style={S.emptyTitle}>{search ? 'No results' : 'No Transactions'}</Text>
              <Text style={S.emptySub}>{search ? 'Try a different search.' : 'Tap + to add an expense.'}</Text>
            </View>
          ) : (
            <View style={[S.card, { padding: 0, marginTop: 4 }]}>
              {txFiltered.map((item, idx) => (
                <TxRow
                  key={String(item.id)}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  showBorder={idx > 0}
                />
              ))}
            </View>
          )}
        </FadeSlideIn>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { paddingBottom: 110 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletBadge: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(0,201,167,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  appName:    { ...typography.label, color: colors.textPrimary, fontSize: 14, letterSpacing: 3 },
  headerSlash:{ ...typography.caption, color: colors.textMuted },
  savingsBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(0,201,167,0.12)', borderWidth: 1, borderColor: 'rgba(0,201,167,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  heroCard: {
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,201,167,0.15)',
    shadowColor: '#00c9a7', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
    overflow: 'hidden',
  },
  heroLabel:  { ...typography.label, color: colors.textMuted, marginBottom: 6 },
  heroAmt:    { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 38, color: colors.violet, letterSpacing: -1.5, marginBottom: 4 },
  heroCount:  { ...typography.caption, color: colors.textMuted, marginBottom: 12 },
  catDots:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catDot:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  catDotText: { fontSize: 11, fontFamily: 'JetBrainsMono_600SemiBold' },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14,
  },
  tabBtn:   { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabBtnOn: { borderBottomColor: colors.violet },
  tabText:  { ...typography.label, color: colors.textMuted, fontSize: 11, letterSpacing: 1.5 },
  tabTextOn:{ ...typography.label, color: colors.textPrimary, fontSize: 11, letterSpacing: 1.5 },

  // Shared card
  card: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  cardEye: { ...typography.label, color: colors.textMuted, marginBottom: 14 },

  // Bar chart
  barsWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 },
  barCol:   { flex: 1, alignItems: 'center' },
  barAmt:   { fontSize: 7, color: colors.textMuted, marginBottom: 4, textAlign: 'center' },
  barTrack: { width: 20, height: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:  { width: '100%', borderRadius: 5 },
  barLabel: { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 6 },
  barLabelOn: { color: colors.violet },

  // Category section (donut + list)
  catSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  catList:    { flex: 1 },
  catListRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catDotSmall:{ width: 7, height: 7, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  catListName:{ ...typography.caption, color: colors.textMuted, flex: 1 },
  catListAmt: { ...typography.captionBold, color: colors.textPrimary },

  // Category bars
  catBarRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catBarBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  catBarIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catBarBody:   { flex: 1 },
  catBarHead:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catBarName:   { ...typography.captionMedium, color: colors.textPrimary },
  catBarAmt:    { ...typography.captionBold, color: colors.textPrimary },

  // Recent header
  recentHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 2,
  },
  viewAll: { ...typography.caption, color: colors.violet },

  // Transaction row
  txRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  txBorder:{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  txIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  txBody:  { flex: 1, minWidth: 0 },
  txTitle: { ...typography.captionMedium, color: colors.textPrimary },
  txSub:   { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', marginRight: 8 },
  txAmt:   { ...typography.captionBold, color: colors.textPrimary },
  txDate:  { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txClose: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText:  { ...typography.captionMedium, color: colors.textMuted },
  emptyTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 4 },
  emptySub:   { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  // Transactions tab
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: 12,
    marginHorizontal: 20, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, padding: 0 },

  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  filterGroup:{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, gap: 2, borderWidth: 1, borderColor: colors.border },
  filterBtn:  { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  filterBtnOn:{ backgroundColor: colors.violet },
  filterText: { ...typography.captionMedium, color: colors.textMuted },
  filterTextOn:{ ...typography.captionBold, color: '#0f1117' },
  totalPill:  { marginLeft: 'auto', backgroundColor: colors.violetTint2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: colors.borderStrong },
  totalPillText: { ...typography.captionBold, color: colors.violet },
});
