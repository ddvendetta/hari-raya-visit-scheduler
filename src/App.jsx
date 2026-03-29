import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CheckCircle2,
  AlertTriangle,
  Home,
  GripVertical,
  Clock,
  MapPin,
  ArrowRight,
  Car,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAVEL = {
  'Bukit Batok':  { 'Bukit Gombak': 8,  'Pasir Ris': 42, 'Simei': 38 },
  'Bukit Gombak': { 'Bukit Batok': 8,   'Pasir Ris': 40, 'Simei': 37 },
  'Pasir Ris':    { 'Bukit Batok': 42,  'Bukit Gombak': 40, 'Simei': 12 },
  'Simei':        { 'Bukit Batok': 38,  'Bukit Gombak': 37, 'Pasir Ris': 12 },
}

const BUFFER = 15
const RETURN_HOME = 30 + BUFFER
const START_MIN = 690   // 11:30 AM
const HOME_TARGET = 1020 // 5:00 PM
const TIMELINE_START = 690
const TIMELINE_END = 1020
const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START // 330 min

const PEOPLE = {
  wati:   { id: 'wati',   name: 'Wak Wati',  location: 'Bukit Batok',  region: 'West', earliestMin: 690, mustBeFirst: true },
  pak:    { id: 'pak',    name: 'Pak Long',  location: 'Bukit Gombak', region: 'West', earliestMin: 720 },
  zainab: { id: 'zainab', name: 'Zainab',    location: 'Pasir Ris',    region: 'East', earliestMin: 720, latestDepart: 900 },
  ijah:   { id: 'ijah',   name: 'Wak Ijah',  location: 'Simei',        region: 'East', earliestMin: 870 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`
}

function travelBetween(locA, locB) {
  if (!locA || !locB || locA === locB) return 0
  return (TRAVEL[locA]?.[locB] ?? TRAVEL[locB]?.[locA] ?? 0) + BUFFER
}

function computeSchedule(order, durations) {
  const entries = []
  let cursor = START_MIN

  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    const person = PEOPLE[id]
    const travelFromPrev = i === 0 ? 0 : travelBetween(PEOPLE[order[i - 1]].location, person.location)
    const arrivalMin = cursor + travelFromPrev
    const departureMin = arrivalMin + (durations[id] ?? 45)

    const errors = []

    if (person.mustBeFirst && i !== 0) {
      errors.push(`${person.name} must be the 1st visit`)
    }
    if (arrivalMin < person.earliestMin) {
      errors.push(`Arriving too early — opens at ${minToTime(person.earliestMin)}`)
    }
    if (person.latestDepart && departureMin > person.latestDepart) {
      errors.push(`Must leave by ${minToTime(person.latestDepart)} — departing at ${minToTime(departureMin)}`)
    }

    entries.push({
      id,
      person,
      travelFromPrev,
      arrivalMin,
      departureMin,
      errors,
    })

    cursor = departureMin
  }

  const lastPerson = PEOPLE[order[order.length - 1]]
  const homeArrivalMin = cursor + RETURN_HOME

  return { entries, homeArrivalMin }
}

// ─── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({ entry, index, totalCount, duration, onDurationChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  }

  const hasError = entry.errors.length > 0
  const isFirst = index === 0
  const isLast = index === totalCount - 1

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          background: '#fff',
          border: `1.5px solid ${hasError ? '#FDA4AF' : '#E2E8F0'}`,
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 12,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: hasError
            ? '0 0 0 3px rgba(244,63,94,0.08)'
            : '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'grab',
              color: '#94A3B8',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              touchAction: 'none',
            }}
            aria-label="Drag to reorder"
          >
            <GripVertical size={18} />
          </button>

          {/* Index badge */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: hasError ? '#FFF1F2' : '#EEF2FF',
              color: hasError ? '#F43F5E' : '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>

          {/* Name & location */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#09090B' }}>{entry.person.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MapPin size={12} color="#94A3B8" />
              <span style={{ fontSize: 12, color: '#64748B' }}>{entry.person.location}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: entry.person.region === 'West' ? '#7C3AED' : '#0891B2',
                  background: entry.person.region === 'West' ? '#F5F3FF' : '#ECFEFF',
                  borderRadius: 4,
                  padding: '1px 5px',
                  marginLeft: 2,
                }}
              >
                {entry.person.region}
              </span>
            </div>
          </div>

          {/* Time display */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: hasError ? '#F43F5E' : '#4F46E5',
                  background: hasError ? '#FFF1F2' : '#EEF2FF',
                  borderRadius: 8,
                  padding: '3px 8px',
                }}
              >
                {minToTime(entry.arrivalMin)}
              </div>
              <ArrowRight size={12} color="#94A3B8" />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: hasError ? '#F43F5E' : '#334155',
                  background: hasError ? '#FFF1F2' : '#F8FAFC',
                  borderRadius: 8,
                  padding: '3px 8px',
                }}
              >
                {minToTime(entry.departureMin)}
              </div>
            </div>
          </div>
        </div>

        {/* Travel from previous */}
        {entry.travelFromPrev > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '6px 10px',
              background: '#F8FAFC',
              borderRadius: 8,
              marginLeft: 40,
            }}
          >
            <Car size={12} color="#94A3B8" />
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Taxi from previous: <strong>{entry.travelFromPrev}m</strong> (incl. 15m buffer)
            </span>
          </div>
        )}

        {/* Duration slider */}
        <div style={{ marginTop: 14, marginLeft: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label
              htmlFor={`slider-${entry.id}`}
              style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Clock size={12} color="#94A3B8" />
              Visit duration
            </label>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>{duration}m</span>
          </div>
          <input
            id={`slider-${entry.id}`}
            type="range"
            min={35}
            max={50}
            value={duration}
            onChange={(e) => onDurationChange(entry.id, Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>35m</span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>50m</span>
          </div>
        </div>

        {/* Errors */}
        {hasError && (
          <div style={{ marginTop: 12, marginLeft: 40 }}>
            {entry.errors.map((err, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: '7px 10px',
                  background: '#FFF1F2',
                  borderRadius: 8,
                  marginBottom: i < entry.errors.length - 1 ? 6 : 0,
                }}
              >
                <AlertTriangle size={13} color="#F43F5E" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#BE123C', fontWeight: 500 }}>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ entries, homeArrivalMin }) {
  const pct = (min) => ((min - TIMELINE_START) / TIMELINE_SPAN) * 100

  const labels = [690, 720, 780, 840, 900, 960, 1020]

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '20px 24px',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
        Day Timeline
      </div>

      <div style={{ position: 'relative', paddingBottom: 32 }}>
        {/* Track */}
        <div
          style={{
            position: 'relative',
            height: 36,
            background: '#F1F5F9',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {entries.map((entry, i) => {
            const hasError = entry.errors.length > 0
            const startPct = pct(entry.arrivalMin)
            const widthPct = ((entry.departureMin - entry.arrivalMin) / TIMELINE_SPAN) * 100

            // Travel block before this visit
            const travelStart = i === 0 ? null : pct(entries[i - 1].departureMin)
            const travelWidth = i === 0 ? 0 : ((entry.arrivalMin - entries[i - 1].departureMin) / TIMELINE_SPAN) * 100

            return (
              <div key={entry.id}>
                {/* Travel segment */}
                {i > 0 && travelWidth > 0 && (
                  <div
                    title={`Travel: ${entry.travelFromPrev}m`}
                    style={{
                      position: 'absolute',
                      left: `${Math.max(0, travelStart)}%`,
                      width: `${travelWidth}%`,
                      height: '100%',
                      background: 'repeating-linear-gradient(45deg, #CBD5E1 0px, #CBD5E1 2px, #E2E8F0 2px, #E2E8F0 6px)',
                    }}
                  />
                )}

                {/* Visit block */}
                <div
                  title={`${entry.person.name}: ${minToTime(entry.arrivalMin)}–${minToTime(entry.departureMin)}`}
                  style={{
                    position: 'absolute',
                    left: `${Math.max(0, startPct)}%`,
                    width: `${widthPct}%`,
                    height: '100%',
                    background: hasError
                      ? 'linear-gradient(135deg, #F43F5E, #FB7185)'
                      : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '0 4px',
                    }}
                  >
                    {entry.person.name.split(' ')[0]}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Return home segment */}
          {entries.length > 0 && (() => {
            const lastDep = entries[entries.length - 1].departureMin
            const returnStart = pct(lastDep)
            const returnWidth = ((homeArrivalMin - lastDep) / TIMELINE_SPAN) * 100
            return returnWidth > 0 && (
              <div
                title={`Return home: ${RETURN_HOME}m`}
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, returnStart)}%`,
                  width: `${Math.min(returnWidth, 100 - returnStart)}%`,
                  height: '100%',
                  background: 'repeating-linear-gradient(45deg, #CBD5E1 0px, #CBD5E1 2px, #E2E8F0 2px, #E2E8F0 6px)',
                }}
              />
            )
          })()}

          {/* 5PM deadline line */}
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: 0,
              bottom: 0,
              width: 2,
              background: '#F43F5E',
              zIndex: 10,
            }}
          />
        </div>

        {/* Time labels */}
        <div style={{ position: 'relative', height: 20, marginTop: 4 }}>
          {labels.map((min) => (
            <div
              key={min}
              style={{
                position: 'absolute',
                left: `${pct(min)}%`,
                transform: 'translateX(-50%)',
                fontSize: 10,
                color: min === 1020 ? '#F43F5E' : '#94A3B8',
                fontWeight: min === 1020 ? 700 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {minToTime(min).replace(' AM', '').replace(' PM', min === 690 || min === 720 ? 'AM' : 'PM')}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {[
            { color: 'linear-gradient(135deg, #4F46E5, #6366F1)', label: 'Visit (on time)' },
            { color: 'linear-gradient(135deg, #F43F5E, #FB7185)', label: 'Visit (conflict)' },
            { color: 'repeating-linear-gradient(45deg, #CBD5E1 0px, #CBD5E1 2px, #E2E8F0 2px, #E2E8F0 6px)', label: 'Travel / Buffer' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#64748B' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [order, setOrder] = useState(['wati', 'pak', 'zainab', 'ijah'])
  const [durations, setDurations] = useState({ wati: 45, pak: 45, zainab: 45, ijah: 45 })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id)
        const newIndex = prev.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  const handleDurationChange = useCallback((id, value) => {
    setDurations((prev) => ({ ...prev, [id]: value }))
  }, [])

  const { entries, homeArrivalMin } = computeSchedule(order, durations)
  const allErrors = entries.flatMap((e) => e.errors)
  const isValid = allErrors.length === 0 && homeArrivalMin <= HOME_TARGET
  const homeOver = homeArrivalMin > HOME_TARGET

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        padding: '0 0 48px',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #E2E8F0',
          padding: '20px 0',
          marginBottom: 28,
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {/* Crescent moon SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="white" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#09090B', letterSpacing: '-0.02em' }}>
                Hari Raya Visits
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 1 }}>
                Singapore · 29 March 2026 · 4 stops
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>
        {/* Global Status Card */}
        <div
          style={{
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 24,
            background: isValid ? '#F0FDF4' : '#FFF1F2',
            border: `1.5px solid ${isValid ? '#BBF7D0' : '#FDA4AF'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {isValid ? (
            <CheckCircle2 size={22} color="#16A34A" style={{ flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={22} color="#F43F5E" style={{ flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: isValid ? '#15803D' : '#BE123C' }}>
              {isValid ? 'Schedule looks good!' : `${allErrors.length} conflict${allErrors.length !== 1 ? 's' : ''} detected`}
            </div>
            <div style={{ fontSize: 12, color: isValid ? '#16A34A' : '#F43F5E', marginTop: 2 }}>
              {isValid
                ? 'All visits are within their time windows. You\'ll be home on time.'
                : 'Drag cards to reorder visits or adjust durations to resolve conflicts.'}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <Timeline entries={entries} homeArrivalMin={homeArrivalMin} />

        {/* Visit Cards */}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Visit Order — drag to reorder
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {entries.map((entry, index) => (
              <SortableCard
                key={entry.id}
                entry={entry}
                index={index}
                totalCount={entries.length}
                duration={durations[entry.id]}
                onDurationChange={handleDurationChange}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Home Arrival Card */}
        <div
          style={{
            background: '#fff',
            border: `1.5px solid ${homeOver ? '#FDA4AF' : '#E2E8F0'}`,
            borderRadius: 16,
            padding: '18px 20px',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: homeOver ? '0 0 0 3px rgba(244,63,94,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: homeOver ? '#FFF1F2' : '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Home size={20} color={homeOver ? '#F43F5E' : '#16A34A'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Estimated home arrival</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Includes 30m taxi + 15m buffer from last stop
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: homeOver ? '#F43F5E' : '#16A34A',
                letterSpacing: '-0.02em',
              }}
            >
              {minToTime(homeArrivalMin)}
            </div>
            {homeOver && (
              <div style={{ fontSize: 11, color: '#F43F5E', marginTop: 2, fontWeight: 500 }}>
                +{homeArrivalMin - HOME_TARGET}m over target
              </div>
            )}
            {!homeOver && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Target: 5:00 PM
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#CBD5E1' }}>
          Selamat Hari Raya Aidilfitri · Travel times are mid-day taxi estimates
        </div>
      </div>
    </div>
  )
}
