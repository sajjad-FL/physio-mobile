import { useCallback, useRef } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { getTechniqueBySlug } from '../constants/techniques'
import { usePricingSettings } from '../api/queries'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'

export default function TechniqueDetailScreen({ navigation, route }) {
  const slug = route.params?.slug
  const tech = getTechniqueBySlug(slug)
  const { data: settings } = usePricingSettings()
  const scrollRef = useRef(null)

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, [slug]),
  )

  if (!tech) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Technique not found.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const price = Number(settings?.techniquePrices?.[tech.bookingIssue])
  const priceLabel =
    Number.isFinite(price) && price > 0 ? `₹${price.toLocaleString('en-IN')}` : '—'

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: tech.bg }]}>
          <Image source={tech.image} style={styles.heroImg} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{tech.label}</Text>
        <Text style={styles.intro}>{tech.intro}</Text>

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Session price</Text>
          <Text style={[styles.price, { color: tech.color }]}>{priceLabel}</Text>
          <Text style={styles.priceHint}>One home session · price set by platform</Text>
        </View>

        <Text style={styles.section}>What to expect</Text>
        {tech.expect.map((line) => (
          <View key={line} style={styles.expectRow}>
            <Ionicons name="checkmark-circle" size={16} color={tech.color} />
            <Text style={styles.expectTxt}>{line}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerTitle} numberOfLines={1}>
            {tech.label}
          </Text>
          <Text style={styles.footerSub}>{priceLabel} · home or clinic</Text>
        </View>
        <Pressable
          style={[styles.cta, { backgroundColor: tech.color }]}
          onPress={() => navigation.navigate('TechniqueBook', { slug: tech.slug })}
        >
          <Text style={styles.ctaTxt}>Book now</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas || '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textSecondary, fontSize: type.sm },
  link: { marginTop: 12, color: colors.teal700 || '#0f766e', fontFamily: font.semibold },
  scroll: { padding: 16, paddingBottom: 100 },
  hero: {
    width: '100%',
    minHeight: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  heroImg: { width: '100%', height: 200 },
  title: { fontSize: type.xl, fontFamily: font.bold, color: colors.textPrimary },
  intro: { marginTop: 8, fontSize: type.sm, lineHeight: 20, color: colors.textSecondary },
  priceBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: font.semibold,
    color: colors.textTertiary || '#94a3b8',
    textTransform: 'uppercase',
  },
  price: { marginTop: 4, fontSize: 28, fontFamily: font.bold },
  priceHint: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: font.semibold,
    color: colors.textTertiary || '#94a3b8',
    textTransform: 'uppercase',
  },
  expectRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  expectTxt: { flex: 1, fontSize: type.sm, color: colors.textPrimary, lineHeight: 20 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerTitle: { fontFamily: font.semibold, color: colors.textPrimary },
  footerSub: { fontSize: 12, color: colors.textSecondary },
  cta: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  ctaTxt: { color: '#fff', fontFamily: font.semibold },
})
