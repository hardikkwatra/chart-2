"use client"

import type { User, TempUser } from "@/types/user"
import { Sparkles, AlertTriangle } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface UserPanelProps {
  users: User[]
  tempUsers: TempUser[]
}

export default function UserPanel({ users, tempUsers }: UserPanelProps) {
  const allUsers = [...users, ...tempUsers]

  return (
    <div
      className="bg-gradient-to-br from-purple-900/80 to-purple-800/50 rounded-lg overflow-hidden h-full border border-purple-500/50"
      style={{ backdropFilter: "blur(10px)" }}
    >
      <div className="bg-purple-800/80 p-3 border-b border-purple-500/50">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Sparkles className="text-purple-300 mr-2" size={20} />
          User Analysis
        </h2>
      </div>

      <div className="p-4">
        {allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-200">
            <div className="border-2 border-dashed border-purple-400/30 p-6 rounded-lg mb-4">
              <Sparkles size={32} className="text-purple-300 mx-auto mb-2" />
            </div>
            <p>No users analyzed yet. Enter a Twitter username to see their score and badges.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {allUsers.map((user) => {
              const isTemp = "walletScore" in user ? false : true

              return (
                <div
                  key={user.id}
                  className={`${isTemp ? "bg-red-900/30" : "bg-purple-800/30"} rounded-lg p-3 border ${isTemp ? "border-red-500/50" : "border-purple-500/50"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-glow border-purple-400/70">
                      <Image
                        src={user.profileImageUrl || "/placeholder.svg"}
                        alt={user.username}
                        width={40}
                        height={40}
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
                        <AlertTriangle size={12} className="mr-1" />
                        Temp
                      </div>
                    )}

                    {!isTemp && (user as User).isVerified && (
                      <div className="ml-auto px-2 py-1 bg-blue-600/70 rounded text-xs font-medium text-white">
                        Verified
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-purple-200 mb-1">Badges:</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.badges.map((badge) => (
                        <Badge
                          key={badge.id}
                          variant="outline"
                          className="bg-purple-700/50 text-white border-purple-400/50"
                        >
                          {badge.icon} {badge.name}
                        </Badge>
                      ))}

                      {user.badges.length === 0 && (
                        <span className="text-xs text-purple-300">No badges earned yet</span>
                      )}
                    </div>
                  </div>

                  {!isTemp && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="bg-purple-800/50 p-2 rounded">
                        <div className="text-xs text-purple-300">Twitter</div>
                        <div className="font-bold text-white">{(user as User).twitterScore}</div>
                      </div>
                      <div className="bg-purple-800/50 p-2 rounded">
                        <div className="text-xs text-purple-300">Wallet</div>
                        <div className="font-bold text-white">{(user as User).walletScore}</div>
                      </div>
                      <div className="bg-purple-800/50 p-2 rounded">
                        <div className="text-xs text-purple-300">Telegram</div>
                        <div className="font-bold text-white">{(user as User).telegramScore}</div>
                      </div>
                    </div>
                  )}

                  {isTemp && (
                    <div className="mt-3 p-2 bg-red-900/30 rounded border border-red-500/30">
                      <p className="text-xs text-red-200">
                        This is a temporary user with limited data. For a complete profile, please connect wallet and
                        Telegram.
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
  )
}

