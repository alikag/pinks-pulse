import React, { useEffect, useRef } from 'react'
import './RainbowLoadingWave.css'

const RainbowLoadingWave: React.FC = () => {
  const textRef = useRef<HTMLDivElement>(null)

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
        squeegeeing your view...
      </div>
    </div>
  )
}

export default RainbowLoadingWave