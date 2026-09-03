# Forca Multiplayer

A serverless multiplayer hangman ("forca") game. React on GitHub Pages, all
state exchanged over a public MQTT broker. No backend, no database.

- One player hosts a room with a name and a key. Others join with the same pair.
- The host builds a frozen random turn order when the game starts.
- Each round the next player in that order becomes the round master. They type a
  secret word and a category on their own device.
- The category is published. The word is not. Players see empty slots only.
- The round master types each guess that a player speaks, evaluates it locally
  and publishes the revealed slots.
- Lives are a shared pool. A miss costs one life.
- The player who completes the word scores a point. The room shows a ranking.

Read [architecture.md](architecture.md) before you write any code. It defines the
topic map, the encryption envelope, the state shapes and the failure modes.

## Status

Design only. No implementation yet.
