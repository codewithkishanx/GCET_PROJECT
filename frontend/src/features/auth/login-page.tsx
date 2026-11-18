import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { API_BASE_URL } from '@/lib/http'
import { z } from 'zod'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email.'),
  password: z.string().min(1, 'Enter your password.'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } })

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values)
      toast({ title: 'Signed in', tone: 'success' })
      navigate(from, { replace: true })
    } catch (error) {
      setServerError(describeError(error))
    }
  })

  return (
    <Page className="!max-w-5xl">
      <div className="grid gap-6 pt-4 sm:pt-10 lg:grid-cols-[1fr_24rem] lg:gap-10">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Pick up your progress: continue a challenge, review a submission, or publish a note.
            Visualisations stay available without an account.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Sessions use http-only cookies, never localStorage tokens.</li>
            <li>• Points come only from accepted submissions.</li>
            <li>• Sign-in failures are intentionally generic.</li>
          </ul>
          <p className="mt-8 rounded-lg border border-border bg-surface p-3 font-mono text-[11px] text-muted-foreground">
            API base: {API_BASE_URL}
          </p>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your username or email address.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            {serverError ? (
              <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
                {serverError}
              </p>
            ) : null}

            <Field label="Username or email" htmlFor="identifier" error={errors.identifier?.message}>
              <Input
                id="identifier"
                autoComplete="username"
                autoFocus
                invalid={Boolean(errors.identifier)}
                {...register('identifier')}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </Page>
  )
}
