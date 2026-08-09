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
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>App blocked</Text>
        {appLabel ? (
          <Text style={styles.domain}>{appLabel}</Text>
        ) : null}
        <Text style={styles.body}>
          This app is blocked during your focus session
          {goal ? `: "${goal}"` : ''}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onDismiss}>
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon:       { fontSize: 48, marginBottom: 24 },
  title:      { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 },
  domain:     { fontSize: 14, color: '#666666', marginBottom: 16, fontFamily: 'monospace' },
  body:       { fontSize: 15, color: '#888888', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button:     { backgroundColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2A2A2A' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});