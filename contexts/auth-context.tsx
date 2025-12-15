"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth, isConfigValid } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isConfigValid || !auth) {
      console.error("[v0] Firebase is not configured. Skipping auth setup.")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!isConfigValid || !auth) {
      toast({
        title: "שגיאה",
        description: "Firebase לא מוגדר. אנא הוסף את משתני הסביבה הנדרשים.",
        variant: "destructive",
      })
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      toast({
        title: "התחברת בהצלחה!",
        description: `ברוך הבא, ${user.displayName || user.email}`,
      })

      router.push("/trainings")
    } catch (error: any) {
      let errorMessage = "אירעה שגיאה בעת ההתחברות"

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "ההתחברות בוטלה"
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "החלון הקופץ נחסם. אנא אפשר חלונות קופצים ונסה שוב"
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "בעיית תקשורת. בדוק את החיבור לאינטרנט"
      }

      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const signOut = async () => {
    if (!isConfigValid || !auth) {
      return
    }

    try {
      await firebaseSignOut(auth)
      console.log("[v0] User signed out successfully")

      toast({
        title: "התנתקת בהצלחה",
        description: "להתראות!",
      })

      router.push("/")
    } catch (error) {
      console.error("[v0] Sign-out error:", error)
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת ההתנתקות",
        variant: "destructive",
      })
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
