import * as THREE from 'three';
import { SPHParticle } from './SPHParticle.js';

export class SPHSystem {
  constructor(params = {}) {
    // SPH参数
    this.particleMass = params.particleMass || 1.0; // 粒子质量
    this.restDensity = params.restDensity || 1000.0; // 静止密度
    this.gasConstant = params.gasConstant || 2000.0; // 气体常数
    this.h = params.smoothingRadius || 0.16; // 平滑核半径
    this.h2 = this.h * this.h; // 平滑核半径的平方
    this.viscosity = params.viscosity || 0.018; // 粘度系数
    this.dt = params.timeStep || 0.004; // 时间步长
    this.gravity = params.gravity || new THREE.Vector3(0, -9.8, 0); // 重力
    this.boundingBox = params.boundingBox || new THREE.Box3(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1)
    ); // 边界盒
    this.surfaceTension = params.surfaceTension || 0.0728; // 表面张力系数
    this.surfaceThreshold = params.surfaceThreshold || 7.065; // 表面阈值

    // 粒子系统
    this.particles = [];
    this.obstacles = []; // 障碍物列表

    // 预计算常量
    this.poly6Constant = 315.0 / (64.0 * Math.PI * Math.pow(this.h, 9));
    this.spikyGradConstant = -45.0 / (Math.PI * Math.pow(this.h, 6));
    this.viscosityLaplaceConstant = 45.0 / (Math.PI * Math.pow(this.h, 6));
  }

  // 添加粒子
  addParticle(position) {
    const particle = new SPHParticle(position, this.particleMass);
    this.particles.push(particle);
    return particle;
  }

  // 添加障碍物
  addObstacle(obstacle) {
    this.obstacles.push(obstacle);
  }

  // 初始化粒子系统
  initializeParticles(count, region) {
    const { min, max } = region;
    const spacing = this.h * 0.5; // 粒子间距
    
    // 计算每个维度上的粒子数量
    const nx = Math.floor((max.x - min.x) / spacing);
    const ny = Math.floor((max.y - min.y) / spacing);
    const nz = Math.floor((max.z - min.z) / spacing);
    
    // 创建规则网格上的粒子
    let created = 0;
    for (let i = 0; i < nx && created < count; i++) {
      for (let j = 0; j < ny && created < count; j++) {
        for (let k = 0; k < nz && created < count; k++) {
          const x = min.x + i * spacing;
          const y = min.y + j * spacing;
          const z = min.z + k * spacing;
          
          const position = new THREE.Vector3(x, y, z);
          this.addParticle(position);
          created++;
        }
      }
    }
    
    console.log(`Created ${created} particles`);
  }

  // Poly6核函数
  poly6Kernel(r, h) {
    if (r > h) return 0;
    const term = h * h - r * r;
    return this.poly6Constant * term * term * term;
  }

  // Spiky核函数梯度
  spikyGradKernel(r, h, dir) {
    if (r > h || r < 0.0001) return new THREE.Vector3(0, 0, 0);
    const term = h - r;
    const scale = this.spikyGradConstant * term * term / r;
    return dir.clone().multiplyScalar(scale);
  }

  // 粘度核函数拉普拉斯
  viscosityLaplaceKernel(r, h) {
    if (r > h) return 0;
    return this.viscosityLaplaceConstant * (h - r);
  }

  // 查找每个粒子的邻居
  findNeighbors() {
    // 简单的O(n²)邻居搜索
    for (const particle of this.particles) {
      particle.neighbors = [];
      
      for (const other of this.particles) {
        if (particle === other) continue;
        
        const dist = particle.position.distanceTo(other.position);
        if (dist < this.h) {
          particle.neighbors.push({
            particle: other,
            distance: dist,
            direction: other.position.clone().sub(particle.position).normalize()
          });
        }
      }
    }
  }

  // 计算密度和压力
  computeDensityPressure() {
    for (const particle of this.particles) {
      // 初始密度为自身贡献
      particle.density = this.poly6Kernel(0, this.h) * particle.mass;
      
      // 加上邻居的贡献
      for (const neighbor of particle.neighbors) {
        particle.density += neighbor.particle.mass * this.poly6Kernel(neighbor.distance, this.h);
      }
      
      // 计算压力 (状态方程)
      particle.pressure = this.gasConstant * (particle.density - this.restDensity);
    }
  }

  // 计算所有力
  computeForces() {
    for (const particle of this.particles) {
      // 重置力
      particle.resetForce();
      
      // 添加重力
      const gravity = this.gravity.clone().multiplyScalar(particle.mass);
      particle.addForce(gravity);
      
      // 压力力
      const pressureForce = new THREE.Vector3(0, 0, 0);
      // 粘度力
      const viscosityForce = new THREE.Vector3(0, 0, 0);
      // 表面张力
      const surfaceNormal = new THREE.Vector3(0, 0, 0);
      let colorFieldLaplacian = 0;
      
      for (const neighbor of particle.neighbors) {
        const other = neighbor.particle;
        const dir = neighbor.direction;
        const dist = neighbor.distance;
        
        // 压力力 (对称公式)
        const pressureGrad = this.spikyGradKernel(dist, this.h, dir);
        const pressureTerm = (particle.pressure + other.pressure) / (2.0 * other.density);
        pressureForce.add(pressureGrad.multiplyScalar(-other.mass * pressureTerm));
        
        // 粘度力
        const relativeVelocity = other.velocity.clone().sub(particle.velocity);
        const viscosityTerm = this.viscosityLaplaceKernel(dist, this.h) / other.density;
        viscosityForce.add(relativeVelocity.multiplyScalar(other.mass * viscosityTerm));
        
        // 表面张力 - 计算颜色场梯度和拉普拉斯
        const colorGrad = this.spikyGradKernel(dist, this.h, dir).multiplyScalar(other.mass / other.density);
        surfaceNormal.add(colorGrad);
        colorFieldLaplacian += other.mass / other.density * this.viscosityLaplaceKernel(dist, this.h);
      }
      
      // 添加压力力
      particle.addForce(pressureForce);
      
      // 添加粘度力
      viscosityForce.multiplyScalar(this.viscosity * particle.mass);
      particle.addForce(viscosityForce);
      
      // 添加表面张力
      const surfaceNormalLength = surfaceNormal.length();
      if (surfaceNormalLength > this.surfaceThreshold) {
        const surfaceForce = surfaceNormal.normalize().multiplyScalar(-this.surfaceTension * colorFieldLaplacian);
        particle.addForce(surfaceForce);
      }
    }
  }

  // 处理碰撞
  handleCollisions() {
    const { min, max } = this.boundingBox;
    const damping = 0.5; // 碰撞阻尼系数
    
    for (const particle of this.particles) {
      // 边界碰撞检测与响应
      if (particle.position.x < min.x) {
        particle.position.x = min.x;
        particle.velocity.x *= -damping;
      } else if (particle.position.x > max.x) {
        particle.position.x = max.x;
        particle.velocity.x *= -damping;
      }
      
      if (particle.position.y < min.y) {
        particle.position.y = min.y;
        particle.velocity.y *= -damping;
      } else if (particle.position.y > max.y) {
        particle.position.y = max.y;
        particle.velocity.y *= -damping;
      }
      
      if (particle.position.z < min.z) {
        particle.position.z = min.z;
        particle.velocity.z *= -damping;
      } else if (particle.position.z > max.z) {
        particle.position.z = max.z;
        particle.velocity.z *= -damping;
      }
      
      // 障碍物碰撞检测与响应
      for (const obstacle of this.obstacles) {
        obstacle.handleCollision(particle, damping);
      }
    }
  }

  // 更新系统
  update() {
    // 查找邻居
    this.findNeighbors();
    
    // 计算密度和压力
    this.computeDensityPressure();
    
    // 计算力
    this.computeForces();
    
    // 更新粒子
    for (const particle of this.particles) {
      particle.update(this.dt);
    }
    
    // 处理碰撞
    this.handleCollisions();
  }

  // 创建粒子的可视化表示
  createParticleMeshes(scene, radius = 0.05, color = 0x1E88E5) {
    for (const particle of this.particles) {
      particle.createMesh(scene, radius, color);
    }
  }
}