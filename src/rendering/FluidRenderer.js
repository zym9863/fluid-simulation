import * as THREE from 'three';

export class FluidRenderer {
  constructor(sphSystem, params = {}) {
    this.sphSystem = sphSystem;
    this.particleSize = params.particleSize || 0.08; // 减小粒子尺寸
    this.particleColor = params.particleColor || 0x00e5ff; // 改为高饱和青色
    this.renderMode = params.renderMode || 'particles'; // 'particles', 'metaballs', 'mesh'
    
    this.particleMeshes = [];
    this.pointCloud = null;
  }

  // 创建粒子点云
  createPointCloud(scene) {
    const particles = this.sphSystem.particles;
    const positions = new Float32Array(particles.length * 3);
    
    for (let i = 0; i < particles.length; i++) {
      positions[i * 3] = particles[i].position.x;
      positions[i * 3 + 1] = particles[i].position.y;
      positions[i * 3 + 2] = particles[i].position.z;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: this.particleColor,
      size: this.particleSize,
      transparent: true,
      opacity: 0.7, // 调整透明度
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending // 添加混合效果
    });
    
    this.pointCloud = new THREE.Points(geometry, material);
    scene.add(this.pointCloud);
  }

  // 更新点云位置
  updatePointCloud() {
    if (!this.pointCloud) return;
    
    const particles = this.sphSystem.particles;
    const positions = this.pointCloud.geometry.attributes.position.array;
    
    for (let i = 0; i < particles.length; i++) {
      positions[i * 3] = particles[i].position.x;
      positions[i * 3 + 1] = particles[i].position.y;
      positions[i * 3 + 2] = particles[i].position.z;
    }
    
    this.pointCloud.geometry.attributes.position.needsUpdate = true;
  }

  // 创建单个粒子的网格
  createParticleMeshes(scene) {
    const particles = this.sphSystem.particles;
    
    for (let i = 0; i < particles.length; i++) {
      const mesh = particles[i].createMesh(scene, this.particleSize / 2, this.particleColor);
      this.particleMeshes.push(mesh);
    }
  }

  // 更新粒子网格位置
  updateParticleMeshes() {
    const particles = this.sphSystem.particles;
    
    for (let i = 0; i < particles.length; i++) {
      if (this.particleMeshes[i]) {
        this.particleMeshes[i].position.copy(particles[i].position);
      }
    }
  }

  // 渲染更新
  update() {
    if (this.renderMode === 'particles') {
      this.updatePointCloud();
    } else if (this.renderMode === 'metaballs' || this.renderMode === 'mesh') {
      this.updateParticleMeshes();
    }
  }

  // 清理渲染器资源
  dispose(scene) {
    if (this.pointCloud) {
      scene.remove(this.pointCloud);
      this.pointCloud.geometry.dispose();
      this.pointCloud.material.dispose();
      this.pointCloud = null;
    }
    
    for (const mesh of this.particleMeshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.particleMeshes = [];
  }
}