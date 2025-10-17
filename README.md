# Minecraft 游戏克隆

这是一个基于Three.js的简化版Minecraft游戏，实现了基本的3D方块世界和第一人称控制。

## 功能特性

- 🎮 第一人称视角控制
- 🧱 方块放置与破坏
- 🌍 随机地形生成
- 🎯 鼠标指针锁定
- ⌨️ WASD移动控制

## 方块类型

1. **草地** - 绿色草地纹理
2. **泥土** - 棕色泥土纹理
3. **石头** - 灰色石头纹理
4. **沙子** - 黄色沙子纹理
5. **水** - 蓝色水纹理

## 控制说明

- **鼠标点击** - 进入第一人称模式
- **WASD** - 移动
- **鼠标移动** - 视角旋转
- **左键点击** - 破坏方块
- **右键点击** - 放置方块
- **数字键1-5** - 切换方块类型

## 技术栈

- Three.js - 3D图形渲染
- HTML5 Canvas - 游戏画布
- JavaScript - 游戏逻辑

## 快速开始

1. 克隆项目
```bash
git clone [你的仓库地址]
cd minecraft-clone
```

2. 启动本地服务器
```bash
python3 -m http.server 8000
```

3. 打开浏览器访问 `http://localhost:8000`

## 项目结构

```
minecraft-clone/
├── index.html          # 主页面
├── src/
│   └── main.js        # 游戏主逻辑
├── textures/          # 方块纹理
│   ├── grass.png
│   ├── dirt.png
│   ├── stone.png
│   ├── sand.png
│   └── water.png
└── README.md
```

## 开发说明

游戏使用Three.js构建3D场景，实现了简化的地形生成算法和第一人称控制系统。所有纹理都是使用SVG生成的简单像素风格图案。

## 许可证

MIT License