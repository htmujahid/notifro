export function BackupCodeGrid({ codes }: { codes: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
      {codes.map((code) => (
        <span key={code} className="tracking-widest">
          {code}
        </span>
      ))}
    </div>
  )
}
