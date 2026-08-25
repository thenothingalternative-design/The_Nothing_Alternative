/**
 * PricingScreen
 * Three-card layout: Monthly · Yearly (highlighted) · Lifetime
 * Tapping a plan triggers Google Play billing via RevenueCat.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../../theme';
import { Divider } from '../../components';
import { getOfferings, purchasePackage, restorePurchases } from '../../api/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const PLANS = [
  {
    plan:      'monthly' as const,
    name:      'Monthly',
    price:     '$4.99',
    period:    'per month',
    detail:    'Billed monthly.\nCancel anytime.',
    badge:     null,
    featured:  false,
    btnColor:  Colors.accent,
  },
  {
    plan:      'yearly' as const,
    name:      'Yearly',
    price:     '$39.99',
    period:    'per year',
    detail:    'Just $3.33/month.\nSave 33% vs monthly.',
    badge:     'BEST VALUE',
    featured:  true,
    btnColor:  Colors.accent,
  },
  {
    plan:      'lifetime' as const,
    name:      'Lifetime',
    price:     '$99.99',
    period:    'one-time',
    detail:    'Pay once, own forever.\nNo recurring charges.',
    badge:     null,
    featured:  false,
    btnColor:  '#336633',
  },
];

export default function PricingScreen() {
  const navigation = useNavigation();
  const [loading,  setLoading]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});

  // Load RC offerings on mount
  React.useEffect(() => {
    (async () => {
      const offering = await getOfferings();
      if (!offering) return;
      const map: Record<string, PurchasesPackage> = {};
      for (const pkg of offering.availablePackages) {
        const id = pkg.product.identifier;
        if (id.includes('monthly'))  map['monthly']  = pkg;
        if (id.includes('yearly'))   map['yearly']   = pkg;
        if (id.includes('lifetime')) map['lifetime'] = pkg;
      }
      setPackages(map);
    })();
  }, []);

  const handleChoose = async (plan: 'monthly' | 'yearly' | 'lifetime') => {
    if (loading) return;
    const pkg = packages[plan];
    if (!pkg) {
      setError('Products not available yet. Please try again shortly.');
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const customerInfo = await purchasePackage(pkg);
      if (!customerInfo) throw new Error('Purchase failed. Please try again.');
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    setError(null);
    try {
      await restorePurchases();
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Restore failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade to Premium</Text>
        <View style={{ width: 28 }} />
      </View>

      <Divider />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Unlock cross-device sync, unlimited profiles, and full session history.
        </Text>

        {/* Plan cards — stacked vertically on mobile */}
        {PLANS.map(p => (
          <View
            key={p.plan}
            style={[styles.card, p.featured && styles.cardFeatured]}
          >
            {/* Badge */}
            {p.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{p.badge}</Text>
              </View>
            ) : (
              <View style={styles.badgeSpacer} />
            )}

            <View style={styles.cardInner}>
              <View style={styles.cardLeft}>
                <Text style={styles.planName}>{p.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{p.price}</Text>
                  <Text style={styles.period}>  {p.period}</Text>
                </View>
                <Text style={styles.detail}>{p.detail}</Text>
              </View>

              <TouchableOpacity
                style={[styles.chooseBtn, { backgroundColor: p.btnColor }]}
                onPress={() => handleChoose(p.plan)}
                activeOpacity={0.85}
                disabled={loading !== null}
              >
                {loading === p.plan ? (
                  <ActivityIndicator color={Colors.textPri} size="small" />
                ) : (
                  <Text style={styles.chooseBtnText}>Choose</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Error */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Restore purchases */}
        <TouchableOpacity onPress={handleRestore} disabled={loading !== null}>
          {loading === 'restore'
            ? <ActivityIndicator color={Colors.textMut} size="small" />
            : <Text style={styles.restore}>Restore purchases</Text>
          }
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          All plans include a 7-day free trial{'\n'}
          Secure payment via Google Play
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: Colors.bgBase,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
  },
  closeBtn: {
    fontFamily: Fonts.sans,
    fontSize:   FontSizes.lg,
    color:      Colors.textMut,
    width:      28,
    textAlign:  'center',
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize:   FontSizes.xl,
    color:      Colors.textPri,
  },

  content: {
    padding:    Spacing.lg,
    gap:        Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize:   FontSizes.md,
    color:      Colors.textSec,
    textAlign:  'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },

  // Card
  card: {
    backgroundColor: Colors.bgSurface,
    borderColor:     Colors.border,
    borderWidth:     1,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  cardFeatured: {
    backgroundColor: Colors.bgRaised,
    borderColor:     Colors.accent,
    borderWidth:     2,
  },
  badge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   4,
    alignSelf:       'flex-start',
    borderBottomRightRadius: Radius.sm,
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs,
    color:      Colors.textPri,
    fontWeight: 'bold',
  },
  badgeSpacer: { height: 26 },

  cardInner: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.md,
    gap:            Spacing.md,
  },
  cardLeft: { flex: 1, gap: 4 },
  planName: {
    fontFamily: Fonts.sansBold,
    fontSize:   FontSizes.md,
    color:      Colors.textPri,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  price: {
    fontFamily: Fonts.sansBold,
    fontSize:   FontSizes.h1,
    color:      Colors.textPri,
  },
  period: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs,
    color:      Colors.textMut,
  },
  detail: {
    fontFamily: Fonts.sans,
    fontSize:   FontSizes.sm,
    color:      Colors.textSec,
    lineHeight: 18,
  },

  chooseBtn: {
    paddingHorizontal: 20,
    paddingVertical:   12,
    borderRadius:      Radius.sm,
    alignItems:        'center',
    justifyContent:    'center',
    minWidth:          80,
  },
  chooseBtnText: {
    fontFamily: Fonts.sansBold,
    fontSize:   FontSizes.md,
    color:      Colors.textPri,
  },

  error: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs,
    color:      Colors.amber,
    textAlign:  'center',
    marginTop:  Spacing.sm,
  },
  restore: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs,
    color:      Colors.textMut,
    textAlign:  'center',
    marginTop:  Spacing.md,
    textDecorationLine: 'underline',
  },
  footer: {
    fontFamily: Fonts.mono,
    fontSize:   FontSizes.xs,
    color:      Colors.textMut,
    textAlign:  'center',
    lineHeight: 16,
    marginTop:  Spacing.md,
  },
});