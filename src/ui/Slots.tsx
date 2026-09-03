/** The word. A hidden letter shows an empty slot. */

import type { Slot } from '../game/types'

export function Slots({ slots, reveal }: { slots: Slot[]; reveal?: string | null }) {
  if (reveal) {
    return (
      <p className="slots slots--reveal">
        {Array.from(reveal).map((char, index) => (
          <span key={index} className={char === ' ' ? 'slot slot--space' : 'slot slot--filled'}>
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </p>
    )
  }
  return (
    <p className="slots">
      {slots.map((slot, index) => {
        if (slot.kind === 'fixed') {
          return (
            <span key={index} className={slot.char === ' ' ? 'slot slot--space' : 'slot slot--fixed'}>
              {slot.char === ' ' ? ' ' : slot.char}
            </span>
          )
        }
        return (
          <span key={index} className={slot.char ? 'slot slot--filled' : 'slot slot--empty'}>
            {slot.char ?? ' '}
          </span>
        )
      })}
    </p>
  )
}
