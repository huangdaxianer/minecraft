// 游戏基本配置
const config = {
    chunkSize: 16,
    blockSize: 1,
    renderDistance: 4
};

// 初始化Three.js核心组件
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 16, 8);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加光照
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// 纹理加载器
const textureLoader = new THREE.TextureLoader();

// 定义方块类型和纹理
const blockTypes = {
    grass: {
        color: 0x33ff33,
        texture: textureLoader.load('./textures/grass.png')
    },
    dirt: {
        color: 0x964b00,
        texture: textureLoader.load('./textures/dirt.png')
    },
    stone: {
        color: 0x808080,
        texture: textureLoader.load('./textures/stone.png')
    },
    sand: {
        color: 0xffff99,
        texture: textureLoader.load('./textures/sand.png')
    },
    water: {
        color: 0x3333ff,
        texture: textureLoader.load('./textures/water.png'),
        transparent: true,
        opacity: 0.8
    }
};

// 存储所有方块
const blocks = new Map();

// 创建方块几何体
const blockGeometry = new THREE.BoxGeometry(config.blockSize, config.blockSize, config.blockSize);

// 生成地形
function generateTerrain() {
    for (let x = 0; x < config.chunkSize; x++) {
        for (let z = 0; z < config.chunkSize; z++) {
            // 生成高度图
            const height = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 3 + 5);

            // 底部石头层
            for (let y = 0; y < height - 3; y++) {
                createBlock(x, y, z, 'stone');
            }

            // 中间泥土层
            for (let y = height - 3; y < height; y++) {
                createBlock(x, y, z, 'dirt');
            }

            // 顶部草层
            createBlock(x, height, z, 'grass');

            // 添加沙子（靠近水的区域）
            if (height < 4) {
                createBlock(x, height, z, 'sand');
            }

            // 添加水
            if (height < 3) {
                createBlock(x, height + 1, z, 'water');
            }
        }
    }
}

// 创建单个方块
function createBlock(x, y, z, type) {
    const blockType = blockTypes[type];
    if (!blockType) return;

    const blockMaterial = new THREE.MeshLambertMaterial({
        map: blockType.texture,
        color: blockType.color,
        transparent: blockType.transparent || false,
        opacity: blockType.opacity || 1
    });

    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(x, y, z);
    block.userData = { type, x, y, z };

    scene.add(block);
    blocks.set(`${x},${y},${z}`, block);
}

// 移除方块
function removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (blocks.has(key)) {
        scene.remove(blocks.get(key));
        blocks.delete(key);
    }
}

// 简化版指针锁定控制实现
class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;
        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(camera);

        this.domElement.addEventListener('mousedown', () => this.lock());
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());

        // 鼠标移动事件
        this.mouseMoveHandler = (event) => {
            if (this.isLocked) {
                const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
                const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

                this.yawObject.rotation.y -= movementX * 0.002;
                this.pitchObject.rotation.x -= movementY * 0.002;
                this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
            }
        };

        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    lock() {
        this.domElement.requestPointerLock();
    }

    unlock() {
        document.exitPointerLock();
    }

    onPointerLockChange() {
        this.isLocked = document.pointerLockElement === this.domElement;
        this.dispatchEvent({ type: this.isLocked ? 'lock' : 'unlock' });
    }

    onPointerLockError() {
        console.error('PointerLockControls: Unable to acquire pointer lock');
    }

    addEventListener(type, listener) {
        this.domElement.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
        this.domElement.removeEventListener(type, listener);
    }

    dispatchEvent(event) {
        this.domElement.dispatchEvent(new CustomEvent(event.type, event));
    }

    getObject() {
        return this.yawObject;
    }

    moveForward(distance) {
        const forward = new THREE.Vector3();
        this.getObject().getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        this.getObject().position.add(forward.multiplyScalar(distance));
    }

    moveRight(distance) {
        const right = new THREE.Vector3();
        this.getObject().getWorldDirection(right);
        right.y = 0;
        right.normalize();
        right.cross(new THREE.Vector3(0, 1, 0));
        this.getObject().position.add(right.multiplyScalar(distance));
    }
}

