import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { describeError } from '@/lib/api-error'
import { communityApi } from '@/services/community.api'
import type { ReportTargetType } from '@/types'

const REASONS = [
  'Spam or advertising',
  'Harassment or abuse',
  'Hateful content',
  'Plagiarism',
  'Misleading technical content',
  'Other',
]

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: string
  targetLabel: string
}) {
  const [reason, setReason] = useState(REASONS[0]!)
  const [details, setDetails] = useState('')
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () =>
      communityApi.report({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'A moderator will review it. You will not be notified of the outcome.',
        tone: 'success',
      })
      setDetails('')
      onClose()
    },
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report content"
      description={`Reporting ${targetType}: ${targetLabel}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Submit report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Reason" htmlFor="report-reason" required>
          <Select
            id="report-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            {REASONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Details"
          htmlFor="report-details"
          hint={`${details.length}/500`}
        >
          <Textarea
            id="report-details"
            maxLength={500}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Optional context for the moderator"
          />
        </Field>

        {mutation.isError ? (
          <p role="alert" className="text-xs text-danger">
            {describeError(mutation.error)}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
