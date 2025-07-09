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