// 初始化指针锁定控制
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
const blocker = document.createElement('div');
blocker.style.position = 'fixed';
blocker.style.top = '0';
blocker.style.left = '0';
blocker.style.width = '100%';
blocker.style.height = '100%';
blocker.style.background = 'rgba(0,0,0,0.5)';
blocker.style.display = 'flex';
blocker.style.justifyContent = 'center';
blocker.style.alignItems = 'center';
blocker.style.fontSize = '24px';
blocker.style.color = 'white';
blocker.textContent = '点击屏幕开始游戏 (WASD移动, 鼠标控制视角, 左键破坏方块, 右键放置方块)';
document.body.appendChild(blocker);

blocker.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex';
});

// 玩家移动控制
const keys = {};
const moveSpeed = 5;
const jumpSpeed = 8;
const gravity = 0.5;
let velocity = new THREE.Vector3();
let isOnGround = false;

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// 射线投射器（用于方块选择）
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBlock = null;
let hoveredBlock = null;

// 鼠标事件处理
document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;

    if (e.button === 0) {
        // 左键破坏方块
        if (selectedBlock) {
            const { x, y, z } = selectedBlock.userData;
            removeBlock(x, y, z);
        }
    } else if (e.button === 2) {
        // 右键放置方块
        if (hoveredBlock) {
            const { x, y, z } = hoveredBlock.userData;
            const normal = new THREE.Vector3();
            raycaster.ray.intersectPlane(new THREE.Plane(normal.set(0, 1, 0)), 0);
            createBlock(x, y + 1, z, 'dirt');
        }
    }
});

// 窗口大小调整处理
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 游戏循环
function animate() {
    requestAnimationFrame(animate);

    // 更新玩家位置
    if (controls.isLocked) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

        velocity.x = 0;
        velocity.z = 0;

        if (keys['KeyW']) {
            velocity.add(forward.multiplyScalar(moveSpeed));
        }
        if (keys['KeyS']) {
            velocity.add(forward.multiplyScalar(-moveSpeed));
        }
        if (keys['KeyA']) {
            velocity.add(right.multiplyScalar(-moveSpeed));
        }
        if (keys['KeyD']) {
            velocity.add(right.multiplyScalar(moveSpeed));
        }

        // 跳跃
        if (keys['Space'] && isOnGround) {
            velocity.y = jumpSpeed;
            isOnGround = false;
        }

        // 应用重力
        velocity.y -= gravity;

        // 移动玩家
        controls.moveRight(velocity.x * 0.01);
        controls.moveForward(velocity.z * 0.01);
        controls.getObject().position.y += velocity.y * 0.01;

        // 碰撞检测
        const pos = controls.getObject().position;
        const blockX = Math.floor(pos.x);
        const blockY = Math.floor(pos.y - 0.1);
        const blockZ = Math.floor(pos.z);

        isOnGround = blocks.has(`${blockX},${blockY},${blockZ}`) ||
                    blocks.has(`${blockX},${blockY},${blockZ + 1}`) ||
                    blocks.has(`${blockX + 1},${blockY},${blockZ}`) ||
                    blocks.has(`${blockX + 1},${blockY},${blockZ + 1}`);
    }

    // 更新方块选择
    if (controls.isLocked) {
        raycaster.setFromCamera(mouse.set(0, 0), camera);
        const intersects = raycaster.intersectObjects([...blocks.values()]);

        if (intersects.length > 0) {
            selectedBlock = intersects[0].object;
            if (hoveredBlock !== selectedBlock) {
                if (hoveredBlock) {
                    hoveredBlock.material.emissive.set(0x000000);
                }
                hoveredBlock = selectedBlock;
                hoveredBlock.material.emissive.set(0x555555);
            }
        } else {
            if (hoveredBlock) {
                hoveredBlock.material.emissive.set(0x000000);
                hoveredBlock = null;
            }
            selectedBlock = null;
        }
    }

    renderer.render(scene, camera);
}

// 初始化游戏
function init() {
    generateTerrain();
    animate();
}

init();