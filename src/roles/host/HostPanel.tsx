/** Host controls: the configuration, the start, the next round and the export. */

import { ranking } from '../../game/roomReducer'
import { hostApi } from '../roomSession'
import type { RoomState } from '../../game/types'

function exportRanking(roster: RoomState): void {
  const payload = {
    room: roster.roundNumber,
    exportedAt: new Date().toISOString(),
    ranking: ranking(roster.players).map((player) => ({
      name: player.name,
      score: player.score,
    })),
  }
  const text = JSON.stringify(payload, null, 2)
  void navigator.clipboard?.writeText(text)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'forca-ranking.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function HostPanel({ roster, blocked }: { roster: RoomState; blocked: boolean }) {
  const connected = roster.players.filter((player) => player.connected).length

  return (
    <section className="panel panel--host">
      <h3>Anfitrião</h3>

      {roster.status === 'lobby' && (
        <>
          <label className="row">
            Vidas
            <input
              type="number"
              min={1}
              max={12}
              value={roster.config.maxLives}
              onChange={(event) =>
                void hostApi.setConfig({ maxLives: Number(event.target.value) })
              }
            />
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={roster.config.livesResetEachRound}
              onChange={(event) =>
                void hostApi.setConfig({ livesResetEachRound: event.target.checked })
              }
            />
            Repor as vidas em cada ronda
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={roster.config.onePassLimit}
              onChange={(event) => void hostApi.setConfig({ onePassLimit: event.target.checked })}
            />
            Uma ronda por jogador
          </label>
          <button
            type="button"
            className="primary"
            disabled={blocked || connected < 2}
            onClick={() => void hostApi.startGame()}
          >
            Começar o jogo
          </button>
          {connected < 2 && <p className="hint">São precisos dois jogadores ligados.</p>}
        </>
      )}

      {roster.status === 'round_end' && (
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={blocked}
            onClick={() => void hostApi.nextRound()}
          >
            Próxima ronda
          </button>
          <button type="button" disabled={blocked} onClick={() => void hostApi.endGame()}>
            Terminar o jogo
          </button>
        </div>
      )}

      {(roster.status === 'choosing' || roster.status === 'playing') && (
        <button type="button" disabled={blocked} onClick={() => void hostApi.voidRound()}>
          Anular a ronda
        </button>
      )}

      {roster.status === 'game_over' && (
        <button type="button" onClick={() => exportRanking(roster)}>
          Exportar a classificação
        </button>
      )}

      <p className="hint">A sala fecha quando o anfitrião sai. A classificação perde-se.</p>
    </section>
  )
}
