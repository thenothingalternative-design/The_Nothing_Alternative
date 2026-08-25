/**
 * BlockedScreen
 *
 * Shown inside the browser's custom tab / WebView when a domain is blocked.
 * Since we return NXDOMAIN from the VPN, the browser shows an error —
 * but we also catch the navigation event in any in-app WebView and render
 * this screen instead for a cleaner experience.
 *
 * For external browsers (Chrome etc.), the NXDOMAIN is enough to block.
 * This screen is primarily for any in-app WebView usage.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useSession } from '../auth/SessionContext';

interface Props {
  blockedDomain?: string;
  onDismiss?: () => void;
}

export function BlockedScreen({ blockedDomain, onDismiss }: Props) {
  const { goal } = useSession();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* App mark */}
        <View style={styles.iconWrap}>
          <Text style={styles.appMark}>∅</Text>
        </View>

        <Text style={styles.title}>Site blocked</Text>

        {blockedDomain ? (
          <View style={styles.domainPill}>
            <Text style={styles.domainText}>{blockedDomain}</Text>
          </View>
        ) : null}

        <Text style={styles.body}>
          {goal
            ? `You're focusing on "${goal}".`
            : 'A focus session is active.'}
          {'\n'}Come back when you're done.
        </Text>

        {onDismiss ? (
          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.buttonText}>← Go back</Text>
          </TouchableOpacity>
        ) : null}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#0A0A0A',
    justifyContent:  'center',
    alignItems:      'center',
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
    fontSize:  34,
    color:     '#3a3aff',
    lineHeight: 40,
  },

  title: {
    fontSize:      22,
    fontWeight:    '700',
    color:         '#ffffff',
    letterSpacing: -0.4,
    fontFamily:    'DMSans_700Bold',
  },

  // Blocked domain chip
  domainPill: {
    backgroundColor: '#1c1c22',
    borderWidth:     1,
    borderColor:     '#2a2a2e',
    borderRadius:    99,
    paddingHorizontal: 14,
    paddingVertical:    5,
  },
  domainText: {
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
