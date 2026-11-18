import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { formatDate, formatNumber, initials } from '@/lib/format'
import { authApi } from '@/services/auth.api'

const schema = z.object({
  displayName: z.string().trim().max(48, 'Keep it to 48 characters.').optional(),
  avatarUrl: z
    .string()
    .trim()
    .url('Enter a full image URL.')
    .max(500, 'URL is too long.')
    .optional()
    .or(z.literal('')),
  bio: z.string().trim().max(280, 'Keep it to 280 characters.').optional(),
})

type FormValues = z.infer<typeof schema>

export function ProfilePage() {
  useDocumentTitle('Profile settings')
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      avatarUrl: user?.avatarUrl ?? '',
      bio: user?.bio ?? '',
    },
  })

  useEffect(() => {
    if (!user) return
    reset({
      displayName: user.displayName ?? '',
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
    })
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.updateProfile({
        displayName: values.displayName?.trim() || undefined,
        avatarUrl: values.avatarUrl?.trim() || undefined,
        bio: values.bio?.trim() || undefined,
      }),
    onSuccess: (response) => {
      setUser(response.user)
      toast({ title: 'Profile updated', tone: 'success' })
      reset({
        displayName: response.user.displayName ?? '',
        avatarUrl: response.user.avatarUrl ?? '',
        bio: response.user.bio ?? '',
      })
    },
  })

  const avatarUrl = watch('avatarUrl')

  if (!user) return null

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Account
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Profile settings</h1>
        <p className="text-sm text-muted-foreground">
          Only these three fields are editable. Role, status, username, email, and points are
          controlled by the server.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
        <aside className="card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center overflow-hidden rounded-xl bg-primary-soft text-lg font-semibold text-primary">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(user.displayName ?? user.username)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.displayName ?? user.username}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-mono">{user.role}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-mono">{user.status}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Points</dt>
              <dd className="font-mono tabular-nums">{formatNumber(user.points)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </aside>

        <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
          <Field
            label="Display name"
            htmlFor="displayName"
            error={errors.displayName?.message}
            hint={`${(watch('displayName') ?? '').length}/48`}
          >
            <Input
              id="displayName"
              placeholder={user.username}
              invalid={Boolean(errors.displayName)}
              {...register('displayName')}
            />
          </Field>

          <Field
            label="Avatar URL"
            htmlFor="avatarUrl"
            error={errors.avatarUrl?.message}
            hint="https://…"
          >
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.png"
              invalid={Boolean(errors.avatarUrl)}
              {...register('avatarUrl')}
            />
          </Field>

          <Field
            label="Bio"
            htmlFor="bio"
            error={errors.bio?.message}
            hint={`${(watch('bio') ?? '').length}/280`}
          >
            <Textarea
              id="bio"
              rows={4}
              placeholder="What are you working through right now?"
              invalid={Boolean(errors.bio)}
              {...register('bio')}
            />
          </Field>

          {mutation.isError ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {describeError(mutation.error)}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty || mutation.isPending}
              onClick={() =>
                reset({
                  displayName: user.displayName ?? '',
                  avatarUrl: user.avatarUrl ?? '',
                  bio: user.bio ?? '',
                })
              }
            >
              Reset
            </Button>
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
