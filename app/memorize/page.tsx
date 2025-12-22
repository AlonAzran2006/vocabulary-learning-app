"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Home, BookOpen, Languages, Sparkles } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataType, DEFAULT_DATA_TYPE, getAllDataTypes, getDataTypeInfo } from "@/lib/types"

export default function MemorizePage() {
  const units = Array.from({ length: 10 }, (_, i) => i + 1)
  const [selectedDataType, setSelectedDataType] = useState<DataType>(
    (typeof window !== "undefined" 
      ? (localStorage.getItem("memorizeDataType") as DataType) || DEFAULT_DATA_TYPE
      : DEFAULT_DATA_TYPE)
  )

  const handleDataTypeChange = (dataType: DataType) => {
    setSelectedDataType(dataType)
    if (typeof window !== "undefined") {
      localStorage.setItem("memorizeDataType", dataType)
    }
  }

  const dataTypeInfo = getDataTypeInfo(selectedDataType)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 dark:bg-primary/20">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                בחר יחידה לשינון
              </h1>
            </div>
          </div>
          <Link href="/">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl h-12 w-12 border-2 hover:bg-accent hover:scale-110 transition-all duration-200 shadow-sm"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Language Selection Card */}
        <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">בחר שפה</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getAllDataTypes().reverse().map((dataTypeInfo) => {
                const isSelected = selectedDataType === dataTypeInfo.code
                return (
                  <button
                    key={dataTypeInfo.code}
                    onClick={() => handleDataTypeChange(dataTypeInfo.code)}
                    className={`
                      relative p-6 rounded-2xl border-2 transition-all duration-300 text-right
                      ${isSelected 
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg scale-[1.02]' 
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50 hover:shadow-md'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-3 left-3">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className={`text-xl font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {dataTypeInfo.label}
                      </h3>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Units Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              יחידות לשינון
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {units.map((unit, index) => {
              // צבעים שונים לאנגלית ולעברית
              const isEnglish = selectedDataType === "en_he"
              const numberColor = isEnglish 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-emerald-600 dark:text-emerald-400"
              const textColor = isEnglish
                ? "text-blue-500 dark:text-blue-400"
                : "text-emerald-500 dark:text-emerald-400"
              
              return (
                <Link 
                  key={unit} 
                  href={`/memorize/${unit}?data_type=${selectedDataType}`}
                  className="group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card className={`h-full border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer overflow-hidden ${
                    isEnglish 
                      ? "hover:border-blue-500/50 group-hover:bg-gradient-to-br group-hover:from-blue-500/5 group-hover:to-blue-500/10 dark:group-hover:from-blue-500/10 dark:group-hover:to-blue-500/20"
                      : "hover:border-emerald-500/50 group-hover:bg-gradient-to-br group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 dark:group-hover:from-emerald-500/10 dark:group-hover:to-emerald-500/20"
                  }`}>
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[120px] space-y-2">
                      <div className={`text-3xl md:text-4xl font-bold ${numberColor} group-hover:scale-110 transition-transform duration-300`}>
                        {unit}
                      </div>
                      <div className={`text-sm font-semibold ${textColor} group-hover:opacity-100 transition-colors`}>
                        יחידה {unit}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-center text-muted-foreground">
              <span className="font-semibold text-foreground">נבחר:</span> {dataTypeInfo.description}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
