// ─── SETUP ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000008, 0.018);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 4, 10);
camera.lookAt(0, 1, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── LIGHTING ──────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x111133, 1);
scene.add(ambientLight);

const frontLight = new THREE.DirectionalLight(0x4af0ff, 2);
frontLight.position.set(0, 5, 5);
scene.add(frontLight);

const backGlow = new THREE.PointLight(0xff4a9b, 3, 20);
backGlow.position.set(0, 2, 8);
scene.add(backGlow);

// ─── STARS ─────────────────────────────────────────────────────────────────
function createStarField() {
  const geo = new THREE.BufferGeometry();
  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 2] = Math.random() * -200;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
  return new THREE.Points(geo, mat);
}
const stars = createStarField();
scene.add(stars);

// ─── LANE / TRACK ──────────────────────────────────────────────────────────
const LANE_WIDTH = 2.5;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];
const SEGMENT_LENGTH = 12;
const NUM_SEGMENTS = 20;

function createTrackSegment(z) {
  const group = new THREE.Group();

  // Floor — dark space-tile, no lane lines
  const floorGeo = new THREE.PlaneGeometry(8, SEGMENT_LENGTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x030315,
    emissive: 0x06062a,
    emissiveIntensity: 0.25,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = z;
  group.add(floor);

  // Subtle edge borders (left & right walls hint)
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x1a0a3a, transparent: true, opacity: 0.5 });
  [-4.1, 4.1].forEach(x => {
    const edgeGeo = new THREE.PlaneGeometry(0.15, SEGMENT_LENGTH);
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.005, z);
    group.add(edge);
  });

  return group;
}

// ─── TRACK POOL ────────────────────────────────────────────────────────────
const trackSegments = [];
for (let i = 0; i < NUM_SEGMENTS; i++) {
  const seg = createTrackSegment(-i * SEGMENT_LENGTH);
  scene.add(seg);
  trackSegments.push(seg);
}

// ─── PLAYER SHIP ───────────────────────────────────────────────────────────
function createShip() {
  const group = new THREE.Group();

  // Fuselage (body)
  const bodyGeo = new THREE.ConeGeometry(0.32, 1.6, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    emissive: 0x4af0ff,
    emissiveIntensity: 0.35,
    metalness: 0.95,
    roughness: 0.05
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Main wings
  const wingGeo = new THREE.BoxGeometry(2.2, 0.07, 0.8);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x224466,
    emissive: 0x4af0ff,
    emissiveIntensity: 0.15,
    metalness: 0.85,
    roughness: 0.2
  });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.z = 0.35;
  group.add(wings);

  // Small back stabilisers
  const stabGeo = new THREE.BoxGeometry(0.9, 0.06, 0.45);
  const stab = new THREE.Mesh(stabGeo, wingMat);
  stab.position.set(0, 0.22, 0.65);
  stab.rotation.z = Math.PI / 2;
  group.add(stab);

  // Cockpit glass
  const cockpitGeo = new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x88ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.7,
    metalness: 0.1,
    roughness: 0
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.z = -0.35;
  cockpit.rotation.x = Math.PI;
  group.add(cockpit);

  // Engine nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.14, 0.22, 0.28, 8);
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.95, roughness: 0.1 });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 0.88;
  group.add(nozzle);

  // Engine glow core
  const engineGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const engineMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.z = 0.95;
  group.add(engine);

  // Engine trail ring
  const ringGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.z = 0.9;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Engine point light
  const engineLight = new THREE.PointLight(0xff6a00, 2.5, 5);
  engineLight.position.z = 1.0;
  group.add(engineLight);

  group.position.set(0, 0.8, 6);
  return { group, engineLight, engine, ring };
}

const { group: ship, engineLight, engine: engineMesh, ring: engineRing } = createShip();
scene.add(ship);

// ─── OBSTACLES ─────────────────────────────────────────────────────────────
const OBSTACLE_COLORS = [0xff3366, 0xff8800, 0xcc00ff];

