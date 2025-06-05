"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

interface ModernEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
}

export function ModernEditor({ value, onChange, placeholder, className, onPaste }: ModernEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  // Calculate word count
  useEffect(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0
    setWordCount(words)
  }, [value])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && !showPreview) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(400, textarea.scrollHeight)}px`
    }
  }, [value, showPreview])

  const insertText = (before: string, after = "", placeholder = "") => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newValue = value.substring(0, start) + before + textToInsert + after + value.substring(end)
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      if (!selectedText && placeholder) {
        textarea.selectionStart = start + before.length
        textarea.selectionEnd = start + before.length + placeholder.length
      } else {
        textarea.selectionStart = start + before.length
        textarea.selectionEnd = start + before.length + textToInsert.length
      }
    }, 0)
  }

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const lines = value.substring(0, start).split("\n")
    const currentLineStart = start - lines[lines.length - 1].length

    const newValue = value.substring(0, currentLineStart) + prefix + value.substring(currentLineStart)
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + prefix.length
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement
    const { selectionStart, selectionEnd } = textarea

    // Tab for indentation
    if (e.key === "Tab") {
      e.preventDefault()
      insertText("  ")
    }

    // Enter for list continuation
    if (e.key === "Enter") {
      const lines = value.substring(0, selectionStart).split("\n")
      const currentLine = lines[lines.length - 1]

      const unorderedMatch = currentLine.match(/^(\s*)([-*+])\s/)
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s/)

      if (unorderedMatch) {
        e.preventDefault()
        const [, indent, bullet] = unorderedMatch
        insertText(`\n${indent}${bullet} `)
      } else if (orderedMatch) {
        e.preventDefault()
        const [, indent, number] = orderedMatch
        const nextNumber = Number.parseInt(number) + 1
        insertText(`\n${indent}${nextNumber}. `)
      }
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault()
          insertText("**", "**", "bold text")
          break
        case "i":
          e.preventDefault()
          insertText("*", "*", "italic text")
          break
        case "k":
          e.preventDefault()
          insertText("[", "](url)", "link text")
          break
        case "`":
          e.preventDefault()
          insertText("`", "`", "code")
          break
        case "Enter":
          e.preventDefault()
          setShowPreview(!showPreview)
          break
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
          e.preventDefault()
          const level = "#".repeat(Number.parseInt(e.key))
          insertAtLineStart(`${level} `)
          break
      }
    }
  }

  return (
    <div>
      {/* Minimal controls - only show on hover or focus */}
      <div className="group">
        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{wordCount} words</span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="hover:text-gray-600 transition-colors"
              title="Toggle Preview (⌘Enter)"
            >
              {showPreview ? "edit" : "preview"}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{value || "*Preview will appear here...*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={placeholder}
            className={`w-full border-0 resize-none focus:outline-none text-sm leading-relaxed bg-transparent ${className}`}
            style={{
              minHeight: "400px",
            }}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}
