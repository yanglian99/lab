const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  minerals: document.getElementById('minerals'),
  supply: document.getElementById('supply'),
  baseHp: document.getElementById('baseHp'),
  enemyHp: document.getElementById('enemyHp'),
  log: document.getElementById('log'),
  overlay: document.getElementById('overlay'),
  buttons: {
    drone: document.getElementById('buildDrone'),
    marine: document.getElementById('buildMarine'),
    medic: document.getElementById('buildMedic'),
    depot: document.getElementById('buildDepot'),
  },
};

const TEAM_PLAYER = 'player';
const TEAM_ENEMY = 'enemy';
const RESOURCE_RADIUS = 30;
const BASE_RADIUS = 40;
const ENEMY_HIVE_RADIUS = 54;
const MAX_LOG_ENTRIES = 10;

const state = {
  minerals: 180,
  supplyUsed: 0,
  supplyCap: 8,
  selectedUnitId: null,
  nextId: 1,
  elapsed: 0,
  enemyWaveAt: 12,
  gameOver: false,
  victory: false,
  units: [],
  enemyUnits: [],
  bullets: [],
  effects: [],
  resources: [
    { x: 215, y: 150, amount: 700 },
    { x: 170, y: 260, amount: 700 },
    { x: 285, y: 245, amount: 700 },
    { x: 375, y: 115, amount: 700 },
  ],
  base: { x: 145, y: 470, hp: 1200, maxHp: 1200 },
  enemyHive: { x: 815, y: 125, hp: 1400, maxHp: 1400 },
  logs: [],
};

const unitDefs = {
  drone: {
    label: 'Drone',
    cost: 50,
    supply: 1,
    speed: 58,
    hp: 60,
    range: 12,
    damage: 6,
    cooldown: 0.9,
    color: '#7fe7ff',
    radius: 9,
    worker: true,
  },
  marine: {
    label: 'Marine',
    cost: 75,
    supply: 1,
    speed: 78,
    hp: 85,
    range: 120,
    damage: 12,
    cooldown: 0.6,
    color: '#5db0ff',
    radius: 10,
  },
  medic: {
    label: 'Medic',
    cost: 90,
    supply: 1,
    speed: 72,
    hp: 70,
    range: 100,
    heal: 14,
    cooldown: 1.2,
    color: '#9bffba',
    radius: 10,
    support: true,
  },
  zergling: {
    label: 'Raider',
    speed: 82,
    hp: 48,
    range: 14,
    damage: 9,
    cooldown: 0.7,
    color: '#ff7a8b',
    radius: 9,
  },
  brute: {
    label: 'Brute',
    speed: 48,
    hp: 180,
    range: 18,
    damage: 18,
    cooldown: 1.05,
    color: '#ffb347',
    radius: 15,
  },
};

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, MAX_LOG_ENTRIES);
  ui.log.innerHTML = state.logs.map((entry) => `<div class="log-entry">${entry}</div>`).join('');
}

function createUnit(type, team, x, y) {
  const def = unitDefs[type];
  const unit = {
    id: state.nextId++,
    type,
    team,
    x,
    y,
    targetX: x,
    targetY: y,
    hp: def.hp,
    maxHp: def.hp,
    cooldownLeft: 0,
    carry: 0,
    gatherTimer: 0,
  };

  if (team === TEAM_PLAYER) {
    state.units.push(unit);
    state.supplyUsed += def.supply || 0;
  } else {
    state.enemyUnits.push(unit);
  }

  return unit;
}

