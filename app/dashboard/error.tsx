'use client'

export default function DashboardError({ error }: { error: Error }) {
  return (
    <div className="p-8 text-red-600">
      <h2 className="text-lg font-bold mb-2">Errore nel dashboard</h2>
      <pre className="text-sm bg-red-50 p-4 rounded">{error.message}</pre>
    </div>
  )
}
