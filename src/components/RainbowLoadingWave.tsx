import React, { useEffect, useRef, useState } from 'react'
import './RainbowLoadingWave.css'

const loadingMessages = [
  "Go grab a coffee. We've got this.",
  "Stretch your legs. It'll be ready when it's ready.",
  "Almost done. Maybe take a deep breath?",
  "Hang tight. Nobody likes a hoverer.",
  "Almost ready. Go stare out a window if you're bored.",
  "You could clean your keyboard while we finish up.",
  "Chill the fuck out, we're polishing your numbers.",
  "We're making it look better than we found it",
  "Still better than waiting for a window cleaner to call you back",
  "Almost ready. You could go wipe a counter or something.",
  "Your dashboard's getting a streak-free shine. Almost there!",
  "Squeegeeing your view...",
  "Loading faster than a ResiCon agenda pivot"
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
      
      for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span')
        span.textContent = text[i] === ' ' ? '\u00A0' : text[i]
        span.style.animationDelay = `${i * 0.05}s`
        textRef.current.appendChild(span)
      }
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