function spawnStartingArmy() {
  createUnit('drone', TEAM_PLAYER, 170, 440);
  createUnit('drone', TEAM_PLAYER, 120, 420);
  createUnit('marine', TEAM_PLAYER, 210, 500);
  createUnit('marine', TEAM_PLAYER, 235, 455);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampPoint(point) {
  return {
    x: Math.max(20, Math.min(canvas.width - 20, point.x)),
    y: Math.max(20, Math.min(canvas.height - 20, point.y)),
  };
}

function canAfford(type) {
  const def = unitDefs[type];
  return state.minerals >= def.cost && state.supplyUsed + def.supply <= state.supplyCap;
}

function trainUnit(type) {
  if (state.gameOver) return;
  const def = unitDefs[type];
  if (!canAfford(type)) {
    addLog(`Insufficient resources for ${def.label}.`);
    return;
  }

  state.minerals -= def.cost;
  createUnit(type, TEAM_PLAYER, state.base.x + 55 + Math.random() * 35, state.base.y - 40 + Math.random() * 35);
  addLog(`${def.label} deployed from the Command Core.`);
}

function buildDepot() {
  if (state.gameOver) return;
  if (state.minerals < 125) {
    addLog('Need 125 crystals for a Supply Depot.');
    return;
  }

  state.minerals -= 125;
  state.supplyCap += 4;
  addLog('Supply Depot online. Capacity increased by 4.');
}

function spawnEnemyWave() {
  const intensity = 1 + Math.floor(state.elapsed / 25);
  const raiders = 2 + intensity;
  const brutes = intensity > 1 ? Math.floor(intensity / 2) : 0;

  for (let i = 0; i < raiders; i += 1) {
    createUnit('zergling', TEAM_ENEMY, state.enemyHive.x - 30 - Math.random() * 25, state.enemyHive.y + 30 + Math.random() * 50);
  }

  for (let i = 0; i < brutes; i += 1) {
    createUnit('brute', TEAM_ENEMY, state.enemyHive.x - 50 - Math.random() * 40, state.enemyHive.y + 35 + Math.random() * 60);
  }

  state.enemyWaveAt = state.elapsed + Math.max(8, 16 - intensity);
  addLog(`Enemy wave detected: ${raiders + brutes} hostiles inbound.`);
}

function pickUnitAt(x, y) {
  const reverse = [...state.units].reverse();
  return reverse.find((unit) => Math.hypot(unit.x - x, unit.y - y) <= unitDefs[unit.type].radius + 4);
}

function dealDamage(target, amount) {
  target.hp -= amount;
  state.effects.push({ x: target.x, y: target.y, ttl: 0.2, color: '#ffffff' });
}

function removeDeadUnits() {
  const beforeEnemy = state.enemyUnits.length;
  const beforePlayer = state.units.length;

  state.units = state.units.filter((unit) => unit.hp > 0);
  state.enemyUnits = state.enemyUnits.filter((unit) => unit.hp > 0);

  if (beforePlayer !== state.units.length) {
    state.supplyUsed = state.units.reduce((sum, unit) => sum + (unitDefs[unit.type].supply || 0), 0);
  }

  if (state.selectedUnitId && !state.units.find((unit) => unit.id === state.selectedUnitId)) {
    state.selectedUnitId = null;
  }

  if (beforeEnemy !== state.enemyUnits.length) {
    addLog('Enemy target neutralized.');
  }
  if (beforePlayer !== state.units.length) {
    addLog('We lost a unit.');
  }
}

function moveTowards(unit, target, dt, stopDistance = 4) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= stopDistance) return true;
  const def = unitDefs[unit.type];
  const step = Math.min(dist - stopDistance, def.speed * dt);
  if (dist > 0) {
    unit.x += (dx / dist) * step;
    unit.y += (dy / dist) * step;
  }
  return false;
}

function nearestResource(unit) {
  let best = null;
  let bestDistance = Infinity;
  for (const resource of state.resources) {
    if (resource.amount <= 0) continue;
    const d = Math.hypot(resource.x - unit.x, resource.y - unit.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = resource;
    }
  }
  return best;
}

function updateDrone(unit, dt) {
  const resource = nearestResource(unit);
  if (!resource) return;

  if (unit.carry === 0) {
    const arrived = moveTowards(unit, resource, dt, RESOURCE_RADIUS + 4);
    if (arrived) {
      unit.gatherTimer += dt;
      if (unit.gatherTimer >= 1.1) {
        unit.gatherTimer = 0;
        const mined = Math.min(25, resource.amount);
        resource.amount -= mined;
        unit.carry = mined;
      }
    }
  } else {
    const arrived = moveTowards(unit, state.base, dt, BASE_RADIUS + 4);
    if (arrived) {
      state.minerals += unit.carry;
      addLog(`Drone delivered ${unit.carry} crystals.`);
      unit.carry = 0;
    }
  }
}

function acquireTarget(unit, enemies) {
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    const d = distance(unit, enemy);
    if (d < bestDistance) {
      bestDistance = d;
      best = enemy;
    }
  }
  return { target: best, distance: bestDistance };
}

function fireBullet(source, target, color, amount, heal = false) {
  state.bullets.push({
    x: source.x,
    y: source.y,
    target,
    amount,
    heal,
    color,
    speed: 320,
  });
}

