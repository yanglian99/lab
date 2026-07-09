const canvas = document.getElementById('battlefield');
const ctx = canvas.getContext('2d');
const mineralsEl = document.getElementById('minerals');
const gasEl = document.getElementById('gas');
const supplyEl = document.getElementById('supply');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

const state = {
  minerals: 80,
  gas: 25,
  supply: 4,
  supplyCap: 10,
  attackMode: false,
  dragStart: null,
  dragEnd: null,
  lastSpawn: 0,
  units: [],
  enemies: [],
  resources: [
    { type: 'crystal', x: 145, y: 115, amount: 900, radius: 34 },
    { type: 'crystal', x: 215, y: 165, amount: 850, radius: 34 },
    { type: 'gas', x: 120, y: 315, amount: 650, radius: 30 },
  ],
  base: { x: 90, y: 230, hp: 900, maxHp: 900, radius: 42 },
  hive: { x: 850, y: 285, hp: 1200, maxHp: 1200, radius: 52 },
};

const unitStats = {
  worker: { name: 'Drone', hp: 45, speed: 1.35, damage: 4, range: 26, cost: [50, 0], supply: 1, color: '#9ef5ff' },
  marine: { name: 'Ranger', hp: 65, speed: 1.65, damage: 11, range: 96, cost: [65, 10], supply: 1, color: '#6cff91' },
  tank: { name: 'Siege Walker', hp: 145, speed: .82, damage: 26, range: 138, cost: [120, 45], supply: 2, color: '#ffc861' },
};

function reset() {
  Object.assign(state, { minerals: 80, gas: 25, supply: 0, attackMode: false, dragStart: null, dragEnd: null, units: [], enemies: [] });
  state.hive.hp = 1200; state.base.hp = 900;
  for (let i = 0; i < 4; i++) addUnit('worker', 120 + i * 18, 245 + i * 18);
  for (let i = 0; i < 8; i++) state.enemies.push({ x: 690 + Math.random() * 120, y: 150 + Math.random() * 260, hp: 48, maxHp: 48, radius: 12, cooldown: 0 });
  setMessage('Mission started. Mine resources and assault the enemy hive.');
}

function addUnit(type, x = 150, y = 230) {
  const s = unitStats[type];
  state.units.push({ type, x, y, tx: x, ty: y, hp: s.hp, selected: false, gather: null, cooldown: 0, radius: type === 'tank' ? 16 : 10 });
  state.supply += s.supply;
}

