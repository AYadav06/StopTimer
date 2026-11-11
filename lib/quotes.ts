export interface Quote {
  text: string
  author: string
}

/**
 * Short, sourced quotes. Kept intentionally free of disputed attributions.
 */
export const QUOTES: readonly Quote[] = [
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Motivation gets you started. Habit keeps you going.', author: 'Jim Ryun' },
  { text: 'Small deeds done are better than great deeds planned.', author: 'Peter Marshall' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
  { text: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
  { text: 'Consistency is what transforms average into excellence.', author: 'Anonymous' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Do not count the days. Make the days count.', author: 'Muhammad Ali' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese proverb' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { text: 'It is not about having time. It is about making time.', author: 'Anonymous' },
  { text: 'Progress, not perfection.', author: 'Anonymous' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
]

export function quoteOfTheDay(now = Date.now()): Quote {
  const today = new Date(now)
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / 86_400_000)
  return QUOTES[Math.abs(dayOfYear) % QUOTES.length]
}
