import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function MetricCard({ title, value, hint }: { title: string; value: string; hint?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="pt-0 text-sm text-slate-500">{hint}</CardContent> : null}
    </Card>
  )
}
