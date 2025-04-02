import * as THREE from 'three';

export class SPHParticle {
  constructor(position, mass = 1.0) {
    this.position = position.clone(); // 粒子位置
    this.velocity = new THREE.Vector3(0, 0, 0); // 粒子速度
    this.acceleration = new THREE.Vector3(0, 0, 0); // 粒子加速度
    this.force = new THREE.Vector3(0, 0, 0); // 作用在粒子上的力
    this.mass = mass; // 粒子质量
    this.density = 0; // 粒子密度
    this.pressure = 0; // 粒子压力
    this.neighbors = []; // 邻近粒子列表
    
    // 可视化相关
    this.mesh = null; // 粒子的网格对象
  }

  // 重置粒子的力
  resetForce() {
    this.force.set(0, 0, 0);
  }

  // 添加外力
  addForce(force) {
    this.force.add(force);
  }

  // 更新粒子位置和速度
  update(dt) {
    // 计算加速度 F = ma, a = F/m
    this.acceleration.copy(this.force).divideScalar(this.mass);
    
    // 更新速度 v = v + a*dt
    this.velocity.add(this.acceleration.clone().multiplyScalar(dt));
    
    // 更新位置 p = p + v*dt
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    
    // 更新粒子的可视化位置
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }

  // 创建粒子的可视化表示
  createMesh(scene, radius = 0.1, color = 0x1E88E5) {
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    return this.mesh;
  }

  // 移除粒子的可视化表示
  removeMesh(scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}