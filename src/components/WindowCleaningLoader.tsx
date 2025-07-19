import React, { useEffect, useState, useRef } from 'react'
import './WindowCleaningLoader.css'

const loadingMessages = [
  "Squeegeeing your data...",
  "Wiping away the digital smudges...",
  "Getting a streak-free view of your numbers...",
  "Polishing your dashboard to perfection...",
  "Cleaning up those analytics...",
  "Making your metrics sparkle...",
  "Buffing out the data dust...",
  "Crystal clear insights coming right up...",
  "Washing away the uncertainty...",
  "Applying the finishing touches...",
  "One more wipe for good measure...",
  "Almost done... just removing the water spots..."
]

const WindowCleaningLoader: React.FC = () => {
  const [message] = useState(() => {
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
  })
  const [cleanProgress, setCleanProgress] = useState(0)
  const [showSpray, setShowSpray] = useState(false)
  const squeegeeRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Show spray effect at the beginning
    setTimeout(() => setShowSpray(true), 100)
    setTimeout(() => setShowSpray(false), 1500)
    
    // Animate the cleaning progress
    const interval = setInterval(() => {
      setCleanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        // Variable speed for more realistic motion
        const speed = prev < 20 || prev > 80 ? 1.5 : 2.5
        return Math.min(prev + speed, 100)
      })
    }, 40)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="window-cleaning-loader">
      {/* Dirty glass overlay */}
      <div className="glass-surface" style={{'--clean-progress': `${cleanProgress}%`} as React.CSSProperties}>
        {/* Initial foggy/dirty overlay */}
        <div className="fog-layer" />
        
        {/* Fingerprints and smudges */}
        <div className="fingerprints">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="fingerprint"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 20}%`,
                transform: `rotate(${-30 + i * 15}deg) scale(${0.8 + Math.random() * 0.4})`
              }}
            />
          ))}
        </div>
        
        {/* Water droplets */}
        <div className="water-droplets">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="droplet" 
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                '--size': `${Math.random() * 20 + 10}px`
              } as React.CSSProperties}
            />
          ))}
        </div>
        
        {/* Spray effect */}
        {showSpray && (
          <div className="spray-effect">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i}
                className="spray-particle"
                style={{
                  left: `${45 + Math.random() * 10}%`,
                  top: `${45 + Math.random() * 10}%`,
                  '--angle': `${Math.random() * 360}deg`,
                  '--distance': `${50 + Math.random() * 100}px`,
                  animationDelay: `${Math.random() * 0.3}s`
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        
        {/* Smudges and dirt */}
        <div className="dirt-layer" />
        
        {/* Squeegee wipe effect */}
        <div 
          ref={squeegeeRef}
          className="squeegee-wipe" 
          style={{ width: `${cleanProgress}%` }}
        >
          <div className="squeegee-handle">
            <div className="handle-grip" />
          </div>
          <div className="squeegee-blade">
            <div className="rubber-edge" />
          </div>
          <div className="clean-streak" />
          
          {/* Water being pushed by squeegee */}
          <div className="pushed-water">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="water-trail"
                style={{
                  top: `${20 + i * 15}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Bubbles floating up */}
        <div className="soap-bubbles">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="bubble" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                '--size': `${Math.random() * 30 + 20}px`
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      
      {/* Loading message appears on the clean glass */}
      <div className="loading-message" style={{ opacity: cleanProgress > 30 ? 1 : 0 }}>
        <h2 className="message-text">{message}</h2>
        <div className="shine-effect" />
      </div>
      
      {/* Progress indicator */}
      <div className="progress-indicator">
        <div className="progress-text">{Math.round(cleanProgress)}%</div>
      </div>
      
      {/* Pink's branding */}
      <div className="branding">
        <div className="logo-shine">Pink's Window Cleaning</div>
      </div>
    </div>
  )
}

export default WindowCleaningLoader