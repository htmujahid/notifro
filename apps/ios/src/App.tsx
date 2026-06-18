import { Capacitor } from "@capacitor/core"

export function App() {
  const platform = Capacitor.getPlatform()
  const isNative = Capacitor.isNativePlatform()

  return (
    <main className="app">
      <h1>iOS</h1>
      <p>Capacitor + React app is running.</p>
      <dl>
        <dt>Platform</dt>
        <dd>{platform}</dd>
        <dt>Native runtime</dt>
        <dd>{isNative ? "yes" : "no (web preview)"}</dd>
      </dl>
    </main>
  )
}
