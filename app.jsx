"use client"

import { useState, useEffect, useRef } from "react"
import "./index.css"

// Define types for our data structures
// Badge represents a user achievement
const Badge = ({ id, name, icon }) => (
  <span className="inline-flex items-center rounded-md border border-purple-400/30 bg-purple-800/30 px-2 py-1 text-xs font-medium text-white">
    {icon} {name}
  </span>
)

// Score calculation function
function calculateScore(twitterScore, walletScore, telegramScore) {
  const weightedTwitter = twitterScore * 0.5
  const weightedWallet = walletScore * 0.3
  const weightedTelegram = telegramScore * 0.2
  return Math.round(weightedTwitter + weightedWallet + weightedTelegram)
}

function App() {
  const [username, setUsername] = useState("")
  const [users, setUsers] = useState([])
  const [tempUsers, setTempUsers] = useState([])
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState("")
  const [hoverInfo, setHoverInfo] = useState(null)
  const canvasRef = useRef(null)
  const userPositionsRef = useRef([])

  // Load users from localStorage on initial render
  useEffect(() => {
    const savedUsers = localStorage.getItem("users")
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers))
      } catch (e) {
        console.error("Failed to parse saved users", e)
      }
    }
  }, [])

  // Save users to localStorage when they change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("users", JSON.stringify(users))
    }
  }, [users])

  // Draw the graph whenever users or tempUsers change
  useEffect(() => {
    drawGraph()
  }, [users, tempUsers, hoverInfo])

  // Handle mouse movement for hover effects
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Check if mouse is over any user position
    const hoveredUser = userPositionsRef.current.find((item) => {
      const { x, y, size } = item
      return mouseX >= x - size / 2 && mouseX <= x + size / 2 && mouseY >= y - size / 2 && mouseY <= y + size / 2
    })

    if (hoveredUser) {
      setHoverInfo({
        user: hoveredUser.user,
        x: hoveredUser.x,
        y: hoveredUser.y,
      })
    } else {
      setHoverInfo(null)
    }
  }

  // Function to draw the graph
  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Reset user positions
    userPositionsRef.current = []

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Set background - darker theme
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, "rgba(10, 10, 18, 0.95)")
    gradient.addColorStop(1, "rgba(20, 10, 30, 0.95)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid
    ctx.strokeStyle = "rgba(100, 65, 165, 0.15)"
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * rect.width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * rect.height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = "rgba(180, 120, 255, 0.5)"
    ctx.lineWidth = 2

    // X-axis
    ctx.beginPath()
    ctx.moveTo(0, rect.height - 30)
    ctx.lineTo(rect.width, rect.height - 30)
    ctx.stroke()

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(30, rect.height)
    ctx.stroke()

    // Draw axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"

    // X-axis label
    ctx.fillText("Total Score", rect.width / 2, rect.height - 10)

    // Y-axis label
    ctx.save()
    ctx.translate(10, rect.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText("Total Badges", 0, 0)
    ctx.restore()

    // Calculate the maximum score and badge count for scaling
    const maxScore = Math.max(
      100, // Minimum scale
      ...users.map((user) => user.totalScore),
      ...tempUsers.map((user) => user.totalScore),
    )

    const maxBadges = Math.max(
      5, // Minimum scale
      ...users.map((user) => user.badges.length),
      ...tempUsers.map((user) => user.badges.length),
    )

    // Draw scale markers
    ctx.textAlign = "right"
    ctx.fillText("0", 25, rect.height - 25)
    ctx.fillText(maxScore.toString(), rect.width - 5, rect.height - 25)

    ctx.textAlign = "left"
    ctx.fillText("0", 35, rect.height - 35)
    ctx.fillText(maxBadges.toString(), 35, 15)

    // Draw all users
    const allUsers = [...users, ...tempUsers]

    allUsers.forEach((user) => {
      // Determine if it's a temp user
      const isTemp = !("walletScore" in user)

      // Calculate position
      const x = 30 + (user.totalScore / maxScore) * (rect.width - 60)
      const y = rect.height - 30 - (user.badges.length / maxBadges) * (rect.height - 60)

      // Define image size (larger square - one grid cell)
      const cellSize = Math.min(rect.width, rect.height) / 10
      const imageSize = cellSize * 0.8 // 80% of a grid cell

      // Store user position for hover detection
      userPositionsRef.current.push({
        x,
        y,
        size: imageSize,
        user,
      })

      // Draw username
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`@${user.username}`, x, y + imageSize / 2 + 15)

      // Draw profile image background glow
      const glowGradient = ctx.createRadialGradient(x, y, imageSize / 2, x, y, imageSize)
      glowGradient.addColorStop(0, isTemp ? "rgba(255, 100, 100, 0.8)" : "rgba(138, 43, 226, 0.8)")
      glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.beginPath()
      ctx.rect(x - imageSize / 2 - 5, y - imageSize / 2 - 5, imageSize + 10, imageSize + 10)
      ctx.fillStyle = glowGradient
      ctx.fill()

      // Draw profile image border (square)
      ctx.beginPath()
      ctx.rect(x - imageSize / 2, y - imageSize / 2, imageSize, imageSize)
      ctx.strokeStyle = isTemp ? "rgba(255, 100, 100, 0.9)" : "rgba(138, 43, 226, 0.9)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Load and draw profile image (square)
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = user.profileImageUrl

      img.onload = () => {
        // Draw square profile image
        ctx.save()
        ctx.beginPath()
        ctx.rect(x - imageSize / 2, y - imageSize / 2, imageSize, imageSize)
        ctx.clip()
        ctx.drawImage(img, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize)
        ctx.restore()
      }
    })

    // Draw hover info if available
    if (hoverInfo) {
      const { user, x, y } = hoverInfo
      const isTemp = !("walletScore" in user)

      // Draw info box
      ctx.fillStyle = isTemp ? "rgba(255, 100, 100, 0.9)" : "rgba(138, 43, 226, 0.9)"
      ctx.fillRect(x - 80, y - 100, 160, 80)

      // Draw info text
      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`Score: ${user.totalScore}`, x, y - 75)
      ctx.fillText(`Badges: ${user.badges.length}`, x, y - 55)

      if (!isTemp) {
        ctx.fillText(`Twitter: ${user.twitterScore}`, x, y - 35)
      } else {
        ctx.fillText("Connect wallet for full score", x, y - 35)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)

    try {
      // In a real app, you would fetch actual user data from Twitter API
      // For now, we'll simulate with random data
      const twitterScore = Math.floor(Math.random() * 100)
      const walletScore = Math.floor(Math.random() * 100)
      const telegramScore = Math.floor(Math.random() * 100)

      // Calculate total score based on algorithm
      const totalScore = calculateScore(twitterScore, walletScore, telegramScore)

      // Generate random badges
      const badges = [
        { id: "1", name: "Early Adopter", icon: "🌟" },
        { id: "2", name: "Content Creator", icon: "📝" },
        { id: "3", name: "Community Builder", icon: "🏗️" },
      ].filter(() => Math.random() > 0.5)

      // Check if this is a full user or temp user
      const isFullUser = Math.random() > 0.3 // 70% chance of being a full user

      if (isFullUser) {
        const newUser = {
          id: Date.now().toString(),
          username,
          profileImageUrl: `https://via.placeholder.com/100x100`,
          twitterScore,
          walletScore,
          telegramScore,
          totalScore,
          badges,
          isVerified: Math.random() > 0.7,
        }
        setUsers([...users, newUser])
        setNotification(`@${username} has been added to the graph with full data.`)
      } else {
        // Create temporary user with only Twitter data
        const tempUser = {
          id: `temp-${Date.now().toString()}`,
          username,
          profileImageUrl: `https://via.placeholder.com/100x100`,
          twitterScore,
          totalScore: twitterScore, // For temp users, total score is just Twitter score
          badges: badges.slice(0, 1), // Temp users get fewer badges
        }
        setTempUsers([...tempUsers, tempUser])
        setNotification(
          `@${username} has been added with Twitter data only. Connect wallet and Telegram for full score.`,
        )
      }

      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification("")
      }, 5000)

      setUsername("")
    } catch (error) {
      console.error("Error fetching user data:", error)
      setNotification("Error adding user. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const clearUsers = () => {
    setUsers([])
    setTempUsers([])
    localStorage.removeItem("users")
    setNotification("All users have been cleared.")

    // Clear notification after 3 seconds
    setTimeout(() => {
      setNotification("")
    }, 3000)
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#050508]">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-purple-400"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              User Score & Badge Analysis
            </span>
          </h1>

          <form onSubmit={handleSubmit} className="w-full flex gap-2 max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter Twitter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-[#1a1a2e]/80 border border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2 rounded-md bg-[#1a1a2e]/80 border border-purple-500/30 text-gray-200 hover:bg-purple-900/30 hover:border-purple-500/50 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowUserPanel(!showUserPanel)}
              className="p-2 rounded-md bg-purple-600/80 border border-purple-500/50 text-white hover:bg-purple-700 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
            </button>
          </form>

          {/* Notification */}
          {notification && (
            <div className="mt-4 w-full max-w-md p-3 rounded-lg bg-purple-900/30 border border-purple-500/30 text-white text-center animate-fadeIn">
              {notification}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {showUserPanel && (
            <div className="w-full md:w-96">
              <div
                className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#16162a]/80 rounded-lg overflow-hidden h-full border border-purple-500/30 shadow-xl"
                style={{ backdropFilter: "blur(10px)" }}
              >
                <div className="bg-purple-900/80 p-3 border-b border-purple-500/30">
                  <h2 className="text-lg font-bold text-white flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-300 mr-2"
                    >
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      <path d="M5 3v4" />
                      <path d="M19 17v4" />
                      <path d="M3 5h4" />
                      <path d="M17 19h4" />
                    </svg>
                    User Analysis
                  </h2>
                </div>

                <div className="p-4">
                  {users.length === 0 && tempUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-200">
                      <div className="border-2 border-dashed border-purple-400/30 p-6 rounded-lg mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-purple-300 mx-auto mb-2"
                        >
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          <path d="M5 3v4" />
                          <path d="M19 17v4" />
                          <path d="M3 5h4" />
                          <path d="M17 19h4" />
                        </svg>
                      </div>
                      <p>No users analyzed yet. Enter a Twitter username to see their score and badges.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {[...users, ...tempUsers].map((user) => {
                        const isTemp = !("walletScore" in user)

                        return (
                          <div
                            key={user.id}
                            className={`${isTemp ? "bg-red-900/20" : "bg-purple-900/20"} rounded-lg p-3 border ${isTemp ? "border-red-500/30" : "border-purple-500/30"} hover:border-opacity-50 transition-all`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-none overflow-hidden border-2 shadow-glow border-purple-400/70">
                                <img
                                  src={user.profileImageUrl || "https://via.placeholder.com/100x100"}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h3 className="font-bold text-white">@{user.username}</h3>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-purple-200">Score: {user.totalScore}</span>
                                  <span className="text-xs text-purple-200">•</span>
                                  <span className="text-xs text-purple-200">Badges: {user.badges.length}</span>
                                </div>
                              </div>

                              {isTemp && (
                                <div className="ml-auto px-2 py-1 bg-red-600/70 rounded text-xs font-medium text-white flex items-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mr-1"
                                  >
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                    <path d="M12 9v4" />
                                    <path d="M12 17h.01" />
                                  </svg>
                                  Temp
                                </div>
                              )}

                              {!isTemp && user.isVerified && (
                                <div className="ml-auto px-2 py-1 bg-blue-600/70 rounded text-xs font-medium text-white">
                                  Verified
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <h4 className="text-xs font-semibold text-purple-200 mb-1">Badges:</h4>
                              <div className="flex flex-wrap gap-2">
                                {user.badges.map((badge) => (
                                  <Badge key={badge.id} {...badge} />
                                ))}

                                {user.badges.length === 0 && (
                                  <span className="text-xs text-purple-300">No badges earned yet</span>
                                )}
                              </div>
                            </div>

                            {!isTemp && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="bg-purple-900/30 p-2 rounded border border-purple-500/20">
                                  <div className="text-xs text-purple-300">Twitter</div>
                                  <div className="font-bold text-white">{user.twitterScore}</div>
                                </div>
                                <div className="bg-purple-900/30 p-2 rounded border border-purple-500/20">
                                  <div className="text-xs text-purple-300">Wallet</div>
                                  <div className="font-bold text-white">{user.walletScore}</div>
                                </div>
                                <div className="bg-purple-900/30 p-2 rounded border border-purple-500/20">
                                  <div className="text-xs text-purple-300">Telegram</div>
                                  <div className="font-bold text-white">{user.telegramScore}</div>
                                </div>
                              </div>
                            )}

                            {isTemp && (
                              <div className="mt-3 p-2 bg-red-900/20 rounded border border-red-500/20">
                                <p className="text-xs text-red-200">
                                  <span className="font-semibold">Limited data:</span> To get a complete profile and
                                  accurate total score, please connect your wallet and Telegram account.
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`flex-1 ${showUserPanel ? "md:max-w-[calc(100%-24rem)]" : "w-full"}`}>
            <div className="p-6 bg-[#1a1a2e]/80 rounded-lg border border-purple-500/30 shadow-xl">
              <div className="w-full">
                <div className="flex justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-none bg-purple-600 mr-2"></div>
                    <span className="text-white text-sm">Full Users</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-none bg-red-400 mr-2"></div>
                    <span className="text-white text-sm">Temporary Users</span>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full aspect-[4/3] rounded-lg border border-purple-500/30 bg-black/50"
                  style={{
                    boxShadow: "0 0 30px rgba(138, 43, 226, 0.15)",
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoverInfo(null)}
                />
                <div className="mt-2 text-xs text-purple-300 text-center">
                  <span className="italic">Hover over a user to see details</span>
                </div>
              </div>

              {users.length === 0 && tempUsers.length === 0 && (
                <div className="mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-2 text-purple-300"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <p className="text-purple-100">
                    Enter a Twitter username to plot it on the graph. The X-axis represents total score, and the Y-axis
                    represents total badges.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6 gap-4">
          <button
            onClick={() => setShowUserPanel(!showUserPanel)}
            className="px-4 py-2 bg-purple-600/80 hover:bg-purple-700 border border-purple-500/50 text-white rounded-full flex items-center shadow-lg shadow-purple-900/20 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
            User details
          </button>

          <button
            onClick={clearUsers}
            className="px-4 py-2 bg-pink-500/70 hover:bg-pink-600 border border-pink-400/50 text-white rounded-full flex items-center shadow-lg shadow-pink-900/20 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
            Clear all
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-8">
          <p>For a proper plot with total score and total badges, please login with all required logins</p>
        </div>
      </div>
    </main>
  )
}

export default App

