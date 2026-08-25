/**
 * Navigation
 *
 * Root navigator:
 *   - First launch       → WalkthroughScreen (full-screen, blocks nav)
 *   - Not signed in      → AuthStack (SignIn only)
 *   - Signed in          → MainTabs (Home, Profiles, History, Settings) + modal stacks
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, FontSizes } from '../theme';
import { useAuth } from '../auth/AuthContext';

// Screens
import SignInScreen      from '../screens/Auth/SignInScreen';
import HomeScreen        from '../screens/Home/HomeScreen';
import ProfilesScreen    from '../screens/Profiles/ProfilesScreen';
import HistoryScreen     from '../screens/History/HistoryScreen';
import SettingsScreen    from '../screens/Settings/SettingsScreen';
import PricingScreen     from '../screens/Pricing/PricingScreen';
import WalkthroughScreen from '../screens/WalkthroughScreen';

const WALKTHROUGH_KEY = 'walkthrough_done';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab icon component ────────────────────────────────────────────────────────
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={tabStyles.item}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{icon}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  item: {
    alignItems:  'center',
    gap:         2,
    paddingTop:  Platform.OS === 'ios' ? 6 : 4,
  },
  icon: {
    fontSize:   18,
    color:      Colors.textMut,
  },
  iconActive: {
    color: Colors.accent,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs - 1,
    color:      Colors.textMut,
  },
  labelActive: {
    color: Colors.accent,
  },
});

// ── Main tab navigator ────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:     false,
        tabBarStyle: {
          backgroundColor:   Colors.bgBase,
          borderTopColor:    Colors.border,
          borderTopWidth:    1,
          height:            Platform.OS === 'ios' ? 82 : 60,
          paddingBottom:     Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabIcon icon="∅" label="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profiles"
        component={ProfilesScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabIcon icon="◈" label="profiles" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabIcon icon="🕐" label="history" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabIcon icon="⚙" label="settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}

// ── Root stack (includes modal screens over tabs) ─────────────────────────────
function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Walkthrough"
        component={WalkthroughScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();

  // null = still reading AsyncStorage
  const [walkthroughDone, setWalkthroughDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WALKTHROUGH_KEY).then((val) => {
      setWalkthroughDone(val === '1');
    });
  }, []);

  const handleWalkthroughDone = async () => {
    await AsyncStorage.setItem(WALKTHROUGH_KEY, '1');
    setWalkthroughDone(true);
  };

  // Wait for both auth restore and storage read before rendering anything
  if (isLoading || walkthroughDone === null) return null;

  // First launch — show walkthrough before NavigationContainer
  if (!walkthroughDone) {
    return <WalkthroughScreen onDone={handleWalkthroughDone} />;
  }

  return (
    <NavigationContainer>
      {isSignedIn ? <RootStack /> : <AuthStack />}
    </NavigationContainer>
  );
}