/**
 * Calculates the total score based on Twitter, wallet, and Telegram scores
 * This is a simplified algorithm for demonstration purposes
 */
export function calculateScore(twitterScore: number, walletScore: number, telegramScore: number): number {
  // Weight the scores (Twitter has highest weight in this example)
  const weightedTwitter = twitterScore * 0.5
  const weightedWallet = walletScore * 0.3
  const weightedTelegram = telegramScore * 0.2

  // Calculate total score (0-100 scale)
  return Math.round(weightedTwitter + weightedWallet + weightedTelegram)
}

