import React, { useEffect, useRef, useState } from 'react'
import './RainbowLoadingWave.css'

const loadingMessages = [
  "Loading your dashboard...",
  "Fetching the latest data...",
  "Almost there...",
  "Preparing your analytics...",
  "Gathering business insights...",
  "Loading KPI metrics...",
  "Refreshing your data...",
  "Your dashboard is loading...",
  "Syncing with BigQuery...",
  "Loading performance data...",
  "Getting the latest numbers...",
  "Just a moment...",
  "Loading Pink's Pulse..."
]

const RainbowLoadingWave: React.FC = () => {
  const textRef = useRef<HTMLDivElement>(null)
  const [message] = useState(() => {
    // Pick a random message when component mounts
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
  })

  useEffect(() => {
    if (textRef.current) {
      const text = textRef.current.textContent || ''
      textRef.current.innerHTML = ''
      
      // Split by words to maintain word boundaries
      const words = text.split(' ')
      let charIndex = 0
      
      words.forEach((word, wordIndex) => {
        // Create a wrapper span for each word
        const wordSpan = document.createElement('span')
        wordSpan.style.display = 'inline-block'
        wordSpan.style.whiteSpace = 'nowrap'
        
        // Add each character of the word
        for (let i = 0; i < word.length; i++) {
          const charSpan = document.createElement('span')
          charSpan.textContent = word[i]
          charSpan.className = 'rainbow-char'
          charSpan.style.animationDelay = `${charIndex * 0.05}s`
          wordSpan.appendChild(charSpan)
          charIndex++
        }
        
        textRef.current?.appendChild(wordSpan)
        
        // Add space after word (except for last word)
        if (wordIndex < words.length - 1) {
          const spaceSpan = document.createElement('span')
          spaceSpan.textContent = '\u00A0'
          spaceSpan.className = 'rainbow-char'
          spaceSpan.style.animationDelay = `${charIndex * 0.05}s`
          textRef.current?.appendChild(spaceSpan)
          charIndex++
        }
      })
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div 
        ref={textRef}
        className="rainbow-loading-wave"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {message}
      </div>
    </div>
  )
}

export default RainbowLoadingWave