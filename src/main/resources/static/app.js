const unitStats = { WARRIOR: { movement: 1, attack: 3, defense: 2 }, ARCHER: { movement: 1, attack: 3, defense: 1 }, RIDER: { movement: 2, attack: 3, defense: 1 }, DEFENDER: { movement: 1, attack: 2, defense: 4 } };
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tileSize = 60;
let game = null;
let selectedUnitId = null;
let selectedTile = null;
let highlightedMoves = new Set();

const terrainColors = {
  PLAIN: '#84cc16',
  FOREST: '#15803d',
  MOUNTAIN: '#64748b',
  WATER: '#0ea5e9',
  SHALLOW_WATER: '#38bdf8'
};

const techs = ['ORGANIZATION','HUNTING','FISHING','ARCHERY','RIDING','SHIELDS','FORESTRY'];
const researchSelect = document.getElementById('researchSelect');
techs.forEach(tech => {
  const opt = document.createElement('option');
  opt.value = tech;
  opt.textContent = tech;
  researchSelect.appendChild(opt);
});

document.getElementById('newGameBtn').onclick = async () => {
  game = await api('/api/game/new', 'POST');
  selectedUnitId = null;
  selectedTile = null;
  render();
};

document.getElementById('endTurnBtn').onclick = async () => {
  if (!game) return;
  game = await api(`/api/game/${game.id}/end-turn`, 'POST');
  selectedUnitId = null;
  highlightedMoves.clear();
  render();
};

document.getElementById('researchBtn').onclick = async () => {
  if (!game) return;
  game = await api(`/api/game/${game.id}/research`, 'POST', { tech: researchSelect.value });
  render();
};

document.getElementById('recruitBtn').onclick = async () => {
  if (!game || !selectedTile) return;
  const city = Object.values(game.cities).find(c => c.x === selectedTile.x && c.y === selectedTile.y && c.ownerId === game.players[game.activePlayerIndex].id);
  if (!city) return alert('Select one of your cities first.');
  game = await api(`/api/game/${game.id}/recruit`, 'POST', { cityId: city.id, unitType: document.getElementById('recruitSelect').value });
  render();
};

document.getElementById('buildBtn').onclick = async () => {
  if (!game || !selectedTile) return;
  game = await api(`/api/game/${game.id}/build`, 'POST', selectedTile);
  render();
};

canvas.addEventListener('click', async (event) => {
  if (!game) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / tileSize);
  const y = Math.floor((event.clientY - rect.top) / tileSize);
  const tile = game.map.tiles[y][x];
  selectedTile = { x, y };
  const unitId = tile.occupantUnitId;
  const activeId = game.players[game.activePlayerIndex].id;

  if (unitId && game.units[unitId].ownerId === activeId) {
    selectedUnitId = unitId;
    highlightedMoves = computeReachable(game.units[unitId]);
    render();
    return;
  }

  if (selectedUnitId) {
    const attacker = game.units[selectedUnitId];
    if (unitId && game.units[unitId].ownerId !== attacker.ownerId) {
      game = await api(`/api/game/${game.id}/attack`, 'POST', { attackerId: selectedUnitId, defenderId: unitId });
    } else if (highlightedMoves.has(`${x},${y}`)) {
      game = await api(`/api/game/${game.id}/move`, 'POST', { unitId: selectedUnitId, x, y });
    }
    selectedUnitId = null;
    highlightedMoves.clear();
  }
  render();
});

function computeReachable(unit) {
  const visited = new Set();
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (ny < 0 || nx < 0 || ny >= game.map.height || nx >= game.map.width) continue;
      const tile = game.map.tiles[ny][nx];
      if (tile.terrain === 'WATER') continue;
      const stepCost = tile.terrain === 'FOREST' || tile.terrain === 'SHALLOW_WATER' ? 2 : tile.terrain === 'MOUNTAIN' ? 99 : 1;
      const total = current.cost + stepCost;
      const key = `${nx},${ny}`;
      if (total <= unitStats[unit.type].movement && !visited.has(key) && !tile.occupantUnitId) {
        visited.add(key);
        queue.push({ x: nx, y: ny, cost: total });
      }
    }
  }
  return visited;
}

function visibleToPlayer(x, y) {
  const activeId = game.players[game.activePlayerIndex].id;
  const units = Object.values(game.units).filter(u => u.ownerId === activeId);
  const cities = Object.values(game.cities).filter(c => c.ownerId === activeId);
  return units.some(u => Math.abs(u.x - x) + Math.abs(u.y - y) <= 2) || cities.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) <= 2);
}

function render() {
  if (!game) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < game.map.height; y++) {
    for (let x = 0; x < game.map.width; x++) {
      const tile = game.map.tiles[y][x];
      const visible = visibleToPlayer(x, y);
      ctx.fillStyle = visible ? terrainColors[tile.terrain] : '#020617';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      if (!visible) continue;
      if (highlightedMoves.has(`${x},${y}`)) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(x * tileSize + 4, y * tileSize + 4, tileSize - 8, tileSize - 8);
      }
      if (tile.village) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x * tileSize + 18, y * tileSize + 18, 24, 24);
      }
      if (tile.cityId) {
        const city = game.cities[tile.cityId];
        ctx.fillStyle = city.ownerId === 1 ? '#f97316' : '#7c3aed';
        ctx.fillRect(x * tileSize + 14, y * tileSize + 14, 32, 32);
      }
      if (tile.resource !== 'NONE') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText(tile.resource[0], x * tileSize + 4, y * tileSize + 14);
      }
      if (tile.improvement) {
        ctx.fillStyle = '#0f172a';
        ctx.fillText('+' + tile.improvement[0], x * tileSize + 24, y * tileSize + 55);
      }
      if (tile.occupantUnitId) {
        const unit = game.units[tile.occupantUnitId];
        ctx.beginPath();
        ctx.fillStyle = unit.ownerId === 1 ? '#fb7185' : '#c084fc';
        ctx.arc(x * tileSize + 30, y * tileSize + 30, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.fillText(unit.type[0], x * tileSize + 26, y * tileSize + 34);
        ctx.fillText(unit.health, x * tileSize + 4, y * tileSize + 56);
      }
      if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
      }
    }
  }

  const currentPlayer = game.players[game.activePlayerIndex];
  document.getElementById('status').innerHTML = `
    <strong>Turn ${game.turnNumber}</strong><br>
    Active: ${currentPlayer.name} (${currentPlayer.tribe})<br>
    Stars: ${currentPlayer.stars}<br>
    Score: ${currentPlayer.score}<br>
    Status: ${game.status}<br>
    Winner: ${game.winnerId ?? '-'}<br>
    <small>${game.log}</small>`;

  if (selectedTile) {
    const tile = game.map.tiles[selectedTile.y][selectedTile.x];
    const defender = tile.occupantUnitId ? game.units[tile.occupantUnitId] : null;
    const attackPreview = selectedUnitId && defender ? `Preview: ${unitStats[game.units[selectedUnitId].type].attack} atk vs ${unitStats[defender.type].defense} def` : 'No target';
    document.getElementById('details').innerHTML = `
      Tile: (${selectedTile.x}, ${selectedTile.y})<br>
      Terrain: ${tile.terrain}<br>
      Resource: ${tile.resource}<br>
      Improvement: ${tile.improvement ?? '-'}<br>
      Village: ${tile.village}<br>
      ${attackPreview}`;
  }
}

async function api(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    alert(text);
    throw new Error(text);
  }
  return response.json();
}
