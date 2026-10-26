import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SmartWatch {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.watchGroup = null;
    this.exploded = false;
    this.explodeProgress = 0; // Tweened via GSAP ScrollTrigger

    // Loading status
    this.loaded = false;
    this.model = null;

    // References to GLB meshes
    this.watchParts = {
      glass: null,
      hands: null,
      dial: null,
      bezel: null,
      strap: null,
      caseback: null,
      clasps: null,
      buttons: null
    };

    // Hands references for ticking
    this.hands = {
      seconds: null,
      minutes: null,
      hours: null
    };

    // Default position caches for exploded view along local Y-axis (dial normal)
    this.initialY = {
      glass: 0,
      hands: 0,
      dial: 0,
      bezel: 0,
      strap: 0,
      caseback: 0,
      clasps: 0,
      buttons: 0
    };

    // UI Configuration States
    this.states = {
      caseMaterial: 'oystersteel', // oystersteel, gold, everose
      dialColor: '#006039', // Green, Black, Blue
      bezelColor: '#006039'
    };

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera - positioned slightly above and looking at watch group
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 1.5, 4.2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.container.appendChild(this.renderer.domElement);

    // Watch Group
    this.watchGroup = new THREE.Group();
    this.scene.add(this.watchGroup);

    // Setup Lighting
    this.setupLights();

    // Load High-Quality GLB Watch Model
    this.loadWatchModel();

    // Initial position tilt & responsive layout offset
    this.watchGroup.rotation.x = 0.4;
    this.watchGroup.rotation.y = -0.4;
    this.adjustWatchPosition();

    // Make camera look at watch group initially
    this.camera.lookAt(this.watchGroup.position);

    // Handle resizing
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Mouse movement parallax parallax offsets
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    });

    // Start render loop
    this.animate();
  }

  setupLights() {
    // Soft ambient for shadows contrast
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // High intensity spotlights to create stunning PBR metal reflections
    const keyLight = new THREE.SpotLight(0xffffff, 8.0);
    keyLight.position.set(2, 6, 5);
    keyLight.angle = Math.PI / 4;
    keyLight.penumbra = 0.6;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5f3fc, 1.4); 
    fillLight.position.set(-4, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.8); 
    rimLight.position.set(0, -6, 2);
    this.scene.add(rimLight);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 20, 0xd4af37, 0x112211);
    grid.position.y = -2;
    this.scene.add(grid);
  }

  loadWatchModel() {
    const loader = new GLTFLoader();
    
    loader.load('/watch_model.glb', (gltf) => {
      this.model = gltf.scene;

      // Scale and position the model
      this.model.scale.set(0.32, 0.32, 0.32);
      
      // ROTATE MODEL TO ALIGN DIAL FACE WITH SCREEN FRONT
      // In the GLB mesh, dial face is in XZ plane (looking UP along Y-positive).
      // Rotating by Math.PI / 2 around X turns the face to point FORWARD along Z-positive (front of screen).
      this.model.rotation.x = Math.PI / 2;
      this.model.rotation.y = Math.PI; // Flip 180 degrees around dial normal to position 12 o'clock at the top (upright)
      this.model.position.set(0, 0, 0);

      this.watchGroup.add(this.model);

      // Traversal to extract parts and apply shadows
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Boost physical PBR properties
          if (child.material) {
            child.material.envMapIntensity = 2.2;
            child.material.needsUpdate = true;
          }

          // Save references by Node Name (caching local Y coordinates)
          const name = child.name;
          if (name === 'Glass Face') {
            this.watchParts.glass = child;
            this.initialY.glass = child.position.y;
          } else if (name === 'Watch Face') {
            this.watchParts.dial = child;
            this.initialY.dial = child.position.y;
          } else if (name === 'Bezel Frame') {
            this.watchParts.bezel = child;
            this.initialY.bezel = child.position.y;
          } else if (name === 'Band Carbon Fiber' || name === 'Band Plastic') {
            // Use Carbon Fiber strap, hide the Plastic one
            if (name === 'Band Plastic') {
              child.visible = false;
            } else {
              this.watchParts.strap = child;
              this.initialY.strap = child.position.y;
            }
          } else if (name === 'Backplate Khronos') {
            this.watchParts.caseback = child;
            this.initialY.caseback = child.position.y;
          } else if (name === 'Clasp DGG') {
            this.watchParts.clasps = child;
            this.initialY.clasps = child.position.y;
          } else if (name === 'Button Metal' || name === 'Button Plastic') {
            this.watchParts.buttons = child;
            this.initialY.buttons = child.position.y;
          }

          // Save references to Hands for manual clock movement
          if (name === 'Hand Seconds') this.hands.seconds = child;
          else if (name === 'Hand Minutes') this.hands.minutes = child;
          else if (name === 'Hand Hours') this.hands.hours = child;
        }

        // Save reference to Hands Group (Parent node of the hands)
        if (child.name === 'Hands') {
          this.watchParts.hands = child;
          this.initialY.hands = child.position.y;
        }
      });

      // 8. DOTTED PATH LINES (drawn along the Z-axis disassembling normal)
      this.lineMaterial = new THREE.LineDashedMaterial({
        color: 0xd4af37, // Golden dashed line
        dashSize: 0.07,
        gapSize: 0.05,
        linewidth: 1,
        transparent: true,
        opacity: 0
      });
      const points = [
        new THREE.Vector3(0, 0, -1.0),
        new THREE.Vector3(0, 0, 1.2)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, this.lineMaterial);
      line.computeLineDistances();

      this.components.connectingLines = new THREE.Group();
      this.components.connectingLines.add(line);
      this.watchGroup.add(this.components.connectingLines);

      // Apply initial state configuration
      this.applyCustomizerState();
      
      this.loaded = true;
    }, undefined, (error) => {
      console.error('Error loading 3D model:', error);
    });
  }

  // Get metal color properties based on customizer selection
  getMetalProperties() {
    let metalColor, metalRough, metalMetal;

    switch (this.states.caseMaterial) {
      case 'gold':
        metalColor = new THREE.Color(0xd4af37); // 18k Yellow Gold
        metalMetal = 1.0;
        metalRough = 0.12;
        break;
      case 'everose':
        metalColor = new THREE.Color(0xe5a995); // Everose Gold
        metalMetal = 1.0;
        metalRough = 0.15;
        break;
      case 'oystersteel':
      default:
        metalColor = new THREE.Color(0xd1d5db); // Oystersteel
        metalMetal = 0.95;
        metalRough = 0.18;
    }

    return { metalColor, metalRough, metalMetal };
  }

  // Apply metal finish and dial colors to GLB meshes
  applyCustomizerState() {
    if (!this.model) return;

    const { metalColor, metalRough, metalMetal } = this.getMetalProperties();
    const dialColor = new THREE.Color(this.states.dialColor);

    this.model.traverse((child) => {
      if (child.isMesh) {
        const name = child.name;

        // Apply metal configurations to case elements
        if (name === 'Bezel Frame' || name === 'Button Metal' || name === 'Clasp DGG' || name.startsWith('Hand ')) {
          gsap.to(child.material.color, {
            r: metalColor.r,
            g: metalColor.g,
            b: metalColor.b,
            duration: 0.5
          });
          gsap.to(child.material, {
            roughness: metalRough,
            metalness: metalMetal,
            duration: 0.5
          });
        }

        // Apply dial configurations
        if (name === 'Watch Face') {
          gsap.to(child.material.color, {
            r: dialColor.r,
            g: dialColor.g,
            b: dialColor.b,
            duration: 0.5
          });
        }
      }
    });
  }

  updateCaseMaterial(materialType) {
    this.states.caseMaterial = materialType;
    this.applyCustomizerState();
  }

  updateDialColor(colorHex) {
    this.states.dialColor = colorHex;
    this.applyCustomizerState();
  }

  adjustWatchPosition() {
    const width = window.innerWidth;
    if (width > 1024) {
      // Desktop: Shift watch to the right side of the screen
      this.watchGroup.position.set(0.9, 0, 0);
    } else {
      // Mobile: Center watch on screen, offset slightly up
      this.watchGroup.position.set(0, 0.3, 0);
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.adjustWatchPosition();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.loaded && this.model) {
      // 1. Sweeping Hands (Mechanical Continuous Movement)
      const now = new Date();
      const millis = now.getMilliseconds();

      // Mechanical sweep (negative rotation around local Y-axis normal to the dial)
      const secAngle = -((now.getSeconds() + millis / 1000) * Math.PI) / 30;
      const minAngle = -((now.getMinutes() * Math.PI) / 30 + secAngle / 60);
      const hourAngle = -(((now.getHours() % 12) * Math.PI) / 6 + minAngle / 12);

      // Rotate hands around their local normal Y-axis
      if (this.hands.seconds) this.hands.seconds.rotation.y = secAngle;
      if (this.hands.minutes) this.hands.minutes.rotation.y = minAngle;
      if (this.hands.hours) this.hands.hours.rotation.y = hourAngle;

      // 2. Recalculate component local Y-spacings based on explodeProgress
      const p = this.explodeProgress;
      this.exploded = p > 0.02;

      // Disassemble along the local Y-axis (which now aligns with world Z-axis)
      if (this.watchParts.glass) this.watchParts.glass.position.y = this.initialY.glass + p * 1.0;
      if (this.watchParts.hands) this.watchParts.hands.position.y = this.initialY.hands + p * 0.7;
      if (this.watchParts.dial) this.watchParts.dial.position.y = this.initialY.dial + p * 0.4;
      if (this.watchParts.bezel) this.watchParts.bezel.position.y = this.initialY.bezel + p * 0.0;
      if (this.watchParts.strap) this.watchParts.strap.position.y = this.initialY.strap - p * 0.4;
      if (this.watchParts.caseback) this.watchParts.caseback.position.y = this.initialY.caseback - p * 0.8;
      if (this.watchParts.clasps) this.watchParts.clasps.position.y = this.initialY.clasps - p * 0.4;
      if (this.watchParts.buttons) this.watchParts.buttons.position.y = this.initialY.buttons + p * 0.0;

      // Update connecting dashed line visibility
      if (this.lineMaterial) {
        this.lineMaterial.opacity = p;
      }
    }

    // Bezel & Watch rotation if NOT exploded
    if (!this.exploded) {
      this.watchGroup.rotation.y += 0.002;
    }

    // Parallax mouse adjustments
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;
    
    if (!this.exploded) {
      this.watchGroup.rotation.x = 0.4 + this.mouseY;
      this.watchGroup.rotation.y += this.mouseX * 0.04;
    }

    // FORCE CAMERA TO FOCUS AND FRAME WATCH GROUP CENTER PERFECTLY
    this.camera.lookAt(this.watchGroup.position);

    this.renderer.render(this.scene, this.camera);
  }
}
