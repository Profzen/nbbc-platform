# Mobile Release Guide (Capacitor)

This project ships Android and iOS from the same web codebase.

## 1) Prerequisites
- Node.js
- Android Studio + SDK
- Xcode (macOS only)
- Apple Developer + Google Play Console accounts

## 2) Sync app with production URL
PowerShell:

```powershell
$env:CAPACITOR_APP_URL="https://nbbc-platform.vercel.app"
npm run cap:sync
```

This updates native projects from current web/mobile wrapper config.

## 3) Android build (Play Store)
1. Open Android project:
```powershell
npm run cap:open:android
```
2. In Android Studio: verify appId/version/signing.
3. Create keystore once (example):
```powershell
keytool -genkey -v -keystore nbbc-release.jks -alias nbbc -keyalg RSA -keysize 2048 -validity 10000
```
4. Configure signing in `Build > Generate Signed Bundle / APK`.
5. Generate AAB and upload to Play Console (internal testing first).

## 4) iOS build (App Store)
Requires macOS.

1. Open iOS project on Mac:
```bash
npm run cap:open:ios
```
2. In Xcode: set Team, Bundle Identifier, Signing.
3. Archive and upload to App Store Connect.
4. Start with TestFlight then release to App Store.

## 5) Update flow after code changes
1. Push web changes as usual.
2. Sync native projects:
```powershell
$env:CAPACITOR_APP_URL="https://nbbc-platform.vercel.app"
npm run cap:sync
```
3. Rebuild/release Android and iOS binaries when app package changes are required.

## 6) Security reminders
- Never commit keystore files or raw credentials.
- Keep `.env.local` and store credentials in CI/hosting secrets.
- Rotate exposed secrets if they leak.
