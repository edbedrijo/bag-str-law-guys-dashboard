'use client'

interface FunnelStep {
  label: string
  value: number
  color: string
  pct?:  string  // drop-off % from previous step
}

interface Props { steps: FunnelStep[] }

export default function ConversionFunnel({ steps }: Props) {
  const max = steps[0]?.value || 1

  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const barPct = max > 0 ? (step.value / max) * 100 : 0
        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-4 text-right">{i + 1}</span>
                <span className="text-sm font-medium text-gray-700">{step.label}</span>
                {step.pct && (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{step.pct} conversion</span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900">{step.value.toLocaleString()}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{ width: `${barPct}%`, backgroundColor: step.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
