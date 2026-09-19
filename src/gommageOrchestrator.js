//gommageOrchestrator.js

import * as THREE from 'three/webgpu';
import MSDFText from './msdfText.js';
import { uniform } from 'three/tsl';
import DustParticles from './dustParticles.js';
import PetalParticles from './petalParticles.js';
import Debug, { DEBUG_FOLDERS } from './debug.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

export default class GommageOrchestrator {
  #uProgress = uniform(0.0);

  #MSDFTextEntity = null;
  #DustParticlesEntity = null;
  #PetalParticlesEntity = null;

  #dustInterval = 0.125;
  #petalInterval = 0.05;
  #gommageTween = null;
  #spawnDustTween = null;
  #spawnPetalTween = null;

  constructor() {}

  async initialize(scene) {
    const { perlinTexture, dustParticleTexture, fontAtlasTexture } = await this.loadTextures();
    const petalGeometry = await this.loadPetalGeometry();

    this.scene = scene;
    this.perlinTexture = perlinTexture;
    this.fontAtlasTexture = fontAtlasTexture;
    this.petalGeometry = petalGeometry;
    this.petalMode = 'normal';

    const debugFolder = Debug.getInstance().getFolder(DEBUG_FOLDERS.MSDF_TEXT);
    this.#MSDFTextEntity = new MSDFText();
    // Two lines like in screenshot: centered like blog (middle screen)
    const initialText = 'WEBGPU GOMMAGE EFFECT\nCLAIR OBSCUR: EXPEDITION 33';
    const msdfText = await this.#MSDFTextEntity.initialize(
      initialText,
      new THREE.Vector3(0, 0.25, 0),
      this.#uProgress,
      perlinTexture,
      fontAtlasTexture
    );
    this.currentTextMesh = msdfText;
    scene.add(msdfText);

    this.#DustParticlesEntity = new DustParticles();
    const dustParticles = await this.#DustParticlesEntity.initialize(perlinTexture, dustParticleTexture);
    scene.add(dustParticles);

    this.#PetalParticlesEntity = new PetalParticles();
    const petalParticles = await this.#PetalParticlesEntity.initialize(perlinTexture, petalGeometry);
    scene.add(petalParticles);

    const GommageButton = debugFolder.addButton({
      title: 'GOMMAGE',
    });
    const ResetButton = debugFolder.addButton({
      title: 'RESET',
    });
    const DustButton = debugFolder.addButton({
      title: 'DUST',
    });
    const PetalButton = debugFolder.addButton({
      title: 'PETAL',
    });
    GommageButton.on('click', () => {
      this.triggerGommage();
    });
    ResetButton.on('click', () => {
      this.resetGommage();
    });
    DustButton.on('click', () => {
      const randomPosition = this.#MSDFTextEntity.getRandomPositionInMesh();
      this.#DustParticlesEntity.spawnDust(randomPosition);
    });
    PetalButton.on('click', () => {
      this.#PetalParticlesEntity.debugSpawnPetal();
    });

    // Use HTML buttons - like screenshot
    this.gommageButton = document.getElementById('gommage-button');
    this.resetButton = document.getElementById('reset-button');
    this.writeInput = document.getElementById('write-input');
    this.petalButtons = document.querySelectorAll('[data-petals]');

    if (this.gommageButton) this.gommageButton.addEventListener('click', () => this.triggerGommage());
    if (this.resetButton) this.resetButton.addEventListener('click', () => this.resetGommage());

