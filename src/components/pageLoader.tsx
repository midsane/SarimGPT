"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface PageLoaderProps {
  isLoading?: boolean
  onComplete?: () => void
}

export function PageLoader({ isLoading = true, onComplete }: PageLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    "Initializing AI models...",
    "Loading conversation history...",
    "Preparing chat interface...",
    "Almost ready...",
  ]

  useEffect(() => {
    if (!isLoading) return

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setTimeout(() => onComplete?.(), 500)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length)
    }, 1500)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
    }
  }, [isLoading, onComplete, steps.length])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-8 max-w-md mx-auto px-6">
        {/* Logo/Brand Area */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <img src="/chatgpt.png" />
          </div>

          {/* Animated rings */}
          <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/30 animate-ping" />
          <div className="absolute inset-0 rounded-2xl border border-purple-500/20 animate-pulse" />
        </div>

        {/* Main heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">MidGPT</h1>
          <p className="text-muted-foreground text-sm">Powered by advanced language models</p>
        </div>

        {/* Animated dots */}
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full bg-blue-500 animate-bounce",
                i === 1 && "animation-delay-150",
                i === 2 && "animation-delay-300",
              )}
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-3">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Loading text */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground animate-pulse">{steps[currentStep]}</p>
          </div>
        </div>

        {/* Percentage */}
        <div className="text-xs text-muted-foreground font-mono">{Math.round(Math.min(progress, 100))}%</div>
      </div>
    </div>
  )
}
