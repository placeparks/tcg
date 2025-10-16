'use client'

import { useRef, useEffect, forwardRef } from 'react'

interface LazyVideoProps {
  src: string
  poster?: string
  className?: string
  muted?: boolean
  playsInline?: boolean
  loop?: boolean
  preload?: 'auto' | 'metadata' | 'none'
}

export const LazyVideo = forwardRef<HTMLVideoElement, LazyVideoProps>(
  ({ src, poster, className, muted = true, playsInline = true, loop = true, preload = 'none' }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    // Merge forwarded ref with internal ref
    const setRef = (el: HTMLVideoElement | null) => {
      videoRef.current = el
      if (typeof ref === 'function') {
        ref(el)
      } else if (ref) {
        ref.current = el
      }
    }

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      // Load video immediately when component mounts (for lazy loading)
      // The main page will handle intersection and play/pause
      if (!video.src) {
        video.src = src
        video.load()
        
        // Just add fade-in class when loaded, let main page handle play/pause
        video.addEventListener('loadeddata', () => {
          video.classList.add('video-fade-in')
          console.log('LazyVideo loaded and ready:', src)
        }, { once: true })
      }
    }, [src])

    return (
      <video
        ref={setRef}
        className={className}
        poster={poster}
        muted={muted}
        playsInline={playsInline}
        loop={loop}
        preload={preload}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          minWidth: '100%',
          minHeight: '100%'
        }}
      />
    )
  }
)

LazyVideo.displayName = 'LazyVideo'
