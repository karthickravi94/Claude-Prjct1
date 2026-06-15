import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../utils/storage';
import Button from '../components/ui/Button';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, shadows, radius, typography } from '../theme';

// Input field with animated focus border
function Field({ label, icon, value, onChangeText, secureEntry, rightSlot, ...props }) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [colors.border, colors.violet],
  });
  const bgColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [colors.surface2, colors.surface2],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={S.fieldLabel}>{label}</Text>
      <Animated.View style={[S.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? colors.violet : colors.textMuted}
          style={S.inputIcon}
        />
        <TextInput
          style={S.input}
          value={value}
          onChangeText={onChangeText}
          selectionColor={colors.violet}
          secureTextEntry={secureEntry}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        />
        {rightSlot}
      </Animated.View>
    </View>
  );
}

export default function LoginScreen({ onLogin, onGoSignup }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await signIn(email.trim(), password);
      onLogin(data.user);
    } catch (e) {
      setError(e.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={S.container}
        contentContainerStyle={S.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={S.hero}>
          <View style={S.heroBubble1} />
          <View style={S.heroBubble2} />
          <View style={S.heroBubble3} />
          <View style={S.heroIcon}>
            <Ionicons name="wallet" size={38} color={colors.violet} />
          </View>
          <Text style={S.heroTitle}>EXPNS</Text>
          <Text style={S.heroSub}>Track every dollar, own your future.</Text>
        </View>

        {/* Form card */}
        <FadeSlideIn delay={100} dy={30}>
          <View style={S.form}>
            <Text style={S.formTitle}>Welcome back</Text>
            <Text style={S.formSub}>Sign in to your account</Text>

            {error ? (
              <FadeSlideIn dy={-4}>
                <View style={S.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <Text style={S.errorText}>{error}</Text>
                </View>
              </FadeSlideIn>
            ) : null}

            <Field
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textDisabled}
              secureEntry={!showPw}
              rightSlot={
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={S.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              }
            />

            <Button
              variant="primary"
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 8 }}
            />

            <View style={S.divider}>
              <View style={S.divLine} />
              <Text style={S.divText}>or</Text>
              <View style={S.divLine} />
            </View>

            <TouchableOpacity style={S.linkBtn} onPress={onGoSignup} activeOpacity={0.7}>
              <Text style={S.linkText}>
                Don't have an account?{'  '}
                <Text style={S.linkAccent}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </FadeSlideIn>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { flexGrow: 1 },

  hero: {
    height: 280, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
    backgroundColor: '#0f1117',
  },
  heroBubble1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(0,201,167,0.06)', top: -70, right: -60,
  },
  heroBubble2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(0,201,167,0.04)', bottom: -50, left: -30,
  },
  heroBubble3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,201,167,0.08)', top: 30, right: 80,
  },
  heroIcon: {
    width: 82, height: 82, borderRadius: radius.xl,
    backgroundColor: 'rgba(0,201,167,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,201,167,0.3)',
  },
  heroTitle: { ...typography.h1, color: colors.textPrimary, letterSpacing: 4 },
  heroSub:   { ...typography.body, color: colors.textMuted, marginTop: 6 },

  form: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28, paddingTop: 32,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  formTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  formSub:   { ...typography.body, color: colors.textMuted, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: colors.errorBorder,
  },
  errorText: { ...typography.captionMedium, color: colors.error, flex: 1 },

  fieldLabel: { ...typography.captionBold, color: colors.textPrimary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 14, borderWidth: 1.5,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, ...typography.body,
    color: colors.textPrimary, paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },

  divider:  { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divLine:  { flex: 1, height: 1, backgroundColor: colors.border },
  divText:  { ...typography.caption, color: colors.textMuted, marginHorizontal: 12 },

  linkBtn:   { alignItems: 'center', paddingVertical: 8 },
  linkText:  { ...typography.body, color: colors.textMuted },
  linkAccent:{ ...typography.subtitle, color: colors.violet },
});
