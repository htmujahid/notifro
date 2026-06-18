import { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>💖 Hello from React</h1>
      <p>This component is rendered in the Electron renderer process.</p>
      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
    </main>
  );
}
