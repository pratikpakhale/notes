"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ModernEditor } from "@/components/modern-editor"

const convertHtmlToMarkdown = (html: string): string => {
  const markdown = html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = "#".repeat(Number.parseInt(level))
      return `${hashes} ${content.trim()}\n\n`
    })
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br[^>]*\/?>/gi, "\n")
    .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n"
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + "\n"
    })
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, "```\n$1\n```\n")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      return (
        content
          .split("\n")
          .map((line) => `> ${line.trim()}`)
          .join("\n") + "\n\n"
      )
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")

  return markdown
}

export default function NewNotePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    setHasUnsavedChanges(title.trim() !== "" || content.trim() !== "")
  }, [title, content])

  useEffect(() => {
    if (!hasUnsavedChanges || !user) return
    if (!title.trim() || !content.trim() || title.trim().length < 1 || content.trim().length < 3) return

    const timeoutId = setTimeout(() => {
      saveNote()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [title, content, hasUnsavedChanges, user, noteId])

  const saveNote = async () => {
    if (!title.trim() || !content.trim() || !user) return

    setIsSaving(true)
    setError(null)

    try {
      if (noteId) {
        const { error } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            content: content.trim(),
          })
          .eq("id", noteId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            title: title.trim(),
            content: content.trim(),
            user_id: user.id,
          })
          .select()

        if (error) throw error

        if (data && data.length > 0) {
          setNoteId(data[0].id)
        }
      }

      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Error saving note:", error)
      setError(error instanceof Error ? error.message : "Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDone = async () => {
    if (title.trim() && content.trim()) {
      await saveNote()
    }

    if (!error) {
      router.push("/")
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData
    const htmlData = clipboardData.getData("text/html")

    if (htmlData && htmlData.trim() !== "") {
      e.preventDefault()
      const markdown = convertHtmlToMarkdown(htmlData)
      const textarea = e.target as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + markdown + content.substring(end)
      setContent(newContent)

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + markdown.length
        textarea.focus()
      }, 0)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">please sign in to create notes</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-4 text-sm">
          <span onClick={handleDone} className="text-black hover:underline cursor-pointer">
            ← done
          </span>
          <span onClick={() => saveNote()} className="text-black hover:underline cursor-pointer">
            save now
          </span>
          {isSaving && <span className="text-gray-500">saving...</span>}
          {hasUnsavedChanges && !isSaving && <span className="text-gray-500">unsaved changes</span>}
          {error && <span className="text-red-500">{error}</span>}
        </div>

        <div className="space-y-6">
          <Input
            placeholder="note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="note-title-input text-xl font-normal border-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400 bg-transparent"
          />
          <ModernEditor
            placeholder="write your note in markdown..."
            value={content}
            onChange={setContent}
            onPaste={handlePaste}
            className="modern-editor"
          />
        </div>
      </div>
    </div>
  )
}
