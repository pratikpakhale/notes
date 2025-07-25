"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { ModernEditor } from "@/components/modern-editor"

import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
  is_public: boolean
  share_token: string | null
  allow_public_edit: boolean
}

export default function NotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalNote, setOriginalNote] = useState({ title: "", content: "" })
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNote()
    } else if (!authLoading) {
      router.push("/")
    }
  }, [user, authLoading, params.id])

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || !user || !isEditing) return

    const timeoutId = setTimeout(() => {
      if (title.trim() && content.trim()) {
        saveNote()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [title, content, hasUnsavedChanges, user, isEditing])

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
      const { data, error } = await supabase.from("notes").select("*").eq("id", params.id).single()

      if (error) {
        if (error.code === "PGRST116") {
          router.push("/")
          return
        }
        throw error
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
    if (!title.trim() || !content.trim() || !user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content,
        })
        .eq("id", params.id)

      if (error) throw error

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

  const generateShareToken = async () => {
    if (!note || !user) return

    try {
      const { data, error } = await supabase.rpc("generate_share_token")
      if (error) throw error

      const shareToken = data

      const { error: updateError } = await supabase
        .from("notes")
        .update({
          is_public: true,
          share_token: shareToken,
        })
        .eq("id", note.id)

      if (updateError) throw updateError

      setNote({ ...note, is_public: true, share_token: shareToken })
    } catch (error) {
      console.error("Error generating share token:", error)
    }
  }

  const togglePublicEdit = async () => {
    if (!note || !user) return

    try {
      const { error } = await supabase
        .from("notes")
        .update({
          allow_public_edit: !note.allow_public_edit,
        })
        .eq("id", note.id)

      if (error) throw error

      setNote({ ...note, allow_public_edit: !note.allow_public_edit })
    } catch (error) {
      console.error("Error updating edit permissions:", error)
    }
  }

  const stopSharing = async () => {
    if (!note || !user) return

    try {
      const { error } = await supabase
        .from("notes")
        .update({
          is_public: false,
          share_token: null,
          allow_public_edit: false,
        })
        .eq("id", note.id)

      if (error) throw error

      setNote({ ...note, is_public: false, share_token: null, allow_public_edit: false })
      setShowShareMenu(false)
    } catch (error) {
      console.error("Error stopping share:", error)
    }
  }

  const copyShareLink = async () => {
    if (!note?.share_token) return

    const shareUrl = `${window.location.origin}/share/${note.share_token}`
    await navigator.clipboard.writeText(shareUrl)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const startEditing = () => {
    setIsEditing(true)
  }

  const stopEditing = async () => {
    if (hasUnsavedChanges) {
      await saveNote()
    }
    setIsEditing(false)
  }

  const deleteNote = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("notes").delete().eq("id", params.id)

      if (error) throw error

      router.push("/")
    } catch (error) {
      console.error("Error deleting note:", error)
      setIsLoading(false)
    }
  }

  const startDeleteConfirmation = () => {
    setIsConfirmingDelete(true)
  }

  const cancelDeleteConfirmation = () => {
    setIsConfirmingDelete(false)
  }

  const convertHtmlToMarkdown = (html: string) => {
    // Basic HTML to Markdown conversion (can be improved)
    let markdown = html
      .replace(/<br\s*[/]?>/gi, "\n") // Convert line breaks
      .replace(/<b>(.*?)<\/b>/gi, "**$1**") // Convert bold tags
      .replace(/<i>(.*?)<\/i>/gi, "*$1*") // Convert italic tags
      .replace(/<p>(.*?)<\/p>/gi, "$1\n\n") // Convert paragraph tags
      .replace(/&nbsp;/gi, " ") // Convert non-breaking spaces
      .replace(/&lt;/gi, "<") // Convert less-than signs
      .replace(/&gt;/gi, ">") // Convert greater-than signs

    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, "")

    return markdown
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()

    const text = e.clipboardData.getData("text/plain")
    const html = e.clipboardData.getData("text/html")

    let markdown = text

    if (html) {
      markdown = convertHtmlToMarkdown(html)
    }

    document.execCommand("insertText", false, markdown)
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">loading...</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">note not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-4 text-sm">
          <span onClick={() => router.push("/")} className="text-black hover:underline cursor-pointer">
            ← back
          </span>
          {!isEditing ? (
            <>
              <span onClick={startEditing} className="text-black hover:underline cursor-pointer">
                edit
              </span>
              <span
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="text-black hover:underline cursor-pointer"
              >
                share
              </span>
              {!isConfirmingDelete ? (
                <span onClick={startDeleteConfirmation} className="text-black hover:underline cursor-pointer">
                  delete
                </span>
              ) : (
                <span className="text-black">
                  are you sure?{" "}
                  <span onClick={deleteNote} className="text-black hover:underline cursor-pointer">
                    yes
                  </span>
                  {" / "}
                  <span onClick={cancelDeleteConfirmation} className="text-black hover:underline cursor-pointer">
                    no
                  </span>
                </span>
              )}
            </>
          ) : (
            <>
              <span onClick={stopEditing} className="text-black hover:underline cursor-pointer">
                done
              </span>
              {isSaving && <span className="text-gray-500">saving...</span>}
              {hasUnsavedChanges && !isSaving && <span className="text-gray-500">unsaved changes</span>}
            </>
          )}
        </div>

        {showShareMenu && (
          <div className="mb-8 p-4 border border-gray-200 space-y-3">
            {!note.is_public ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">this note is private</p>
                <span onClick={generateShareToken} className="text-sm text-black hover:underline cursor-pointer">
                  make public
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">this note is public</p>
                  <div className="flex items-center gap-2">
                    <span onClick={copyShareLink} className="text-sm text-black hover:underline cursor-pointer">
                      copy link
                    </span>
                    {copySuccess && <span className="text-sm text-gray-500">copied!</span>}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={note.allow_public_edit}
                      onChange={togglePublicEdit}
                      className="w-3 h-3"
                    />
                    allow public editing
                  </label>
                </div>
                <div>
                  <span onClick={stopSharing} className="text-sm text-black hover:underline cursor-pointer">
                    stop sharing
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {isEditing ? (
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
          <div className="max-w-none">
            <h2 className="text-xl font-normal mb-2">{note.title}</h2>
            <p className="text-xs text-gray-500 mb-8 ui-text">updated {note.updated_at}</p>
            <div className="minimal-prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-medium mt-6 mb-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-medium mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                  code: ({ inline, children }) => {
                    if (inline) {
                      return (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono border">{children}</code>
                      )
                    }
                    return (
                      <code className="block bg-gray-100 p-3 rounded border font-mono text-sm overflow-x-auto">
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 p-3 rounded border font-mono text-sm overflow-x-auto my-4">
                      {children}
                    </pre>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-black underline decoration-gray-400 hover:decoration-black transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {note.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
