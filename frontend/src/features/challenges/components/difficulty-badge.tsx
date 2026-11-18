import { Badge } from '@/components/ui/badge'
import type { Difficulty } from '@/types'

const tones = { easy: 'success', medium: 'warning', hard: 'danger' } as const
const labels: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge tone={tones[difficulty]}>{labels[difficulty] ?? difficulty}</Badge>
}
