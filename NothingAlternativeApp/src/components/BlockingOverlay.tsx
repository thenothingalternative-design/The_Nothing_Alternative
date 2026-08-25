/**
 * BlockingOverlay
 *
 * Full-screen overlay shown when the Kotlin service detects a blocked app
 * and emits "ShowBlockingOverlay" with the package name.
 *
 * The service already sent the user home before this renders, so "Go back"
 * only needs to clear the overlay state — no MinimizeApp module needed.
 *
 * iOS/Windows/Mac: this component returns null (Android-only concern).
 * The prop interface is intentionally simple so future platform variants
 * can share the same call site in App.tsx unchanged.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  AppState,
  Platform,
} from 'react-native';
import { useSession } from '../auth/SessionContext';

interface Props {
  visible:    boolean;
  blockedApp: string;   // raw package name e.g. "com.instagram.android"
  onDismiss:  () => void;
}

export default function BlockingOverlay({ visible, blockedApp, onDismiss }: Props) {
  const { goal } = useSession();

  // Hardware back — user is already on home screen, just clear the overlay
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  // Auto-dismiss when user navigates back to this app
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') onDismiss();
    });
    return () => sub.remove();
  }, [visible]);

  if (!visible || Platform.OS !== 'android') return null;

  // "com.instagram.android" → "instagram"
  const appLabel = blockedApp.split('.').slice(-2, -1)[0] ?? blockedApp;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View style={styles.inner}>

        {/* App mark */}
        <View style={styles.iconWrap}>
          <Text style={styles.appMark}>∅</Text>
        </View>

        <Text style={styles.title}>App blocked</Text>

        {appLabel ? (
          <View style={styles.appPill}>
            <Text style={styles.appLabel}>{appLabel}</Text>
          </View>
        ) : null}

        <Text style={styles.body}>
          {goal
            ? `You're focusing on "${goal}".`
            : 'A focus session is active.'}
          {'\n'}Come back when you're done.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={styles.buttonText}>← Go back</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          9999,
    elevation:       9999,
  },
  inner: {
    alignItems:        'center',
    paddingHorizontal: 40,
    gap:               16,
  },

  // App mark
  iconWrap: {
    width:           72,
    height:          72,
    borderRadius:    18,
    backgroundColor: '#16161a',
    borderWidth:     1,
    borderColor:     '#2a2a2e',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    8,
  },
  appMark: {
    fontSize:   34,
    color:      '#3a3aff',
    lineHeight: 40,
  },

  title: {
    fontSize:      22,
    fontWeight:    '700',
    color:         '#ffffff',
    letterSpacing: -0.4,
    fontFamily:    'DMSans_700Bold',
  },

  // Blocked app chip
  appPill: {
    backgroundColor:   '#1c1c22',
    borderWidth:       1,
    borderColor:       '#2a2a2e',
    borderRadius:      99,
    paddingHorizontal: 14,
    paddingVertical:   5,
  },
  appLabel: {
    fontSize:   13,
    color:      '#8888aa',
    fontFamily: 'DMSans_400Regular',
  },

  body: {
    fontSize:   15,
    color:      '#8888aa',
    textAlign:  'center',
    lineHeight: 23,
    fontFamily: 'DMSans_400Regular',
  },

  // Accent button
  button: {
    marginTop:         8,
    backgroundColor:   '#3a3aff',
    paddingHorizontal: 28,
    paddingVertical:   12,
    borderRadius:      10,
  },
  buttonText: {
    color:      '#ffffff',
    fontSize:   15,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
});