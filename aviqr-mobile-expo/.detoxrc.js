/** Detox config — full E2E on a real/emulated device.
 *  Run: detox build -c android.emu.debug && detox test -c android.emu.debug
 *  Requires: a dev build of the app + an Android emulator named "Pixel_6_API_34"
 *  or an iOS simulator. This is a scaffold; wire to your CI device farm.
 */
module.exports = {
  testRunner: { args: { config: 'e2e/jest.config.js' }, jest: { setupTimeout: 120000 } },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/AviQR.app',
      build: 'xcodebuild -workspace ios/AviQR.xcworkspace -scheme AviQR -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    emulator: { type: 'android.emulator', device: { avdName: 'Pixel_6_API_34' } },
    simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
  },
  configurations: {
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
    'ios.sim.debug':     { device: 'simulator', app: 'ios.debug' },
  },
};
