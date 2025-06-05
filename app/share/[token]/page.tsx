"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ModernEditor } from "@/components/modern-editor"

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
  allow_public_edit: boolean
}

export default function SharedNotePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalNote, setOriginalNote] = useState({ title: "", content: "" })

  useEffect(() => {
    fetchNote()
  }, [params.token])

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditing || !note?.allow_public_edit) return

    const timeoutId = setTimeout(() => {
      if (title.trim() && content.trim()) {
        saveNote()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [title, content, hasUnsavedChanges, isEditing, note?.allow_public_edit])

  // Track changes
  useEffect(() => {
    if (isEditing) {
      const hasChanges = title !== originalNote.title || content !== originalNote.content
      setHasUnsavedChanges(hasChanges)
    }
  }, [title, content, originalNote, isEditing])

  const fetchNote = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("share_token", params.token)
        .eq("is_public", true)
        .single()

      if (error) {
        console.error("Error fetching note:", error)
        return
      }

      if (data) {
        const noteData = {
          ...data,
          updated_at: new Date(data.updated_at).toLocaleDateString(),
        }
        setNote(noteData)
        setTitle(data.title)
        setContent(data.content)
        setOriginalNote({ title: data.title, content: data.content })
      }
    } catch (error) {
      console.error("Error fetching note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveNote = async () => {
    if (!title.trim() || !content.trim() || !note?.allow_public_edit) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content,
        })
        .eq("id", note.id)

      if (error) throw error

      // Update local note state
      if (note) {
        setNote({
          ...note,
          title,
          content,
          updated_at: new Date().toLocaleDateString(),
        })
      }
      setOriginalNote({ title, content })
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Error saving note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = () => {
    if (note?.allow_public_edit) {
      setIsEditing(true)
    }
  }

  const stopEditing = async () => {
    if (hasUnsavedChanges && note?.allow_public_edit) {
      await saveNote()
    }
    setIsEditing(false)
  }

  // Function to convert HTML to Markdown
  const convertHtmlToMarkdown = (html: string) => {
    // Basic conversion - you might need a more robust solution
    html = html.replace(/<br\s*[/]?>/gi, "\n")
    html = html.replace(/<b>(.*?)<\/b>/gi, "**$1**")
    html = html.replace(/<i>(.*?)<\/i>/gi, "*$1*")
    // Add more replacements as needed
    return html
  }

  // Handle paste event
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData("text/plain")
    const html = event.clipboardData.getData("text/html")

    let markdownText = text

    if (html) {
      markdownText = convertHtmlToMarkdown(html)
    }

    // Insert the text at the cursor position
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    setContent(textarea.value.substring(0, start) + markdownText + textarea.value.substring(end))
    textarea.selectionStart = textarea.selectionEnd = start + markdownText.length
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">loading...</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">note not found or not shared</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-4 text-sm">
          <span className="text-gray-500">shared note</span>
          {note.allow_public_edit && !isEditing && (
            <span onClick={startEditing} className="text-black hover:underline cursor-pointer">
              edit
            </span>
          )}
          {isEditing && (
            <>
              <span onClick={stopEditing} className="text-black hover:underline cursor-pointer">
                done
              </span>
              {isSaving && <span className="text-gray-500">saving...</span>}
              {hasUnsavedChanges && !isSaving && <span className="text-gray-500">unsaved changes</span>}
            </>
          )}
        </div>

        {isEditing && note.allow_public_edit ? (
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
              className="note-content-textarea border-0 focus-visible:ring-0 text-sm leading-relaxed bg-transparent w-full"
            />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-normal mb-2">{note.title}</h2>
            <p className="text-xs text-gray-500 mb-8">updated {note.updated_at}</p>
            <div className="note-content text-sm leading-relaxed">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
