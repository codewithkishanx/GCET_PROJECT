import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '@/components/layout/public-layout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-context'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { describeError } from '@/lib/api-error'
import { z } from 'zod'

const schema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use at least 3 characters.')
      .max(24, 'Use 24 characters or fewer.')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens, and underscores only.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .max(128, 'Use 128 characters or fewer.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', confirm: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await registerUser({ username: values.username, email: values.email, password: values.password })
      toast({ title: 'Account created', description: 'Welcome to DSA Arcade.', tone: 'success' })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(describeError(error))
    }
  })

  return (
    <Page className="!max-w-md">
      <div className="card mt-4 p-6 sm:mt-10">
        <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your username is public. Roles and points are assigned by the server and cannot be set
          from this form.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          ) : null}

          <Field label="Username" htmlFor="username" error={errors.username?.message} hint="3–24 characters">
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              invalid={Boolean(errors.username)}
              {...register('username')}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="At least 10 characters"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              {...register('confirm')}
            />
          </Field>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Page>
  )
}
