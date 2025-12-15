"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Home, ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Word {
  id: string
  word: string
  meaning: string
  knowing_grade: number
}

type FilterType = "known" | "partial" | "unknown" | "unclassified"

export default function MemorizeUnitPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const unit = Number.parseInt(params.unit as string)

  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set())
  const [wordsPerPage, setWordsPerPage] = useState(10)

  useEffect(() => {
    loadUnit()
  }, [unit])

  const loadUnit = async () => {
    try {
      setLoading(true)

      console.log("[v0] Loading unit:", unit)
      const response = await fetch("/api/proxy/memorize_unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_index: unit }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Loaded unit data:", data)

      if (data.status === "ok") {
        setWords(data.words)
      } else {
        throw new Error("Failed to load unit")
      }
    } catch (error) {
      console.error("[v0] Error loading unit:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את היחידה",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateWordGrade = async (wordId: string, newGrade: number) => {
    try {
      console.log("[v0] Updating word grade:", { wordId, newGrade })
      const response = await fetch("/api/proxy/memorization_update_word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: wordId, new_grade: newGrade }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Word grade updated:", data)

      if (data.status === "ok") {
        // Update local state
        setWords((prevWords) => prevWords.map((w) => (w.id === wordId ? { ...w, knowing_grade: newGrade } : w)))
      }
    } catch (error) {
      console.error("[v0] Error updating word grade:", error)
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הציון",
        variant: "destructive",
      })
    }
  }

  const toggleReveal = (wordId: string) => {
    setRevealedWords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(wordId)) {
        newSet.delete(wordId)
      } else {
        newSet.add(wordId)
      }
      return newSet
    })
  }

  const toggleFilter = (filterType: FilterType) => {
    setActiveFilters((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(filterType)) {
        newSet.delete(filterType)
      } else {
        newSet.add(filterType)
      }
      return newSet
    })
    setCurrentPage(0)
  }

  const getFilteredWords = () => {
    if (activeFilters.size === 0) return words

    return words.filter((w) => {
      if (activeFilters.has("known") && w.knowing_grade === 10) return true
      if (activeFilters.has("partial") && w.knowing_grade > 0 && w.knowing_grade < 10) return true
      if (activeFilters.has("unknown") && w.knowing_grade === 0) return true
      if (activeFilters.has("unclassified") && w.knowing_grade === -1) return true
      return false
    })
  }

  const filteredWords = getFilteredWords()
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage)
  const startIndex = currentPage * wordsPerPage
  const endIndex = Math.min(startIndex + wordsPerPage, filteredWords.length)
  const currentWords = filteredWords.slice(startIndex, endIndex)

  const getBorderColor = (grade: number) => {
    if (grade === -1) return "border-gray-400"
    if (grade === 0) return "border-red-500"
    if (grade === 10) return "border-green-500"
    return "border-yellow-500"
  }

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === "known") return words.filter((w) => w.knowing_grade === 10).length
    if (filterType === "partial") return words.filter((w) => w.knowing_grade > 0 && w.knowing_grade < 10).length
    if (filterType === "unknown") return words.filter((w) => w.knowing_grade === 0).length
    if (filterType === "unclassified") return words.filter((w) => w.knowing_grade === -1).length
    return 0
  }

  const handlePageSizeChange = (value: string) => {
    const size = Number.parseInt(value)
    if (size > 0 && size <= 100) {
      setWordsPerPage(size)
      setCurrentPage(0)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary"
        dir="rtl"
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-lg text-muted-foreground">טוען יחידה {unit}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">שינון יחידה {unit}</h1>
            <p className="text-sm text-muted-foreground">
              סה"כ {words.length} מילים | מציג {startIndex + 1}-{endIndex}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/memorize">
              <Button variant="outline" size="icon" className="rounded-xl bg-transparent">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-xl bg-transparent">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Words per page selector */}
        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <Label htmlFor="pageSize" className="text-sm font-medium whitespace-nowrap">
            מילים בעמוד:
          </Label>
          <Input
            id="pageSize"
            type="number"
            min="1"
            max="100"
            value={wordsPerPage}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            className="w-20 rounded-lg"
          />
          <span className="text-xs text-muted-foreground">מסננים פעילים: {activeFilters.size || "ללא"}</span>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilters.has("known") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("known")}
            className="rounded-lg border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            data-state={activeFilters.has("known") ? "active" : "inactive"}
          >
            יודע ({getFilterCount("known")})
          </Button>
          <Button
            variant={activeFilters.has("partial") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("partial")}
            className="rounded-lg border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            data-state={activeFilters.has("partial") ? "active" : "inactive"}
          >
            בערך ({getFilterCount("partial")})
          </Button>
          <Button
            variant={activeFilters.has("unknown") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("unknown")}
            className="rounded-lg border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 data-[state=active]:bg-red-500 data-[state=active]:text-white"
            data-state={activeFilters.has("unknown") ? "active" : "inactive"}
          >
            לא יודע ({getFilterCount("unknown")})
          </Button>
          <Button
            variant={activeFilters.has("unclassified") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("unclassified")}
            className="rounded-lg border-gray-400 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950 data-[state=active]:bg-gray-500 data-[state=active]:text-white"
            data-state={activeFilters.has("unclassified") ? "active" : "inactive"}
          >
            לא מסווג ({getFilterCount("unclassified")})
          </Button>
          {activeFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFilters(new Set())
                setCurrentPage(0)
              }}
              className="rounded-lg"
            >
              נקה מסננים
            </Button>
          )}
        </div>

        {/* Words Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentWords.map((word) => (
            <div
              key={word.id}
              className={`p-4 rounded-xl border-4 ${getBorderColor(word.knowing_grade)} bg-card shadow-md transition-all duration-200 hover:shadow-lg space-y-3`}
            >
              {/* Word (clickable) */}
              <button onClick={() => toggleReveal(word.id)} className="w-full text-right">
                <p className="text-xl font-bold text-foreground hover:text-primary transition-colors">{word.word}</p>
              </button>

              {/* Meaning (revealed) */}
              {revealedWords.has(word.id) && (
                <p className="text-base text-foreground animate-fade-in">{word.meaning}</p>
              )}

              {/* Grade Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant={word.knowing_grade === 0 ? "default" : "outline"}
                  onClick={() => updateWordGrade(word.id, 0)}
                  className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 text-white border-red-500"
                >
                  לא יודע
                </Button>
                <Button
                  size="sm"
                  variant={word.knowing_grade > 0 && word.knowing_grade < 10 ? "default" : "outline"}
                  onClick={() => updateWordGrade(word.id, 5)}
                  className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                >
                  בערך
                </Button>
                <Button
                  size="sm"
                  variant={word.knowing_grade === 10 ? "default" : "outline"}
                  onClick={() => updateWordGrade(word.id, 10)}
                  className="flex-1 rounded-lg bg-green-500 hover:bg-green-600 text-white border-green-500"
                >
                  יודע
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              עמוד {currentPage + 1} מתוך {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
