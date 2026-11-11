'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { QUOTES, quoteOfTheDay } from '@/lib/quotes'
import { formatTime } from '@/lib/types'

interface BmwHeroProps {
  currentStreak: number
  bestStreak: number
  totalTracked: number
}

export function BmwHero({ currentStreak, bestStreak, totalTracked }: BmwHeroProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [ready, setReady] = useState(false)

  // Pick today's quote after hydration so the server and client agree.
  useEffect(() => {
    const today = quoteOfTheDay()
    setQuoteIndex(Math.max(0, QUOTES.indexOf(today)))
    setReady(true)
  }, [])

  // Rotate slowly; the fade is keyed to the index.
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((index) => (index + 1) % QUOTES.length)
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  const quote = QUOTES[quoteIndex]

  const nextQuote = () => {
    setQuoteIndex((index) => (index + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length)
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-media">
        <Image
          src="/bmw-5-series.jpg"
          alt="White BMW 5 Series (G60) with the M Sport package"
          fill
          priority
          sizes="(max-width: 720px) 100vw, (max-width: 1120px) 100vw, 1100px"
          className="hero-img"
        />
        <div className="hero-gradient" aria-hidden="true" />
        <div className="hero-shine" aria-hidden="true" />
        <div className="speed-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="hero-content">
        <p className="hero-eyebrow">
          <span className="m-stripe" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Drive your day
        </p>

        <h1 id="hero-title">
          Stay consistent.
          <br />
          <span className="gradient-text">Build momentum.</span>
        </h1>

        <p className="hero-copy">
          Every focused session is another mile. Show up daily, keep the streak alive, and let the
          momentum carry you.
        </p>

        <blockquote className="quote" key={quoteIndex} aria-live="off">
          <p>&ldquo;{quote.text}&rdquo;</p>
          <footer>- {quote.author}</footer>
        </blockquote>

        <div className="hero-actions">
          <a className="button primary" href="#new-session">
            Start a session
          </a>
          <button type="button" className="button ghost" onClick={nextQuote} disabled={!ready}>
            New quote
          </button>
        </div>

        <dl className="hero-stats">
          <div>
            <dt>Current streak</dt>
            <dd>
              {currentStreak}
              <small>days</small>
            </dd>
          </div>
          <div>
            <dt>Best streak</dt>
            <dd>
              {bestStreak}
              <small>days</small>
            </dd>
          </div>
          <div>
            <dt>Total focus</dt>
            <dd>{formatTime(totalTracked)}</dd>
          </div>
        </dl>
      </div>

      <a
        className="hero-credit"
        href="https://commons.wikimedia.org/wiki/File:BMW_G60_520i_1X7A2443.jpg"
        target="_blank"
        rel="noreferrer"
      >
        BMW 5 Series &middot; Photo: Alexander-93 &middot; CC BY-SA 4.0
      </a>
    </section>
  )
}
