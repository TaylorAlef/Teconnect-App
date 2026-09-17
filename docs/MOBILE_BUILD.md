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

Before Play submission, verify the current target API requirement and generate a signed AAB for internal testing.

## iOS

Run on macOS/Xcode:

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Configure signing and location privacy usage descriptions, then validate native GPS on a real iPhone before TestFlight.

## Launch gate — 23/09/2026

- [ ] Android signed AAB generated
- [ ] Android real-device GPS attendance test
- [ ] Google Play internal testing
- [ ] iOS signed archive generated
- [ ] iPhone real-device GPS attendance test
- [ ] TestFlight validation
- [ ] Store metadata, privacy and support URLs checked
