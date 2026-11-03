import { useState, useEffect } from 'react'
import type { GameProps } from '../types'

type Task = { id: number; label: string; sent: boolean; approved: boolean }

export default function Game({ onWin }: GameProps) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, label: 'fix the failing test', sent: false, approved: false },
    { id: 2, label: 'add dark mode', sent: false, approved: false },
    { id: 3, label: 'write the README', sent: false, approved: false },
  ])
  const [travelingTask, setTravelingTask] = useState<number | null>(null)
  const [coding, setCoding] = useState<number | null>(null)
  const [progress, setProgress] = useState<string[]>([])
  const [approving, setApproving] = useState<number | null>(null)

  const completedCount = tasks.filter(t => t.approved).length
  const hasWon = completedCount >= 2

  useEffect(() => {
    if (hasWon && !approving && !coding && !travelingTask) {
      const timer = setTimeout(() => onWin(), 400)
      return () => clearTimeout(timer)
    }
  }, [hasWon, approving, coding, travelingTask, onWin])

  const sendTask = (taskId: number) => {
    if (travelingTask || coding || approving) return
    setTravelingTask(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sent: true } : t))
    
    setTimeout(() => {
      setTravelingTask(null)
      setCoding(taskId)
      setProgress([])
      
      const lines = [
        'Running agent...',
        'Analyzing codebase...',
        '+ Added implementation',
        '- Removed old code',
        'Tests passing ✓',
      ]
      
      lines.forEach((line, i) => {
        setTimeout(() => {
          setProgress(prev => [...prev, line])
          if (i === lines.length - 1) {
            setTimeout(() => {
              setCoding(null)
              setApproving(taskId)
            }, 600)
          }
        }, i * 700)
      })
    }, 1200)
  }

  const approve = (taskId: number) => {
    if (approving !== taskId) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, approved: true } : t))
    setApproving(null)
    setProgress([])
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--paper)',
      fontFamily: 'Inter, sans-serif',
      userSelect: 'none',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        height: '100%',
        maxHeight: '500px',
        display: 'flex',
        gap: '3rem',
        padding: '2rem',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Phone */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '140px',
            height: '280px',
            background: '#c9bfb0',
            borderRadius: '28px',
            padding: '12px',
            boxShadow: '0 8px 20px rgba(59, 51, 48, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '50px',
              height: '4px',
              background: '#8a6748',
              borderRadius: '2px',
            }} />
            <div style={{
              flex: 1,
              background: '#faf7f0',
              borderRadius: '20px',
              padding: '24px 12px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflow: 'hidden',
            }}>
              {tasks.map(task => (
                <button
                  key={task.id}
                  data-qa={`task-chip-${task.id}`}
                  onClick={() => sendTask(task.id)}
                  disabled={task.sent || !!travelingTask || !!coding || !!approving}
                  style={{
                    padding: '12px 14px',
                    background: task.approved ? '#8fb36b' : task.sent ? '#e8d6b8' : '#d9825b',
                    border: 'none',
                    borderRadius: '14px',
                    color: task.approved || !task.sent ? '#f3e9da' : '#8a6748',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: task.sent ? 'default' : 'pointer',
                    opacity: task.sent && !task.approved ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: task.sent ? 'none' : '0 3px 6px rgba(59, 51, 48, 0.25)',
                    textAlign: 'center',
                    lineHeight: '1.3',
                  }}
                >
                  {task.approved ? '✓ Done' : task.label}
                </button>
              ))}
            </div>
          </div>
          {completedCount === 0 && !travelingTask && !coding && !approving && (
            <div style={{
              fontSize: '12px',
              color: 'var(--ink2)',
              textAlign: 'center',
              maxWidth: '140px',
            }}>
              Tap a task to send it
            </div>
          )}
        </div>

        {/* Traveling task animation */}
        {travelingTask && (
          <div style={{
            position: 'absolute',
            left: '28%',
            top: '50%',
            transform: 'translateY(-50%)',
            animation: 'travel 1.2s ease-in-out',
          }}>
            <div style={{
              width: '60px',
              height: '30px',
              background: 'var(--terracotta)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream)',
              fontSize: '10px',
              boxShadow: '0 4px 8px rgba(59, 51, 48, 0.2)',
            }}>
              Task
            </div>
          </div>
        )}

        {/* Dotted path */}
        <svg
          width="180"
          height="20"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.3,
          }}
        >
          <path
            d="M 0 10 Q 90 0, 180 10"
            stroke="var(--earth)"
            strokeWidth="2"
            strokeDasharray="4 6"
            fill="none"
          />
        </svg>

        {/* Laptop */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            width: '200px',
            height: '130px',
            background: 'var(--stone)',
            borderRadius: '6px 6px 0 0',
            padding: '8px',
            boxShadow: '0 -2px 8px rgba(59, 51, 48, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              flex: 1,
              background: coding || approving ? 'var(--ink)' : 'var(--earth)',
              borderRadius: '4px',
              padding: '8px',
              fontFamily: '"Courier New", monospace',
              fontSize: '9px',
              color: coding || approving ? 'var(--moss)' : 'var(--cream)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}>
              {coding && progress.map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith('+') ? '#90c070' : line.startsWith('-') ? '#e88080' : 'var(--moss)',
                  opacity: 0.9,
                }}>
                  {line}
                </div>
              ))}
              {approving && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{
                    fontSize: '32px',
                    animation: 'checkGrow 0.4s ease-out',
                  }}>
                    ✓
                  </div>
                  <button
                    data-qa="approve-btn"
                    onClick={() => approve(approving)}
                    style={{
                      padding: '8px 20px',
                      background: 'var(--leaf)',
                      border: 'none',
                      borderRadius: '20px',
                      color: 'var(--cream)',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(59, 51, 48, 0.3)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{
            width: '220px',
            height: '8px',
            background: 'var(--stoneLight)',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 8px rgba(59, 51, 48, 0.15)',
          }} />
        </div>

        <style>{`
          @keyframes travel {
            0% { left: 28%; opacity: 1; }
            50% { left: 50%; top: 45%; }
            100% { left: 72%; opacity: 1; }
          }
          @keyframes checkGrow {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
