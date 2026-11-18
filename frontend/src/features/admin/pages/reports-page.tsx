import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ExternalLink, Flag, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Tabs } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { adminApi } from '@/services/admin.api'
import type { Report } from '@/types'

type StatusTab = 'open' | 'resolved' | 'dismissed' | 'all'

export function AdminReportsPage() {
  useDocumentTitle('Admin · Reports')
  const { toast } = useToast()
  const [tab, setTab] = useState<StatusTab>('open')
  const [active, setActive] = useState<{ report: Report; action: 'resolved' | 'dismissed' } | null>(null)
  const [note, setNote] = useState('')

  const query = useQuery({
    queryKey: queryKeys.admin.reports(tab),
    queryFn: () => adminApi.reports(tab),
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) =>
      adminApi.updateReport(id, { status, note: note.trim() || undefined }),
    onSuccess: (report) => {
      void query.refetch()
      toast({
        title: report.status === 'resolved' ? 'Report resolved' : 'Report dismissed',
        tone: 'success',
      })
      setActive(null)
      setNote('')
    },
  })

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Admin
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          Reports are triaged, not auto-hidden. Resolving or dismissing is recorded with the actor
          and note.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'open', label: 'Open' },
          { id: 'resolved', label: 'Resolved' },
          { id: 'dismissed', label: 'Dismissed' },
          { id: 'all', label: 'All' },
        ]}
        value={tab}
        onChange={(value) => setTab(value as StatusTab)}
      >
        {query.isPending ? <SkeletonList rows={3} /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

        {query.data && query.data.items.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={tab === 'open' ? 'No open reports' : 'Nothing here'}
            description="Reports submitted by users appear in this queue."
          />
        ) : null}

        <ul className="space-y-2">
          {query.data?.items.map((report) => (
            <li key={report.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={report.status === 'open' ? 'warning' : 'neutral'}>
                      {report.status}
                    </Badge>
                    <Badge tone="neutral">{report.targetType}</Badge>
                    <span className="truncate text-sm font-medium">{report.targetLabel}</span>
                  </div>
                  <p className="mt-1 text-sm">{report.reason}</p>
                  {report.details ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{report.details}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    by @{report.reporter.username} · {formatDateTime(report.createdAt)}
                  </p>
                  {report.resolutionNote ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Note: {report.resolutionNote}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {report.targetType === 'post' ? (
                    <Link
                      to={`/community/${report.targetId}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Open
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                  {report.status === 'open' ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Check}
                        onClick={() => {
                          setNote('')
                          setActive({ report, action: 'resolved' })
                        }}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={X}
                        onClick={() => {
                          setNote('')
                          setActive({ report, action: 'dismissed' })
                        }}
                      >
                        Dismiss
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Tabs>

      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.action === 'resolved' ? 'Resolve report' : 'Dismiss report'}
        description={active?.report.targetLabel}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button
              loading={mutation.isPending}
              onClick={() => {
                if (!active) return
                mutation.mutate({ id: active.report.id, status: active.action })
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Field label="Resolution note" htmlFor="resolution-note" hint={`${note.length}/300`}>
          <Textarea
            id="resolution-note"
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What action did you take? Visible in the audit trail."
          />
        </Field>
        {mutation.isError ? (
          <p className="mt-2 text-xs text-danger">{describeError(mutation.error)}</p>
        ) : null}
      </Dialog>
    </div>
  )
}
