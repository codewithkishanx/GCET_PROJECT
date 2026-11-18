import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { Search, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { Input, Select } from '@/components/ui/input'
import { LoadMore } from '@/components/ui/load-more'
import { SkeletonList } from '@/components/ui/skeleton'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { describeError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { queryKeys } from '@/services/query-keys'
import { adminApi } from '@/services/admin.api'
import type { AdminUserRow, UserStatus } from '@/types'

export function AdminUsersPage() {
  useDocumentTitle('Admin · Users')
  const { user: me } = useAuth()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const debouncedSearch = useDebouncedValue(search)
  const [target, setTarget] = useState<AdminUserRow | null>(null)

  const query = useInfiniteQuery({
    queryKey: queryKeys.admin.users({ search: debouncedSearch, status }),
    queryFn: ({ pageParam, signal }) =>
      adminApi.users(
        { search: debouncedSearch, status, cursor: pageParam as string | null },
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const mutation = useMutation({
    mutationFn: ({ userId, next }: { userId: string; next: UserStatus }) =>
      adminApi.setUserStatus(userId, next),
    onSuccess: (result) => {
      void query.refetch()
      toast({
        title: result.status === 'suspended' ? 'Account suspended' : 'Account restored',
        description: 'The action is recorded in the audit log.',
        tone: 'success',
      })
    },
    onError: (error) =>
      toast({ title: 'Action failed', description: describeError(error), tone: 'error' }),
  })

  const users = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Admin
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">User accounts</h1>
        <p className="text-sm text-muted-foreground">
          Suspending an account blocks sign-in. Role changes are intentionally not available from
          this console.
        </p>
      </header>

      <div className="card flex flex-col gap-2 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search username or email"
            aria-label="Search users"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as UserStatus | 'all')}
          aria-label="Filter by status"
          className="sm:w-44"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {query.isPending ? <SkeletonList rows={5} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {query.data ? (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Points</Th>
                <Th>Joined</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => {
                const isMe = me?.id === row.id
                return (
                  <tr key={row.id}>
                    <Td>
                      <p className="text-sm font-medium">{row.username}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{row.email}</p>
                    </Td>
                    <Td>
                      <Badge tone={row.role === 'admin' ? 'info' : 'neutral'}>{row.role}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>
                    </Td>
                    <Td className="font-mono tabular-nums">{row.points}</Td>
                    <Td className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant={row.status === 'active' ? 'ghost' : 'secondary'}
                        icon={row.status === 'active' ? UserX : UserCheck}
                        disabled={isMe || (row.role === 'admin' && row.status === 'active')}
                        title={
                          isMe
                            ? 'You cannot change your own status'
                            : row.role === 'admin'
                              ? 'Suspend another admin through the operations process'
                              : undefined
                        }
                        onClick={() => setTarget(row)}
                      >
                        {row.status === 'active' ? 'Suspend' : 'Restore'}
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}

      <LoadMore
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoad={() => void query.fetchNextPage()}
      />

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.status === 'active' ? `Suspend @${target?.username}?` : `Restore @${target?.username}?`}
        description={
          target?.status === 'active'
            ? 'The user will be signed out and blocked from signing in. Their content remains unless separately moderated.'
            : 'The account regains normal access immediately.'
        }
        confirmLabel={target?.status === 'active' ? 'Suspend account' : 'Restore account'}
        destructive={target?.status === 'active'}
        onConfirm={async () => {
          if (!target) return
          await mutation.mutateAsync({
            userId: target.id,
            next: target.status === 'active' ? 'suspended' : 'active',
          })
        }}
      >
        <p className="text-xs text-muted-foreground">
          Recorded fields: actor, target user id, previous status, new status, and timestamp.
        </p>
      </ConfirmDialog>
    </div>
  )
}