function createAsteroid(lane, z) {
  const laneX = LANES[lane];
  const size = 0.35 + Math.random() * 0.45;

  const geo = new THREE.DodecahedronGeometry(size, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) + (Math.random() - 0.5) * 0.12,
      pos.getY(i) + (Math.random() - 0.5) * 0.12,
      pos.getZ(i) + (Math.random() - 0.5) * 0.12
    );
  }
  geo.computeVertexNormals();

  const colorIdx = Math.floor(Math.random() * OBSTACLE_COLORS.length);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x553322,
    emissive: OBSTACLE_COLORS[colorIdx],
    emissiveIntensity: 0.55,
    roughness: 0.9,
    metalness: 0.1
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(laneX, 0.8, z);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  mesh.userData = {
    lane,
    rotSpeed: (Math.random() - 0.5) * 0.06,
    size,
    type: 'asteroid'
  };
  scene.add(mesh);
  return mesh;
}

// ─── LEVEL BANNER ──────────────────────────────────────────────────────────
const levelBanner   = document.getElementById('level-banner');
const bannerNumber  = document.getElementById('banner-number');
let bannerTimeout   = null;

function showLevelBanner(lvl) {
  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerNumber.textContent = lvl;

  levelBanner.classList.remove('hide');
  levelBanner.classList.add('show');

  bannerTimeout = setTimeout(() => {
    levelBanner.classList.remove('show');
    levelBanner.classList.add('hide');
    bannerTimeout = setTimeout(() => {
      levelBanner.classList.remove('hide');
    }, 400);
  }, 1800);
}

// ─── GAME STATE ────────────────────────────────────────────────────────────
let state = 'start';
let score = 0;
let bestScore = 0;
let level = 1;
let gameSpeed = 12;
let spawnTimer = 0;
let spawnInterval = 2.0;
let obstacles = [];
let currentLane = 1;
let targetX = LANES[1];
let isJumping = false;
let jumpVelocity = 0;
let shipY = 0.8;
const JUMP_FORCE = 9;
const GRAVITY = 22;
let laneChangeCooldown = 0;
let tiltAngle = 0;
let scoreTimer = 0;
let difficultyTimer = 0;

