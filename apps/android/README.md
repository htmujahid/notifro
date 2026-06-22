# android

The Notifro Android app — the dashboard delivered as a native Android application.

## Stack

- **Capacitor 8** + **Vite** + **React 19** + **React Router 8** + **TypeScript 6**

## How it fits

A Capacitor web container wrapping the shared React app. Native capabilities are accessed through Capacitor plugins (`@capacitor/app`, `@capacitor/preferences`), while screens and logic come from the workspace:

- [`@notifro/app`](../../packages/app) — app-wide universal logic and the mobile auth client
- [`@notifro/views`](../../packages/views) — shared pages (consumes `./routes/android`)

The native Gradle project lives in `android/`; the web build is synced into it via Capacitor.

## Develop

```bash
pnpm dev              # web dev server
npx cap sync android  # sync web build into the native project
npx cap open android  # open in Android Studio
```
