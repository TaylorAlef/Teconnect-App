# Te-connect — Mobile Build

The repository contains the Capacitor 8 Android/iOS foundation and native GPS adapter.

## Android

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Before Play submission, the CI release pipeline verifies Android target API 36+, prepares location permissions, and can generate a signed AAB when the GitHub signing secrets are configured.

### Android release secrets

Configure these as GitHub Actions repository secrets before running `.github/workflows/mobile-release.yml`:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The keystore must be the production signing keystore that will remain associated with the Google Play app.

## iOS

Run on macOS/Xcode:

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

The release workflow prepares the native location privacy strings and can create a signed App Store archive/IPA when Apple signing material is configured.

### iOS release secrets

Configure these as GitHub Actions repository secrets:

- `APPLE_CERTIFICATE_P12_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `IOS_PROVISION_PROFILE_BASE64`
- `IOS_TEAM_ID`

The provisioning profile must match bundle ID `com.teconnect.app` and the production distribution certificate.

## Real-device acceptance

### Android

Install the build on a physical Android device and verify:

1. First launch requests location permission.
2. GPS permission is granted.
3. Login works.
4. Clock-in inside the authorized geofence succeeds.
5. Clock-in outside the geofence is rejected by the server.
6. Pause and exit work.
7. Denying/revoking location permission produces a clear user-facing error.
8. Poor/no network does not create duplicate attendance records.
9. GPS coordinates and accuracy reach the attendance server path.

### iPhone

Repeat the same acceptance flow on a physical iPhone, including permission denial and re-enabling location access.

## Launch gate — 23/09/2026

- [ ] Android signed AAB generated
- [ ] Android real-device GPS attendance test
- [ ] Google Play internal testing
- [ ] iOS signed archive generated
- [ ] iPhone real-device GPS attendance test
- [ ] TestFlight validation
- [ ] Store metadata, privacy and support URLs checked

The repository includes `.github/workflows/mobile-release.yml` for reproducible release signing/builds.