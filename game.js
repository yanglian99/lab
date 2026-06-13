const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const statusBanner = document.getElementById('statusBanner');
const resourcesEl = document.getElementById('resources');
const objectivesEl = document.getElementById('objectives');
const statTemplate = document.getElementById('stat-template');

const ages = ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'];
const resourceTypes = ['food', 'wood', 'gold', 'stone'];
const costs = {
  villager: { food: 50 },
  militia: { food: 60, gold: 20 },
  farm: { wood: 60 },
  house: { wood: 35 },
  tower: { wood: 80, stone: 60 },
  age: [
    { food: 0, gold: 0 },
    { food: 180, gold: 80 },
    { food: 280, gold: 180 },
    { food: 420, gold: 320 },
  ],
};

const game = {
  time: 0,
  lastTick: performance.now(),
  resources: { food: 220, wood: 220, gold: 90, stone: 80 },
  villagers: [
    { job: 'food' },
    { job: 'food' },
    { job: 'wood' },
    { job: 'wood' },
    { job: 'idle' },
  ],
  army: 1,
  farms: 1,
  houses: 3,
  towers: 0,
  hp: 120,
  maxHp: 120,
  enemyProgress: 0,
  age: 0,
  queue: [],
  message: 'Your settlers arrive with a modest town center. Build an economy before the first raid.',
  gameOver: false,
  victory: false,
  raidCooldown: 45,
};

const objectives = [
  { text: 'Reach 10 population', done: () => population() >= 10 },
  { text: 'Advance to the Castle Age', done: () => game.age >= 2 },
  { text: 'Build 2 watch towers', done: () => game.towers >= 2 },
  { text: 'Train 8 militia', done: () => game.army >= 8 },
  { text: 'Survive 6 enemy raids', done: () => raidsHandled >= 6 },
];

let raidsHandled = 0;

const nodes = {
  townCenter: { x: 210, y: 300, size: 72 },
  berryPatch: { x: 85, y: 130, radius: 42, amount: 999 },
  forest: { x: 90, y: 470, radius: 60, amount: 999 },
  gold: { x: 820, y: 135, radius: 44, amount: 999 },
  stone: { x: 810, y: 470, radius: 50, amount: 999 },
};

function population() {
  return game.villagers.length + game.army;
}

function housingCap() {
  return 5 + game.houses * 4;
}

function workersOn(job) {
  return game.villagers.filter((villager) => villager.job === job).length;
}

function canAfford(cost) {
  return Object.entries(cost).every(([type, amount]) => game.resources[type] >= amount);
}

function pay(cost) {
  Object.entries(cost).forEach(([type, amount]) => {
    game.resources[type] -= amount;
  });
}

function queueUnit(type, duration, onComplete) {
  game.queue.push({ type, remaining: duration, duration, onComplete });
}

function postMessage(text) {
  game.message = text;
  logEl.textContent = text;
}

function advanceAge() {
  if (game.age >= ages.length - 1) {
    postMessage('Your people are already in the Imperial Age.');
    return;
  }
  const cost = costs.age[game.age + 1];
  if (!canAfford(cost)) {
    postMessage(`Need ${cost.food} food and ${cost.gold} gold to age up.`);
    return;
  }
  pay(cost);
  queueUnit('Advance Age', 18, () => {
    game.age += 1;
    game.maxHp += 30;
    game.hp = Math.min(game.maxHp, game.hp + 20);
    postMessage(`Your civilization advances to the ${ages[game.age]}!`);
  });
}

function build(kind) {
  const cost = costs[kind];
  if (!canAfford(cost)) {
    postMessage(`Not enough resources to build ${kind}.`);
    return;
  }
  pay(cost);
  if (kind === 'farm') {
    game.farms += 1;
    postMessage('A new farm boosts your food gather rate.');
  }
  if (kind === 'house') {
    game.houses += 1;
    postMessage('A house raises your population limit.');
  }
  if (kind === 'tower') {
    game.towers += 1;
    postMessage('A watch tower will weaken incoming raiders.');
  }
}

function train(type) {
  const cost = costs[type];
  if (population() >= housingCap()) {
    postMessage('You need more houses before training more units.');
    return;
  }
  if (!canAfford(cost)) {
    postMessage(`Not enough resources to train ${type}.`);
    return;
  }
  pay(cost);
  if (type === 'villager') {
    queueUnit('Villager', 8, () => {
      game.villagers.push({ job: 'idle' });
      postMessage('A villager joins your town and awaits orders.');
    });
  }
  if (type === 'militia') {
    queueUnit('Militia', 10, () => {
      game.army += 1;
      postMessage('A militia unit marches out to defend the town.');
    });
  }
}