function setMessage(text) { messageEl.textContent = text; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function canAfford(type) { const [m, g] = unitStats[type].cost; return state.minerals >= m && state.gas >= g && state.supply + unitStats[type].supply <= state.supplyCap; }

function train(type) {
  if (!canAfford(type)) return setMessage('Insufficient resources or supply cap reached.');
  const [m, g] = unitStats[type].cost;
  state.minerals -= m; state.gas -= g;
  addUnit(type, state.base.x + 55, state.base.y + Math.random() * 70 - 35);
  setMessage(`${unitStats[type].name} ready for orders.`);
}

function update() {
  for (const u of state.units) {
    const target = nearestEnemy(u);
    if (target && dist(u, target) < unitStats[u.type].range) {
      u.cooldown -= 1;
      if (u.cooldown <= 0) { target.hp -= unitStats[u.type].damage; u.cooldown = u.type === 'tank' ? 62 : 28; }
    } else moveToward(u, u.tx, u.ty, unitStats[u.type].speed);
    if (u.gather && dist(u, u.gather) < u.gather.radius + 8 && u.gather.amount > 0) {
      u.gather.amount -= .18;
      if (u.gather.type === 'crystal') state.minerals += .055; else state.gas += .035;
    }
  }
  for (const e of state.enemies) {
    const target = nearestUnit(e) || state.base;
    if (target && dist(e, target) > 34) moveToward(e, target.x, target.y, .72);
    else if (target) { e.cooldown -= 1; if (e.cooldown <= 0) { target.hp -= 6; e.cooldown = 42; } }
  }
  if (Date.now() - state.lastSpawn > 6500 && state.hive.hp > 0) { state.lastSpawn = Date.now(); state.enemies.push({ x: state.hive.x - 45, y: state.hive.y + Math.random() * 90 - 45, hp: 48, maxHp: 48, radius: 12, cooldown: 0 }); }
  state.units = state.units.filter(u => u.hp > 0);
  state.enemies = state.enemies.filter(e => e.hp > 0);
  if (state.hive.hp <= 0) setMessage('Victory! The enemy hive has fallen.');
  if (state.base.hp <= 0 || state.units.length === 0) setMessage('Defeat. Restart the mission and rebuild stronger.');
  render(); requestAnimationFrame(update);
}

function moveToward(obj, x, y, speed) { const dx = x - obj.x, dy = y - obj.y, d = Math.hypot(dx, dy); if (d > 2) { obj.x += dx / d * speed; obj.y += dy / d * speed; } }
function nearestEnemy(u) { return [...state.enemies, ...(state.hive.hp > 0 ? [state.hive] : [])].filter(e => dist(u, e) < unitStats[u.type].range + 22).sort((a,b)=>dist(u,a)-dist(u,b))[0]; }
function nearestUnit(e) { return state.units.slice().sort((a,b)=>dist(e,a)-dist(e,b))[0]; }

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  state.resources.forEach(drawResource);
  drawStructure(state.base, '#36b8ff', 'NEXUS', state.base.hp / 900);
  drawStructure(state.hive, '#ff4b7d', 'HIVE', state.hive.hp / 1200);
  state.units.forEach(drawUnit);
  state.enemies.forEach(e => drawBlob(e, '#ff5f75'));
  if (state.dragStart && state.dragEnd) drawSelectionBox();
  mineralsEl.textContent = Math.floor(state.minerals);
  gasEl.textContent = Math.floor(state.gas);
  state.supply = state.units.reduce((sum, u) => sum + unitStats[u.type].supply, 0);
  supplyEl.textContent = `${state.supply} / ${state.supplyCap}`;
}
function drawGrid() { ctx.strokeStyle = 'rgba(97,184,255,.08)'; for (let x=0; x<canvas.width; x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();} for (let y=0; y<canvas.height; y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();} }
function drawResource(r) { ctx.fillStyle = r.type === 'crystal' ? '#4be8ff' : '#70ff78'; ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#03101a'; ctx.fillText(Math.floor(r.amount), r.x-13, r.y+4); }
function drawStructure(s, color, label, pct) { drawBlob(s, color); ctx.fillStyle = '#e8f6ff'; ctx.fillText(label, s.x - 20, s.y + 4); ctx.fillStyle = '#13283d'; ctx.fillRect(s.x-36, s.y-s.radius-18, 72, 6); ctx.fillStyle = color; ctx.fillRect(s.x-36, s.y-s.radius-18, 72*Math.max(0,pct), 6); }
function drawUnit(u) { drawBlob(u, unitStats[u.type].color); if (u.selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u.x,u.y,u.radius+6,0,Math.PI*2); ctx.stroke(); } }
function drawBlob(o, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(o.x-o.radius, o.y-o.radius-9, o.radius*2, 4); ctx.fillStyle = '#a7ff9e'; ctx.fillRect(o.x-o.radius, o.y-o.radius-9, o.radius*2*Math.max(0, o.hp / (o.type ? unitStats[o.type].hp : o.maxHp)), 4); }
function drawSelectionBox() { const a=state.dragStart,b=state.dragEnd; ctx.strokeStyle='#fff'; ctx.setLineDash([6,4]); ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.setLineDash([]); }

function pointer(e) { const rect=canvas.getBoundingClientRect(); return { x:(e.clientX-rect.left)*(canvas.width/rect.width), y:(e.clientY-rect.top)*(canvas.height/rect.height) }; }
canvas.addEventListener('mousedown', e => { if (e.button !== 0) return; state.dragStart = pointer(e); state.dragEnd = pointer(e); });
canvas.addEventListener('mousemove', e => { if (state.dragStart) state.dragEnd = pointer(e); });
canvas.addEventListener('mouseup', e => { const p=pointer(e); const a=state.dragStart; state.dragStart=null; if (!a) return; const moved=Math.hypot(p.x-a.x,p.y-a.y)>8; state.units.forEach(u => u.selected = moved ? inBox(u,a,p) : Math.hypot(u.x-p.x,u.y-p.y)<20); });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); const p=pointer(e); const selected=state.units.filter(u=>u.selected); const resource=state.resources.find(r=>Math.hypot(r.x-p.x,r.y-p.y)<r.radius+20); selected.forEach((u,i)=>{ u.tx=p.x+(i%4)*16; u.ty=p.y+Math.floor(i/4)*16; u.gather=resource || null; }); setMessage(resource ? `Gathering ${resource.type}.` : 'Units moving.'); });
canvas.addEventListener('click', e => { if (!state.attackMode) return; const p=pointer(e); state.units.filter(u=>u.selected).forEach(u => { u.tx=p.x; u.ty=p.y; u.gather=null; }); state.attackMode=false; setMessage('Attack move confirmed.'); });
function inBox(u,a,b){ return u.x>=Math.min(a.x,b.x)&&u.x<=Math.max(a.x,b.x)&&u.y>=Math.min(a.y,b.y)&&u.y<=Math.max(a.y,b.y); }
document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => btn.dataset.action === 'attack' ? (state.attackMode = true, setMessage('Attack mode armed. Click the battlefield.')) : train(btn.dataset.action)));
document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'a') { state.attackMode = true; setMessage('Attack mode armed. Click the battlefield.'); } });
restartBtn.addEventListener('click', reset);
reset(); update();