// ─── KEYS ──────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (state !== 'playing') return;

  if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && currentLane > 0 && laneChangeCooldown <= 0) {
    currentLane--;
    targetX = LANES[currentLane];
    laneChangeCooldown = 0.18;
  }
  if ((e.code === 'ArrowRight' || e.code === 'KeyD') && currentLane < 2 && laneChangeCooldown <= 0) {
    currentLane++;
    targetX = LANES[currentLane];
    laneChangeCooldown = 0.18;
  }
  if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !isJumping) {
    isJumping = true;
    jumpVelocity = JUMP_FORCE;
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ─── UI REFS ───────────────────────────────────────────────────────────────
const startScreen    = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const hud            = document.getElementById('hud');
const scoreDisplay   = document.getElementById('score-display');
const levelDisplay   = document.getElementById('level-display');
const finalScore     = document.getElementById('final-score');
const bestScoreEl    = document.getElementById('best-score');
const finalLevel     = document.getElementById('final-level');
const speedBar       = document.getElementById('speed-bar');
const flashEl        = document.getElementById('flash');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

function startGame() {
  obstacles.forEach(o => scene.remove(o));
  obstacles = [];
  score = 0;
  level = 1;
  gameSpeed = 12;
  spawnInterval = 2.0;
  spawnTimer = 0;
  difficultyTimer = 0;
  scoreTimer = 0;
  currentLane = 1;
  targetX = LANES[1];
  isJumping = false;
  jumpVelocity = 0;
  shipY = 0.8;
  ship.position.set(0, 0.8, 6);
  ship.rotation.set(0, 0, 0);
  tiltAngle = 0;

  levelDisplay.textContent = 1;
  scoreDisplay.textContent = 0;

  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'playing';

  // Show level 1 banner at start
  showLevelBanner(1);
}

function gameOver() {
  state = 'dead';
  hud.classList.add('hidden');
  if (score > bestScore) bestScore = score;
  finalScore.textContent = Math.floor(score);
  bestScoreEl.textContent = Math.floor(bestScore);
  finalLevel.textContent = level;
  flashEl.style.opacity = '1';
  setTimeout(() => {
    flashEl.style.opacity = '0';
    gameoverScreen.classList.remove('hidden');
  }, 180);
}

// ─── COLLISION ─────────────────────────────────────────────────────────────
function checkCollision() {
  const sx = ship.position.x;
  const sy = ship.position.y;
  for (const obs of obstacles) {
    const dx = Math.abs(obs.position.x - sx);
    const dy = Math.abs(obs.position.y - sy);
    const dz = Math.abs(obs.position.z - ship.position.z);
    const threshold = 0.55 + obs.userData.size * 0.6;
    if (dx < threshold && dy < threshold * 1.2 && dz < threshold) {
      return true;
    }
  }
  return false;
}

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state !== 'playing') {
    renderer.render(scene, camera);
    return;
  }

  // ── Score
  scoreTimer += dt;
  if (scoreTimer >= 0.1) {
    score += gameSpeed * 0.08;
    scoreTimer = 0;
    scoreDisplay.textContent = Math.floor(score);
  }

  // ── Difficulty ramp (every 8 seconds)
  difficultyTimer += dt;
  if (difficultyTimer >= 8) {
    difficultyTimer = 0;
    level++;
    gameSpeed    = Math.min(gameSpeed + 2.5, 55);
    spawnInterval = Math.max(spawnInterval - 0.18, 0.55);
    levelDisplay.textContent = level;
    showLevelBanner(level);          // ← banner on every level up
  }

  // ── Speed bar
  const speedPct = ((gameSpeed - 12) / (55 - 12)) * 100;
  speedBar.style.width = Math.max(8, speedPct) + '%';

  // ── Move track
  trackSegments.forEach(seg => {
    seg.position.z += gameSpeed * dt;
    if (seg.position.z > 24) seg.position.z -= NUM_SEGMENTS * SEGMENT_LENGTH;
  });

  // ── Move stars
  stars.position.z += gameSpeed * 0.12 * dt;
  if (stars.position.z > 10) stars.position.z = 0;

  // ── Move & rotate obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.position.z += gameSpeed * dt;
    o.rotation.x += o.userData.rotSpeed;
    o.rotation.y += o.userData.rotSpeed * 0.7;
    if (o.position.z > 14) {
      scene.remove(o);
      obstacles.splice(i, 1);
    }
  }

  // ── Spawn obstacles
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    const blockCount = level < 3 ? 1
      : level < 6 ? (Math.random() < 0.4 ? 2 : 1)
      : (Math.random() < 0.55 ? 2 : 1);
    const lanePool = [0, 1, 2].sort(() => Math.random() - 0.5);
    for (let b = 0; b < blockCount; b++) {
      obstacles.push(createAsteroid(lanePool[b], -80 - Math.random() * 20));
    }
  }

  // ── Lane movement
  laneChangeCooldown -= dt;
  ship.position.x += (targetX - ship.position.x) * Math.min(1, dt * 14);

  // Tilt on lane change
  const desiredTilt = (LANES[currentLane] === targetX ? 0 : (targetX - ship.position.x) * -0.3);
  tiltAngle += (desiredTilt - tiltAngle) * dt * 8;
  ship.rotation.z = tiltAngle;

  // ── Jump
  if (isJumping) {
    jumpVelocity -= GRAVITY * dt;
    shipY += jumpVelocity * dt;
    if (shipY <= 0.8) { shipY = 0.8; isJumping = false; jumpVelocity = 0; }
  }
  ship.position.y = isJumping ? shipY : 0.8 + Math.sin(now * 0.002) * 0.08;

  // ── Engine pulse
  const pulse = 0.15 + Math.abs(Math.sin(now * 0.005)) * 0.1;
  engineMesh.scale.setScalar(1 + pulse);
  engineRing.scale.setScalar(1 + pulse * 0.5);
  engineLight.intensity = 1.5 + Math.sin(now * 0.006) * 0.8;

  // ── Collision
  if (checkCollision()) { gameOver(); return; }

  // ── Back glow tracks ship
  backGlow.position.x = ship.position.x;
  backGlow.position.y = ship.position.y;

  renderer.render(scene, camera);
}

animate();