function updateCombatUnit(unit, allies, enemies, dt) {
  const def = unitDefs[unit.type];
  unit.cooldownLeft = Math.max(0, unit.cooldownLeft - dt);

  if (def.support) {
    const wounded = allies
      .filter((ally) => ally.hp < ally.maxHp && ally !== unit)
      .sort((a, b) => distance(unit, a) - distance(unit, b))[0];

    if (wounded) {
      const d = distance(unit, wounded);
      if (d > def.range - 12) {
        moveTowards(unit, wounded, dt, def.range - 18);
      } else if (unit.cooldownLeft === 0) {
        unit.cooldownLeft = def.cooldown;
        fireBullet(unit, wounded, '#9bffba', def.heal, true);
      }
      return;
    }
  }

  const { target, distance: d } = acquireTarget(unit, enemies);
  if (!target) {
    moveTowards(unit, { x: unit.targetX, y: unit.targetY }, dt, 3);
    return;
  }

  if (d > def.range) {
    moveTowards(unit, target, dt, Math.max(6, def.range - 10));
  } else if (unit.cooldownLeft === 0) {
    unit.cooldownLeft = def.cooldown;
    if (def.range > 40) {
      fireBullet(unit, target, def.color, def.damage);
    } else {
      dealDamage(target, def.damage);
    }
  }
}

function updateEnemy(unit, dt) {
  const def = unitDefs[unit.type];
  unit.cooldownLeft = Math.max(0, unit.cooldownLeft - dt);

  const candidates = [...state.units, state.base];
  const { target, distance: d } = acquireTarget(unit, candidates);
  if (!target) return;

  if (d > def.range + 4) {
    moveTowards(unit, target, dt, Math.max(4, def.range - 6));
  } else if (unit.cooldownLeft === 0) {
    unit.cooldownLeft = def.cooldown;
    if (target === state.base) {
      state.base.hp -= def.damage;
      state.effects.push({ x: state.base.x, y: state.base.y, ttl: 0.28, color: '#ff6b7a' });
    } else {
      dealDamage(target, def.damage);
    }
  }
}

function updateBullets(dt) {
  state.bullets = state.bullets.filter((bullet) => {
    if (!bullet.target || bullet.target.hp <= 0) return false;
    const dx = bullet.target.x - bullet.x;
    const dy = bullet.target.y - bullet.y;
    const dist = Math.hypot(dx, dy);
    const step = bullet.speed * dt;
    if (dist <= step || dist === 0) {
      if (bullet.heal) {
        bullet.target.hp = Math.min(bullet.target.maxHp, bullet.target.hp + bullet.amount);
      } else if (bullet.target === state.enemyHive) {
        state.enemyHive.hp -= bullet.amount;
      } else {
        dealDamage(bullet.target, bullet.amount);
      }
      return false;
    }
    bullet.x += (dx / dist) * step;
    bullet.y += (dy / dist) * step;
    return true;
  });
}

function updateEffects(dt) {
  state.effects = state.effects.filter((effect) => {
    effect.ttl -= dt;
    return effect.ttl > 0;
  });
}

function maybeAttackHive(unit, dt) {
  const def = unitDefs[unit.type];
  if (distance(unit, state.enemyHive) > def.range + ENEMY_HIVE_RADIUS - 10) return;
  unit.cooldownLeft = Math.max(0, unit.cooldownLeft - dt);
  if (unit.cooldownLeft === 0) {
    unit.cooldownLeft = def.cooldown;
    if (def.range > 40) {
      fireBullet(unit, state.enemyHive, def.color, def.damage);
    } else {
      state.enemyHive.hp -= def.damage;
      state.effects.push({ x: state.enemyHive.x, y: state.enemyHive.y, ttl: 0.25, color: '#ffb347' });
    }
  }
}

function update(dt) {
  if (state.gameOver) return;

  state.elapsed += dt;

  if (state.elapsed >= state.enemyWaveAt) {
    spawnEnemyWave();
  }

  for (const unit of state.units) {
    if (unit.type === 'drone') {
      updateDrone(unit, dt);
    } else {
      updateCombatUnit(unit, state.units, state.enemyUnits, dt);
      maybeAttackHive(unit, dt);
    }
  }

  for (const enemy of state.enemyUnits) {
    updateEnemy(enemy, dt);
  }

  updateBullets(dt);
  updateEffects(dt);
  removeDeadUnits();

  if (state.base.hp <= 0) {
    state.base.hp = 0;
    state.gameOver = true;
    state.victory = false;
    ui.overlay.textContent = 'Defeat — the Command Core has fallen.';
    ui.overlay.classList.remove('hidden');
    addLog('Defeat. The colony is overrun.');
  }

  if (state.enemyHive.hp <= 0) {
    state.enemyHive.hp = 0;
    state.gameOver = true;
    state.victory = true;
    ui.overlay.textContent = 'Victory — the hive has been destroyed.';
    ui.overlay.classList.remove('hidden');
    addLog('Victory! Enemy hive neutralized.');
  }
}

