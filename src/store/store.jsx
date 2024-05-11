import { create } from "zustand";
import { playerColors } from "../utils/gameData";
import { MathUtils } from "three";

export const useGameStore = create((set, get) => ({
  debug: false,
  setDebug: () => set({ debug: !get().debug }),

  mainCamera: null,
  setMainCameraRef: (camearaRef) => set({ mainCamera: camearaRef }),

  orbitControlsRef: null,
  setOrbitControlsRef: (obRef) => set({ orbitControlsRef: obRef }),

  setCameraAngle: (angle) => {
    switch (angle) {
      case 1: // Launch view
        const szt = get().scoreZoneRef.translation();
        get().orbitControlsRef.target.set(szt.x, szt.y, szt.z);
        get().mainCamera.position.set(0, 4.5, -4.4);
        get().mainCamera.rotation.set(
          MathUtils.degToRad(33),
          MathUtils.degToRad(-180),
          0
        );

        break;
      case 2: // Top view
        get().mainCamera.position.set(0, 7.2, -0.1);
        get().orbitControlsRef.target.set(0, 0, 0);
        break;
      case 3: // Follow capsule
        const ct = get().capsuleRefs[0].translation();
        get().mainCamera.position.set(ct.x - 2, ct.y + 3, ct.z - 1.5);
        get().orbitControlsRef.target.set(ct.x, ct.y, ct.z);
        // const { px, py } = state.pointer;
        // get().orbitControlsRef.setAzimuthalAngle(-px * angleToRadians(60));
        // get().orbitControlsRef.setPolarAngle((py + 0.5) * angleToRadians(90-45));
        // get().orbitControlsRef.update();
        break;

      default:
        break;
    }
  },

  selectedLevel: "base",
  setLevel: (level) => set({ selectedLevel: level }),

  gameState: 0,
  setGameState: (newGameState) => set({ gameState: newGameState }),
  players: [
    { slot: 1, name: "Player 1", capsuleSkin: playerColors[0], remaining: 0 },
  ],
  addPlayer: (optName = "") => {
    const newPlayers = [...get().players];
    const lth = newPlayers.length;
    if (lth < 4)
      newPlayers[lth] = {
        slot: lth + 1,
        name: optName,
        capsuleSkin: playerColors[lth],
        remaining: 0,
      };
    set({ players: newPlayers });
  },
  removePlayer: (playerSlot) => {
    const newPlayers = get().players.filter(
      (player) => player.slot !== playerSlot
    );
    newPlayers.map((player, index) => (player.slot = index + 1));
    set({ players: newPlayers });
  },
  setPlayers: (players) => set({ players: players }),
  onPlayerChange: (slot, newName) => {
    const newPlayers = [...get().players];
    const playerIndex = newPlayers.findIndex((player) => player.slot === slot);
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], name: newName };
    set({ players: newPlayers });
  },
  playingPlayer: null,
  setPlayingPlayer: (player) => set({ playingPlayer: player }),

  nbCapsules: 3,
  setNbCapsules: (nbCapsules) => set({ nbCapsules: nbCapsules }),

  score: [0, 0, 0, 0],
  setScore: (newScore) => set({ score: newScore }),

  scoreToWin: 10,
  setScoreToWin: (value) => set({ scoreToWin: value }),

  gameWinner: null,
  setGameWinner: (player) => set({ gameWinner: player }),

  scoreZoneRef: null,
  setScoreZoneRef: (ref) => set({ scoreZoneRef: ref }),
  withinScoreZone: [],
  setWithinScoreZone: (capsule) => {
    const present = get().withinScoreZone.find(
      (cap) => capsule.userData.key === cap.userData.key
    );
    // have to check if already present since the onEnterScoreZone happens twice
    if (!present) {
      set({ withinScoreZone: [capsule, ...get().withinScoreZone] });
    }
  },
  removeWithinScoreZone: (capsuleKey) => {
    set({
      withinScoreZone: get().withinScoreZone.filter((inZoneCap) => {
        return inZoneCap.userData.key !== capsuleKey;
      }),
    });
  },
  checkWithingScoreZone: () => {
    return get().withinScoreZone.sort(
      (a, b) => b.translation().z - a.translation().z
    );
  },

  startGame: () => {
    const players = get().players;
    if (!players.length) {
      get().addPlayer("Player");
    }
    for (let i = 0; i < get().players.length; i++) {
      const player = get().players[i];
      player.name = player.name === "" ? "Player " + (i + 1) : player.name;
      player.remaining = get().nbCapsules;
    }
    get().setPlayingPlayer(players[0]);
    get().removeCapsule();
    get().setScore(get().players.map(() => 0));
    get().addCapsule();
    get().setTurn(1);
    get().setRound(1);
    get().setGameState(1);
  },

  turn: 0,
  setTurn: (newTurn) => set({ turn: newTurn }),
  endTurn: () => {
    // Check if game started
    if (get().gameState > 0) {
      const nbPlayers = get().players.length;

      const currentPlayerSlot = get().playingPlayer.slot;
      get().playingPlayer.remaining -= 1;

      const turnResult = get().checkWithingScoreZone();

      let capsulesRemain = get().players.filter(
        (player) => player.remaining !== 0
      );

      // Players spend all their capsules this round, set next round
      if (!capsulesRemain.length) {
        // Count the points for this round
        const winCap = turnResult.length && turnResult[0];
        if (winCap) {
          let nbPoints = 0;
          for (let i = 0; i < turnResult.length; i++) {
            if (
              turnResult[i].userData.owner.slot === winCap.userData.owner.slot
            )
              nbPoints++;
            else break;
          }

          get().score[winCap.userData.owner.slot - 1] =
            get().score[winCap.userData.owner.slot - 1] + nbPoints;
        }

        const winner = get().score.find((sc) => sc >= get().scoreToWin);
        if (winner !== undefined) {
          get().setGameWinner(get().players[get().score.indexOf(winner)]);
          get().setGameState(5);
        } else {
          set({ round: get().round + 1 });
          get().removeCapsule();
          get().players.forEach((player) => {
            player.remaining = get().nbCapsules;
          });
          get().setPlayingPlayer(get().players[0]);
          get().addCapsule();
          get().setGameState(1);
        }
      } else {
        // slot next player in line to play
        let nextInLineSlot = get().players.find(
          (player) =>
            player.remaining > 0 &&
            currentPlayerSlot !== get().players.length &&
            player.slot > currentPlayerSlot
        );

        // Set index for the player next in line
        nextInLineSlot =
          nextInLineSlot !== undefined
            ? get().players.indexOf(nextInLineSlot)
            : 0;

        // Set array of players that have at least one capsule outside the zone
        const outsideOfScoreZone = get().players.filter((player) =>
          turnResult.every(
            (cap) =>
              player.slot !== cap.userData.owner.slot && player.remaining > 0
          )
        );

        if (outsideOfScoreZone) {
          // Is one of the outside of the zone players is the scheduled next player ?
          const isNextInline = outsideOfScoreZone.find(
            (player) =>
              player.slot === nextInLineSlot + 1 && player.remaining > 0
          );

          // If not, find the player with the next slot in line
          if (!isNextInline) {
            const nextSlot = outsideOfScoreZone.find(
              (player) =>
                (player.slot === get().players.length &&
                  player.slot >= nextInLineSlot) ||
                player.slot >= nextInLineSlot
            );

            if (nextSlot) {
              nextInLineSlot = get().players.indexOf(nextSlot);
            } else {
              // Every player has a capsule in the score zone, set the player that has the farthest capsule from the edge
              for (let i = turnResult.length - 1; i >= 0; i--) {
                const owner = turnResult[i].userData.owner;
                if (owner.remaining > 0) {
                  nextInLineSlot = get().players.findIndex(
                    (player) => player.slot === owner.slot
                  );
                  break;
                }
              }
            }
          }
        }

        get().setPlayingPlayer(get().players[nextInLineSlot]);

        get().setTurn(get().turn + 1);
        get().addCapsule();
        get().setGameState(1);
      }
    }
  },

  round: 0,
  setRound: (newRound) => set({ round: newRound }),
  endRound: () => {},

  resetGame: () => {
    get().score.map((player) => (player = 0));
    get().setPlayingPlayer(get().players[0]);
    get().removeCapsule();
    get().setGameState(0);
  },

  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),

  draggedCapsule: null,
  setDraggedCapsule: (dc) => set({ draggedCapsule: dc }),

  capsuleRefs: [],
  addCapsuleRef: (ref) => set({ capsuleRefs: [ref, ...get().capsuleRefs] }),
  capsules: [],
  addCapsule: () =>
    set({
      capsules: [
        ...get().capsules,
        {
          key: "capsule_" + Date.now(),
          owner: get().playingPlayer ? get().playingPlayer : get().players[0],
          position: [-0.5 + Math.random(), 1.8, -2.5],
          color: get().playingPlayer
            ? get().playingPlayer.capsuleSkin
            : get().players[0].capsuleSkin, // "#" + Math.floor(Math.random() * 0xffffff).toString(16),
        },
      ],
    }),
  removeCapsule: () => {
    set({ withinScoreZone: [] });
    set({ capsuleRefs: [] });
    set({ capsules: [] });
  },
}));
