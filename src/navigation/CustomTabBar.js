import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'
import { setBottomTabBarHeight } from './tabBarMetrics'

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[styles.bar, { paddingBottom: (insets.bottom || 0) + 4 }]}
      onLayout={(event) => setBottomTabBarHeight(event.nativeEvent.layout.height)}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const focused = state.index === index

        const label = options.tabBarLabel ?? options.title ?? route.name
        const icon = options.tabBarIcon?.({
          color: focused ? colors.brand : colors.slate400,
          size: 22,
          focused,
        })
        const badge = options.tabBarBadge

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true })
          }
        }

        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              {icon}
              {badge != null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{String(badge)}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabPressed: { opacity: 0.65 },

  iconWrap: {
    width: 46,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.teal50,
  },

  label: {
    fontFamily: font.semiBold,
    fontSize: 10,
  },
  labelActive: { color: colors.brand },
  labelInactive: { color: colors.slate400 },

  badge: {
    position: 'absolute',
    top: 0,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: 9,
    color: colors.white,
    lineHeight: 12,
  },
})
