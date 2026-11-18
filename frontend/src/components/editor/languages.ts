import type { Language } from '@/types'

export const languageMeta: Record<Language, { label: string; monaco: string; extension: string }> = {
  javascript: { label: 'JavaScript', monaco: 'javascript', extension: 'js' },
  python: { label: 'Python', monaco: 'python', extension: 'py' },
  java: { label: 'Java', monaco: 'java', extension: 'java' },
  cpp: { label: 'C++', monaco: 'cpp', extension: 'cpp' },
}

export const languages: Language[] = ['javascript', 'python', 'java', 'cpp']

export function languageLabel(language: Language): string {
  return languageMeta[language]?.label ?? language
}
