import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A2540',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
        }}
      >
        <svg width="22" height="19" viewBox="0 0 230 200">
          <path
            d="M33.3013 200L155.242 129.601L195.889 200H230L114.525 0L97.5398 29.6616L140.75 104.5L62.2845 149.802L112.594 62.6678H78.6396L0 200H33.3013Z"
            fill="#00D4AA"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
