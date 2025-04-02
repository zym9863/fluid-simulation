# Fluid Simulation Based on SPH Algorithm

[中文](README.md) | English

This is a fluid simulation application implemented using Three.js and SPH (Smoothed Particle Hydrodynamics) algorithm. The application can simulate water flow effects and supports interaction with objects.

## Features

- Realistic fluid physics simulation based on SPH algorithm
- 3D visualization of fluid particles
- Support for interaction with obstacles (draggable sphere obstacle)
- Support for simulation reset
- Support for camera controls (rotation, zoom)

## Tech Stack

- Three.js - 3D rendering library
- Vite - Build tool
- SPH algorithm - Fluid simulation algorithm

## How to Run

1. Ensure Node.js environment is installed
2. Install dependencies:
   ```
   npm install
   ```
3. Start development server:
   ```
   npm run dev
   ```
4. Open the displayed URL in your browser (default is http://localhost:3000)

## Usage Instructions

- **Drag the Sphere**: Click and drag the central sphere to interact with the fluid
- **Reset Simulation**: Press spacebar to reset the entire simulation
- **Rotate View**: Click and drag empty space to rotate camera view
- **Zoom View**: Use mouse wheel to zoom in or out

## SPH Algorithm Introduction

SPH (Smoothed Particle Hydrodynamics) is a meshless Lagrangian method for simulating fluid dynamics. It works by discretizing the fluid into a set of interacting particles, each carrying physical quantities (such as mass, velocity, density, etc.).

Main calculation steps include:

1. Density Calculation: Calculate density for each particle using kernel functions
2. Pressure Calculation: Calculate pressure for each particle based on density
3. Force Calculation: Calculate pressure force, viscosity force, surface tension, etc.
4. Position Update: Update particle velocity and position based on total force
5. Collision Handling: Handle collisions between particles and boundaries/obstacles

## Project Structure

- `src/sph/` - SPH algorithm implementation
  - `SPHParticle.js` - Particle class
  - `SPHSystem.js` - SPH system
  - `Obstacle.js` - Obstacle class
- `src/rendering/` - Rendering related
  - `FluidRenderer.js` - Fluid renderer
- `src/main.js` - Main application
- `index.html` - HTML entry file