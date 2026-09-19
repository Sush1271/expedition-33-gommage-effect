# Clair Obscur: Expedition 33 - WebGPU Gommage Effect

An advanced WebGPU-powered visual experiment that recreates the "Gommage" (erasing/scrubbing) aesthetic inspired by the artistic direction of **Clair Obscur: Expedition 33**.

This project explores the intersection of high-fidelity typography, organic dissolution, and particle systems to create a painterly transition effect where text is "scrubbed" away by an invisible force, leaving behind ethereal dust and petals.

## 🎨 Inspiration & Concept

In the context of **Expedition 33**, the "Gommage" effect represents a thematic erasure—a scrubbing away of existence or memory. This implementation translates that feeling into a digital experience by combining:
- **The Void:** The stark contrast between the base text and the background.
- **Organic Decay:** Using Perlin noise to ensure the erasure doesn't look linear or digital, but rather like a physical brush scrubbing a canvas.
- **Residual Memory:** The dust and petals that spawn at the point of erasure, suggesting that something physical remains even after the form is gone.

## 🛠 Technical Deep Dive

The effect is built using a modern WebGPU stack to handle complex shaders and high-instance counts with maximum performance.

### 1. MSDF Typography
Instead of standard text geometry or textures, this project uses **Multi-channel Signed Distance Fields (MSDF)**. This allows the text to remain perfectly crisp at any zoom level while providing the shader with the precise distance data needed to create the "edge-in" dissolve effect.

### 2. The Gommage Shader (TSL)
The core erasure is driven by a custom shader written in **Three.js Shading Language (TSL)**:
- **Noise-Driven Mask:** A Perlin noise texture is sampled to create a non-uniform alpha mask.
- **Progress Uniform:** A `uProgress` uniform (0.0 $\rightarrow$ 1.0) shifts the threshold of the noise mask, effectively "scrubbing" the text away.
- **Color Transition:** The shader interpolates between a base color and a dissolved "ash" color as the erasure progresses.

### 3. Particle Orchestration
To add depth and physical presence, two instanced particle systems are synchronized with the erasure:
- **Dust Particles:** Small, fast-spawning particles that simulate the "debris" of the erased text.
- **Petal Particles:** Low-poly GLB petal models that drift away, adding a poetic, melancholic layer to the visual.
- **Dynamic Spawning:** The `GommageOrchestrator` calculates random positions within the text mesh bounds to spawn these particles exactly where the "scrubbing" is occurring.

## 🚀 Getting Started

### Requirements
- A WebGPU-compatible browser (Chrome 113+, Edge, or Chrome Canary).

### Local Development
```bash
npm install
npm run dev     # Starts Vite dev server at http://localhost:5173
```

### Production Build
```bash
npm run build   # Generates optimized assets in /dist
npm run preview # Previews the production build
```

## ⚙️ Customization

You can easily modify the aesthetic of the effect:

| Target | File | Variable/Line | Description |
| :--- | :--- | :--- | :--- |
| **Text** | `src/gommageOrchestrator.js` | `initialText` | Change the default starting text |
| **Colors** | `src/msdfText.js` | `uBaseColor` / `uDissolvedColor` | Adjust the primary and "ash" colors |
| **UI Theme** | `css/controlUI.css` | `--e33-color` | Change the accent color of the interface |
| **Timing** | `src/gommageOrchestrator.js` | `duration` (in `triggerGommage`) | Slow down or speed up the erasure |

## 📜 Credits & References

- **Artistic Inspiration:** [Clair Obscur: Expedition 33]
- **Technical Implementation:** Inspired by the work of [Thibault Introvigne](https://blog.thibault-introvigne.com/clair-obscur-gommage/).
