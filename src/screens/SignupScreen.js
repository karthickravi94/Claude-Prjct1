import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signUp } from '../utils/storage';
import Button from '../components/ui/Button';
import FadeSlideIn from '../components/ui/FadeSlideIn';
import { colors, shadows, radius, typography } from '../theme';

// Reusable animated focus input — same pattern as LoginScreen
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
    outputRange: [colors.border, 'rgba(255,240,220,0.18)'],
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
          color={colors.textSecondary}
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

export default function SignupScreen({ onSignup, onGoLogin }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await signUp(email.trim(), password, name.trim());
      if (data.user && !data.session) setSuccess(true);
      else if (data.session) onSignup(data.user);
      else setSuccess(true);
    } catch (e) {
      setError(e.message || 'Sign up failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <FadeSlideIn style={S.successScreen}>
        <View style={S.successIcon}>
          <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={S.successIconBg}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </LinearGradient>
        </View>
        <Text style={S.successTitle}>Check your email!</Text>
        <Text style={S.successSub}>
          We sent a confirmation link to{'\n'}
          <Text style={{ color: colors.violet, fontFamily: 'JetBrainsMono_600SemiBold' }}>{email}</Text>
          {'\n'}Click it to activate your account.
        </Text>
        <Button
          variant="primary"
          label="Go to Sign In"
          onPress={onGoLogin}
          style={{ marginTop: 32, width: '100%' }}
        />
      </FadeSlideIn>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={S.container}
        contentContainerStyle={S.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={['#8B5CF6', '#6C5CE7', '#a29bfe']} style={S.hero} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}>
          <View style={S.heroBubble1} />
          <View style={S.heroBubble2} />
          <View style={S.heroIcon}>
            <Text style={{ fontSize: 38 }}>✨</Text>
          </View>
          <Text style={S.heroTitle}>Get Started</Text>
          <Text style={S.heroSub}>Create your free account today</Text>
        </LinearGradient>

        {/* Form card */}
        <FadeSlideIn delay={100} dy={30}>
          <View style={S.form}>
            <Text style={S.formTitle}>Create account</Text>
            <Text style={S.formSub}>Join thousands tracking their spending</Text>

            {error ? (
              <FadeSlideIn dy={-4}>
                <View style={S.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
                  <Text style={S.errorText}>{error}</Text>
                </View>
              </FadeSlideIn>
            ) : null}

            <Field
              label="Full Name"
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="words"
            />

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
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.textDisabled}
              secureEntry={!showPw}
              rightSlot={
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={S.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              }
            />

            <Button
              variant="primary"
              label="Create Account"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 8 }}
            />

            <View style={S.divider}>
              <View style={S.divLine} />
              <Text style={S.divText}>or</Text>
              <View style={S.divLine} />
            </View>

            <TouchableOpacity style={S.linkBtn} onPress={onGoLogin} activeOpacity={0.7}>
              <Text style={S.linkText}>
                Already have an account?{'  '}
                <Text style={S.linkAccent}>Sign in</Text>
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
    height: 240, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  heroBubble1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)', top: -60, right: -60,
  },
  heroBubble2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -40, left: -30,
  },
  heroIcon: {
    width: 76, height: 76, borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: { ...typography.h2, color: '#fff' },
  heroSub:   { ...typography.body, color: 'rgba(255,255,255,0.78)', marginTop: 4 },

  form: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 28, paddingTop: 32,
    ...shadows.lg,
    shadowOffset: { width: 0, height: -4 },
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
    borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1.5,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, ...typography.body,
    color: colors.textPrimary, paddingVertical: 14,
    outlineStyle: 'none',
  },
  eyeBtn: { padding: 4 },

  divider:  { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine:  { flex: 1, height: 1, backgroundColor: colors.border },
  divText:  { ...typography.caption, color: colors.textMuted, marginHorizontal: 12 },

  linkBtn:   { alignItems: 'center', paddingVertical: 8 },
  linkText:  { ...typography.body, color: colors.textMuted },
  linkAccent:{ ...typography.subtitle, color: colors.violet },

  successScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, backgroundColor: colors.surface,
  },
  successIcon:   { marginBottom: 28 },
  successIconBg: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  successSub:   { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
});
