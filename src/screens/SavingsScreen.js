import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSavings, deleteSaving, SAVINGS_CATEGORIES,
  getCurrency, getCurrencySync, CURRENCIES,
} from '../utils/storage';
import FadeSlideIn from '../components/ui/FadeSlideIn';

// ─── Paperwork palette (shared) ───────────────────────────────────────────────
const P = {
  paper:      '#F0EAE0',
  paper2:     '#E8E0D2',
  paper3:     '#DDD4C4',
  ink:        '#1A1208',
  inkMid:     '#4A3C2C',
  inkFaint:   '#8A7A68',
  inkGhost:   '#C4B8A8',
  stamp:      '#8B2012',
  tally:      '#1A3A5C',
  rule:       '#C4B8A8',
  ruleStrong: '#A09080',
};

const T = {
  body:    { fontFamily: 'JetBrainsMono_400Regular',  fontSize: 13 },
  bodyMed: { fontFamily: 'JetBrainsMono_500Medium',   fontSize: 13 },
  label:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, letterSpacing: 1.8 },
  monoSm:  { fontFamily: 'JetBrainsMono_400Regular',  fontSize: 11 },
};

// ─── Currency-aware formatters ────────────────────────────────────────────────

const fmtWith = (n, cur) => {
  if (cur.code === 'JPY') return `${cur.symbol}${Math.round(n).toLocaleString()}`;
  if (cur.code === 'INR') return `${cur.symbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return n.toLocaleString('en-US', { style: 'currency', currency: cur.code, minimumFractionDigits: 2 });
};

const fmtCompactWith = (n, cur) => {
  if (n >= 1000000) return `${cur.symbol}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${cur.symbol}${(n / 1000).toFixed(1)}k`;
  return `${cur.symbol}${n.toFixed(0)}`;
};

const fmtDate = (s) => {
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return s; }
};

const getCatMeta = (label) =>
  SAVINGS_CATEGORIES.find(c => c.label === label) || SAVINGS_CATEGORIES[SAVINGS_CATEGORIES.length - 1];

// ─── Pie Chart ────────────────────────────────────────────────────────────────

function PieChart({ data, size = 130 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 2;
  const total = data.reduce((s, d) => s + d.total, 0);
  let startAngle = -Math.PI / 2;

  const slices = data.map(item => {
    const angle    = (item.total / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const d  = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    startAngle = endAngle;
    return { d, color: item.color };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <Path key={i} d={s.d} fill={s.color} stroke={P.paper} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

// ─── Animated fill bar ────────────────────────────────────────────────────────

function FillBar({ pct, color, delay }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 650, delay, useNativeDriver: false,
    }).start();
  }, [pct]);
  const width = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 3, backgroundColor: P.paper3, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', backgroundColor: color + 'CC' }} />
    </View>
  );
}

// ─── Holding row ─────────────────────────────────────────────────────────────

function HoldingRow({ item, idx, onDelete, cur }) {
  const meta   = getCatMeta(item.category);
  const isEven = idx % 2 === 0;
  return (
    <View style={[S.holdRow, isEven && S.holdRowAlt]}>
      <Text style={S.holdIdx}>{String(idx + 1).padStart(2, '0')}</Text>
      <View style={[S.holdDot, { backgroundColor: meta.color }]} />
      <View style={S.holdBody}>
        <Text style={S.holdName} numberOfLines={1}>{item.name || item.category}</Text>
        <Text style={S.holdCat}>{item.category}</Text>
      </View>
      <Text style={S.holdDate}>{fmtDate(item.date)}</Text>
      <Text style={S.holdAmt}>{fmtWith(item.amount, cur)}</Text>
      <TouchableOpacity style={S.holdDel} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={S.holdDelX}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Section head ─────────────────────────────────────────────────────────────

function SectionHead({ label, right }) {
  return (
    <View style={S.sectionHead}>
      <Text style={S.sectionLabel}>{label}</Text>
      {right && <Text style={S.sectionRight}>{right}</Text>}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SavingsScreen({ navigation }) {
  const [savings, setSavings]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [focusKey, setFocusKey] = useState(0);
  const [cur, setCur]           = useState(() => getCurrencySync());

  // Load saved currency immediately on mount — same session preference as Dashboard
  useEffect(() => {
    getCurrency().then(savedCur => setCur(savedCur));
  }, []);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      const [data, savedCur] = await Promise.all([getSavings(), getCurrency()]);
      setSavings([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setCur(savedCur);
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
      <View style={S.loadWrap}>
        <Text style={S.loadText}>loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={S.container}
      contentContainerStyle={S.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Masthead ── */}
      <FadeSlideIn delay={0} trigger={focusKey}>
        <View style={S.masthead}>
          <View style={S.mastheadTop}>
            <View style={S.mastheadLeft}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                style={S.backBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={S.backText}>← EXPNS</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[S.mastheadBtn, S.mastheadBtnAdd]}
              onPress={() => navigation.navigate('AddSaving')}
              activeOpacity={0.8}
            >
              <Text style={[S.mastheadBtnText, { color: P.paper }]}>+ ADD</Text>
            </TouchableOpacity>
          </View>
          <View style={S.mastheadRule} />
          <Text style={S.mastheadDate}>SAVINGS · PORTFOLIO LEDGER</Text>
        </View>
      </FadeSlideIn>

      {/* ── Hero ── */}
      <FadeSlideIn delay={50} trigger={focusKey}>
        <View style={S.heroBlock}>
          <Text style={S.heroLabel}>TOTAL PORTFOLIO</Text>
          <Text style={S.heroAmt}>{fmtWith(totalSavings, cur)}</Text>
          <View style={S.heroMeta}>
            <Text style={S.heroMetaItem}>{savings.length} {savings.length === 1 ? 'holding' : 'holdings'}</Text>
            {byCategory.length > 0 && (
              <>
                <Text style={S.heroMetaDot}>·</Text>
                <Text style={S.heroMetaItem}>{byCategory.length} categories</Text>
              </>
            )}
          </View>
        </View>
      </FadeSlideIn>

      {/* ── By Category — pie + legend ── */}
      {byCategory.length > 0 && (
        <FadeSlideIn delay={100} trigger={focusKey}>
          <View style={S.section}>
            <SectionHead label="BY CATEGORY" />
            <View style={S.catSection}>
              <PieChart data={byCategory} size={130} />
              <View style={S.catLegend}>
                {byCategory.map((cat, idx) => (
                  <View key={cat.label}>
                    <View style={S.legendRow}>
                      <View style={[S.legendDot, { backgroundColor: cat.color }]} />
                      <Text style={S.legendName} numberOfLines={1}>{cat.label}</Text>
                      <Text style={S.legendShare}>
                        {totalSavings > 0 ? ((cat.total / totalSavings) * 100).toFixed(0) : 0}%
                      </Text>
                      <Text style={S.legendAmt}>{fmtCompactWith(cat.total, cur)}</Text>
                    </View>
                    <FillBar
                      pct={cat.total / maxCat}
                      color={cat.color}
                      delay={idx * 60 + 200}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View style={S.catFooter}>
              <View style={S.ruleStrongLine} />
              <View style={S.catFootRow}>
                <Text style={S.catFootLabel}>TOTAL</Text>
                <Text style={S.catFootAmt}>{fmtWith(totalSavings, cur)}</Text>
              </View>
            </View>
          </View>
        </FadeSlideIn>
      )}

      {/* ── Holdings ledger ── */}
      <FadeSlideIn delay={160} trigger={focusKey}>
        <View style={[S.section, savings.length === 0 && S.sectionNoBorder]}>
          <SectionHead label="HOLDINGS" right={savings.length > 0 ? `${savings.length} ENTRIES` : undefined} />

          {savings.length === 0 ? (
            <View style={S.emptyWrap}>
              <Text style={S.emptyText}>no holdings recorded</Text>
              <Text style={S.emptyHint}>tap ADD to record your first saving</Text>
            </View>
          ) : (
            <>
              {/* Column header */}
              <View style={S.holdHeader}>
                <Text style={[S.holdHCol, { width: 28 }]}>#</Text>
                <Text style={[S.holdHCol, { flex: 1 }]}>NAME</Text>
                <Text style={[S.holdHCol, { width: 64 }]}>DATE</Text>
                <Text style={[S.holdHCol, { width: 80, textAlign: 'right' }]}>AMOUNT</Text>
                <View style={{ width: 20 }} />
              </View>

              {savings.map((item, idx) => (
                <HoldingRow
                  key={String(item.id)}
                  item={item} idx={idx} cur={cur}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}

              <View style={S.holdFooter}>
                <View style={S.ruleStrongLine} />
                <View style={S.holdFootRow}>
                  <Text style={S.holdFootLabel}>{savings.length} HOLDINGS</Text>
                  <Text style={S.holdFootAmt}>{fmtWith(totalSavings, cur)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </FadeSlideIn>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.paper },
  content:   { paddingBottom: 110 },

  loadWrap: { flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' },
  loadText: { ...T.body, color: P.inkFaint },

  // Masthead
  masthead: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 0 },
  mastheadTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  mastheadLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn:  { paddingVertical: 4 },
  backText: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 13, color: P.stamp, letterSpacing: 1 },
  mastheadBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: P.ruleStrong },
  mastheadBtnAdd: { backgroundColor: P.ink, borderColor: P.ink },
  mastheadBtnText:{ ...T.label, color: P.inkMid, letterSpacing: 1.2 },
  mastheadRule:   { height: 2, backgroundColor: P.ink, marginBottom: 8 },
  mastheadDate:   { ...T.label, color: P.inkFaint, marginBottom: 20, letterSpacing: 1.5 },

  // Hero
  heroBlock: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: P.rule },
  heroLabel: { ...T.label, color: P.inkFaint, marginBottom: 6 },
  heroAmt: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 44, letterSpacing: -2,
    color: P.tally, marginBottom: 8,
  },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaItem: { ...T.monoSm, color: P.inkFaint },
  heroMetaDot:  { ...T.monoSm, color: P.inkGhost },

  // Section
  section: {
    marginTop: 20, marginHorizontal: 20,
    borderTopWidth: 1, borderTopColor: P.ruleStrong,
    paddingTop: 14, marginBottom: 4,
  },
  sectionNoBorder: { borderTopWidth: 0 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionLabel: { ...T.label, color: P.ink },
  sectionRight: { ...T.label, color: P.inkFaint, letterSpacing: 1 },

  // Category pie
  catSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  catLegend:  { flex: 1 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 99, marginRight: 7, flexShrink: 0 },
  legendName: { ...T.monoSm, color: P.inkMid, flex: 1 },
  legendShare:{ ...T.monoSm, color: P.inkFaint, width: 30, textAlign: 'right', marginRight: 6 },
  legendAmt:  { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: P.tally, width: 44, textAlign: 'right' },

  catFooter:     { marginTop: 6 },
  ruleStrongLine:{ height: 1.5, backgroundColor: P.ink, marginBottom: 8 },
  catFootRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  catFootLabel:  { ...T.label, color: P.inkMid },
  catFootAmt:    { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, color: P.tally },

  // Holdings ledger
  holdHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: P.ruleStrong,
  },
  holdHCol: { ...T.label, color: P.inkFaint, fontSize: 9, letterSpacing: 1 },

  holdRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  holdRowAlt: { backgroundColor: P.paper2, marginHorizontal: -20, paddingHorizontal: 20 },
  holdIdx:    { ...T.monoSm, color: P.inkGhost, width: 20 },
  holdDot:    { width: 6, height: 6, borderRadius: 99, marginRight: 8, flexShrink: 0 },
  holdBody:   { flex: 1, minWidth: 0, marginRight: 8 },
  holdName:   { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, color: P.ink, marginBottom: 1 },
  holdCat:    { ...T.monoSm, color: P.inkFaint },
  holdDate:   { ...T.monoSm, color: P.inkFaint, width: 64 },
  holdAmt:    { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12, color: P.tally, width: 80, textAlign: 'right', marginRight: 4 },
  holdDel:    { width: 20, alignItems: 'center' },
  holdDelX:   { ...T.body, fontSize: 15, color: P.inkGhost, lineHeight: 18 },

  holdFooter:    { marginTop: 8 },
  holdFootRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 },
  holdFootLabel: { ...T.label, color: P.inkMid },
  holdFootAmt:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, color: P.tally },

  emptyWrap: { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyText: { ...T.body, color: P.inkMid },
  emptyHint: { ...T.monoSm, color: P.inkFaint },
});
