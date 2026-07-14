import { Text } from 'react-native'
import { colors } from '../../theme/colors'

/** Red asterisk for mandatory fields. */
export function RequiredMark() {
  return <Text style={styles.req}> *</Text>
}

const styles = {
  req: { color: colors.danger || '#ef4444' },
}

export default RequiredMark
