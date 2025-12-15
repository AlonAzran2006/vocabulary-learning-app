"use client"

import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import Link from "next/link"

export default function MemorizePage() {
  const units = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">בחר יחידה לשינון</h1>
          <Link href="/">
            <Button variant="outline" size="icon" className="rounded-xl bg-transparent">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {units.map((unit) => (
            <Link key={unit} href={`/memorize/${unit}`}>
              <Button
                size="lg"
                className="w-full h-24 text-2xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.05] active:scale-[0.98] bg-primary text-primary-foreground"
              >
                יחידה {unit}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
