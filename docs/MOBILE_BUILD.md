# Te-connect — Mobile Build Guide

## Stack

- Capacitor 8.5.2 for Android and iOS.
- Capacitor Geolocation 8.2.2 for native GPS permission and position access.
- Web/PWA keeps browser geolocation.
- Server-side geofence validation remains authoritative.
- Application ID / Bundle Identifier: `com.teconnect.app`.

## Local Android

Requirements: Node 24, Android Studio, Android SDK and a configured Android device/emulator.

```bash
npm install
npm run build
npx cap add android
npm run mobile:sync
npm run mobile:android
```

For Google Play release:

1. Open the generated `android/` project in Android Studio.
2. Configure signing for release.
3. Verify the generated app targets Android 16 / API 36 or higher.
4. Test login, session persistence, point registration and GPS permissions on a physical Android device.
5. Build a signed AAB and upload it first to internal testing.

Google Play requires new apps and updates submitted from 31 August 2026 to target Android 16 / API 36 or higher.

## Local iOS

Requirements: macOS, current Xcode, Apple Developer account and an iPhone for physical-device testing.

```bash
npm install
npm run build
npx cap add ios
npm run mobile:sync
npm run mobile:ios
```

Then in Xcode:

1. Configure the Apple Developer Team and signing.
2. Confirm Bundle Identifier `com.teconnect.app`.
3. Verify the location usage descriptions generated for the Geolocation plugin.
4. Test login, session persistence, point registration and GPS permissions on a physical iPhone.
5. Archive and distribute through TestFlight before App Store submission.

## Important product behavior

The app is not intended to be a generic website wrapper. Mobile users receive a platform app experience around secure authentication, attendance, requests and location-backed time registration. The server remains responsible for final geofence validation.

Apple's App Review Guidelines require apps to provide functionality and UI that go beyond a repackaged website, so the store build must retain meaningful mobile-specific behavior and be tested as an app.

## CI

`.github/workflows/mobile-build.yml` generates fresh Android and iOS projects in CI and performs debug/simulator build smoke tests. Signed store artifacts are deliberately separate because signing credentials and store accounts must not be committed to the repository.
