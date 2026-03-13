'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SearchSuggestion, SearchSafetyWarning } from '@/lib/search/types'

interface SearchAutocompleteProps {
  id: string
  value: string
  onChange: (next: string) => void
  onSubmit: (next?: string) => void
  onSafety?: (warnings: SearchSafetyWarning[]) => void
  placeholder?: string
  ariaLabel?: string
  minLength?: number
  debounceMs?: number
}

export function SearchAutocomplete({
  id,
  value,
  onChange,
  onSubmit,
  onSafety,
  placeholder,
  ariaLabel,
  minLength = 2,
  debounceMs = 250
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const blurTimeout = useRef<number | null>(null)
  const isFocusedRef = useRef(false)

  const trimmedValue = value.trim()

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {}
    suggestions.forEach((suggestion) => {
      const group = groups[suggestion.type] || []
      group.push(suggestion)
      groups[suggestion.type] = group
    })
    return groups
  }, [suggestions])

  useEffect(() => {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current)
      blurTimeout.current = null
    }
    if (trimmedValue.length < minLength) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      setError(null)
      setHighlightIndex(-1)
      onSafety?.([])
      return
    }

    setIsLoading(true)
    setError(null)
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedValue)}&limit=5&suggest=true`
        )
        if (!response.ok) {
          throw new Error('Failed to load suggestions')
        }
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        onSafety?.(data.safety?.warnings || [])
        if (isFocusedRef.current) setIsOpen(true)
        setHighlightIndex(-1)
      } catch (err) {
        setSuggestions([])
        setError('Unable to load suggestions.')
        onSafety?.([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => window.clearTimeout(handle)
  }, [trimmedValue, minLength, debounceMs, onSafety])

  function handleSelect(suggestion: SearchSuggestion) {
    onChange(suggestion.value)
    onSubmit(suggestion.value)
    setIsOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      setIsOpen(false)
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        event.preventDefault()
        handleSelect(suggestions[highlightIndex])
      } else {
        event.preventDefault()
        ;(event.target as HTMLInputElement).blur()
        onSubmit()
      }
      return
    }

    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightIndex((prev) => (prev + 1) % suggestions.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function handleBlur() {
    blurTimeout.current = window.setTimeout(() => setIsOpen(false), 120)
  }

  return (
    <div className="relative flex-1">
      <input
        id={id}
        type="text"
        role="combobox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input w-full"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        aria-activedescendant={highlightIndex >= 0 ? `${id}-option-${highlightIndex}` : undefined}
        onFocus={() => {
          isFocusedRef.current = true
          if (trimmedValue.length >= minLength) setIsOpen(true)
        }}
        onBlur={() => {
          isFocusedRef.current = false
          handleBlur()
        }}
        onKeyDown={handleKeyDown}
      />

      {isLoading && (
        <div className="absolute right-3 top-3 text-xs text-gray-600" aria-live="polite" role="status">
          Loading...
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-40 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-lg"
          role="listbox"
          id={`${id}-listbox`}
          onMouseDown={(event) => event.preventDefault()}
        >
          {Object.entries(groupedSuggestions).map(([type, group]) => (
            <div key={type} className="border-b border-gray-100 last:border-b-0" role="group" aria-label={type}>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500" aria-hidden="true">
                {type}
              </div>
              <ul>
                {group.map((suggestion, index) => {
                  const overallIndex = suggestions.findIndex((item) => item === suggestion)
                  const isActive = overallIndex === highlightIndex
                  return (
                    <li
                      key={`${suggestion.type}-${suggestion.value}-${index}`}
                      id={`${id}-option-${overallIndex}`}
                      role="option"
                      aria-selected={isActive}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 ${
                        isActive ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => handleSelect(suggestion)}
                    >
                      {suggestion.image_url ? (
                        <img
                          src={suggestion.image_url}
                          alt=""
                          className="h-8 w-8 rounded object-contain"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{suggestion.value}</span>
                        {suggestion.subtitle ? (
                          <span className="text-xs text-gray-600">{suggestion.subtitle}</span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
