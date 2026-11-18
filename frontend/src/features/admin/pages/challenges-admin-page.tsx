import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePlus2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { SkeletonList } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { languages, languageLabel } from '@/components/editor/languages'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { queryKeys } from '@/services/query-keys'
import { challengesApi } from '@/services/challenges.api'
import { topics } from '@/features/dsa/content/catalog'
import type { Difficulty, Language } from '@/types'

const emptyStarter = 'function solve(input) {\n  // fix me\n}\n'

export function AdminChallengesPage() {
  useDocumentTitle('Admin · Challenges')
  const [searchParams, setSearchParams] = useSearchParams()
  const editingSlug = searchParams.get('slug')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    title: '',
    slug: '',
    topic: topics[0]?.slug ?? 'arrays',
    difficulty: 'easy' as Difficulty,
    description: '',
    constraints: '',
    pointValue: '50',
    timeLimitMs: '2000',
    memoryLimitMb: '128',
    status: 'draft' as 'draft' | 'published' | 'archived',
  })
  const [selected, setSelected] = useState<Language[]>(['javascript'])
  const [starters, setStarters] = useState<Partial<Record<Language, string>>>({
    javascript: emptyStarter,
  })
  const [error, setError] = useState<string | null>(null)

  const existing = useQuery({
    queryKey: queryKeys.challenges.detail(editingSlug ?? 'none'),
    queryFn: ({ signal }) => challengesApi.detail(editingSlug!, signal),
    enabled: Boolean(editingSlug),
  })

  useEffect(() => {
    if (!existing.data) return
    const data = existing.data
    setForm({
      title: data.title,
      slug: data.slug,
      topic: data.topic,
      difficulty: data.difficulty,
      description: data.description,
      constraints: data.constraints.join('\n'),
      pointValue: String(data.pointValue),
      timeLimitMs: String(data.timeLimitMs),
      memoryLimitMb: String(data.memoryLimitMb),
      status: 'published',
    })
    setSelected(data.supportedLanguages)
    setStarters(data.starterCode)
  }, [existing.data])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        topic: form.topic,
        difficulty: form.difficulty,
        description: form.description.trim(),
        constraints: form.constraints
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        pointValue: Number(form.pointValue),
        timeLimitMs: Number(form.timeLimitMs),
        memoryLimitMb: Number(form.memoryLimitMb),
        supportedLanguages: selected,
        starterCode: Object.fromEntries(
          selected.map((language) => [language, starters[language] ?? '']),
        ),
        status: form.status,
      }
      return existing.data
        ? challengesApi.adminUpdate(existing.data.id, payload)
        : challengesApi.adminCreate(payload)
    },
    onSuccess: (challenge) => {
      void queryClient.invalidateQueries({ queryKey: ['challenges'] })
      toast({ title: 'Challenge saved', description: challenge.title, tone: 'success' })
      if (!editingSlug) {
        setSearchParams({ slug: challenge.slug })
      }
    },
  })

  const submit = () => {
    const nextErrors: string[] = []
    if (form.title.trim().length < 5) nextErrors.push('Title needs at least 5 characters.')
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
      nextErrors.push('Slug must be lowercase letters, numbers, and single hyphens.')
    }
    if (form.description.trim().length < 30) {
      nextErrors.push('Description needs at least 30 characters.')
    }
    if (selected.length === 0) nextErrors.push('Enable at least one language.')
    if (selected.some((language) => (starters[language] ?? '').trim().length === 0)) {
      nextErrors.push('Every enabled language needs starter code.')
    }
    const points = Number(form.pointValue)
    if (!Number.isInteger(points) || points < 10 || points > 500) {
      nextErrors.push('Points must be an integer between 10 and 500.')
    }
    const time = Number(form.timeLimitMs)
    if (!Number.isInteger(time) || time < 100 || time > 10_000) {
      nextErrors.push('Time limit must be between 100 and 10000 ms.')
    }
    const memory = Number(form.memoryLimitMb)
    if (!Number.isInteger(memory) || memory < 16 || memory > 512) {
      nextErrors.push('Memory limit must be between 16 and 512 MB.')
    }

    setError(nextErrors.length ? nextErrors.join(' ') : null)
    if (nextErrors.length === 0) mutation.mutate()
  }

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Admin
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {existing.data ? `Edit: ${existing.data.title}` : 'New challenge'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Execution images and sandbox limits are fixed server configuration. This form only
            chooses allowlisted values.
          </p>
        </div>
        {editingSlug ? (
          <Button
            variant="secondary"
            size="sm"
            icon={FilePlus2}
            onClick={() => {
              setSearchParams({})
              setForm({
                title: '',
                slug: '',
                topic: topics[0]?.slug ?? 'arrays',
                difficulty: 'easy',
                description: '',
                constraints: '',
                pointValue: '50',
                timeLimitMs: '2000',
                memoryLimitMb: '128',
                status: 'draft',
              })
              setSelected(['javascript'])
              setStarters({ javascript: emptyStarter })
              setError(null)
            }}
          >
            Create new
          </Button>
        ) : null}
      </header>

      {existing.isError ? (
        <ErrorState error={existing.error} onRetry={() => void existing.refetch()} compact />
      ) : null}
      {existing.isPending && editingSlug ? <SkeletonList rows={2} /> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="card space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" required>
              <Input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} />
            </Field>
            <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens">
              <Input id="slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
            </Field>
            <Field label="Topic" htmlFor="topic">
              <Select id="topic" value={form.topic} onChange={(e) => update('topic', e.target.value)}>
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Difficulty" htmlFor="difficulty">
              <Select
                id="difficulty"
                value={form.difficulty}
                onChange={(e) => update('difficulty', e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description" required hint={`${form.description.length} chars`}>
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Explain the bug and what a correct solution must do."
            />
          </Field>

          <Field label="Constraints" htmlFor="constraints" hint="One per line">
            <Textarea
              id="constraints"
              rows={3}
              value={form.constraints}
              onChange={(e) => update('constraints', e.target.value)}
              placeholder="1 ≤ n ≤ 1000&#10;Values fit in 32-bit integers"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Points" htmlFor="points">
              <Input id="points" value={form.pointValue} onChange={(e) => update('pointValue', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Time (ms)" htmlFor="time">
              <Input id="time" value={form.timeLimitMs} onChange={(e) => update('timeLimitMs', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Memory (MB)" htmlFor="memory">
              <Input id="memory" value={form.memoryLimitMb} onChange={(e) => update('memoryLimitMb', e.target.value)} inputMode="numeric" />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Languages</legend>
            <div className="flex flex-wrap gap-3">
              {languages.map((language) => (
                <label key={language} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selected.includes(language)}
                    onChange={(event) => {
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, language]
                          : current.filter((item) => item !== language),
                      )
                      setStarters((current) => ({
                        ...current,
                        [language]: current[language] ?? emptyStarter,
                      }))
                    }}
                  />
                  {languageLabel(language)}
                </label>
              ))}
            </div>
          </fieldset>

          {selected.map((language) => (
            <Field
              key={language}
              label={`${languageLabel(language)} starter code`}
              htmlFor={`starter-${language}`}
              hint="intentionally buggy"
            >
              <Textarea
                id={`starter-${language}`}
                rows={6}
                spellCheck={false}
                className="font-mono text-xs"
                value={starters[language] ?? ''}
                onChange={(event) =>
                  setStarters((current) => ({ ...current, [language]: event.target.value }))
                }
              />
            </Field>
          ))}

          {error ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}
          {mutation.isError ? (
            <p role="alert" className="text-xs text-danger">
              {describeError(mutation.error)}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button icon={Save} onClick={submit} loading={mutation.isPending}>
              {existing.data ? 'Save changes' : 'Create challenge'}
            </Button>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Publication
            </h2>
            <Select
              className="mt-2"
              aria-label="Publication status"
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Drafts are not listed publicly. Hidden tests and reference solutions are managed
              server-side and never accepted from this form.
            </p>
          </div>

          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Guardrails
            </h2>
            <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
              <li>Points 10–500, time 100–10 000 ms, memory 16–512 MB.</li>
              <li>Languages are limited to the four allowlisted runners.</li>
              <li>
                <Badge tone="neutral">server-owned</Badge> images, seccomp, and capability sets.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