    // Petal modes: NORMAL (0.05), MANY (0.02), STENDHAL (0.01) - visible difference
    this.petalButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.petalButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.petals;
        this.petalMode = mode;
        if (mode === 'normal') this.#petalInterval = 0.05;
        else if (mode === 'many') this.#petalInterval = 0.025;
        else if (mode === 'stendhal') this.#petalInterval = 0.01;
        console.log('petal mode', mode, this.#petalInterval);
        // if gommage is running, restart petal spawn with new interval so change is immediate
        if (this.#spawnPetalTween) {
          this.#spawnPetalTween.kill();
          this.#spawnPetalTween = gsap.to({}, {
            duration: this.#petalInterval,
            repeat: -1,
            onRepeat: () => {
              const p = this.#MSDFTextEntity.getRandomPositionInMesh();
              this.#PetalParticlesEntity.spawnPetal(p);
            },
          });
        }
      });
    });
    // default active
    const normalBtn = document.querySelector('[data-petals="normal"]');
    if (normalBtn) normalBtn.classList.add('active');

    // Write here input - update text on enter or change
    if (this.writeInput) {
      this.writeInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          const txt = this.writeInput.value.trim();
          if (txt) await this.updateText(txt.toUpperCase());
        }
      });
      this.writeInput.addEventListener('change', async () => {
        const txt = this.writeInput.value.trim();
        if (txt) await this.updateText(txt.toUpperCase());
      });
    }
  }

  async updateText(newText) {
    if (!this.currentTextMesh || !this.scene) return;
    this.resetGommage();
    this.scene.remove(this.currentTextMesh);
    this.currentTextMesh.geometry.dispose();
    // allow multiline via \n if user types, keep centered
    const formatted = newText.includes('\n') ? newText : newText;
    const newMesh = await this.#MSDFTextEntity.initialize(
      formatted,
      new THREE.Vector3(0, 0.25, 0),
      this.#uProgress,
      this.perlinTexture,
      this.fontAtlasTexture
    );
    this.currentTextMesh = newMesh;
    this.scene.add(newMesh);
    // re-enable buttons after text change
    if (this.gommageButton) {
      this.gommageButton.disabled = false;
      this.gommageButton.classList.remove('disabled');
    }
  }

  async loadPetalGeometry() {
    const modelLoader = new GLTFLoader();
    const petalScene = await modelLoader.loadAsync('./models/petal.glb');
    const petalMesh = petalScene.scene.getObjectByName('PetalV2');
    return petalMesh.geometry;
  }

  async loadTextures() {
    const textureLoader = new THREE.TextureLoader();

    const dustParticleTexture = await textureLoader.loadAsync('./textures/dustParticle.png');
    dustParticleTexture.colorSpace = THREE.NoColorSpace;
    dustParticleTexture.minFilter = THREE.LinearFilter;
    dustParticleTexture.magFilter = THREE.LinearFilter;
    dustParticleTexture.generateMipmaps = false;

    const perlinTexture = await textureLoader.loadAsync('./textures/perlin.webp');
    perlinTexture.colorSpace = THREE.NoColorSpace;
    perlinTexture.minFilter = THREE.LinearFilter;
    perlinTexture.magFilter = THREE.LinearFilter;
    perlinTexture.wrapS = THREE.RepeatWrapping;
    perlinTexture.wrapT = THREE.RepeatWrapping;
    perlinTexture.generateMipmaps = false;

    const fontAtlasTexture = await textureLoader.loadAsync('./fonts/Cinzel/Cinzel.png');
    fontAtlasTexture.colorSpace = THREE.NoColorSpace;
    fontAtlasTexture.minFilter = THREE.LinearFilter;
    fontAtlasTexture.magFilter = THREE.LinearFilter;
    fontAtlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    fontAtlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    fontAtlasTexture.generateMipmaps = false;

    return { perlinTexture, dustParticleTexture, fontAtlasTexture };
  }

  triggerGommage() {
    // Don't start if already running
    if (this.#gommageTween || this.#spawnDustTween || this.#spawnPetalTween) return;
    this.#uProgress.value = 0;

    // Disable button while effect is running
    this.gommageButton.disabled = true;
    this.gommageButton.classList.add('disabled');

    this.#spawnDustTween = gsap.to(
      {},
      {
        duration: this.#dustInterval,
        repeat: -1,
        onRepeat: () => {
          const p = this.#MSDFTextEntity.getRandomPositionInMesh();
          this.#DustParticlesEntity.spawnDust(p);
        },
      }
    );

    this.#spawnPetalTween = gsap.to(
      {},
      {
        duration: this.#petalInterval,
        repeat: -1,
        onRepeat: () => {
          const p = this.#MSDFTextEntity.getRandomPositionInMesh();
          this.#PetalParticlesEntity.spawnPetal(p);
        },
      }
    );

    this.#gommageTween = gsap.to(this.#uProgress, {
      value: 1,
      duration: 6,
      ease: 'linear',
      onComplete: () => {
        this.#spawnDustTween?.kill();
        this.#spawnPetalTween?.kill();
        this.#spawnDustTween = null;
        this.#gommageTween = null;
        this.#spawnPetalTween = null;
        gsap.delayedCall(1, () => {
          this.gommageButton.disabled = false;
          this.gommageButton.classList.remove('disabled');
        });
      },
    });
  }

  resetGommage() {
    this.#gommageTween?.kill();
    this.#spawnDustTween?.kill();
    this.#spawnPetalTween?.kill();

    this.#gommageTween = null;
    this.#spawnDustTween = null;
    this.#spawnPetalTween = null;

    this.#uProgress.value = 0;
    // re-enable GOMMAGE button
    if (this.gommageButton) {
      this.gommageButton.disabled = false;
      this.gommageButton.classList.remove('disabled');
    }
  }
}