function assign(job) {
  const idle = game.villagers.find((villager) => villager.job === 'idle');
  if (idle) {
    idle.job = job;
    postMessage(`An idle villager is now gathering ${job}.`);
    return;
  }
  const other = game.villagers.find((villager) => villager.job !== job);
  if (other) {
    other.job = job;
    postMessage(`A villager is reassigned to ${job}.`);
    return;
  }
  postMessage(`All villagers are already working on ${job}.`);
}

function gather(delta) {
  const ageBonus = 1 + game.age * 0.18;
  const farmBonus = 1 + Math.max(0, game.farms - 1) * 0.16;
  const rates = {
    food: 2.6 * farmBonus,
    wood: 2.0,
    gold: 1.4 + game.age * 0.25,
    stone: 1.25 + game.age * 0.15,
  };

  resourceTypes.forEach((type) => {
    game.resources[type] += workersOn(type) * rates[type] * ageBonus * delta;
  });
}

function updateQueue(delta) {
  if (!game.queue.length) return;
  game.queue[0].remaining -= delta;
  if (game.queue[0].remaining <= 0) {
    const item = game.queue.shift();
    item.onComplete();
  }
}

function handleRaid() {
  raidsHandled += 1;
  const ageThreat = 16 + raidsHandled * 8 + game.age * 10;
  const towerDamage = game.towers * (14 + game.age * 4);
  const armyDamage = game.army * (9 + game.age * 2.5);
  const defense = towerDamage + armyDamage;
  const overflow = Math.max(0, ageThreat - defense);
  const losses = Math.max(0, Math.floor((ageThreat - towerDamage) / 40));

  game.army = Math.max(0, game.army - losses);
  game.hp = Math.max(0, game.hp - overflow);
  game.raidCooldown = Math.max(20, 48 - raidsHandled * 2.2);

  if (overflow > 0) {
    postMessage(`Raid ${raidsHandled}: the enemy breaks through for ${overflow.toFixed(0)} damage!`);
  } else {
    postMessage(`Raid ${raidsHandled}: your defenses repel the attack.`);
  }

  if (game.hp <= 0) {
    game.gameOver = true;
    game.victory = false;
    postMessage('Your town center falls. The kingdom is lost. Refresh to try again.');
  }

  if (objectives.every((objective) => objective.done())) {
    game.gameOver = true;
    game.victory = true;
    postMessage('Victory! Your realm endures and now rivals the greatest empires.');
  }
}

function update(delta) {
  if (game.gameOver) return;
  game.time += delta;
  gather(delta);
  updateQueue(delta);
  game.enemyProgress += delta;

  if (game.enemyProgress >= game.raidCooldown) {
    game.enemyProgress = 0;
    handleRaid();
  }
}

function renderHud() {
  const stats = [
    ['Age', ages[game.age]],
    ['Population', `${population()} / ${housingCap()}`],
    ['Food', Math.floor(game.resources.food)],
    ['Wood', Math.floor(game.resources.wood)],
    ['Gold', Math.floor(game.resources.gold)],
    ['Stone', Math.floor(game.resources.stone)],
    ['Villagers', game.villagers.length],
    ['Militia', game.army],
    ['Farms', game.farms],
    ['Towers', game.towers],
    ['Town Center HP', `${Math.ceil(game.hp)} / ${game.maxHp}`],
    ['Next Raid', `${Math.max(0, game.raidCooldown - game.enemyProgress).toFixed(0)}s`],
  ];

  resourcesEl.replaceChildren();
  stats.forEach(([label, value]) => {
    const node = statTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.label').textContent = label;
    node.querySelector('.value').textContent = value;
    resourcesEl.appendChild(node);
  });

  objectivesEl.replaceChildren();
  objectives.forEach((objective) => {
    const li = document.createElement('li');
    const done = objective.done();
    li.textContent = `${done ? '✓' : '○'} ${objective.text}`;
    li.className = done ? 'done' : '';
    objectivesEl.appendChild(li);
  });

  const queueLabel = game.queue.length
    ? `${game.queue[0].type} ${Math.ceil(game.queue[0].remaining)}s`
    : 'Idle town center';
  const raidPressure = raidsHandled ? ` | Raids survived: ${raidsHandled}` : '';
  statusBanner.textContent = `${queueLabel}${raidPressure}`;
}

