// ponytail: band-aid for EAS autolinking resolving @react-native-community/datetimepicker
// to a stale absolute path from the dev machine ("Basedir .../C:/Users/.../datetimepicker/android
// does not exist"). Pinning `root` here forces the path to be resolved on the build machine,
// and project-config entries win over scanned ones in expo autolinking.
// Real fix is CNG (stop committing android/ + ios/) — see notes.
const path = require('path');

function pkgRoot(name) {
  return path.dirname(require.resolve(`${name}/package.json`));
}

module.exports = {
  dependencies: {
    '@react-native-community/datetimepicker': { root: pkgRoot('@react-native-community/datetimepicker') },
  },
};
