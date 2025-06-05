"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "an error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-form w-full mx-auto">
      {error && <div className="text-black p-3 mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            id="email"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-gray-400 bg-transparent px-0"
          />
        </div>

        <div>
          <Input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-gray-400 bg-transparent px-0"
          />
        </div>

        <div className="pt-4">
          <span onClick={handleSubmit} className="ui-text text-sm text-black hover:underline cursor-pointer">
            {isLoading ? "loading..." : isSignUp ? "sign up" : "sign in"}
          </span>
        </div>
      </form>

      <div className="mt-4 text-center">
        <span
          onClick={() => setIsSignUp(!isSignUp)}
          className="ui-text text-sm text-black hover:underline cursor-pointer"
        >
          {isSignUp ? "already have an account? sign in" : "don't have an account? sign up"}
        </span>
      </div>
    </div>
  )
}
