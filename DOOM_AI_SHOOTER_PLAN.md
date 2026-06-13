# DOOM-Style AI Shooter — AI-Codable Build Plan

## 1) Core Vision
Build a single-player, fast-paced arena FPS inspired by classic DOOM: high mobility, close/mid-range combat, resource pickups, and relentless enemy pressure. Use AI for enemy behavior, dynamic difficulty, and optional director-style encounter pacing so fights feel hand-crafted but replayable.

---

## 2) MVP Scope (Vertical Slice / AI Coding Target)

- **1 small level**
  - Arena + corridors + height variation
- **3 weapons**
  - Shotgun
  - Rifle
  - Rocket launcher
- **3 enemy types**
  - Melee chaser
  - Ranged strafing attacker
  - Tank/bruiser
- **Basic game loop**
  - Spawn wave → survive → collect ammo/health → next wave
- **Simple UI**
  - Health, armor, ammo, wave number
  - Win/Lose states
- **AI basics**
  - Navigation, target selection, attack cooldowns, dodge/strafing
- **Code-first deliverable**
  - A playable greybox prototype where every feature is implemented with placeholder meshes, debug text, and tunable data before any art pass

---

## 3) Recommended Tech Stack

- **Engine:** Unreal Engine 5
  - Strong out-of-box FPS feel and AI tooling (Behavior Trees, EQS)
- **Language:** C++ + Blueprints (hybrid)
- **AI architecture:**
  - FSM for simple enemies
  - Behavior Tree for richer enemies/bosses
- **Navigation:** NavMesh + dynamic obstacle handling
- **Version control:** Git + Git LFS

---


## 4) AI Coding Execution Plan

This section turns the design into tasks an AI coding agent can execute without guessing. The agent should build the game in small, testable slices and only move to the next slice when the current slice is playable.

### Coding Agent Rules

- Build the smallest playable version first; do not start with menus, cinematics, networking, monetization, or high-end art.
- Prefer placeholder geometry, debug colors, and simple sounds until combat is fun.
- Keep gameplay values data-driven so tuning does not require code edits.
- Add one feature per task, run the project, and document the manual playtest result.
- Every task should leave the game in a runnable state.
- If using Unreal, implement core systems in C++ and expose tuning fields to Blueprints/Data Assets.

### Suggested Repo / Project Structure

```text
Source/
  ArenaShooter/
    Player/
      ASPlayerCharacter
      ASPlayerMovementComponent
      ASPlayerHealthComponent
    Weapons/
      ASWeaponBase
      ASHitscanWeapon
      ASProjectileWeapon
      ASProjectileRocket
      WeaponData
    Enemies/
      ASEnemyBase
      ASMeleeEnemy
      ASRangedEnemy
      ASTankEnemy
      EnemyData
    AI/
      ASEnemyAIController
      ASDirectorSubsystem
      ASWaveSpawner
      WaveData
    Pickups/
      ASPickupBase
      ASHealthPickup
      ASAmmoPickup
      PickupData
    UI/
      ASHUDWidget
      ASGameStateWidget
    Game/
      ASGameMode
      ASGameState
      ASDamageTypes
```

### Implementation Milestones for an AI Agent

1. **Bootstrap playable arena**
   - Create a first-person character that can move, jump, sprint/dash, and look around.
   - Add a greybox test map with walls, ramps, raised platforms, spawn points, and pickup points.
   - Acceptance: player can run through the arena for 60 seconds without collision or camera issues.

2. **Damage and health framework**
   - Add health/armor components for player and enemies.
   - Add damage events, death events, hit reactions, and debug logs.
   - Acceptance: a debug command or test weapon can damage and kill an enemy actor.

3. **Weapon system**
   - Add a shared weapon base class with ammo, cooldown, spread, recoil hooks, and fire events.
   - Implement shotgun, rifle, and rocket launcher using separate data assets.
   - Acceptance: all three weapons can be swapped, fired, consume ammo, and damage targets differently.

4. **Enemy MVP AI**
   - Implement melee chaser first with perception, chase, wind-up, attack, cooldown, and retreat.
   - Add ranged attacker with preferred distance, strafing, projectile bursts, and cooldowns.
   - Add tank with slower movement, high HP, knockback, and a telegraphed heavy attack.
   - Acceptance: each enemy can spawn, find the player, attack, take damage, and die.

5. **Wave loop**
   - Add wave data with enemy composition, spawn delay, max alive enemies, and completion conditions.
   - Add a wave spawner that waits for all enemies to die before starting the next wave.
   - Acceptance: three waves can run in sequence and display current wave state.

6. **Pickups and economy**
   - Add health, armor, and ammo pickups.
   - Add respawn rules and director-controlled emergency drops.
   - Acceptance: the player can recover resources mid-fight without breaking wave flow.

7. **Lightweight director**
   - Track player health, ammo, recent damage, enemy count, and time since peak intensity.
   - Adjust spawn cadence, pickup frequency, and enemy mix using capped modifiers.
   - Acceptance: the director can ease pressure when the player is low on health/ammo and increase pressure after recovery.

