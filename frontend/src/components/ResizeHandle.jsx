import { useState } from 'react'
import { PanelResizeHandle } from 'react-resizable-panels'

export default function ResizeHandle({ direction = 'vertical' }) {
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)

  const isH = direction === 'horizontal'

  return (
    <PanelResizeHandle
      onDragging={setDragging}
      style={{
        position: 'relative',
        flexShrink: 0,
        width:  isH ? '100%' : 5,
        height: isH ? 5 : '100%',
        cursor: isH ? 'row-resize' : 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'background 0.15s',
        background: dragging
          ? 'rgba(99,102,241,0.25)'
          : hover
          ? 'rgba(99,102,241,0.10)'
          : 'transparent',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Grip dots */}
      <div
        style={{
          display: 'flex',
          flexDirection: isH ? 'row' : 'column',
          gap: 3,
          opacity: hover || dragging ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: dragging ? '#6366f1' : '#9ca3af',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </PanelResizeHandle>
  )
}
