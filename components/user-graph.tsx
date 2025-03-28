"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import Image from "next/image"
import type { User, TempUser } from "@/types/user"

interface UserGraphProps {
  usernames: string[]
}

interface UserPosition {
  x: number;
  y: number;
  isTemp?: boolean;
}

// Global type for browser Image constructor
declare global {
  interface Window {
    Image: {
      new(): HTMLImageElement;
    }
  }
}

export default function UserGraph({ usernames }: UserGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tempUsers, setTempUsers] = useState<TempUser[]>([])
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const userPositionsRef = useRef<UserPosition[]>([])
  
  // Calculate maxScore/maxBadges based on state
  const maxScore = Math.max(
    100,
    ...users.map((user) => user.totalScore),
    ...tempUsers.map((user) => user.totalScore)
  )
  
  const maxBadges = Math.max(
    5,
    ...users.map((user) => user.badges.length),
    ...tempUsers.map((user) => user.badges.length)
  )

  // Draw profile image function (moved outside useEffect)
  const drawProfileImage = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    point: UserPosition
  ) => {
    const radius = point.isTemp ? 6 : 10
    ctx.save()
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(
      img,
      point.x - radius,
      point.y - radius,
      radius * 2,
      radius * 2
    )
    ctx.restore()
  }, [])

  // Load profile image function (moved outside useEffect)
  const loadProfileImage = useCallback((
    user: User | TempUser,
    point: UserPosition,
    ctx: CanvasRenderingContext2D,
    loadedImages: Map<string, HTMLImageElement>
  ) => {
    // Check if image is already loaded
    if (loadedImages.has(user.profileImageUrl)) {
      const img = loadedImages.get(user.profileImageUrl)
      if (img) {
        drawProfileImage(ctx, img, point)
      }
      return
    }

    // Create image with proper type
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      loadedImages.set(user.profileImageUrl, img)
      drawProfileImage(ctx, img, point)
    }

    img.onerror = () => {
      console.error(`Failed to load profile image for ${user.username}`)
      loadedImages.delete(user.profileImageUrl)
    }

    img.src = user.profileImageUrl
  }, [drawProfileImage])

  // Fetch user data from the backend with error handling and cleanup
  const fetchUsers = useCallback(() => {
    // Create abort controller for cleanup
    const controller = new AbortController()
    const signal = controller.signal
    
    // Immediately start the fetch process
    const fetchProcess = async () => {
      try {
        const responses = await Promise.all(
          usernames.map((username) =>
            fetch(`${baseUrl}/api/chart/user`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username }),
              signal,
            })
              .then((res) => {
                if (!res.ok) {
                  throw new Error(`HTTP error! Status: ${res.status}`)
                }
                return res.json()
              })
              .catch((error) => {
                console.error(`Error fetching user ${username}:`, error)
                return null // Return null for failed requests
              })
          )
        )

        const realUsers: User[] = []
        const temporary: TempUser[] = []

        for (const user of responses) {
          if (user && user.username) {
            if (user.isVerified) {
              realUsers.push(user)
            } else {
              temporary.push(user)
            }
          }
        }

        setUsers(realUsers)
        setTempUsers(temporary)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }
    
    // Start the fetch process
    fetchProcess()
    
    // Return abort function directly
    return () => controller.abort()
  }, [usernames, baseUrl])

  // Fetch initially and every 5 seconds with proper cleanup
  useEffect(() => {
    // Get cleanup function (not a promise)
    const abortFn = fetchUsers()
    
    const interval = setInterval(() => {
      fetchUsers()
    }, 5000)
    
    return () => {
      // Clean up fetch requests
      abortFn()
      // Clean up interval
      clearInterval(interval)
    }
  }, [fetchUsers])

  // Draw user point function (moved outside useEffect)
  const drawUserPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    user: User | TempUser,
    isTemp: boolean,
    rect: DOMRect
  ): UserPosition => {
    const x = 30 + (user.totalScore / maxScore) * (rect.width - 60)
    const y = rect.height - 30 - (user.badges.length / maxBadges) * (rect.height - 60)

    ctx.beginPath()
    ctx.arc(x, y, isTemp ? 8 : 12, 0, Math.PI * 2)
    ctx.fillStyle = isTemp ? "rgba(255, 100, 100, 0.7)" : "rgba(138, 43, 226, 0.7)"
    ctx.fill()
    ctx.strokeStyle = isTemp ? "rgba(255, 100, 100, 0.9)" : "rgba(138, 43, 226, 0.9)"
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = "white"
    ctx.font = "10px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`@${user.username}`, x, y - 15)

    return { x, y, isTemp }
  }, [maxScore, maxBadges])

  // Draw graph with proper cleanup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a map to store loaded images
    const loadedImages = new Map<string, HTMLImageElement>()

    // Reset user positions
    userPositionsRef.current = []

    // Set canvas dimensions with requestAnimationFrame for better performance
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.fillRect(0, 0, rect.width, rect.height)

      // Draw grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * rect.width
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, rect.height)
        ctx.stroke()
      }
      for (let i = 0; i <= 10; i++) {
        const y = (i / 10) * rect.height
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(rect.width, y)
        ctx.stroke()
      }

      // Draw axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, rect.height - 30)
      ctx.lineTo(rect.width, rect.height - 30)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(30, 0)
      ctx.lineTo(30, rect.height)
      ctx.stroke()

      // Draw labels
      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Total Score", rect.width / 2, rect.height - 10)
      ctx.save()
      ctx.translate(10, rect.height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText("Total Badges", 0, 0)
      ctx.restore()

      ctx.textAlign = "right"
      ctx.fillText("0", 25, rect.height - 25)
      ctx.fillText(maxScore.toString(), rect.width - 5, rect.height - 25)

      ctx.textAlign = "left"
      ctx.fillText("0", 35, rect.height - 35)
      ctx.fillText(maxBadges.toString(), 35, 15)

      // Draw all users
      const userPoints = users.map((user) => drawUserPoint(ctx, user, false, rect))
      const tempUserPoints = tempUsers.map((user) => drawUserPoint(ctx, user, true, rect))

      // Use loadProfileImage to load and draw images
      users.forEach((user, i) => loadProfileImage(user, userPoints[i], ctx, loadedImages))
      tempUsers.forEach((user, i) => loadProfileImage(user, tempUserPoints[i], ctx, loadedImages))
    }

    // Use requestAnimationFrame for smoother rendering
    const animationId = requestAnimationFrame(draw)

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId)
      loadedImages.clear()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [users, tempUsers, maxScore, maxBadges, drawUserPoint, loadProfileImage])

  return (
    <div className="relative rounded-md bg-gray-900 p-4 h-[500px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-md"
      />
    </div>
  )
}
