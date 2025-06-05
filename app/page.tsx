"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
}

export default function NotesListPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, signOut } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch notes from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user])

  const fetchNotes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("notes").select("*").order("updated_at", { ascending: false })

      if (error) throw error

      if (data) {
        setNotes(
          data.map((note) => ({
            ...note,
            updated_at: new Date(note.updated_at).toLocaleDateString(),
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewNote = () => {
    router.push("/note/new")
  }

  // Show auth form if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-xl font-normal">notes</h1>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="ui-text text-xl font-normal">notes</h1>
          <span onClick={() => signOut()} className="ui-text text-sm text-gray-500 hover:underline cursor-pointer">
            sign out
          </span>
        </div>

        {/* List View */}
        <div>
          <div className="mb-8">
            <span onClick={createNewNote} className="ui-text text-sm text-black hover:underline cursor-pointer">
              new note
            </span>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500">
              <p className="ui-text text-sm">loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-gray-500">
              <p className="ui-text text-sm">no notes yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {notes.map((note) => (
                <div key={note.id} className="border-b border-gray-100 pb-4">
                  <div
                    onClick={() => router.push(`/note/${note.id}`)}
                    className="block text-left w-full hover:text-gray-600 cursor-pointer"
                  >
                    <h3 className="font-medium mb-1">{note.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{note.content.substring(0, 120)}...</p>
                    <p className="text-xs text-gray-400 mt-2">{note.updated_at}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