8. **HUD and game states**
   - Display health, armor, ammo, weapon name, wave number, enemies remaining, win, and lose states.
   - Acceptance: a playtester can understand the game state without debug logs.

9. **Combat feel pass**
   - Add screenshake, muzzle flash placeholders, impact effects, enemy flinch, knockback, and simple audio cues.
   - Acceptance: every shot has immediate feedback, and enemy attacks are readable.

10. **Balance and instrumentation**
    - Record survival time, damage taken per minute, accuracy, deaths by location, and unfair-death flags.
    - Acceptance: a session summary prints after win/loss and can guide tuning.

### Copy/Paste Prompt for the Coding Agent

```text
Build the DOOM-style arena FPS vertical slice from DOOM_AI_SHOOTER_PLAN.md.
Work in milestones, keep the project runnable after every change, and use placeholder assets.
Start with milestone 1 only: first-person movement, dash, greybox arena, spawn points, and a manual playtest checklist.
Do not implement weapons, enemies, menus, or art until milestone 1 is complete.
After implementation, summarize changed files, how to run it, and the exact checks performed.
```

### Manual Playtest Checklist

- Player movement feels responsive at ground level and on ramps.
- Dash cannot clip through walls or launch the player out of bounds.
- Weapons are readable by sound, impact feedback, and ammo behavior.
- Enemies rarely clump in the same lane.
- Spawn points do not place enemies directly in front of the player without warning.
- Player can recover health/ammo, but pickups do not trivialize waves.
- Losing feels attributable to player decisions, not invisible or instant attacks.

---

## 5) AI Design (Game-Feel First)

### Enemy Decision Stack

1. **Perception Layer**
   - Can see player?
   - Distance band (close/mid/far)
   - Line of sight
   - Recent damage taken

2. **Tactical Layer**
   - Decide intent: engage, flank, retreat, suppress, reposition
   - Crowd control: avoid enemies stacking in one lane

3. **Action Layer**
   - MoveTo cover/attack point
   - Fire burst
   - Melee lunge
   - Dodge step
   - Cooldown handling

### Example Behaviors

- **Melee demon:** zig-zag approach, short wind-up, heavy hit, retreat for 1 second
- **Ranged imp:** strafe-fire-strafe loop, occasional projectile burst
- **Tank:** slow pressure, knockback attack, armor weak-point timing windows

### Lightweight AI Director

Observe:
- Player health
- Ammo
- Damage taken per 10 seconds
- Time since last intense fight

Adjust:
- Spawn cadence
- Enemy mix
- Pickup frequency

Goal: intelligent pacing without heavy ML.

---

## 6) Movement + Combat Feel Priorities

Prioritize this before advanced AI:

- High acceleration + responsive air control
- Dash or quick dodge
- Hit feedback: screenshake, enemy flinch, blood decals, punchy audio
- Strong weapon identity:
  - **Shotgun:** close burst + stagger
  - **Rifle:** mid-range precision
  - **Rocket:** splash + mobility risk/reward

> If movement and gun feel are weak, no AI can save the game.

---

## 7) Content Pipeline

Use modular data assets:

- **WeaponData:** damage, spread, recoil, fire rate, VFX, SFX
- **EnemyData:** HP, speed, preferred distance, aggression, abilities
- **WaveData:** spawn points, composition, scaling
- **PickupData:** type, value, respawn rules

This enables fast tuning without code churn.

---

## 8) 8-Week Development Plan

### Week 1–2: Core FPS foundation
- First-person controller
- One weapon + shooting + damage
- One enemy with chase + attack
- Basic arena

### Week 3–4: Combat loop
- Add 2 more weapons
- Add 2 more enemy archetypes
- Health/ammo pickups
- Wave spawner

### Week 5: AI polish
- Strafe, dodge, LOS checks
- Basic group coordination (avoid clumping)
- Aggro priorities

### Week 6: Director system
- Dynamic wave pacing
- Difficulty adjustment
- Better spawn logic (out of direct sight)

### Week 7: Juice + UX
- VFX/SFX pass
- HUD polish
- Hit reactions, death effects

### Week 8: Playtest + balance
- TTK tuning
- Ammo economy tuning
- Remove frustration spikes

---

## 9) Metrics to Track

- Average survival time per wave
- Damage taken per minute
- Accuracy %
- Death heatmap by location
- “Unfair death” flags (e.g., killed <2 sec after spawn)

Use metrics to tune difficulty objectively.

---

## 10) Risks + Mitigations

- **Risk:** Overbuilding AI too early  
  **Mitigation:** Ship simple FSM first, then layer complexity.

- **Risk:** Floaty gunplay  
  **Mitigation:** Daily feel iteration with quick bot testing.

- **Risk:** Scope creep  
  **Mitigation:** Lock MVP (1 level, 3 weapons, 3 enemies) until playable.

---

## 11) Optional AI Upgrades (Post-MVP)

- Enemy voice barks that react to player state
- Learned aim-assist curves per difficulty
- Procedural encounter generation with constraints
- Personality modifiers (aggressive / cowardly / flanker)
