import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, TextInput, Alert, Platform, Modal,
} from 'react-native';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getExpenses, deleteExpense, CATEGORIES, signOut, getCurrentUser,
  getCurrency, getCurrencySync, setCurrency, CURRENCIES,
} from '../utils/storage';
import FadeSlideIn from '../components/ui/FadeSlideIn';

// ─── Paperwork palette ────────────────────────────────────────────────────────
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
  body:     { fontFamily: 'JetBrainsMono_400Regular',  fontSize: 13 },
  bodyMed:  { fontFamily: 'JetBrainsMono_500Medium',   fontSize: 13 },
  label:    { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, letterSpacing: 1.8 },
  mono:     { fontFamily: 'JetBrainsMono_400Regular',  fontSize: 12 },
  monoSm:   { fontFamily: 'JetBrainsMono_400Regular',  fontSize: 11 },
};

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FILTERS = ['ALL', 'MONTH', 'YEAR'];

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
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return s; }
};

const getCatMeta = (label) =>
  CATEGORIES.find(c => c.label === label) || CATEGORIES[CATEGORIES.length - 1];

// ─── Currency Picker Modal ─────────────────────────────────────────────────────

function CurrencyModal({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={S.modalBox}>
          <Text style={S.modalTitle}>SELECT CURRENCY</Text>
          <View style={S.modalRule} />
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[S.modalRow, current.code === c.code && S.modalRowOn]}
              onPress={() => { onSelect(c); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[S.modalCode, current.code === c.code && S.modalCodeOn]}>
                {c.symbol}  {c.code}
              </Text>
              {current.code === c.code && (
                <Text style={S.modalCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── SVG Area Chart ───────────────────────────────────────────────────────────

function AreaChart({ data, cur }) {
  const [w, setW] = useState(0);
  const H     = 72;
  const PAD_T = 10;
  const n     = data.length;
  const hasData = data.some(d => d.total > 0);
  const max   = Math.max(...data.map(d => d.total), 1);

  // When no data at all, just show month labels with no chart
  if (!hasData) {
    return (
      <View style={S.chartNoData}>
        <Text style={S.chartNoDataText}>no spending recorded yet</Text>
        <View style={S.areaFooter}>
          {data.map((d, i) => (
            <View key={i} style={S.areaFooterCol}>
              <Text style={[S.areaLabel, d.isCurrent && { color: P.stamp }]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const pts = w > 0
    ? data.map((d, i) => ({
        x: (i / (n - 1)) * w,
        y: PAD_T + (1 - d.total / max) * (H - PAD_T),
      }))
    : [];

  const polyPts  = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length
    ? `M ${pts[0].x.toFixed(1)},${H} ` +
      pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L ${pts[n - 1].x.toFixed(1)},${H} Z`
    : '';

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {areaPath ? <Path d={areaPath} fill="rgba(26,58,92,0.09)" /> : null}
          {polyPts ? (
            <Polyline points={polyPts} stroke={P.tally} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
          ) : null}
          {pts.map((p, i) => (
            <Circle
              key={i}
              cx={p.x} cy={p.y}
              r={data[i].isCurrent ? 4.5 : 3}
              fill={data[i].isCurrent ? P.stamp : P.tally}
              stroke={P.paper}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      )}
      <View style={S.areaFooter}>
        {data.map((d, i) => (
          <View key={i} style={S.areaFooterCol}>
            <Text style={[S.areaLabel, d.isCurrent && { color: P.stamp }]}>{d.label}</Text>
            {d.total > 0 && (
              <Text style={[S.areaAmt, d.isCurrent && { color: P.tally }]}>
                {fmtCompactWith(d.total, cur)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

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

// ─── Transaction ledger row ───────────────────────────────────────────────────

function TxRow({ item, idx, onDelete, cur }) {
  const meta   = getCatMeta(item.category);
  const isEven = idx % 2 === 0;
  return (
    <View style={[S.txRow, isEven && S.txRowAlt]}>
      <Text style={S.txIdx}>{String(idx + 1).padStart(2, '0')}</Text>
      <View style={[S.txDot, { backgroundColor: meta.color }]} />
      <View style={S.txBody}>
        <Text style={S.txNote} numberOfLines={1}>{item.note || item.category}</Text>
        <Text style={S.txCat}>{item.category}</Text>
      </View>
      <Text style={S.txDate}>{fmtDate(item.date)}</Text>
      <Text style={S.txAmt}>{fmtWith(item.amount, cur)}</Text>
      <TouchableOpacity style={S.txDel} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={S.txDelX}>×</Text>
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

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChangeText }) {
  return (
    <View style={S.searchBar}>
      <Text style={S.searchIcon}>⌕</Text>
      <TextInput
        style={S.searchInput}
        placeholder="search transactions..."
        placeholderTextColor={P.inkGhost}
        value={value}
        onChangeText={onChangeText}
        selectionColor={P.stamp}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.6}>
          <Text style={S.searchClear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const [expenses, setExpenses]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('overview');
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState('ALL');
  const [focusKey, setFocusKey]           = useState(0);
  const [cur, setCur]                     = useState(() => getCurrencySync());
  const [showCurPicker, setShowCurPicker] = useState(false);

  // Load saved currency immediately on mount so it's correct before any data renders
  useEffect(() => {
    getCurrency().then(savedCur => setCur(savedCur));
  }, []);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      const [exp, savedCur] = await Promise.all([getExpenses(), getCurrency(), getCurrentUser()]);
      setExpenses([...exp].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setCur(savedCur);
      setLoading(false);
      setFocusKey(k => k + 1);
    };
    load();
  }, []));

  const handleCurrencySelect = async (c) => {
    setCur(c);
    await setCurrency(c.code);
  };

  const now = new Date();
  const cm  = now.getMonth();
  const cy  = now.getFullYear();

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

  const byCategory = CATEGORIES.map(c => ({
    ...c, total: monthly.filter(e => e.category === c.label).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

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

  const txFiltered = expenses.filter(e => {
    if (filter === 'MONTH') {
      const d = new Date(e.date);
      if (d.getFullYear() !== cy || d.getMonth() !== cm) return false;
    } else if (filter === 'YEAR') {
      if (new Date(e.date).getFullYear() !== cy) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.category.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q);
    }
    return true;
  });
  const txTotal = txFiltered.reduce((s, e) => s + e.amount, 0);

  const monthLabel = MONTH_SHORT[cm].toUpperCase() + ' ' + cy;

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
      keyboardShouldPersistTaps="handled"
    >
      <CurrencyModal
        visible={showCurPicker}
        current={cur}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurPicker(false)}
      />

      {/* ── Masthead ── */}
      <FadeSlideIn delay={0} trigger={focusKey}>
        <View style={S.masthead}>
          <View style={S.mastheadTop}>
            <Text style={S.mastheadTitle}>EXPNS</Text>
            <View style={S.mastheadActions}>
              {/* Currency badge */}
              <TouchableOpacity
                style={S.currencyBadge}
                onPress={() => setShowCurPicker(true)}
                activeOpacity={0.75}
              >
                <Text style={S.currencyText}>{cur.symbol} {cur.code}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.mastheadBtn}
                onPress={() => navigation.navigate('Savings')}
                activeOpacity={0.7}
              >
                <Text style={S.mastheadBtnText}>SAVINGS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.mastheadBtn, S.mastheadBtnAdd]}
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.8}
              >
                <Text style={[S.mastheadBtnText, { color: P.paper }]}>+ ADD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={signOut}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={16} color={P.inkFaint} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={S.mastheadRule} />
          <Text style={S.mastheadDate}>{monthLabel} · EXPENSE LEDGER</Text>
        </View>
      </FadeSlideIn>

      {/* ── Hero ── */}
      <FadeSlideIn delay={50} trigger={focusKey}>
        <View style={S.heroBlock}>
          <Text style={S.heroLabel}>TOTAL SPENT</Text>
          <Text style={S.heroAmt}>{fmtWith(total, cur)}</Text>
          {txCount > 0 && (
            <Text style={S.heroMetaItem}>{txCount} transaction{txCount !== 1 ? 's' : ''}</Text>
          )}
        </View>
      </FadeSlideIn>

      {/* ── Tabs ── */}
      <FadeSlideIn delay={80} trigger={focusKey}>
        <View style={S.tabStrip}>
          {(['overview', 'transactions']).map(t => (
            <TouchableOpacity
              key={t}
              style={[S.tabItem, tab === t && S.tabItemOn]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[S.tabText, tab === t && S.tabTextOn]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
        </View>
      </FadeSlideIn>

      {/* ════════ OVERVIEW ════════ */}
      {tab === 'overview' && (
        <>
          {/* Area chart — only shown when there is actual spending data */}
          {last6.some(m => m.total > 0) && (
            <FadeSlideIn delay={120} trigger={focusKey}>
              <View style={S.section}>
                <SectionHead label="MONTHLY TREND" right="6 MO." />
                <AreaChart data={last6} cur={cur} />
              </View>
            </FadeSlideIn>
          )}

          {/* By Category — pie + legend */}
          {byCategory.length > 0 && (
            <FadeSlideIn delay={180} trigger={focusKey}>
              <View style={S.section}>
                <SectionHead label="BY CATEGORY" right={monthLabel} />
                <View style={S.catSection}>
                  <PieChart data={byCategory} size={130} />
                  <View style={S.catLegend}>
                    {byCategory.map(cat => (
                      <View key={cat.label} style={S.legendRow}>
                        <View style={[S.legendDot, { backgroundColor: cat.color }]} />
                        <Text style={S.legendName} numberOfLines={1}>{cat.label}</Text>
                        <Text style={S.legendShare}>
                          {total > 0 ? ((cat.total / total) * 100).toFixed(0) : 0}%
                        </Text>
                        <Text style={S.legendAmt}>{fmtCompactWith(cat.total, cur)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={S.catFooter}>
                  <View style={S.ruleStrongLine} />
                  <View style={S.catFootRow}>
                    <Text style={S.catFootLabel}>TOTAL</Text>
                    <Text style={S.catFootAmt}>{fmtWith(total, cur)}</Text>
                  </View>
                </View>
              </View>
            </FadeSlideIn>
          )}

          {/* Recent */}
          <FadeSlideIn delay={240} trigger={focusKey}>
            <View style={S.section}>
              <SectionHead
                label="RECENT"
                right={expenses.length > 5 ? `${expenses.length} total` : undefined}
              />
              {expenses.length === 0 ? (
                <View style={S.emptyWrap}>
                  <Text style={S.emptyText}>no expenses recorded</Text>
                  <Text style={S.emptyHint}>tap ADD to record your first expense</Text>
                </View>
              ) : (
                <>
                  {expenses.slice(0, 5).map((item, idx) => (
                    <TxRow
                      key={String(item.id)}
                      item={item} idx={idx} cur={cur}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                  {expenses.length > 5 && (
                    <TouchableOpacity
                      style={S.viewAllBtn}
                      onPress={() => setTab('transactions')}
                      activeOpacity={0.7}
                    >
                      <Text style={S.viewAllText}>VIEW ALL {expenses.length} ENTRIES →</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </FadeSlideIn>
        </>
      )}

      {/* ════════ TRANSACTIONS ════════ */}
      {tab === 'transactions' && (
        <FadeSlideIn delay={100} trigger={tab}>
          <View style={S.section}>
            <SearchBar value={search} onChangeText={setSearch} />
            <View style={S.filterBar}>
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
              <Text style={S.filterTotal}>{fmtWith(txTotal, cur)}</Text>
            </View>

            {txFiltered.length > 0 && (
              <View style={S.txHeader}>
                <Text style={[S.txHCol, { width: 28 }]}>#</Text>
                <Text style={[S.txHCol, { flex: 1 }]}>DESCRIPTION</Text>
                <Text style={[S.txHCol, { width: 56 }]}>DATE</Text>
                <Text style={[S.txHCol, { width: 72, textAlign: 'right' }]}>AMOUNT</Text>
                <View style={{ width: 20 }} />
              </View>
            )}

            {txFiltered.length === 0 ? (
              <View style={S.emptyWrap}>
                <Text style={S.emptyText}>{search ? 'no results found' : 'no transactions'}</Text>
                <Text style={S.emptyHint}>
                  {search ? 'try a different search term' : 'tap ADD to record an expense'}
                </Text>
              </View>
            ) : (
              txFiltered.map((item, idx) => (
                <TxRow
                  key={String(item.id)}
                  item={item} idx={idx} cur={cur}
                  onDelete={() => handleDelete(item.id)}
                />
              ))
            )}

            {txFiltered.length > 0 && (
              <View style={S.txFooter}>
                <View style={S.ruleStrongLine} />
                <View style={S.txFootRow}>
                  <Text style={S.txFootLabel}>{txFiltered.length} ENTRIES</Text>
                  <Text style={S.txFootAmt}>{fmtWith(txTotal, cur)}</Text>
                </View>
              </View>
            )}
          </View>
        </FadeSlideIn>
      )}
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
  mastheadTitle: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 22, letterSpacing: 5, color: P.ink },
  mastheadActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mastheadBtn: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: P.ruleStrong },
  mastheadBtnAdd: { backgroundColor: P.ink, borderColor: P.ink },
  mastheadBtnText: { ...T.label, color: P.inkMid, letterSpacing: 1.2 },
  mastheadRule: { height: 2, backgroundColor: P.ink, marginBottom: 8 },
  mastheadDate: { ...T.label, color: P.inkFaint, marginBottom: 20, letterSpacing: 1.5 },

  // Currency badge
  currencyBadge: {
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: P.stamp,
    backgroundColor: 'rgba(139,32,18,0.06)',
  },
  currencyText: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 10, color: P.stamp, letterSpacing: 1 },

  // Currency modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,18,8,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: P.paper, width: 240,
    borderWidth: 1.5, borderColor: P.ink,
    paddingVertical: 4,
  },
  modalTitle: { ...T.label, color: P.inkFaint, paddingHorizontal: 16, paddingVertical: 12 },
  modalRule:  { height: 1.5, backgroundColor: P.ink, marginHorizontal: 0 },
  modalRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  modalRowOn: { backgroundColor: P.paper2 },
  modalCode:  { fontFamily: 'JetBrainsMono_500Medium', fontSize: 14, color: P.inkMid, flex: 1 },
  modalCodeOn:{ color: P.ink },
  modalCheck: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 13, color: P.stamp },

  // Hero
  heroBlock: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: P.rule },
  heroLabel: { ...T.label, color: P.inkFaint, marginBottom: 6 },
  heroAmt: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 44,
    letterSpacing: -2,
    color: P.tally,
    marginBottom: 8,
  },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaItem: { ...T.monoSm, color: P.inkFaint },
  heroMetaDot:  { ...T.monoSm, color: P.inkGhost },

  // Tabs
  tabStrip: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.rule,
    marginHorizontal: 20, marginTop: 16,
  },
  tabItem:   { paddingVertical: 10, paddingHorizontal: 2, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabItemOn: { borderBottomColor: P.stamp },
  tabText:   { ...T.label, color: P.inkFaint },
  tabTextOn: { ...T.label, color: P.ink },

  // Section
  section: {
    marginTop: 20, marginHorizontal: 20,
    borderTopWidth: 1, borderTopColor: P.ruleStrong,
    paddingTop: 14, marginBottom: 4,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionLabel: { ...T.label, color: P.ink },
  sectionRight: { ...T.label, color: P.inkFaint, letterSpacing: 1 },

  // Area chart
  chartNoData:     { paddingBottom: 8 },
  chartNoDataText: { ...T.monoSm, color: P.inkGhost, textAlign: 'center', paddingVertical: 20 },
  areaFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  areaFooterCol: { alignItems: 'center', flex: 1 },
  areaLabel: { ...T.monoSm, color: P.inkFaint, marginBottom: 2 },
  areaAmt:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 9, color: P.inkMid },

  // Category pie section
  catSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  catLegend:  { flex: 1 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  legendDot:  { width: 7, height: 7, borderRadius: 99, marginRight: 7, flexShrink: 0 },
  legendName: { ...T.monoSm, color: P.inkMid, flex: 1 },
  legendShare:{ ...T.monoSm, color: P.inkFaint, width: 30, textAlign: 'right', marginRight: 6 },
  legendAmt:  { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: P.tally, width: 44, textAlign: 'right' },

  catFooter:    { marginTop: 6 },
  ruleStrongLine:{ height: 1.5, backgroundColor: P.ink, marginBottom: 8 },
  catFootRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  catFootLabel: { ...T.label, color: P.inkMid },
  catFootAmt:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, color: P.tally },

  // Transaction rows
  txHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: P.ruleStrong,
  },
  txHCol: { ...T.label, color: P.inkFaint, fontSize: 9, letterSpacing: 1 },
  txRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txRowAlt: { backgroundColor: P.paper2, marginHorizontal: -20, paddingHorizontal: 20 },
  txIdx:    { ...T.monoSm, color: P.inkGhost, width: 20 },
  txDot:    { width: 6, height: 6, borderRadius: 99, marginRight: 8, flexShrink: 0 },
  txBody:   { flex: 1, minWidth: 0, marginRight: 8 },
  txNote:   { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, color: P.ink, marginBottom: 1 },
  txCat:    { ...T.monoSm, color: P.inkFaint },
  txDate:   { ...T.monoSm, color: P.inkFaint, width: 54 },
  txAmt:    { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12, color: P.tally, width: 72, textAlign: 'right', marginRight: 4 },
  txDel:    { width: 20, alignItems: 'center' },
  txDelX:   { ...T.body, fontSize: 15, color: P.inkGhost, lineHeight: 18 },

  txFooter:    { marginTop: 8 },
  txFootRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 },
  txFootLabel: { ...T.label, color: P.inkMid },
  txFootAmt:   { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, color: P.tally },

  viewAllBtn:  { paddingVertical: 12, borderTopWidth: 1, borderTopColor: P.rule, marginTop: 4, alignItems: 'center' },
  viewAllText: { ...T.label, color: P.stamp, letterSpacing: 1.5 },

  emptyWrap: { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyText: { ...T.body, color: P.inkMid },
  emptyHint: { ...T.monoSm, color: P.inkFaint },

  // Transactions tab
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: P.ruleStrong,
    backgroundColor: P.paper,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
  searchIcon:  { ...T.body, fontSize: 17, color: P.inkFaint, marginRight: 8, lineHeight: 20 },
  searchInput: { flex: 1, ...T.body, color: P.ink, padding: 0 },
  searchClear: { ...T.body, color: P.inkFaint, paddingLeft: 8 },

  filterBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterGroup: { flexDirection: 'row' },
  filterBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: P.rule, marginRight: -1 },
  filterBtnOn: { backgroundColor: P.stamp, borderColor: P.stamp, zIndex: 1 },
  filterText:  { ...T.label, color: P.inkFaint, fontSize: 9 },
  filterTextOn:{ ...T.label, color: P.paper, fontSize: 9 },
  filterTotal: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 13, color: P.tally },
});
