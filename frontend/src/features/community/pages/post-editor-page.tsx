import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Save, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { MarkdownContent } from '@/lib/markdown'
import { queryKeys } from '@/services/query-keys'
import { communityApi } from '@/services/community.api'
import { z } from 'zod'

const schema = z.object({
  title: z.string().trim().min(5, 'Give the post a title of at least 5 characters.').max(120, 'Keep titles under 120 characters.'),
  summary: z.string().trim().max(280, 'Keep the summary under 280 characters.'),
  tags: z
    .string()
    .trim()
    .max(160, 'Too many tags.')
    .refine(
      (value) =>
        value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean).length <= 5,
      'Use at most 5 tags.',
    ),
  contentMarkdown: z
    .string()
    .trim()
    .min(20, 'Write at least a couple of sentences.')
    .max(50_000, 'Posts are limited to 50,000 characters.'),
})

type FormValues = z.infer<typeof schema>

export function PostEditorPage() {
  const { slug } = useParams()
  const editing = Boolean(slug)
  useDocumentTitle(editing ? 'Edit post' : 'New post')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  const existing = useQuery({
    queryKey: queryKeys.posts.detail(slug ?? 'new'),
    queryFn: ({ signal }) => communityApi.detail(slug!, signal),
    enabled: editing,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', summary: '', tags: '', contentMarkdown: '' },
  })

  useEffect(() => {
    if (!existing.data) return
    reset({
      title: existing.data.title,
      summary: existing.data.summary,
      tags: existing.data.tags.join(', '),
      contentMarkdown: existing.data.contentMarkdown,
    })
  }, [existing.data, reset])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const mutation = useMutation({
    mutationFn: async ({ values, status }: { values: FormValues; status: 'draft' | 'published' }) => {
      const payload = {
        title: values.title.trim(),
        summary: values.summary.trim(),
        contentMarkdown: values.contentMarkdown,
        tags: values.tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 5),
        status,
      }
      return editing && existing.data
        ? communityApi.update(existing.data.id, payload)
        : communityApi.create(payload)
    },
    onSuccess: (post, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(post.slug) })
      toast({
        title: variables.status === 'published' ? 'Post published' : 'Draft saved',
        tone: 'success',
      })
      if (variables.status === 'published') navigate(`/community/${post.slug}`)
      else navigate('/community')
    },
  })

  if (editing && existing.isPending) return <SkeletonList rows={3} />
  if (editing && existing.isError) {
    return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />
  }
  if (editing && existing.data && !existing.data.isMine) {
    return (
      <div className="card p-6 text-center">
        <h1 className="text-base font-semibold">You cannot edit this post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only the author can edit a post. If it breaks the rules, report it instead.
        </p>
        <Link to={`/community/${existing.data.slug}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Back to the post
        </Link>
      </div>
    )
  }

  const submitWith = (status: 'draft' | 'published') =>
    handleSubmit((values) => mutation.mutate({ values, status }))()

  const title = watch('title')
  const content = watch('contentMarkdown')
  const tags = watch('tags')

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {editing ? 'Edit' : 'New'} post
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {editing ? 'Edit your note' : 'Write a technical note'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Markdown with headings, lists, links, quotes, and fenced code blocks. Rendered content
            is sanitized.
          </p>
        </div>
        <Badge tone="neutral">{user?.username}</Badge>
      </header>

      {mutation.isError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
          {describeError(mutation.error)}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="card space-y-4 p-5">
          <Field label="Title" htmlFor="title" error={errors.title?.message} required hint={`${title.length}/120`}>
            <Input id="title" maxLength={120} invalid={Boolean(errors.title)} {...register('title')} />
          </Field>

          <Field
            label="Summary"
            htmlFor="summary"
            error={errors.summary?.message}
            hint="Shown in the feed (optional)"
          >
            <Input id="summary" maxLength={280} invalid={Boolean(errors.summary)} {...register('summary')} />
          </Field>

          <Field
            label="Tags"
            htmlFor="tags"
            error={errors.tags?.message}
            hint="Comma separated, max 5"
          >
            <Input id="tags" placeholder="sorting, recursion, debugging" {...register('tags')} />
          </Field>

          <Tabs
            items={[
              { id: 'write', label: 'Write' },
              { id: 'preview', label: 'Preview', icon: Eye },
            ]}
            value={tab}
            onChange={(value) => setTab(value as 'write' | 'preview')}
          >
            {tab === 'write' ? (
              <div>
                <label htmlFor="content" className="sr-only">
                  Post content in Markdown
                </label>
                <Textarea
                  id="content"
                  rows={18}
                  spellCheck={false}
                  className="min-h-96 font-mono text-[13px] leading-relaxed"
                  invalid={Boolean(errors.contentMarkdown)}
                  {...register('contentMarkdown')}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{errors.contentMarkdown?.message ?? 'Markdown supported'}</span>
                  <span className="font-mono">{content.length}/50000</span>
                </div>
              </div>
            ) : (
              <div className="min-h-96 rounded-lg border border-border bg-surface p-4">
                {title || content ? (
                  <MarkdownContent
                    markdown={`# ${title || 'Untitled'}\n\n${content}\n\n${
                      tags ? tags.split(',').map((tag) => `\`#${tag.trim()}\``).join(' ') : ''
                    }`}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {isDirty ? 'You have unsaved changes.' : editing ? 'No changes yet.' : 'Start writing to enable saving.'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={Save}
              loading={mutation.isPending && mutation.variables?.status === 'draft'}
              disabled={mutation.isPending}
              onClick={() => void submitWith('draft')}
            >
              Save draft
            </Button>
            <Button
              icon={Send}
              loading={mutation.isPending && mutation.variables?.status === 'published'}
              disabled={mutation.isPending}
              onClick={() => void submitWith('published')}
            >
              {editing && existing.data?.status === 'published' ? 'Update post' : 'Publish'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
