import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SimulationConfig, SimulationStats } from '../types/simulation';
import { PALETTES, createFloorGridTexture, createGlowSpriteTexture, createRimMarkingsTexture } from './proceduralMaterials';

// Module-level pre-allocated scratch vectors to guarantee ZERO Garbage Collection in tick()
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _norm = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _scratchColor = new THREE.Color();
const _camTargetPos = new THREE.Vector3();
const _camTargetLookAt = new THREE.Vector3();

// Detect software WebGL to adapt frame pacing and shadow quality per SKILL.md
export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

interface KineticBall {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  colorHex: string;
  threeColor: THREE.Color;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  gimbal1: THREE.Mesh;
  gimbal2: THREE.Mesh;
  pointLight: THREE.PointLight;
  trailPoints: THREE.Vector3[];
  trailLine: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  radius: number;
  rotationSpeed1: number;
  rotationSpeed2: number;
}

interface ImpactRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  scale: number;
  maxScale: number;
  color: THREE.Color;
}

export class KineticArena {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private frameId: number = 0;
  private clock: THREE.Clock;

  // Arena Procedural Models
  private arenaGroup: THREE.Group;
  private boundaryRingMesh: THREE.Mesh | null = null;
  private boundaryInnerField: THREE.Mesh | null = null;
  private boundarySphereWire: THREE.LineSegments | null = null;
  private boundaryPylonsGroup: THREE.Group | null = null;
  private floorGridMesh: THREE.Mesh | null = null;
  private contactShadowMesh: THREE.Mesh | null = null;

  // Orbs & Trails
  private balls: KineticBall[] = [];
  private orbsGroup: THREE.Group;
  private trailsGroup: THREE.Group;

  // Shockwaves
  private impactRings: ImpactRing[] = [];
  private impactRingGeometry: THREE.RingGeometry;

  // Config & Stats
  private config: SimulationConfig;
  private onStatsUpdate?: (stats: SimulationStats) => void;
  private onCollision?: (ballIndex: number, velocityMag: number) => void;
  private totalCollisions: number = 0;
  private collisionsLastSecond: number = 0;
  private collisionTimer: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Camera presets targets
  private activeCamMode: string = 'iso3d';
  private targetCamFov: number = 50;

  // Shared Geometries & Materials
  private coreGeometry: THREE.SphereGeometry;
  private gimbalGeometry1: THREE.TorusGeometry;
  private gimbalGeometry2: THREE.TorusGeometry;
  private sensorStudGeometry: THREE.SphereGeometry;
  private studMaterial: THREE.MeshStandardMaterial;

  private floorTexture: THREE.CanvasTexture;
  private rimTexture: THREE.CanvasTexture;
  private glowTexture: THREE.CanvasTexture;

  private isDestroyed: boolean = false;

  constructor(
    container: HTMLElement,
    initialConfig: SimulationConfig,
    onStatsUpdate?: (stats: SimulationStats) => void,
    onCollision?: (ballIndex: number, velocityMag: number) => void
  ) {
    this.container = container;
    this.config = { ...initialConfig };
    this.onStatsUpdate = onStatsUpdate;
    this.onCollision = onCollision;
    this.clock = new THREE.Clock();

    // 1. Setup Scene & Color pipeline
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050819'); // exact pygame screen.fill((5, 8, 25))
    this.scene.fog = new THREE.FogExp2('#050819', 0.015);

    // 2. Setup Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 24, 28);

    // 3. Setup WebGL Renderer with ACESFilmicToneMapping & PBR environment
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Reflection (RoomEnvironment per SKILL.md)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls with silky smooth exponential damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.15; // allow glancing slightly below rim
    this.controls.minDistance = 6;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 0, 0);

    // 6. Studio Lighting Rig (Warm key light, cool hemisphere fill, rim)
    const hemiLight = new THREE.HemisphereLight('#7090C0', '#182035', 0.7);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFE8D6', 2.2);
    keyLight.position.set(15, 30, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 18;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 65;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#4080FF', 1.0);
    rimLight.position.set(-20, 15, -20);
    this.scene.add(rimLight);

    // 7. Shared Procedural Geometries & Materials
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.floorTexture = createFloorGridTexture(maxAnisotropy);
    this.rimTexture = createRimMarkingsTexture(maxAnisotropy);
    this.glowTexture = createGlowSpriteTexture();

    this.coreGeometry = new THREE.SphereGeometry(0.55, 32, 24);
    this.gimbalGeometry1 = new THREE.TorusGeometry(0.85, 0.045, 12, 48);
    this.gimbalGeometry2 = new THREE.TorusGeometry(0.72, 0.04, 12, 48);
    this.sensorStudGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    this.studMaterial = new THREE.MeshStandardMaterial({
      color: '#E0E5FF',
      metalness: 0.95,
      roughness: 0.1,
    });

    this.impactRingGeometry = new THREE.RingGeometry(0.1, 0.4, 32);

    // 8. Construct Arena Hierarchy & Groups
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);

