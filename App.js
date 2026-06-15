import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';

import DashboardScreen from './src/screens/DashboardScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import AddSavingScreen from './src/screens/AddSavingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { getSession, onAuthStateChange } from './src/utils/storage';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const TEAL = '#00c9a7';
const BORDER = 'rgba(255,255,255,0.07)';

const MODAL_HEADER = {
  headerShown: true,
  presentation: 'modal',
  headerStyle: { backgroundColor: '#0f1117' },
  headerShadowVisible: false,
  headerTintColor: '#e8eaf0',
  headerTitleStyle: { fontFamily: 'DMSans_700Bold', fontSize: 17 },
  headerTitleAlign: 'center',
  contentStyle: { backgroundColor: '#08090d' },
};

// Main app stack — all screens + modals
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Savings"   component={SavingsScreen} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ ...MODAL_HEADER, title: 'Add Expense' }}
      />
      <Stack.Screen
        name="AddSaving"
        component={AddSavingScreen}
        options={{ ...MODAL_HEADER, title: 'Add to Portfolio' }}
      />
    </Stack.Navigator>
  );
}

function AuthFlow({ onLogin }) {
  const [screen, setScreen] = useState('login');
  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={onLogin}
        onGoSignup={() => setScreen('signup')}
      />
    );
  }
  return (
    <SignupScreen
      onSignup={onLogin}
      onGoLogin={() => setScreen('login')}
    />
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(s => setSession(s));
    const { data } = onAuthStateChange((_event, s) => setSession(s));
    return () => data?.subscription?.unsubscribe();
  }, []);

  const onReady = useCallback(async () => {
    if ((fontsLoaded || fontError) && session !== undefined) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, session]);

  if ((!fontsLoaded && !fontError) || session === undefined) {
    return (
      <View style={S.loader}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <NavigationContainer onReady={onReady}>
      <StatusBar style="light" />
      {session ? (
        <MainStack />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth">
            {() => <AuthFlow onLogin={(user) => setSession({ user })} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const S = StyleSheet.create({
  loader: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#08090d',
  },
});
