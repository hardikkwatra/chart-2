"use client"

import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import type { User, TempUser } from "@/types/user"

interface UserGraphProps {
  usernames: string[] // Replace full data with just usernames
}

export default function UserGraph({ usernames }: UserGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tempUsers, setTempUsers] = useState<TempUser[]>([])
  const baseUrl = process.env.NEXT_PUBLIC_API_URL


  // Fetch user data from the backend
  const fetchUsers = async () => {
    try {
      const responses = await Promise.all(
        usernames.map((username) =>
          fetch(`${baseUrl}/api/chart/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          }).then((res) => res.json())
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

  // Fetch initially and every 5 seconds
  useEffect(() => {
    fetchUsers()
    const interval = setInterval(fetchUsers, 5000)
    return () => clearInterval(interval)
  }, [usernames])

  // Calculate maxScore/maxBadges based on state
  const maxScore = Math.max(
    100,
    ...users.map((user) => user.totalScore),
    ...tempUsers.map((user) => user.totalScore),
  )
  const maxBadges = Math.max(
    5,
    ...users.map((user) => user.badges.length),
    ...tempUsers.map((user) => user.badges.length),
  )

  // Draw the graph — no changes needed here except using state
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, rect.width, rect.height)

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

    const drawUserPoint = (user, isTemp) => {
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
    }

    const userPoints = users.map((user) => drawUserPoint(user, false))
    const tempUserPoints = tempUsers.map((user) => drawUserPoint(user, true))

    const loadProfileImage = (user, point) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.isTemp ? 6 : 10, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(
          img,
          point.x - (point.isTemp ? 6 : 10),
          point.y - (point.isTemp ? 6 : 10),
          point.isTemp ? 12 : 20,
          point.isTemp ? 12 : 20,
        )
        ctx.restore()
      }
      img.src = user.profileImageUrl
    }

    users.forEach((user, i) => loadProfileImage(user, userPoints[i]))
    tempUsers.forEach((user, i) => loadProfileImage(user, tempUserPoints[i]))
  }, [users, tempUsers, maxScore, maxBadges])

  return (
    <div className="w-full">
      <div className="flex justify-between mb-4">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-purple-600 mr-2"></div>
          <span className="text-white text-sm">Full Users</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-red-400 mr-2"></div>
          <span className="text-white text-sm">Temporary Users</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full aspect-square rounded-lg border border-purple-500/50 bg-black/50"
        style={{
          boxShadow: "0 0 20px rgba(168, 85, 247, 0.2)",
          background: "linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(30, 10, 60, 0.8))",
        }}
      />
    </div>
  )
}
