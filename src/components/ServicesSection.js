import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { font, type } from '../theme/typography'
import { getTechniqueByIssue } from '../constants/techniques'

const imgCupping    = require('../../assets/images/technique_cupping.png')
const imgNeedling   = require('../../assets/images/technique_needling.png')
const imgKinesio    = require('../../assets/images/technique_kinesio.png')
const imgIastm      = require('../../assets/images/technique_iastm.png')
const imgOrthopedic = require('../../assets/images/specialty_orthopedic.png')
const imgNeuro      = require('../../assets/images/specialty_neuro.png')
const imgPediatric  = require('../../assets/images/illustration_pediatric.png')
const imgPostOp     = require('../../assets/images/specialty_post_op.png')
const imgElderly    = require('../../assets/images/technique_elderly.png')
const imgOtherSpec  = require('../../assets/images/specialty_other.png')
const imgBackPain   = require('../../assets/images/illustration_back_pain.png')
const imgKneePain   = require('../../assets/images/illustration_knee_pain.png')
const imgNeckPain   = require('../../assets/images/illustration_neck_pain.png')
const imgStroke     = require('../../assets/images/illustration_neuro_rehab.png')
const imgOther      = require('../../assets/images/illustration_other.png')

const TECHNIQUES = [
  { label: 'Cupping Therapy', issue: 'Cupping Therapy', image: imgCupping,  color: '#ea580c', ring: '#fed7aa', bg: '#fff7ed' },
  { label: 'Dry Needling',    issue: 'Dry Needling',    image: imgNeedling, color: '#7c3aed', ring: '#ddd6fe', bg: '#f5f3ff' },
  { label: 'Kinesio Taping',  issue: 'Kinesio Taping',  image: imgKinesio,  color: '#0d9488', ring: '#99f6e4', bg: '#f0fdfa' },
  { label: 'IASTM',           issue: 'IASTM',           image: imgIastm,    color: '#0369a1', ring: '#bae6fd', bg: '#f0f9ff', imgScale: 1.22 },
]

const SPECIALTIES = [
  { label: 'Orthopedic',   issue: 'Orthopedic Care', image: imgOrthopedic },
  { label: 'Neuro Rehab',  issue: 'Neuro Rehab',     image: imgNeuro      },
  { label: 'Pediatric',    issue: 'Pediatric Rehab', image: imgPediatric  },
  { label: 'Post-Op',      issue: 'Post-Op Rehab',   image: imgPostOp     },
  { label: 'Elderly Care', issue: 'Elderly Care',    image: imgElderly    },
  { label: 'Other Care',   issue: null,              image: imgOtherSpec  },
]

const CONDITIONS = [
  { label: 'Lower Back',       subtitle: 'Stiffness, slip disc, spasm, backache',     issue: 'Lower Back Pain',    image: imgBackPain, color: '#dc2626', bg: '#fff1ee', border: '#fdd0c0' },
  { label: 'Knee & Joint',     subtitle: 'Ligament injury, arthritis, stiffness',     issue: 'Knee & Joint Pain',  image: imgKneePain, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { label: 'Neck & Spine',     subtitle: 'Cervical pain, frozen shoulder, strain',    issue: 'Neck & Spine Pain',  image: imgNeckPain, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { label: 'Stroke/Paralysis', subtitle: 'Stroke recovery, paralysis care, numbness', issue: 'Stroke / Paralysis', image: imgStroke,   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { label: 'Others',           subtitle: 'Post-op care, sports injury, general rehab',issue: null,                 image: imgOther,    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
]

function TechniqueChip({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.techChip, pressed && styles.pressed]}
    >
      <View style={[styles.techRing, { backgroundColor: item.ring }]}>
        <View style={[styles.techInner, { backgroundColor: item.bg }]}>
          <Image
            source={item.image}
            style={[styles.techImg, item.imgScale ? { transform: [{ scale: item.imgScale }] } : null]}
            resizeMode="contain"
          />
        </View>
      </View>
      <Text style={[styles.techLabel, { color: item.color }]} numberOfLines={2}>{item.label}</Text>
    </Pressable>
  )
}

function SpecialtyChip({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.specChip, pressed && styles.pressed]}
    >
      <View style={styles.specCircle}>
        <Image source={item.image} style={styles.specImg} resizeMode="contain" />
      </View>
      <Text style={styles.specLabel} numberOfLines={2}>{item.label}</Text>
    </Pressable>
  )
}

function ConditionCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.condCard, { borderColor: item.border }, pressed && styles.pressed]}
    >
      {/* Tinted image area */}
      <View style={[styles.condImgArea, { backgroundColor: item.bg }]}>
        <Image source={item.image} style={styles.condImg} resizeMode="contain" />
      </View>
      {/* Text */}
      <View style={styles.condBody}>
        <Text style={[styles.condTitle, { color: item.color }]} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.condSub} numberOfLines={2}>{item.subtitle}</Text>
        <View style={styles.condBookRow}>
          <Text style={[styles.condBook, { color: item.color }]}>Book</Text>
          <Text style={[styles.condChevron, { color: item.color }]}>›</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function ServicesSection({ navigation }) {
  function goBook(issue) {
    navigation.navigate('PhysioList', issue ? { issue } : {})
  }

  return (
    <View style={styles.section}>

      {/* ── Header */}
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Text style={styles.headingIconText}>✦</Text>
        </View>
        <Text style={styles.headingText}>Book by Need</Text>
      </View>

      {/* ── Treatment Techniques (highlighted box) */}
      <View style={styles.techBox}>
        <Text style={styles.subLabel}>Treatment Techniques</Text>
        <View style={styles.techRow}>
          {TECHNIQUES.map((t) => (
            <TechniqueChip
              key={t.label}
              item={t}
              onPress={() => {
                const tech = getTechniqueByIssue(t.issue)
                if (tech) navigation.navigate('TechniqueDetail', { slug: tech.slug })
                else goBook(t.issue)
              }}
            />
          ))}
        </View>
      </View>

      {/* ── Conditions — single horizontal scroll row */}
      <View>
        <Text style={styles.subLabel}>Conditions We Treat</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.condScroll}
        >
          {CONDITIONS.map((c) => (
            <ConditionCard key={c.label} item={c} onPress={() => goBook(c.issue)} />
          ))}
        </ScrollView>
      </View>

      {/* ── Care Specialties */}
      <View>
        <Text style={styles.subLabel}>Care Specialties</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specScroll}
        >
          {SPECIALTIES.map((s) => (
            <SpecialtyChip key={s.label} item={s} onPress={() => goBook(s.issue)} />
          ))}
        </ScrollView>
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    gap: 16,
  },
  pressed: { opacity: 0.7 },

  // ── Header
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: figmaTokens.mintSoft || '#e6f4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingIconText: {
    fontSize: 11,
    color: figmaTokens.primary,
  },
  headingText: {
    fontFamily: font.bold,
    fontSize: type.sm,
    color: colors.textPrimary,
  },

  // ── Sub-label
  subLabel: {
    fontFamily: font.bold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 10,
  },

  // ── Technique chips
  techBox: {
    backgroundColor: colors.slate50 || '#f8fafc',
    borderRadius: 16,
    padding: 12,
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  techChip: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  techRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techInner: {
    flex: 1,
    width: '100%',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techImg: {
    width: 38,
    height: 38,
  },
  techLabel: {
    fontFamily: font.bold,
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
    maxWidth: 72,
  },

  // ── Condition cards — horizontal scroll
  condScroll: {
    gap: 10,
    paddingRight: 4,
  },
  condCard: {
    width: 136,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  condImgArea: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  condImg: {
    width: '100%',
    height: 80,
  },
  condBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  condTitle: {
    fontFamily: font.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  condSub: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 13,
  },
  condBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 1,
  },
  condBook: {
    fontFamily: font.bold,
    fontSize: 10,
  },
  condChevron: {
    fontSize: 14,
    lineHeight: 16,
  },

  // ── Specialty chips
  specScroll: {
    gap: 16,
    paddingRight: 4,
  },
  specChip: {
    alignItems: 'center',
    gap: 5,
  },
  specCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.slate50 || '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specImg: {
    width: 36,
    height: 36,
  },
  specLabel: {
    fontFamily: font.semiBold || font.bold,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 58,
    lineHeight: 13,
  },
})