function drawHealthBar(x, y, width, ratio, color) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x - width / 2, y, width, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x - width / 2, y, width * Math.max(0, ratio), 5);
}

function drawUnit(unit) {
  const def = unitDefs[unit.type];
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
  ctx.fill();

  if (unit.team === TEAM_PLAYER && unit.id === state.selectedUnitId) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, def.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (unit.type === 'drone' && unit.carry > 0) {
    ctx.fillStyle = '#8df8ff';
    ctx.fillRect(-4, -def.radius - 6, 8, 8);
  }
  ctx.restore();

  drawHealthBar(unit.x, unit.y + def.radius + 8, 24, unit.hp / unit.maxHp, '#6cff89');
}

function drawBase() {
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.arc(state.base.x, state.base.y, BASE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9cd6ff';
  ctx.fillRect(state.base.x - 14, state.base.y - 26, 28, 52);
  drawHealthBar(state.base.x, state.base.y + BASE_RADIUS + 12, 90, state.base.hp / state.base.maxHp, '#6fd3ff');
}

function drawEnemyHive() {
  ctx.fillStyle = '#7c1f33';
  ctx.beginPath();
  ctx.arc(state.enemyHive.x, state.enemyHive.y, ENEMY_HIVE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff92aa';
  ctx.beginPath();
  ctx.arc(state.enemyHive.x, state.enemyHive.y, 18, 0, Math.PI * 2);
  ctx.fill();
  drawHealthBar(state.enemyHive.x, state.enemyHive.y + ENEMY_HIVE_RADIUS + 12, 110, state.enemyHive.hp / state.enemyHive.maxHp, '#ff7a8b');
}

function drawResources() {
  for (const resource of state.resources) {
    if (resource.amount <= 0) continue;
    ctx.fillStyle = '#5cf0ff';
    ctx.beginPath();
    ctx.moveTo(resource.x, resource.y - 22);
    ctx.lineTo(resource.x + 20, resource.y);
    ctx.lineTo(resource.x, resource.y + 22);
    ctx.lineTo(resource.x - 20, resource.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8ffff';
    ctx.fillText(String(resource.amount), resource.x - 16, resource.y + 38);
  }
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = effect.ttl / 0.28;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 10 + (0.28 - effect.ttl) * 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, '#0b1827');
  bg.addColorStop(1, '#152b17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  drawResources();
  drawBase();
  drawEnemyHive();
  state.units.forEach(drawUnit);
  state.enemyUnits.forEach(drawUnit);
  drawBullets();
  drawEffects();

  if (state.selectedUnitId) {
    const selected = state.units.find((unit) => unit.id === state.selectedUnitId);
    if (selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(selected.targetX, selected.targetY, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function syncUi() {
  ui.minerals.textContent = Math.floor(state.minerals);
  ui.supply.textContent = `${state.supplyUsed} / ${state.supplyCap}`;
  ui.baseHp.textContent = Math.ceil(state.base.hp);
  ui.enemyHp.textContent = Math.ceil(state.enemyHive.hp);
  ui.buttons.drone.disabled = !canAfford('drone');
  ui.buttons.marine.disabled = !canAfford('marine');
  ui.buttons.medic.disabled = !canAfford('medic');
  ui.buttons.depot.disabled = state.minerals < 125;
}

canvas.addEventListener('click', (event) => {
  if (state.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const picked = pickUnitAt(x, y);
  state.selectedUnitId = picked ? picked.id : null;
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (state.gameOver || !state.selectedUnitId) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const unit = state.units.find((entry) => entry.id === state.selectedUnitId);
  if (!unit) return;
  const target = clampPoint({ x, y });
  unit.targetX = target.x;
  unit.targetY = target.y;
  addLog(`${unitDefs[unit.type].label} moving out.`);
});

ui.buttons.drone.addEventListener('click', () => trainUnit('drone'));
ui.buttons.marine.addEventListener('click', () => trainUnit('marine'));
ui.buttons.medic.addEventListener('click', () => trainUnit('medic'));
ui.buttons.depot.addEventListener('click', buildDepot);

spawnStartingArmy();
addLog('Commander, establish your economy and crush the hive.');

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  syncUi();
  requestAnimationFrame(frame);
}

syncUi();
requestAnimationFrame(frame);
