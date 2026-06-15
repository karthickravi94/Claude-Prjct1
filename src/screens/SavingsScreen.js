import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSavings, deleteSaving, SAVINGS_CATEGORIES } from '../utils/storage';
import Shimmer from '../components/ui/Shimmer';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, radius, typography } from '../theme';

const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const fmtCompact = (n) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M`
  : n >= 1000  ? `$${(n / 1000).toFixed(1)}k`
  : `$${n.toFixed(0)}`;

const fmtDate = (s) => {
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return s; }
};

const getCatMeta = (label) =>
  SAVINGS_CATEGORIES.find(c => c.label === label) || SAVINGS_CATEGORIES[SAVINGS_CATEGORIES.length - 1];

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart({ data, size = 110, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.total, 0);
  let cumulative = 0;

  return (
    <Svg width={size} height={size}>
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

// ─── Animated Category Bar ───────────────────────────────────────────────────

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

// ─── Holding Row ─────────────────────────────────────────────────────────────

function HoldingRow({ item, onDelete, showBorder }) {
  const meta = getCatMeta(item.category);
  return (
    <View style={[S.holdRow, showBorder && S.holdBorder]}>
      <View style={[S.holdIcon, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon} size={17} color={meta.color} />
      </View>
      <View style={S.holdBody}>
        <Text style={S.holdName} numberOfLines={1}>{item.name || item.category}</Text>
        <Text style={S.holdCat}>{item.category}</Text>
      </View>
      <View style={S.holdRight}>
        <Text style={S.holdAmt}>{fmt(item.amount)}</Text>
        <Text style={S.holdDate}>{fmtDate(item.date)}</Text>
      </View>
      <TouchableOpacity style={S.holdClose} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={13} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SavingsScreen({ navigation }) {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      const data = await getSavings();
      setSavings([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
      setFocusKey(k => k + 1);
    };
    load();
  }, []));

  const totalSavings = savings.reduce((s, e) => s + e.amount, 0);

  const byCategory = SAVINGS_CATEGORIES.map(c => ({
    ...c,
    total: savings.filter(s => s.category === c.label).reduce((acc, s) => acc + s.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const maxCat = byCategory[0]?.total || 1;

  const handleDelete = async (id) => {
    const confirm = () =>
      deleteSaving(id)
        .then(() => setSavings(prev => prev.filter(s => s.id !== id)))
        .catch(() => {});

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this saving?')) confirm();
      return;
    }
    Alert.alert('Remove', 'Remove this holding?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: confirm },
    ]);
  };

  if (loading) {
    return (
      <ScrollView style={S.container} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20, paddingTop: 56 }}>
          <Shimmer w={160} h={16} r={8} style={{ marginBottom: 24 }} />
          <Shimmer w="100%" h={148} r={24} style={{ marginBottom: 16 }} />
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
    >
      {/* ── Header ── */}
      <FadeSlideIn delay={0} trigger={focusKey}>
        <View style={S.header}>
          <View style={S.headerLeft}>
            <View style={S.iconBadge}>
              <Ionicons name="trending-up" size={15} color={colors.violet} />
            </View>
            <Text style={S.screenTitle}>SAVINGS</Text>
          </View>
          <TouchableOpacity
            style={S.addBtn}
            onPress={() => navigation.navigate('AddSaving')}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={20} color="#08090d" />
          </TouchableOpacity>
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
          <Text style={S.heroLabel}>Total Portfolio</Text>
          <Text style={S.heroAmt}>{fmt(totalSavings)}</Text>
          <Text style={S.heroCount}>{savings.length} {savings.length === 1 ? 'holding' : 'holdings'}</Text>
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

      {/* ── By Category ── */}
      {byCategory.length > 0 && (
        <FadeSlideIn delay={120} trigger={focusKey}>
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

      {/* ── Holdings List ── */}
      <FadeSlideIn delay={180} trigger={focusKey}>
        <View style={[S.card, { padding: 0 }]}>
          <View style={S.listHead}>
            <Text style={S.cardEye}>HOLDINGS</Text>
          </View>
          {savings.length === 0 ? (
            <View style={S.emptyWrap}>
              <Ionicons name="trending-up-outline" size={32} color={colors.textMuted} style={{ opacity: 0.35, marginBottom: 10 }} />
              <Text style={S.emptyTitle}>No savings yet</Text>
              <Text style={S.emptySub}>Tap + to add your first holding.</Text>
            </View>
          ) : (
            savings.map((item, idx) => (
              <HoldingRow
                key={String(item.id)}
                item={item}
                onDelete={() => handleDelete(item.id)}
                showBorder={idx > 0}
              />
            ))
          )}
        </View>
      </FadeSlideIn>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBadge: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(0,201,167,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  screenTitle: { ...typography.label, color: colors.textPrimary, fontSize: 14, letterSpacing: 3 },
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

  // Hero card
  heroCard: {
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,201,167,0.15)',
    shadowColor: '#00c9a7', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
    overflow: 'hidden',
  },
  heroLabel: { ...typography.label, color: colors.textMuted, marginBottom: 6 },
  heroAmt:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 38, color: colors.violet, letterSpacing: -1.5, marginBottom: 4 },
  heroCount: { ...typography.caption, color: colors.textMuted, marginBottom: 12 },
  catDots:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catDot:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  catDotText:{ fontSize: 11, fontFamily: 'JetBrainsMono_600SemiBold' },

  // Shared card
  card: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  cardEye: { ...typography.label, color: colors.textMuted, marginBottom: 14 },

  // Category breakdown
  catSection:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  catList:     { flex: 1 },
  catListRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catDotSmall: { width: 7, height: 7, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  catListName: { ...typography.caption, color: colors.textMuted, flex: 1 },
  catListAmt:  { ...typography.captionBold, color: colors.textPrimary },

  catBarRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catBarBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  catBarIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catBarBody:   { flex: 1 },
  catBarHead:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catBarName:   { ...typography.captionMedium, color: colors.textPrimary },
  catBarAmt:    { ...typography.captionBold, color: colors.textPrimary },

  // Holdings list
  listHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 2,
  },
  holdRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  holdBorder:{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  holdIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  holdBody:  { flex: 1, minWidth: 0 },
  holdName:  { ...typography.captionMedium, color: colors.textPrimary },
  holdCat:   { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  holdRight: { alignItems: 'flex-end', marginRight: 8 },
  holdAmt:   { ...typography.captionBold, color: colors.textPrimary },
  holdDate:  { ...typography.label, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  holdClose: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptySub:   { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
