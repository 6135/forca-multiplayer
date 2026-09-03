import { describe, expect, it } from 'vitest'
import { createRoomState, ranking, roomReducer } from './roomReducer'
import type { RoomState } from './types'

function lobby(): RoomState {
  return createRoomState({ hostId: 'c-host', hostPlayerId: 'h', hostName: 'host' })
}

function withPlayers(): RoomState {
  let state = lobby()
  state = roomReducer(state, { type: 'join', playerId: 'a', name: 'ana' })
  state = roomReducer(state, { type: 'join', playerId: 'b', name: 'bruno' })
  return state
}

describe('join', () => {
  it('adds a row once and updates the name on a repeat', () => {
    let state = withPlayers()
    expect(state.players).toHaveLength(3)
    state = roomReducer(state, { type: 'join', playerId: 'a', name: 'ana maria' })
    expect(state.players).toHaveLength(3)
    expect(state.players.find((player) => player.id === 'a')?.name).toBe('ana maria')
  })

  it('refuses a new player after the game starts', () => {
    let state = roomReducer(withPlayers(), { type: 'start_game', order: ['h', 'a', 'b'] })
    state = roomReducer(state, { type: 'join', playerId: 'c', name: 'carla' })
    expect(state.players).toHaveLength(3)
  })

  it('accepts a rejoin of a known player after the game starts', () => {
    let state = roomReducer(withPlayers(), { type: 'start_game', order: ['h', 'a', 'b'] })
    state = roomReducer(state, { type: 'presence', playerId: 'a', online: false })
    state = roomReducer(state, { type: 'join', playerId: 'a', name: 'ana' })
    expect(state.players.find((player) => player.id === 'a')?.connected).toBe(true)
  })
})

describe('the frozen order', () => {
  it('keeps the order and skips a player that is not connected', () => {
    let state = roomReducer(withPlayers(), { type: 'start_game', order: ['h', 'a', 'b'] })
    expect(state.status).toBe('choosing')
    expect(state.masterId).toBe('h')
    state = roomReducer(state, { type: 'presence', playerId: 'a', online: false })
    state = roomReducer(state, {
      type: 'round_end',
      winnerId: 'b',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 3,
    })
    state = roomReducer(state, { type: 'start_round' })
    expect(state.order).toEqual(['h', 'a', 'b'])
    expect(state.masterId).toBe('b')
  })

  it('needs two players to start', () => {
    const state = roomReducer(lobby(), { type: 'start_game', order: ['h'] })
    expect(state.status).toBe('lobby')
  })
})

describe('scoring', () => {
  function playing(): RoomState {
    return roomReducer(withPlayers(), { type: 'start_game', order: ['h', 'a', 'b'] })
  }

  it('applies one point to the winner', () => {
    const state = roomReducer(playing(), {
      type: 'round_end',
      winnerId: 'a',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 2,
    })
    expect(state.players.find((player) => player.id === 'a')?.score).toBe(1)
    expect(state.status).toBe('round_end')
    expect(state.lastRound).toMatchObject({ word: 'gato', winnerId: 'a', voided: false })
  })

  it('refuses a point for the round master', () => {
    const state = roomReducer(playing(), {
      type: 'round_end',
      winnerId: 'h',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 2,
    })
    expect(state.players.find((player) => player.id === 'h')?.score).toBe(0)
    expect(state.lastRound?.winnerId).toBe(null)
  })

  it('refuses a point for a player that is not in the room', () => {
    const state = roomReducer(playing(), {
      type: 'round_end',
      winnerId: 'ghost',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 2,
    })
    expect(state.players.every((player) => player.score === 0)).toBe(true)
  })

  it('sorts the ranking by score', () => {
    const state = roomReducer(playing(), {
      type: 'round_end',
      winnerId: 'b',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 1,
    })
    expect(ranking(state.players)[0]?.id).toBe('b')
  })
})

describe('the end of the game', () => {
  it('ends when the carried pool is empty', () => {
    let state = roomReducer(withPlayers(), { type: 'config', patch: { livesResetEachRound: false } })
    state = roomReducer(state, { type: 'start_game', order: ['h', 'a', 'b'] })
    state = roomReducer(state, {
      type: 'round_end',
      winnerId: null,
      word: 'gato',
      outcome: 'lost',
      livesRemaining: 0,
    })
    expect(state.status).toBe('game_over')
  })

  it('ends after one round per player when the limit is on', () => {
    let state = roomReducer(withPlayers(), { type: 'config', patch: { onePassLimit: true } })
    state = roomReducer(state, { type: 'start_game', order: ['h', 'a', 'b'] })
    for (let round = 1; round <= 3; round += 1) {
      state = roomReducer(state, {
        type: 'round_end',
        winnerId: null,
        word: 'gato',
        outcome: 'lost',
        livesRemaining: 2,
      })
      if (state.status === 'round_end') state = roomReducer(state, { type: 'start_round' })
    }
    expect(state.status).toBe('game_over')
    expect(state.roundNumber).toBe(3)
  })

  it('voids a round without a score', () => {
    let state = roomReducer(withPlayers(), { type: 'start_game', order: ['h', 'a', 'b'] })
    state = roomReducer(state, { type: 'void_round' })
    expect(state.status).toBe('round_end')
    expect(state.lastRound?.voided).toBe(true)
    expect(state.players.every((player) => player.score === 0)).toBe(true)
  })

  it('carries the life pool to the next round', () => {
    let state = roomReducer(withPlayers(), { type: 'config', patch: { livesResetEachRound: false } })
    state = roomReducer(state, { type: 'start_game', order: ['h', 'a', 'b'] })
    state = roomReducer(state, {
      type: 'round_end',
      winnerId: 'a',
      word: 'gato',
      outcome: 'won',
      livesRemaining: 4,
    })
    state = roomReducer(state, { type: 'start_round' })
    expect(state.lastRound?.livesRemaining).toBe(4)
  })
})
