import Editor from '@monaco-editor/react'
import { Loader2 } from 'lucide-react'
import { useTheme } from '@/app/theme-provider'
import { languageMeta } from './languages'
import './monaco-setup'
import type { Language } from '@/types'

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '22rem',
  ariaLabel = 'Code editor',
}: {
  value: string
  onChange?: (value: string) => void
  language: Language
  readOnly?: boolean
  height?: string
  ariaLabel?: string
}) {
  const { theme } = useTheme()

  return (
    <div className="overflow-hidden rounded-b-xl" style={{ height }} data-aria-label={ariaLabel}>
      <Editor
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        language={languageMeta[language].monaco}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        loading={
          <span className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading editor…
          </span>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace',
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: language === 'python' ? 4 : 2,
          insertSpaces: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          smoothScrolling: true,
          wordWrap: 'on',
          ariaLabel,
        }}
      />
    </div>
  )
}
