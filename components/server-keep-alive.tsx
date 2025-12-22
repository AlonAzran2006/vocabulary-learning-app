"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export function ServerKeepAlive() {
  const { user } = useAuth()

  useEffect(() => {
    const pingServer = async () => {
      // Only ping if user is authenticated
      if (!user?.uid) {
        return
      }

      try {
        // Simple GET request to our own domain - no CORS issues
        // Include user_uid parameter to avoid 422 errors
        await fetch(
          `/api/proxy/list_trainings?user_uid=${encodeURIComponent(user.uid)}`,
          {
            method: "GET",
          }
        )
        console.log("[v0] Server keep-alive ping sent")
      } catch (error) {
        console.log("[v0] Server keep-alive ping failed:", error)
      }
    }

    // Ping immediately on mount (only if user is available)
    pingServer()

    // Set up interval to ping every 5 minutes (300000ms)
    const interval = setInterval(pingServer, 5 * 60 * 1000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [user])

  return null // This component doesn't render anything
}
