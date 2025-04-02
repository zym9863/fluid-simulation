import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SPHSystem } from './sph/SPHSystem.js';
import { FluidRenderer } from './rendering/FluidRenderer.js';
import { SphereObstacle, BoxObstacle } from './sph/Obstacle.js';

class FluidSimulation {
  constructor() {
    // 初始化Three.js
    this.initThree();
    
    // 初始化SPH系统
    this.initSPH();
    
    // 添加事件监听器
    this.addEventListeners();
    
    // 开始动画循环
    this.animate();
  }

  initThree() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111); // 设置暗色背景
    
    // 创建相机
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);
    
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x202020); // 降低环境光亮度
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // 降低直射光强度
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(1);
    this.scene.add(axesHelper);
    
    // 添加容器边界
    this.addBoundary();
    
    // 窗口大小调整处理
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addBoundary() {
    // 创建一个透明的容器边界
    const boundarySize = 2;
    const boundaryGeometry = new THREE.BoxGeometry(boundarySize, boundarySize, boundarySize);
    const boundaryMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    this.scene.add(boundary);
  }

  initSPH() {
    // 创建SPH系统
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1)
    );
    
    this.sphSystem = new SPHSystem({
      smoothingRadius: 0.1,
      particleMass: 1.0,
      restDensity: 1000.0,
      gasConstant: 2000.0,
      viscosity: 0.018,
      timeStep: 0.004,
      gravity: new THREE.Vector3(0, -9.8, 0),
      boundingBox: boundingBox,
      surfaceTension: 0.0728
    });
    
    // 初始化粒子
    const particleRegion = {
      min: new THREE.Vector3(-0.5, -0.5, -0.5),
      max: new THREE.Vector3(0.5, 0.5, 0.5)
    };
    this.sphSystem.initializeParticles(1000, particleRegion);
    
    // 添加障碍物
    this.addObstacles();
    
    // 创建流体渲染器
    this.fluidRenderer = new FluidRenderer(this.sphSystem, {
      particleSize: 0.1,
      particleColor: 0x1E88E5,
      renderMode: 'particles'
    });
    
    // 创建粒子可视化
    this.fluidRenderer.createPointCloud(this.scene);
  }
  
  addObstacles() {
    // 添加球形障碍物
    const sphereObstacle = new SphereObstacle(new THREE.Vector3(0, 0, 0), 0.3);
    sphereObstacle.createMesh(this.scene);
    this.sphSystem.addObstacle(sphereObstacle);
    
    // 保存障碍物引用以便后续交互
    this.sphereObstacle = sphereObstacle;
  }
  
  addEventListeners() {
    // 添加鼠标交互
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.selectedObstacle = null;
    
    // 鼠标按下事件
    window.addEventListener('mousedown', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects([this.sphereObstacle.mesh]);
      
      if (intersects.length > 0) {
        this.isDragging = true;
        this.selectedObstacle = this.sphereObstacle;
        this.controls.enabled = false;
      }
    });
    
    // 鼠标移动事件
    window.addEventListener('mousemove', (event) => {
      if (this.isDragging && this.selectedObstacle) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const planeNormal = this.camera.getWorldDirection(new THREE.Vector3());
        const plane = new THREE.Plane(planeNormal, 0);
        const point = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, point);
        
        // 限制障碍物在边界内
        point.x = Math.max(-0.7, Math.min(0.7, point.x));
        point.y = Math.max(-0.7, Math.min(0.7, point.y));
        point.z = Math.max(-0.7, Math.min(0.7, point.z));
        
        this.selectedObstacle.position.copy(point);
        this.selectedObstacle.mesh.position.copy(point);
      }
    });
    
    // 鼠标松开事件
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.selectedObstacle = null;
      this.controls.enabled = true;
    });
    
    // 添加键盘控制
    window.addEventListener('keydown', (event) => {
      // 空格键重置模拟
      if (event.code === 'Space') {
        this.resetSimulation();
      }
    });
  }
  
  resetSimulation() {
    // 清除现有粒子
    this.fluidRenderer.dispose(this.scene);
    
    // 重新初始化粒子
    const particleRegion = {
      min: new THREE.Vector3(-0.5, -0.5, -0.5),
      max: new THREE.Vector3(0.5, 0.5, 0.5)
    };
    this.sphSystem.particles = [];
    this.sphSystem.initializeParticles(1000, particleRegion);
    
    // 重新创建粒子可视化
    this.fluidRenderer.createPointCloud(this.scene);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // 更新SPH系统
    this.sphSystem.update();
    
    // 更新流体渲染
    this.fluidRenderer.update();
    
    // 更新控制器
    this.controls.update();
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }
}

// 创建应用实例
window.addEventListener('DOMContentLoaded', () => {
  new FluidSimulation();
});