import * as THREE from 'three';

// 障碍物基类
export class Obstacle {
  constructor() {
    this.mesh = null;
  }
  
  // 处理与粒子的碰撞
  handleCollision(particle, damping) {
    // 由子类实现
  }
  
  // 创建可视化表示
  createMesh(scene) {
    // 由子类实现
  }
}

// 球形障碍物
export class SphereObstacle extends Obstacle {
  constructor(position, radius) {
    super();
    this.position = position.clone();
    this.radius = radius;
  }
  
  handleCollision(particle, damping) {
    const distance = particle.position.distanceTo(this.position);
    const minDistance = this.radius + 0.05; // 假设粒子半径为0.05
    
    if (distance < minDistance) {
      // 计算碰撞法线
      const normal = particle.position.clone().sub(this.position).normalize();
      
      // 调整粒子位置到球面
      particle.position.copy(this.position).add(normal.clone().multiplyScalar(minDistance));
      
      // 计算速度在法线方向的分量
      const velocityAlongNormal = particle.velocity.dot(normal);
      
      // 如果粒子正在向球体移动
      if (velocityAlongNormal < 0) {
        // 反弹速度
        const reflection = normal.clone().multiplyScalar(2 * velocityAlongNormal);
        particle.velocity.sub(reflection).multiplyScalar(damping);
      }
    }
  }
  
  createMesh(scene, color = 0xE91E63) {
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.7 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    return this.mesh;
  }
}

// 盒子障碍物
export class BoxObstacle extends Obstacle {
  constructor(position, size) {
    super();
    this.position = position.clone();
    this.size = size.clone();
    this.min = new THREE.Vector3().copy(position).sub(size.clone().multiplyScalar(0.5));
    this.max = new THREE.Vector3().copy(position).add(size.clone().multiplyScalar(0.5));
  }
  
  handleCollision(particle, damping) {
    // 检查粒子是否在盒子内部
    if (particle.position.x > this.min.x && particle.position.x < this.max.x &&
        particle.position.y > this.min.y && particle.position.y < this.max.y &&
        particle.position.z > this.min.z && particle.position.z < this.max.z) {
      
      // 找到最近的面
      const distToMinX = particle.position.x - this.min.x;
      const distToMaxX = this.max.x - particle.position.x;
      const distToMinY = particle.position.y - this.min.y;
      const distToMaxY = this.max.y - particle.position.y;
      const distToMinZ = particle.position.z - this.min.z;
      const distToMaxZ = this.max.z - particle.position.z;
      
      // 找到最小距离
      const minDist = Math.min(distToMinX, distToMaxX, distToMinY, distToMaxY, distToMinZ, distToMaxZ);
      
      // 根据最小距离确定碰撞法线
      let normal = new THREE.Vector3(0, 0, 0);
      
      if (minDist === distToMinX) {
        normal.set(-1, 0, 0);
        particle.position.x = this.min.x;
      } else if (minDist === distToMaxX) {
        normal.set(1, 0, 0);
        particle.position.x = this.max.x;
      } else if (minDist === distToMinY) {
        normal.set(0, -1, 0);
        particle.position.y = this.min.y;
      } else if (minDist === distToMaxY) {
        normal.set(0, 1, 0);
        particle.position.y = this.max.y;
      } else if (minDist === distToMinZ) {
        normal.set(0, 0, -1);
        particle.position.z = this.min.z;
      } else if (minDist === distToMaxZ) {
        normal.set(0, 0, 1);
        particle.position.z = this.max.z;
      }
      
      // 计算速度在法线方向的分量
      const velocityAlongNormal = particle.velocity.dot(normal);
      
      // 如果粒子正在向盒子内部移动
      if (velocityAlongNormal < 0) {
        // 反弹速度
        const reflection = normal.clone().multiplyScalar(2 * velocityAlongNormal);
        particle.velocity.sub(reflection).multiplyScalar(damping);
      }
    }
  }
  
  createMesh(scene, color = 0x4CAF50) {
    const geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.7 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    return this.mesh;
  }
}