// 游戏基本配置
const config = {
    chunkSize: 32,
    blockSize: 1,
    renderDistance: 4
};

// 初始化Three.js核心组件
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// 游戏界面 UI
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '5';
document.body.appendChild(overlay);

const crosshair = document.createElement('div');
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.width = '12px';
crosshair.style.height = '12px';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.borderLeft = '2px solid rgba(255,255,255,0.8)';
crosshair.style.borderTop = '2px solid rgba(255,255,255,0.8)';
crosshair.style.borderRight = '2px solid rgba(255,255,255,0.8)';
crosshair.style.borderBottom = '2px solid rgba(255,255,255,0.8)';
crosshair.style.boxSizing = 'border-box';
overlay.appendChild(crosshair);

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
        opacity: 0.7
    }
};

const placeableBlocks = ['grass', 'dirt', 'stone', 'sand'];
let currentBlockType = placeableBlocks[0];

const hotbar = document.createElement('div');
hotbar.style.position = 'absolute';
hotbar.style.bottom = '32px';
hotbar.style.left = '50%';
hotbar.style.transform = 'translateX(-50%)';
hotbar.style.display = 'flex';
hotbar.style.gap = '12px';
hotbar.style.padding = '12px 16px';
hotbar.style.background = 'rgba(0,0,0,0.35)';
hotbar.style.borderRadius = '12px';
hotbar.style.backdropFilter = 'blur(6px)';
hotbar.style.fontFamily = 'sans-serif';
hotbar.style.color = '#fff';
hotbar.style.pointerEvents = 'none';
overlay.appendChild(hotbar);