function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#9cd173');
  gradient.addColorStop(1, '#659b4f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawResourceNode(nodes.berryPatch.x, nodes.berryPatch.y, nodes.berryPatch.radius, '#7c275c', 'Berries');
  drawResourceNode(nodes.forest.x, nodes.forest.y, nodes.forest.radius, '#256d37', 'Woodline');
  drawResourceNode(nodes.gold.x, nodes.gold.y, nodes.gold.radius, '#d5b441', 'Gold');
  drawResourceNode(nodes.stone.x, nodes.stone.y, nodes.stone.radius, '#8996a5', 'Stone');

  drawTownCenter();
  drawFarms();
  drawHouses();
  drawTowers();
  drawVillagers();
  drawArmy();
  drawRaidBar();

  if (game.gameOver) {
    ctx.fillStyle = 'rgba(16, 22, 29, 0.62)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eef4fa';
    ctx.font = '700 34px Inter, sans-serif';
    ctx.fillText(game.victory ? 'Victory!' : 'Defeat', 380, 280);
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText('Refresh the page to play again.', 345, 320);
  }
}

function drawResourceNode(x, y, radius, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillText(label, x - radius * 0.8, y + radius + 20);
}

function drawTownCenter() {
  const { x, y, size } = nodes.townCenter;
  ctx.fillStyle = '#8d5b36';
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.fillStyle = '#c58a58';
  ctx.fillRect(x - size / 2 + 6, y - size / 2 + 10, size - 12, size - 18);
  ctx.fillStyle = '#6a3f23';
  ctx.beginPath();
  ctx.moveTo(x - size / 2 - 6, y - size / 2 + 10);
  ctx.lineTo(x, y - size / 2 - 20);
  ctx.lineTo(x + size / 2 + 6, y - size / 2 + 10);
  ctx.closePath();
  ctx.fill();
}

function drawFarms() {
  for (let i = 0; i < game.farms; i += 1) {
    const x = 325 + (i % 3) * 58;
    const y = 250 + Math.floor(i / 3) * 58;
    ctx.fillStyle = '#bc9b3f';
    ctx.fillRect(x, y, 38, 38);
    ctx.strokeStyle = '#6e5826';
    ctx.strokeRect(x, y, 38, 38);
  }
}

function drawHouses() {
  for (let i = 0; i < game.houses; i += 1) {
    const x = 250 + (i % 4) * 48;
    const y = 365 + Math.floor(i / 4) * 54;
    ctx.fillStyle = '#9c7048';
    ctx.fillRect(x, y, 26, 26);
    ctx.fillStyle = '#704121';
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 13, y - 12);
    ctx.lineTo(x + 28, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawTowers() {
  for (let i = 0; i < game.towers; i += 1) {
    const x = 170 + i * 54;
    const y = 180 - (i % 2) * 24;
    ctx.fillStyle = '#7b828a';
    ctx.fillRect(x, y, 20, 65);
    ctx.fillStyle = '#abb5bf';
    ctx.fillRect(x - 4, y - 8, 28, 12);
  }
}

function drawVillagers() {
  const jobs = ['food', 'wood', 'gold', 'stone', 'idle'];
  const colors = {
    food: '#ffdf70',
    wood: '#7ad38b',
    gold: '#ffd166',
    stone: '#bdc9d4',
    idle: '#f2f5f7',
  };
  game.villagers.forEach((villager, index) => {
    const lane = jobs.indexOf(villager.job);
    const x = 120 + lane * 180 + (index % 3) * 12;
    const y = 70 + (index % 4) * 28;
    ctx.fillStyle = colors[villager.job];
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawArmy() {
  for (let i = 0; i < game.army; i += 1) {
    const x = 560 + (i % 6) * 34;
    const y = 330 + Math.floor(i / 6) * 32;
    ctx.fillStyle = '#cf5f5b';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f1d1cf';
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 12);
    ctx.lineTo(x + 14, y + 12);
    ctx.stroke();
  }
}

function drawRaidBar() {
  const width = 260;
  const height = 18;
  const x = canvas.width - width - 26;
  const y = 26;
  ctx.fillStyle = 'rgba(16, 22, 29, 0.45)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#ea6b66';
  ctx.fillRect(x, y, width * (game.enemyProgress / game.raidCooldown), height);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText('Enemy raid', x + 8, y + 13);
}

function loop(now) {
  const delta = Math.min(0.25, (now - game.lastTick) / 1000);
  game.lastTick = now;
  update(delta);
  renderHud();
  drawMap();
  requestAnimationFrame(loop);
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'age') {
      advanceAge();
      return;
    }
    if (action === 'farm' || action === 'house' || action === 'tower') {
      build(action);
      return;
    }
    train(action);
  });
});

document.querySelectorAll('[data-assign]').forEach((button) => {
  button.addEventListener('click', () => {
    assign(button.dataset.assign);
  });
});

postMessage(game.message);
renderHud();
requestAnimationFrame(loop);