    this.trailsGroup = new THREE.Group();
    this.scene.add(this.trailsGroup);

    this.orbsGroup = new THREE.Group();
    this.scene.add(this.orbsGroup);

    // 9. Build scene elements
    this.buildFloor();
    this.rebuildBoundary();
    this.initBalls();

    // 10. Listen to window resize
    window.addEventListener('resize', this.handleResize);

    // 11. Initial camera alignment
    this.setCameraPreset(this.config.cameraMode, true);

    // 12. Pre-warm shaders
    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 13. Start animation loop
    this.tick();
  }

  /**
   * Builds the contact ground plane and the procedural circular resonance grid
   */
  private buildFloor() {
    // Floor grid plate
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      roughness: 0.65,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.floorGridMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorGridMesh.rotation.x = -Math.PI / 2;
    this.floorGridMesh.position.y = -0.05;
    this.floorGridMesh.receiveShadow = !isSoftwareGl;
    this.arenaGroup.add(this.floorGridMesh);

    // Soft radial contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(32, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.glowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.y = -0.04;
    this.arenaGroup.add(this.contactShadowMesh);
  }

  /**
   * Builds the multi-part procedural containment boundary:
   * (1) Primary silhouette: Heavy structural titanium bevel rim
   * (2) Secondary read: Luminous inner laser energy field
   * (3) Accent details: 8 architectural node pylons with brackets
   * (4) 3D Geodesic sphere/cylinder variations
   */
  public rebuildBoundary() {
    // Clean old boundary objects
    if (this.boundaryRingMesh) {
      this.arenaGroup.remove(this.boundaryRingMesh);
      this.boundaryRingMesh.geometry.dispose();
      (this.boundaryRingMesh.material as THREE.Material).dispose();
      this.boundaryRingMesh = null;
    }
    if (this.boundaryInnerField) {
      this.arenaGroup.remove(this.boundaryInnerField);
      this.boundaryInnerField.geometry.dispose();
      (this.boundaryInnerField.material as THREE.Material).dispose();
      this.boundaryInnerField = null;
    }
    if (this.boundarySphereWire) {
      this.arenaGroup.remove(this.boundarySphereWire);
      this.boundarySphereWire.geometry.dispose();
      (this.boundarySphereWire.material as THREE.Material).dispose();
      this.boundarySphereWire = null;
    }
    if (this.boundaryPylonsGroup) {
      this.arenaGroup.remove(this.boundaryPylonsGroup);
      this.boundaryPylonsGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.boundaryPylonsGroup = null;
    }

    const radius = this.config.boundaryRadius;
    const currentPalette = PALETTES.find((p) => p.id === this.config.paletteId) || PALETTES[0];

    if (this.config.arenaDimension === 'planar2d') {
      // 1. Primary silhouette: Outer structural rim with bevel
      const rimGeo = new THREE.TorusGeometry(radius, 0.45, 16, 128);
      const rimMat = new THREE.MeshStandardMaterial({
        color: '#1a2238',
        metalness: 0.9,
        roughness: 0.25,
        map: this.rimTexture,
      });
      this.boundaryRingMesh = new THREE.Mesh(rimGeo, rimMat);
      this.boundaryRingMesh.rotation.x = Math.PI / 2;
      this.boundaryRingMesh.position.y = 0;
      this.boundaryRingMesh.receiveShadow = !isSoftwareGl;
      this.boundaryRingMesh.castShadow = !isSoftwareGl;
      this.arenaGroup.add(this.boundaryRingMesh);

      // 2. Secondary read: Laser energy ring glow on inner circumference
      const innerLaserGeo = new THREE.TorusGeometry(radius - 0.2, 0.08, 12, 128);
      const innerLaserMat = new THREE.MeshBasicMaterial({
        color: currentPalette.boundaryColor,
        transparent: true,
        opacity: 0.85,
      });
      this.boundaryInnerField = new THREE.Mesh(innerLaserGeo, innerLaserMat);
      this.boundaryInnerField.rotation.x = Math.PI / 2;
      this.boundaryInnerField.position.y = 0;
      this.arenaGroup.add(this.boundaryInnerField);

      // 3. Accent details: 8 architectural pylon brackets around perimeter
      this.boundaryPylonsGroup = new THREE.Group();
      const pylonCount = 8;
      const bracketGeo = new THREE.BoxGeometry(0.6, 0.9, 1.2);
      const bracketMat = new THREE.MeshStandardMaterial({
        color: '#2a3450',
        metalness: 0.85,
        roughness: 0.3,
      });
      const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: currentPalette.glowColor });

      for (let i = 0; i < pylonCount; i++) {
        const angle = (i * Math.PI * 2) / pylonCount;
        const pylonGroup = new THREE.Group();
        pylonGroup.position.set(Math.cos(angle) * (radius + 0.35), 0.25, Math.sin(angle) * (radius + 0.35));
        pylonGroup.rotation.y = -angle;

        const bracketMesh = new THREE.Mesh(bracketGeo, bracketMat);
        bracketMesh.castShadow = !isSoftwareGl;
        pylonGroup.add(bracketMesh);

        const ledMesh = new THREE.Mesh(ledGeo, ledMat);
        ledMesh.position.set(0, 0.45, 0.2);
        pylonGroup.add(ledMesh);

        this.boundaryPylonsGroup.add(pylonGroup);
      }
      this.arenaGroup.add(this.boundaryPylonsGroup);
    } else if (this.config.arenaDimension === 'sphere3d') {
      // 3D Spherical Celestial Containment
      // 1. Primary outer equatorial and meridional brass/titanium gimbal rings
      this.boundaryPylonsGroup = new THREE.Group();
      const ringMat = new THREE.MeshStandardMaterial({
        color: '#202940',
        metalness: 0.9,
        roughness: 0.2,
      });

      // 3 Orthogonal Major Structural Rings
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.3, 16, 96), ringMat);
      ring1.rotation.x = Math.PI / 2;
      this.boundaryPylonsGroup.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.3, 16, 96), ringMat);
      this.boundaryPylonsGroup.add(ring2);

      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.3, 16, 96), ringMat);
      ring3.rotation.y = Math.PI / 2;
      this.boundaryPylonsGroup.add(ring3);

      this.arenaGroup.add(this.boundaryPylonsGroup);

      // 2. Geodesic wireframe holographic sphere
      const sphereGeo = new THREE.IcosahedronGeometry(radius - 0.1, 2);
      const wireframeGeo = new THREE.WireframeGeometry(sphereGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: currentPalette.boundaryColor,
        transparent: true,
        opacity: 0.35,
      });
      this.boundarySphereWire = new THREE.LineSegments(wireframeGeo, wireMat);
      this.arenaGroup.add(this.boundarySphereWire);
    } else {
      // Cylinder 3D Chamber
      this.boundaryPylonsGroup = new THREE.Group();
      const rimMat = new THREE.MeshStandardMaterial({
        color: '#1e263d',
        metalness: 0.9,
        roughness: 0.2,
      });

      // Bottom ring
      const bottomRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.35, 16, 96), rimMat);
      bottomRing.rotation.x = Math.PI / 2;
      bottomRing.position.y = -radius * 0.6;
      this.boundaryPylonsGroup.add(bottomRing);

      // Top ring
      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.35, 16, 96), rimMat);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.y = radius * 0.6;
      this.boundaryPylonsGroup.add(topRing);

      // Vertical energy pillars
      const pillarCount = 12;
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, radius * 1.2, 16);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: currentPalette.boundaryColor,
        transparent: true,
        opacity: 0.6,
      });
      for (let i = 0; i < pillarCount; i++) {
        const angle = (i * Math.PI * 2) / pillarCount;
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        this.boundaryPylonsGroup.add(pillar);
      }
      this.arenaGroup.add(this.boundaryPylonsGroup);
    }
  }

  /**
   * Initializes all kinetic balls as composite 3-12 part procedural models:
   * (1) Nucleus core sphere (emissive standard/physical material)
   * (2) Primary outer gimbal ring (counter-rotating)
   * (3) Secondary nested gimbal ring
   * (4) 4 magnetic accent stud beads
   * (5) Point light emitting localized radiance
   * (6) Smooth BufferGeometry ribbon trail with fading gradient
   */
  public initBalls() {
    // Dispose previous balls
    for (const b of this.balls) {
      this.orbsGroup.remove(b.group);
      this.trailsGroup.remove(b.trailLine);
      b.trailGeometry.dispose();
      (b.trailLine.material as THREE.Material).dispose();
      (b.coreMesh.material as THREE.Material).dispose();
      (b.gimbal1.material as THREE.Material).dispose();
      (b.gimbal2.material as THREE.Material).dispose();
      b.pointLight.dispose();
    }
    this.balls = [];

    const currentPalette = PALETTES.find((p) => p.id === this.config.paletteId) || PALETTES[0];
    const ballCount = this.config.ballCount;
    const boundaryRadius = this.config.boundaryRadius;
    const maxTrail = this.config.trailLength;

    // Radius ratio matching Python code: center=360, radius=280, initial spawn distance=100
    // So spawn radius is ~ 35% of boundary radius
    const spawnRadius = boundaryRadius * 0.36;

    for (let i = 0; i < ballCount; i++) {
      const angle = (2 * Math.PI * i) / ballCount;
      const colorHex = currentPalette.colors[i % currentPalette.colors.length];
      const threeColor = new THREE.Color(colorHex);

      // Position
      let x = Math.cos(angle) * spawnRadius;
      let y = 0.55; // flush above floor
      let z = Math.sin(angle) * spawnRadius;

      if (this.config.arenaDimension === 'sphere3d') {
        // 3D spherical distributed spawn
        const phi = Math.acos(-1 + (2 * i) / ballCount);
        const theta = Math.sqrt(ballCount * Math.PI) * phi;
        x = spawnRadius * Math.cos(theta) * Math.sin(phi);
        y = spawnRadius * Math.sin(theta) * Math.sin(phi);
        z = spawnRadius * Math.cos(phi);
      }

      // Initial velocity based on preset
      const vel = new THREE.Vector3();
      const baseSpeed = 4.0 * this.config.speed;

      if (this.config.patternPreset === 'pygame') {
        // Python code: vx = 3, vy = 2 (in 2D plane)
        // Normalized with speed
        vel.set(3, 0, 2).normalize().multiplyScalar(baseSpeed);
        // Add subtle rotation per ball so they diverge into harmonic patterns
        vel.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i * Math.PI * 0.25) / ballCount);
      } else if (this.config.patternPreset === 'vortex') {
        // Tangential vortex spin + slight radial outward push
        const tangentAngle = angle + Math.PI / 2;
        vel.set(Math.cos(tangentAngle) * 0.8 + Math.cos(angle) * 0.2, 0, Math.sin(tangentAngle) * 0.8 + Math.sin(angle) * 0.2)
          .normalize()
          .multiplyScalar(baseSpeed);
      } else if (this.config.patternPreset === 'star') {
        // Pure radial outward burst
        vel.set(Math.cos(angle), 0, Math.sin(angle)).normalize().multiplyScalar(baseSpeed);
      } else if (this.config.patternPreset === 'harmonic') {
        // Phase-offset frequency ratios
        const phase = (i * Math.PI * 2) / 3;
        vel.set(Math.sin(phase * 1.5) * 3, 0, Math.cos(phase * 2.0) * 2.5).normalize().multiplyScalar(baseSpeed);
      } else {
        // Chaos
        const randomAngle = Math.random() * Math.PI * 2;
        const randomY = this.config.arenaDimension === 'sphere3d' ? (Math.random() - 0.5) * 2 : 0;
        vel.set(Math.cos(randomAngle), randomY, Math.sin(randomAngle)).normalize().multiplyScalar(baseSpeed);
      }

      if (this.config.arenaDimension === 'sphere3d' && this.config.patternPreset !== 'chaos') {
        // Spread velocity in 3D
        vel.y = (Math.sin(i * 1.7) * baseSpeed) / 2;
      }

      // Composite 3-12 Part Procedural Orb Model
      const orbGroup = new THREE.Group();
      orbGroup.position.set(x, y, z);

      // Part 1: Central Glowing Nucleus
      const coreMat = new THREE.MeshStandardMaterial({
        color: threeColor,
        emissive: threeColor,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.8,
      });
      const coreMesh = new THREE.Mesh(this.coreGeometry, coreMat);
      coreMesh.castShadow = !isSoftwareGl;
      orbGroup.add(coreMesh);

      // Part 2: Primary Outer Equatorial Gimbal Ring (brushed metal, rotates around X/Z)
      const gimbalMat1 = new THREE.MeshStandardMaterial({
        color: '#E8EDF5',
        metalness: 0.95,
        roughness: 0.15,
      });
      const gimbal1 = new THREE.Mesh(this.gimbalGeometry1, gimbalMat1);
      orbGroup.add(gimbal1);

      // Part 3: Secondary Orthogonal Polar Gimbal Ring (counter-rotating)
      const gimbalMat2 = new THREE.MeshStandardMaterial({
        color: '#A0B2C6',
        metalness: 0.9,
        roughness: 0.2,
      });
      const gimbal2 = new THREE.Mesh(this.gimbalGeometry2, gimbalMat2);
      gimbal2.rotation.y = Math.PI / 2;
      orbGroup.add(gimbal2);

      // Part 4: 4 Magnetic Accent Stud Beads spaced at 90 deg along primary ring
      for (let s = 0; s < 4; s++) {
        const studAngle = (s * Math.PI) / 2;
        const stud = new THREE.Mesh(this.sensorStudGeometry, this.studMaterial);
        stud.position.set(Math.cos(studAngle) * 0.85, 0, Math.sin(studAngle) * 0.85);
        gimbal1.add(stud);
      }

      // Part 5: Attached Point Light (radiates colored light on floor and surroundings)
      const lightIntensity = isSoftwareGl ? 0.8 : 1.8;
      const pointLight = new THREE.PointLight(threeColor, lightIntensity, 4.5, 2.0);
      orbGroup.add(pointLight);

      this.orbsGroup.add(orbGroup);

      // Part 6: Smooth Fading Ribbon Trail with Pre-allocated BufferGeometry
      const trailPositions = new Float32Array(maxTrail * 3);
      const trailColors = new Float32Array(maxTrail * 3);

      for (let p = 0; p < maxTrail; p++) {
        trailPositions[p * 3] = x;
        trailPositions[p * 3 + 1] = y;
        trailPositions[p * 3 + 2] = z;

        // Fading alpha gradient
        const alpha = p / maxTrail;
        const col = threeColor.clone().multiplyScalar(alpha);
        trailColors[p * 3] = col.r;
        trailColors[p * 3 + 1] = col.g;
        trailColors[p * 3 + 2] = col.b;
      }

      const trailGeometry = new THREE.BufferGeometry();
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const trailMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
      });

      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      trailLine.frustumCulled = false;
      this.trailsGroup.add(trailLine);

      this.balls.push({
        position: new THREE.Vector3(x, y, z),
        velocity: vel,
        colorHex,
        threeColor,
        group: orbGroup,
        coreMesh,
        gimbal1,
        gimbal2,
        pointLight,
        trailPoints: [new THREE.Vector3(x, y, z)],
        trailLine,
        trailGeometry,
        radius: 0.55,
        rotationSpeed1: 1.5 + (i % 3) * 0.5,
        rotationSpeed2: -(1.2 + (i % 4) * 0.4),
      });
    }
  }

  /**
   * Spawns an expanding luminous shockwave ripple at the collision location
   */
  private spawnImpactRing(pos: THREE.Vector3, normal: THREE.Vector3, color: THREE.Color) {
    if (this.impactRings.length > 24) {
      // Reuse oldest
      const oldest = this.impactRings.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(this.impactRingGeometry, ringMat);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(normal));

    this.scene.add(mesh);
    this.impactRings.push({
      mesh,
      life: 1.0,
      maxLife: 1.0,
      scale: 0.2,
      maxScale: 2.2,
      color,
    });
  }

  /**
   * Smooth Camera Presets transitions
   */
  public setCameraPreset(mode: string, immediate: boolean = false) {
    this.activeCamMode = mode;

    if (mode === 'pygame2d') {
      // Top-Down planar view directly matching the Pygame 2D coordinate system
      _camTargetPos.set(0, 36, 0.01);
      _camTargetLookAt.set(0, 0, 0);
      this.targetCamFov = 50;
    } else if (mode === 'iso3d') {
      // High-angle 3D isometric view showcasing the full multi-part craft and floor bevels
      _camTargetPos.set(0, 24, 28);
      _camTargetLookAt.set(0, 0, 0);
      this.targetCamFov = 50;
    } else if (mode === 'cinematic') {
      // Low dramatic angle
      _camTargetPos.set(22, 9, 20);
      _camTargetLookAt.set(0, 0.5, 0);
      this.targetCamFov = 55;
    } else if (mode === 'follow') {
      // Handled dynamically in tick() targeting ball #1
      this.targetCamFov = 45;
    }

    if (immediate && mode !== 'follow') {
      this.camera.position.copy(_camTargetPos);
      this.controls.target.copy(_camTargetLookAt);
      this.camera.fov = this.targetCamFov;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }
  }

  /**
   * Updates physics, collisions, trails, and animations each frame
   */
  public updatePhysics(dt: number) {
    if (this.config.isPaused) return;

    // Cap delta time to prevent tunneling during background tab pauses
    const stepDt = Math.min(dt, 0.04);
    const radius = this.config.boundaryRadius;
    const elasticity = this.config.elasticity;
    const maxTrail = this.config.trailLength;
    const isPlanar = this.config.arenaDimension === 'planar2d';
    const isSphere = this.config.arenaDimension === 'sphere3d';
    const isCylinder = this.config.arenaDimension === 'cylinder3d';

    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];

      // Gravity effects
      if (this.config.gravityMode === 'center') {
        // Vortex attractor toward center (0, y, 0)
        _v1.set(0, b.position.y, 0).sub(b.position);
        const distToCenter = _v1.length();
        if (distToCenter > 0.1) {
          _v1.normalize().multiplyScalar(4.0 * stepDt);
          b.velocity.add(_v1);
        }
      } else if (this.config.gravityMode === 'floor' && !isPlanar) {
        b.velocity.y -= 9.8 * stepDt;
      }

      // Integrate velocity
      _v1.copy(b.velocity).multiplyScalar(stepDt);
      b.position.add(_v1);

      // Boundary Collision logic based on user's Pygame code:
      // dist = math.hypot(dx, dy)
      // if dist > RADIUS - 10:
      //     nx, ny = dx/dist, dy/dist
      //     dot = self.vx*nx + self.vy*ny
      //     self.vx -= 2*dot*nx
      //     self.vy -= 2*dot*ny
      let hasCollided = false;
      const collisionNormal = _norm;
      let collisionDist = 0;

      if (isPlanar) {
        // Fixed plane Y=0.55, radial reflection in XZ
        b.position.y = 0.55;
        b.velocity.y = 0;

        const dist = Math.hypot(b.position.x, b.position.z);
        const maxDist = radius - b.radius;
        if (dist > maxDist) {
          hasCollided = true;
          collisionDist = dist;
          collisionNormal.set(b.position.x / dist, 0, b.position.z / dist);

          // Reflect velocity: v -= (1 + elasticity) * dot * n
          const dot = b.velocity.dot(collisionNormal);
          if (dot > 0) {
            _v1.copy(collisionNormal).multiplyScalar((1 + elasticity) * dot);
            b.velocity.sub(_v1);

            // Clamp position just inside boundary
            b.position.x = collisionNormal.x * (maxDist - 0.02);
            b.position.z = collisionNormal.z * (maxDist - 0.02);
          }
        }
      } else if (isSphere) {
        // Full 3D spherical boundary reflection
        const dist = b.position.length();
        const maxDist = radius - b.radius;
        if (dist > maxDist) {
          hasCollided = true;
          collisionDist = dist;
          collisionNormal.copy(b.position).normalize();

          const dot = b.velocity.dot(collisionNormal);
          if (dot > 0) {
            _v1.copy(collisionNormal).multiplyScalar((1 + elasticity) * dot);
            b.velocity.sub(_v1);
            b.position.copy(collisionNormal).multiplyScalar(maxDist - 0.02);
          }
        }
      } else if (isCylinder) {
        // Cylinder radius in XZ, height in Y
        const distXZ = Math.hypot(b.position.x, b.position.z);
        const maxDistXZ = radius - b.radius;
        const maxY = radius * 0.6 - b.radius;

        if (distXZ > maxDistXZ) {
          hasCollided = true;
          collisionNormal.set(b.position.x / distXZ, 0, b.position.z / distXZ);
          const dot = b.velocity.dot(collisionNormal);
          if (dot > 0) {
            _v1.copy(collisionNormal).multiplyScalar((1 + elasticity) * dot);
            b.velocity.sub(_v1);
            b.position.x = collisionNormal.x * (maxDistXZ - 0.02);
            b.position.z = collisionNormal.z * (maxDistXZ - 0.02);
          }
        }

        if (Math.abs(b.position.y) > maxY) {
          hasCollided = true;
          b.velocity.y *= -elasticity;
          b.position.y = Math.sign(b.position.y) * (maxY - 0.02);
          collisionNormal.set(0, -Math.sign(b.position.y), 0);
        }
      }

      if (hasCollided) {
        this.totalCollisions++;
        this.collisionsLastSecond++;

        const velocityMag = b.velocity.length();
        this.spawnImpactRing(b.position, collisionNormal, b.threeColor);

        if (this.onCollision) {
          this.onCollision(i, velocityMag);
        }
      }

      // Ball-to-ball elastic collisions (if enabled)
      if (this.config.ballCollisions) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const other = this.balls[j];
          _v1.copy(b.position).sub(other.position);
          const dist = _v1.length();
          const minDist = b.radius + other.radius;
          if (dist < minDist && dist > 0.001) {
            _v1.normalize(); // collision normal from other to b

            // Relative velocity
            _v2.copy(b.velocity).sub(other.velocity);
            const velAlongNormal = _v2.dot(_v1);

            if (velAlongNormal < 0) {
              const impulse = -((1 + elasticity) * velAlongNormal) / 2;
              _v3.copy(_v1).multiplyScalar(impulse);
              b.velocity.add(_v3);
              other.velocity.sub(_v3);

              // Position separation
              const overlap = (minDist - dist) * 0.5;
              b.position.addScaledVector(_v1, overlap);
              other.position.addScaledVector(_v1, -overlap);
            }
          }
        }
      }

      // Update Orb Group transform
      b.group.position.copy(b.position);

      // Rotate counter-rotating gimbal rings
      if (this.config.showGimbals) {
        b.gimbal1.visible = true;
        b.gimbal2.visible = true;
        b.gimbal1.rotation.x += b.rotationSpeed1 * stepDt;
        b.gimbal1.rotation.z += b.rotationSpeed1 * 0.6 * stepDt;
        b.gimbal2.rotation.y += b.rotationSpeed2 * stepDt;
        b.gimbal2.rotation.x += b.rotationSpeed2 * 0.4 * stepDt;
      } else {
        b.gimbal1.visible = false;
        b.gimbal2.visible = false;
      }

      // Append trail point
      if (this.config.showTrails) {
        b.trailLine.visible = true;
        b.trailPoints.push(b.position.clone());
        if (b.trailPoints.length > maxTrail) {
          b.trailPoints.shift();
        }

        // Update trail buffer geometry
        const posAttr = b.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
        const colorAttr = b.trailGeometry.getAttribute('color') as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const colArray = colorAttr.array as Float32Array;

        const count = b.trailPoints.length;
        for (let p = 0; p < count; p++) {
          const pt = b.trailPoints[p];
          posArray[p * 3] = pt.x;
          posArray[p * 3 + 1] = pt.y;
          posArray[p * 3 + 2] = pt.z;

          // Fade older trail points
          const progress = p / count;
          const brightness = 0.15 + 0.85 * (progress * progress);
          colArray[p * 3] = b.threeColor.r * brightness;
          colArray[p * 3 + 1] = b.threeColor.g * brightness;
          colArray[p * 3 + 2] = b.threeColor.b * brightness;
        }

        // Fill remaining buffer with latest position to avoid rendering uninitialized lines
        for (let p = count; p < maxTrail; p++) {
          posArray[p * 3] = b.position.x;
          posArray[p * 3 + 1] = b.position.y;
          posArray[p * 3 + 2] = b.position.z;
          colArray[p * 3] = 0;
          colArray[p * 3 + 1] = 0;
          colArray[p * 3 + 2] = 0;
        }

        b.trailGeometry.setDrawRange(0, count);
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
      } else {
        b.trailLine.visible = false;
      }
    }

    // Update Expanding Impact Rings
    for (let r = this.impactRings.length - 1; r >= 0; r--) {
      const ring = this.impactRings[r];
      ring.life -= stepDt * 2.5;
      ring.scale += (ring.maxScale - ring.scale) * (1 - Math.exp(-12 * stepDt));
      ring.mesh.scale.set(ring.scale, ring.scale, ring.scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ring.life * 0.8);

      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        (ring.mesh.material as THREE.Material).dispose();
        this.impactRings.splice(r, 1);
      }
    }
  }

  /**
   * Main render loop adhering strictly to Three.js skill directives:
   * (1) requestAnimationFrame on GPU, or afterDraw on software GL
   * (2) Silky damping for camera controls and transitions
   * (3) Zero GC inside the loop
   */
  private tick = () => {
    if (this.isDestroyed) return;

    const dt = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Physics
    this.updatePhysics(dt);

    // 2. Camera transition damping & follower cam
    if (this.activeCamMode === 'follow' && this.balls.length > 0) {
      const hero = this.balls[0];
      _v1.copy(hero.velocity).normalize().multiplyScalar(-5);
      _camTargetPos.set(hero.position.x + _v1.x, hero.position.y + 3.2, hero.position.z + _v1.z);
      _camTargetLookAt.copy(hero.position);

      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
      this.controls.target.lerp(_camTargetLookAt, 1 - Math.exp(-6 * dt));
    } else if (this.activeCamMode === 'cinematic') {
      // Gentle cinematic orbit
      const orbitSpeed = 0.25;
      const camRadius = 26;
      this.camera.position.x = Math.sin(elapsedTime * orbitSpeed) * camRadius;
      this.camera.position.z = Math.cos(elapsedTime * orbitSpeed) * camRadius;
      this.camera.position.y = 12 + Math.sin(elapsedTime * 0.15) * 4;
      this.controls.target.set(0, 0.5, 0);
    } else if (this.activeCamMode === 'pygame2d') {
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
      this.controls.target.lerp(_camTargetLookAt, 1 - Math.exp(-6 * dt));
    }

    // Smooth OrbitControls update
    if (this.controls.enableDamping) {
      this.controls.update();
    }

    // Subtle pulse on inner boundary laser field
    if (this.boundaryInnerField) {
      const pulse = 0.75 + 0.25 * Math.sin(elapsedTime * 3.5);
      (this.boundaryInnerField.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // 3. Render frame
    this.renderer.render(this.scene, this.camera);

    // 4. Update Stats
    this.frameCount++;
    this.fpsTimer += dt;
    this.collisionTimer += dt;

    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round((this.frameCount / this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.collisionTimer >= 1.0) {
      const colRate = this.collisionsLastSecond;
      this.collisionsLastSecond = 0;
      this.collisionTimer = 0;

      if (this.onStatsUpdate) {
        let totalTrailPoints = 0;
        let kineticEnergy = 0;
        for (const b of this.balls) {
          totalTrailPoints += b.trailPoints.length;
          kineticEnergy += 0.5 * b.velocity.lengthSq();
        }

        this.onStatsUpdate({
          fps: this.fps,
          collisionCount: this.totalCollisions,
          collisionsPerSec: colRate,
          activeTrailsPoints: totalTrailPoints,
          kineticEnergy: Math.round(kineticEnergy * 10) / 10,
        });
      }
    }

    // 5. Frame pacing per SKILL.md:
    // When isSoftwareGl, use afterDraw fenceSync to prevent GPU starvation.
    if (isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * Software WebGL afterDraw guard per SKILL.md
   */
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 60);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 40);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public updateConfig(newConfig: Partial<SimulationConfig>) {
    const oldBallCount = this.config.ballCount;
    const oldPaletteId = this.config.paletteId;
    const oldDimension = this.config.arenaDimension;
    const oldRadius = this.config.boundaryRadius;
    const oldPattern = this.config.patternPreset;
    const oldSpeed = this.config.speed;
    const oldCamera = this.config.cameraMode;

    this.config = { ...this.config, ...newConfig };

    // Rebuild boundary if dimension, radius, or palette changed
    if (
      newConfig.arenaDimension !== undefined ||
      newConfig.boundaryRadius !== undefined ||
      newConfig.paletteId !== undefined
    ) {
      this.rebuildBoundary();
    }

    // Rebuild or update balls if count, palette, pattern, dimension, or radius changed
    if (
      newConfig.ballCount !== undefined ||
      newConfig.paletteId !== undefined ||
      newConfig.patternPreset !== undefined ||
      newConfig.arenaDimension !== undefined ||
      newConfig.trailLength !== undefined
    ) {
      this.initBalls();
    }

    // Adjust speed on live balls if only speed slider moved
    if (newConfig.speed !== undefined && newConfig.speed !== oldSpeed && this.balls.length > 0) {
      const speedRatio = newConfig.speed / (oldSpeed || 1);
      for (const b of this.balls) {
        b.velocity.multiplyScalar(speedRatio);
      }
    }

    // Camera preset
    if (newConfig.cameraMode !== undefined && newConfig.cameraMode !== oldCamera) {
      this.setCameraPreset(newConfig.cameraMode);
    }
  }

  public resetSimulation() {
    this.totalCollisions = 0;
    this.collisionsLastSecond = 0;
    this.initBalls();
  }

  public clearTrails() {
    for (const b of this.balls) {
      b.trailPoints = [b.position.clone()];
      b.trailGeometry.setDrawRange(0, 1);
    }
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    // Dispose all resources
    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