const hotbarItems = new Map();
placeableBlocks.forEach((type, index) => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.fontSize = '12px';
    item.style.minWidth = '48px';

    const swatch = document.createElement('div');
    swatch.style.width = '36px';
    swatch.style.height = '36px';
    swatch.style.marginBottom = '4px';
    swatch.style.borderRadius = '6px';
    swatch.style.background = `url(./textures/${type}.png)`;
    swatch.style.backgroundSize = 'cover';
    swatch.style.border = '2px solid rgba(255,255,255,0.25)';
    item.appendChild(swatch);

    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${type}`;
    item.appendChild(label);

    hotbar.appendChild(item);
    hotbarItems.set(type, { item, swatch });
});

function updateHotbarSelection() {
    hotbarItems.forEach(({ swatch }, type) => {
        if (type === currentBlockType) {
            swatch.style.border = '2px solid rgba(255,255,255,0.9)';
            swatch.style.boxShadow = '0 0 12px rgba(255,255,255,0.6)';
        } else {
            swatch.style.border = '2px solid rgba(255,255,255,0.25)';
            swatch.style.boxShadow = 'none';
        }
    });
}

updateHotbarSelection();

// 存储所有方块
const blocks = new Map();

const blockMaterials = new Map();

function getBlockMaterial(type) {
    if (!blockMaterials.has(type)) {
        const blockType = blockTypes[type];
        blockMaterials.set(type, new THREE.MeshLambertMaterial({
            map: blockType.texture,
            color: blockType.color,
            transparent: blockType.transparent || false,
            opacity: blockType.opacity || 1
        }));
    }

    return blockMaterials.get(type).clone();
}

function worldKey(x, y, z) {
    return `${x},${y},${z}`;
}

// 创建方块几何体
const blockGeometry = new THREE.BoxGeometry(config.blockSize, config.blockSize, config.blockSize);

// 生成地形
function generateTerrain() {
    for (let x = -config.chunkSize / 2; x < config.chunkSize / 2; x++) {
        for (let z = -config.chunkSize / 2; z < config.chunkSize / 2; z++) {
            // 生成高度图，使用改进的噪声函数
            const height = Math.max(0, Math.floor(sampleHeight(x, z)));

            // 底部石头层
            for (let y = 0; y < height - 3; y++) {
                createBlock(x, y, z, 'stone');
            }

            // 中间泥土层
            for (let y = Math.max(0, height - 3); y < height; y++) {
                createBlock(x, y, z, 'dirt');
            }

            // 顶部草层
            createBlock(x, height, z, 'grass');

            // 添加沙子（靠近水的区域）
            if (height < 2) {
                createBlock(x, height, z, 'sand');
            }

            // 添加水面
            if (height < 1) {
                for (let y = height + 1; y <= 1; y++) {
                    createBlock(x, y, z, 'water');
                }
            }
        }
    }
}

function hashNoise(x, z) {
    const dot = x * 374761393 + z * 668265263;
    let n = (dot ^ (dot << 13)) >>> 0;
    n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
    return 1.0 - n / 1073741824.0;
}

function smoothNoise(x, z) {
    const corners = (hashNoise(x - 1, z - 1) + hashNoise(x + 1, z - 1) + hashNoise(x - 1, z + 1) + hashNoise(x + 1, z + 1)) / 16;
    const sides = (hashNoise(x - 1, z) + hashNoise(x + 1, z) + hashNoise(x, z - 1) + hashNoise(x, z + 1)) / 8;
    const center = hashNoise(x, z) / 4;
    return corners + sides + center;
}

function interpolate(a, b, t) {
    const ft = t * Math.PI;
    const f = (1 - Math.cos(ft)) * 0.5;
    return a * (1 - f) + b * f;
}

function interpolatedNoise(x, z) {
    const integerX = Math.floor(x);
    const fractionalX = x - integerX;
    const integerZ = Math.floor(z);
    const fractionalZ = z - integerZ;

    const v1 = smoothNoise(integerX, integerZ);
    const v2 = smoothNoise(integerX + 1, integerZ);
    const v3 = smoothNoise(integerX, integerZ + 1);
    const v4 = smoothNoise(integerX + 1, integerZ + 1);

    const i1 = interpolate(v1, v2, fractionalX);
    const i2 = interpolate(v3, v4, fractionalX);

    return interpolate(i1, i2, fractionalZ);
}

function perlinNoise(x, z) {
    let total = 0;
    let persistence = 0.5;
    let frequency = 1;
    let amplitude = 1;
    const octaves = 4;

    for (let i = 0; i < octaves; i++) {
        total += interpolatedNoise(x * frequency, z * frequency) * amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    return total;
}

function sampleHeight(x, z) {
    const baseHeight = 4;
    const mountainHeight = 8;
    const noiseValue = perlinNoise(x * 0.08, z * 0.08);
    return baseHeight + noiseValue * mountainHeight;
}

// 创建单个方块
function createBlock(x, y, z, type) {
    const blockType = blockTypes[type];
    if (!blockType) return;

    const key = worldKey(x, y, z);
    if (blocks.has(key)) return blocks.get(key);

    const blockMaterial = getBlockMaterial(type);

    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(x, y, z);
    block.userData = { type, x, y, z };

    scene.add(block);
    blocks.set(key, block);
    return block;
}

// 移除方块
function removeBlock(x, y, z) {
    const key = worldKey(x, y, z);
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
controls.getObject().position.set(0, 8, 10);
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
blocker.style.textAlign = 'center';
blocker.style.padding = '0 24px';
blocker.style.zIndex = '10';
blocker.textContent = '点击屏幕开始游戏\nWASD移动 · 空格跳跃 · 鼠标操作方块 · 1-4选择方块';
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
let lastIntersection = null;

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 鼠标事件处理
document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;

    if (e.button === 0) {
        // 左键破坏方块
        if (selectedBlock) {
            const { x, y, z } = selectedBlock.userData;
            removeBlock(x, y, z);
            selectedBlock = null;
            hoveredBlock = null;
            lastIntersection = null;
        }
    } else if (e.button === 2) {
        // 右键放置方块
        if (lastIntersection) {
            const intersection = lastIntersection;
            const { object } = intersection;
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
            const faceNormal = intersection.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            const { x, y, z } = object.userData;
            const targetPosition = new THREE.Vector3(x, y, z).add(faceNormal).round();
            const key = worldKey(targetPosition.x, targetPosition.y, targetPosition.z);
            if (!blocks.has(key) && blockTypes[currentBlockType]) {
                createBlock(targetPosition.x, targetPosition.y, targetPosition.z, currentBlockType);
            }
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code.startsWith('Digit')) {
        const index = Number(e.code.replace('Digit', ''));
        if (index >= 1 && index <= placeableBlocks.length) {
            currentBlockType = placeableBlocks[index - 1];
            updateHotbarSelection();
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
            velocity.add(forward.clone().multiplyScalar(moveSpeed));
        }
        if (keys['KeyS']) {
            velocity.add(forward.clone().multiplyScalar(-moveSpeed));
        }
        if (keys['KeyA']) {
            velocity.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (keys['KeyD']) {
            velocity.add(right.clone().multiplyScalar(moveSpeed));
        }

        // 跳跃
        if (keys['Space'] && isOnGround) {
            velocity.y = jumpSpeed;
            isOnGround = false;
        }

        // 应用重力
        velocity.y -= gravity;

        // 移动玩家
        controls.getObject().position.addScaledVector(velocity, 0.01);

        // 碰撞检测
        const pos = controls.getObject().position;
        const blockX = Math.floor(pos.x);
        const blockY = Math.floor(pos.y - 0.1);
        const blockZ = Math.floor(pos.z);

        isOnGround = blocks.has(worldKey(blockX, blockY, blockZ)) ||
                    blocks.has(worldKey(blockX, blockY, blockZ + 1)) ||
                    blocks.has(worldKey(blockX + 1, blockY, blockZ)) ||
                    blocks.has(worldKey(blockX + 1, blockY, blockZ + 1));

        if (isOnGround) {
            if (velocity.y < 0) {
                velocity.y = 0;
            }
            controls.getObject().position.y = Math.max(controls.getObject().position.y, blockY + 0.51);
        }
    }

    // 更新方块选择
    if (controls.isLocked) {
        raycaster.setFromCamera(mouse.set(0, 0), camera);
        const intersects = raycaster.intersectObjects([...blocks.values()]);

        if (intersects.length > 0) {
            selectedBlock = intersects[0].object;
            lastIntersection = intersects[0];
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
            lastIntersection = null;
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