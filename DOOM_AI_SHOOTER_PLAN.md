# DOOM-Style AI Shooter — Practical Build Plan

## 1) Core Vision
Build a single-player, fast-paced arena FPS inspired by classic DOOM: high mobility, close/mid-range combat, resource pickups, and relentless enemy pressure. Use AI for enemy behavior, dynamic difficulty, and optional director-style encounter pacing so fights feel hand-crafted but replayable.

---

## 2) MVP Scope (Vertical Slice)

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

## 4) AI Design (Game-Feel First)

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

## 5) Movement + Combat Feel Priorities

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

## 6) Content Pipeline

Use modular data assets:

- **WeaponData:** damage, spread, recoil, fire rate, VFX, SFX
- **EnemyData:** HP, speed, preferred distance, aggression, abilities
- **WaveData:** spawn points, composition, scaling
- **PickupData:** type, value, respawn rules

This enables fast tuning without code churn.

---

## 7) 8-Week Development Plan

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

## 8) Metrics to Track

- Average survival time per wave
- Damage taken per minute
- Accuracy %
- Death heatmap by location
- “Unfair death” flags (e.g., killed <2 sec after spawn)

Use metrics to tune difficulty objectively.

---

## 9) Risks + Mitigations

- **Risk:** Overbuilding AI too early  
  **Mitigation:** Ship simple FSM first, then layer complexity.

- **Risk:** Floaty gunplay  
  **Mitigation:** Daily feel iteration with quick bot testing.

- **Risk:** Scope creep  
  **Mitigation:** Lock MVP (1 level, 3 weapons, 3 enemies) until playable.

---

## 10) Optional AI Upgrades (Post-MVP)

- Enemy voice barks that react to player state
- Learned aim-assist curves per difficulty
- Procedural encounter generation with constraints
- Personality modifiers (aggressive / cowardly / flanker)
