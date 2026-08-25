/**
 * WalkthroughScreen.tsx
 *
 * Two entry paths:
 *   1. First launch — rendered directly by RootNavigator (no navigation prop).
 *      onDone() writes AsyncStorage and unmounts this screen.
 *   2. Re-open via "?" — pushed as a modal by RootStack.
 *      navigation.goBack() dismisses it; AsyncStorage is left untouched.
 */

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';

const BG_BASE   = '#0A0A0A';
const BG_RAISED = '#1c1c22';
const BORDER    = '#2a2a2e';
const ACCENT    = '#3a3aff';
const TEXT_PRI  = '#ffffff';
const TEXT_SEC  = '#8888aa';
const TEXT_MUT  = '#3a3a44';
const GREEN     = '#00e676';

interface Step {
  icon:  string;
  title: string;
  body:  string;
}

const STEPS: Step[] = [
  {
    icon:  '∅',
    title: 'Welcome to Nothing Alternative',
    body:
      'This app gives you one choice: work on what you came here to do, ' +
      'or do nothing at all. No distractions make it through.\n\n' +
      'This walkthrough covers everything in about 60 seconds.',
  },
  {
    icon:  '✎',
    title: '① Session Goal',
    body:
      'Type your goal before starting — "Finish the edit", ' +
      '"Chapter 3 draft", whatever you\'re here to do.\n\n' +
      'It\'s saved automatically so it pre-fills next time.',
  },
  {
    icon:  '◈',
    title: '② Focus Profiles',
    body:
      'Profiles let you save different app sets for different work modes. ' +
      '"Editing", "Study", "Writing", etc.\n\n' +
      'Tap the profile badge to switch or manage your profiles.',
  },
  {
    icon:  '●',
    title: '③ Allowed Apps',
    body:
      'Only apps listed here stay accessible during a session. ' +
      'Everything else is blocked automatically.\n\n' +
      'Tap  Manage →  in Settings to choose which apps are allowed.',
  },
  {
    icon:  '⊘',
    title: '④ Always Blocked',
    body:
      'Distracting sites are blocked through a local VPN during your session:\n\n' +
      '  • Social media is blocked at the network level\n' +
      '  • No browser extension needed on mobile\n\n' +
      'The VPN never routes your traffic externally — it only enforces your block list.',
  },
  {
    icon:  '▸',
    title: '⑤ Session Log',
    body:
      'The log shows live activity during a session:\n\n' +
      '  🔵  SYSTEM — status messages\n' +
      '  🔴  BLOCKED — a distracting site was intercepted\n\n' +
      'Elapsed time and blocked count update every second.',
  },
  {
    icon:  '📱',
    title: '⑥ Mobile Tips',
    body:
      'A few things to know on mobile:\n\n' +
      '  • Keep the app open (or in the background) during a session\n' +
      '  • The VPN icon in your status bar means blocking is active\n\n' +
      'Sessions started on any device sync automatically — ' +
      'if you start one on your laptop, it activates here too.',
  },
  {
    icon:  '▶',
    title: 'Ready to focus',
    body:
      "That's everything. Here's the quick version:\n\n" +
      '  1. Type your goal\n' +
      '  2. Choose your profile (or use Default)\n' +
      '  3. Tap  Start session\n' +
      '  4. Work — or do nothing',
  },
];

interface Props {
  onDone?:    () => void; // first-launch path
  navigation?: any;       // re-open path (stack nav)
}

export default function WalkthroughScreen({ onDone, navigation }: Props) {
  const [step, setStep]   = useState(0);
  const flatRef           = useRef<FlatList<Step>>(null);
  const { width }         = Dimensions.get('window');
  const n                 = STEPS.length;
  const isLast            = step === n - 1;

  const handleDone = () => {
    if (navigation) {
      navigation.goBack();
    } else {
      onDone?.();
    }
  };

  const goTo = (index: number) => {
    setStep(index);
    flatRef.current?.scrollToIndex({ index, animated: true });
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setStep(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({ item }: { item: Step }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Dot progress indicators */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step ? styles.dotActive
                : i < step ? styles.dotPast
                : styles.dotFuture,
            ]}
          />
        ))}
      </View>

      {/* Swipeable step content */}
      <FlatList
        ref={flatRef}
        data={STEPS}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.list}
      />

      {/* Step counter */}
      <Text style={styles.counter}>{step + 1} / {n}</Text>

      <View style={styles.divider} />

      {/* Navigation buttons */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.btnBack, step === 0 && styles.btnDisabled]}
          onPress={() => goTo(step - 1)}
          disabled={step === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnBackText, step === 0 && styles.btnDisabledText]}>
            ← Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnNext, isLast && styles.btnDone]}
          onPress={isLast ? handleDone : () => goTo(step + 1)}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnNextText, isLast && styles.btnDoneText]}>
            {isLast ? 'Get started' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_BASE,
  },
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    paddingTop:     52,
    gap:            6,
  },
  dot:        { width: 8,  height: 8, borderRadius: 4 },
  dotActive:  { width: 20, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  dotPast:    { backgroundColor: BG_RAISED },
  dotFuture:  { backgroundColor: BORDER },
  list:       { flexGrow: 0 },
  slide: {
    paddingHorizontal: 32,
    paddingTop:        28,
    paddingBottom:     8,
    alignItems:        'flex-start',
  },
  icon: {
    fontSize:  40,
    color:     ACCENT,
    marginBottom: 16,
    alignSelf: 'center',
    width:     '100%',
    textAlign: 'center',
  },
  title: {
    fontFamily:   'DMSans_700Bold',
    fontSize:     18,
    fontWeight:   '700',
    color:        TEXT_PRI,
    marginBottom: 14,
    textAlign:    'center',
    width:        '100%',
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   14,
    lineHeight: 22,
    color:      TEXT_SEC,
    width:      '100%',
  },
  counter: {
    textAlign:  'center',
    fontFamily: 'DMSans_400Regular',
    fontSize:   11,
    color:      TEXT_MUT,
    paddingVertical: 8,
  },
  divider: {
    height:          1,
    backgroundColor: BORDER,
  },
  nav: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingVertical:   16,
    paddingBottom:     32,
    backgroundColor:   BG_BASE,
  },
  btnBack: {
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:      8,
    backgroundColor:   BG_RAISED,
    minWidth:          90,
    alignItems:        'center',
  },
  btnDisabled:     { opacity: 0.3 },
  btnBackText:     { fontFamily: 'DMSans_400Regular', fontSize: 14, color: TEXT_SEC },
  btnDisabledText: { color: TEXT_MUT },
  btnNext: {
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:      8,
    backgroundColor:   ACCENT,
    minWidth:          110,
    alignItems:        'center',
  },
  btnDone:     { backgroundColor: GREEN },
  btnNextText: { fontFamily: 'DMSans_700Bold', fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  btnDoneText: { color: '#0a0a0f' },
});