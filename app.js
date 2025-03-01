let scene, camera, renderer, controls, mixer, model;
let recordRTC;
let isPlaying = false;
let isRecording = false;
let clock = new THREE.Clock();
let animationSpeed = 1.0;
let grid, axes;
let stats, gui;
let infoPanel;
let currentAnimationAction = null;
let wireframeMaterial;
let originalMaterials = [];
let currentEnvironment = 'studio';
let envMaps = {};
let screenshotMode = false;
let loadingManager;
let progressBar;
let loadingOverlay;
let screenshotCanvas;
let edgesHelper;
let availableCameras = [];
let selectedCameraId = '';
let loadedModels = [];

let transformControls;
let dragControls;
let cameraPreviewRenderer;
let cameraPreviewScene;
let cameraPreviewCamera;
let cameraKeyframes = [];
let currentKeyframeIndex = -1;
let cameraAnimating = false;
let cameraClock = new THREE.Clock();
let cameraPathCurve;

let cameraHelper;

let modelKeyframes = [];
let currentModelKeyframeIndex = -1;
let modelAnimating = false;
let modelClock = new THREE.Clock();

let renderingInProgress = false;
let renderFrameCount = 0;
let totalRenderFrames = 0;
let renderFrameCaptures = [];
let renderSettings = {
    format: 'mp4',
    quality: 'high',
    fps: 30,
    duration: 5,
    resolution: '1920x1080'
};

let isModelSelected = false;

let cameraGrid;

function init() {
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    
    setupLoadingManager();
    
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 5);
    
    
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(document.getElementById('viewer').clientWidth, window.innerHeight);
    renderer.setClearColor(0x333333);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('viewer').appendChild(renderer.domElement);
    
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    
    
    stats = new Stats();
    stats.dom.style.display = 'none';
    document.getElementById('viewer').appendChild(stats.dom);
    
    
    grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    scene.add(grid);
    
    
    axes = new THREE.AxesHelper(5);
    axes.visible = false;
    scene.add(axes);
    
    
    initEnvironmentMaps();
    
    
    setupEnvironment(currentEnvironment);
    
    
    setupGUI();
    
    
    infoPanel = document.getElementById('info-panel');
    
    
    screenshotCanvas = document.createElement('canvas');
    screenshotCanvas.style.display = 'none';
    document.body.appendChild(screenshotCanvas);
    
    
    listAvailableCameras();
    
    
    initCameraPreview();
    
    
    initTransformControls();
    
    
    initKeyframesContainer();
    initModelKeyframesContainer();
    
    
    cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);
    
    
    cameraGrid = new THREE.GridHelper(10, 10, 0x00ffff, 0x008080);
    cameraGrid.position.set(0, 0, 0);
    cameraGrid.rotation.x = Math.PI / 2; 
    scene.add(cameraGrid);
    cameraGrid.visible = true;
    
    
    animate();
}

function initEnvironmentMaps() {
    
    envMaps.studio = {
        ambientLight: new THREE.AmbientLight(0xffffff, 0.5),
        directionalLights: [
            createDirectionalLight(0xffffff, 1.0, 5, 5, 5),
            createDirectionalLight(0xffffff, 0.8, -5, 5, -5)
        ],
        hemisphereLight: new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5),
        background: new THREE.Color(0x333333)
    };
    
    
    envMaps.outdoor = {
        ambientLight: new THREE.AmbientLight(0xffffff, 0.3),
        directionalLights: [
            createDirectionalLight(0xfffacd, 1.2, 3, 10, 3)
        ],
        hemisphereLight: new THREE.HemisphereLight(0x87ceeb, 0x567d46, 0.6),
        background: new THREE.Color(0x87ceeb)
    };
    
    
    envMaps.night = {
        ambientLight: new THREE.AmbientLight(0x0000ff, 0.1),
        directionalLights: [
            createDirectionalLight(0xadd8e6, 0.3, 5, 5, 5),
        ],
        pointLights: [
            createPointLight(0x9370db, 1.0, 3, 3, 2),
            createPointLight(0x00ffff, 0.7, -2, 1, -2)
        ],
        hemisphereLight: new THREE.HemisphereLight(0x000066, 0x000000, 0.2),
        background: new THREE.Color(0x000033)
    };
}

function createDirectionalLight(color, intensity, x, y, z) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    return light;
}

function createPointLight(color, intensity, x, y, z) {
    const light = new THREE.PointLight(color, intensity, 10);
    light.position.set(x, y, z);
    light.castShadow = true;
    return light;
}

function setupEnvironment(envName) {
    
    scene.children.forEach(child => {
        if (child instanceof THREE.Light) {
            scene.remove(child);
        }
    });
    
    
    const env = envMaps[envName];
    scene.background = env.background;
    
    
    if (env.ambientLight) scene.add(env.ambientLight);
    
    
    if (env.directionalLights) {
        env.directionalLights.forEach(light => scene.add(light));
    }
    
    
    if (env.pointLights) {
        env.pointLights.forEach(light => scene.add(light));
    }
    
    
    if (env.hemisphereLight) scene.add(env.hemisphereLight);
    
    
    if (!scene.children.includes(grid)) scene.add(grid);
    if (!scene.children.includes(axes)) scene.add(axes);
}

function setupGUI() {
    
    gui = new dat.GUI({ autoPlace: false, width: 250 });
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    document.getElementById('viewer').appendChild(gui.domElement);
    
    
    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'x', -10, 10).step(0.1).listen();
    cameraFolder.add(camera.position, 'y', -10, 10).step(0.1).listen();
    cameraFolder.add(camera.position, 'z', -10, 10).step(0.1).listen();
    cameraFolder.open();
    
    
    const rendererFolder = gui.addFolder('Renderer');
    rendererFolder.add(renderer, 'toneMappingExposure', 0, 2).step(0.01).name('Exposure');
    
    
    gui.hide();
}

function setupLoadingManager() {
    
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.style.display = 'none';
    
    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressBarInner = document.createElement('div');
    progressBarInner.className = 'progress-bar-inner';
    
    progressBar.appendChild(progressBarInner);
    loadingOverlay.appendChild(progressBar);
    
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.innerText = 'Loading model...';
    loadingOverlay.appendChild(loadingText);
    
    document.getElementById('viewer').appendChild(loadingOverlay);
    
    
    loadingManager = new THREE.LoadingManager();
    loadingManager.onStart = function() {
        loadingOverlay.style.display = 'flex';
        progressBarInner.style.width = '0%';
    };
    
    loadingManager.onProgress = function(url, loaded, total) {
        const percent = (loaded / total * 100).toFixed(0);
        progressBarInner.style.width = percent + '%';
    };
    
    loadingManager.onLoad = function() {
        loadingOverlay.style.display = 'none';
    };
    
    loadingManager.onError = function(url) {
        loadingOverlay.style.display = 'none';
        infoPanel.innerHTML = `Error loading: ${url}`;
    };
}

function initTransformControls() {
    
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    scene.add(transformControls);
    
    
    transformControls.addEventListener('dragging-changed', function(event) {
        controls.enabled = !event.value;
    });
    
    
    dragControls = new THREE.DragControls([], camera, renderer.domElement);
    dragControls.enabled = false;
    
    dragControls.addEventListener('dragstart', function(event) {
        if (!isModelSelected) {
            transformControls.attach(event.object);
            controls.enabled = false;
            isModelSelected = true;
            
            
            loadedModels.forEach((modelItem, index) => {
                if (modelItem.model.getObjectById(event.object.id)) {
                    document.getElementById('loaded-models').value = index;
                    model = modelItem.model;
                }
            });
        }
    });
    
    dragControls.addEventListener('dragend', function() {
        controls.enabled = true;
    });
    
    
    document.getElementById('translate-mode').addEventListener('click', function() {
        transformControls.setMode('translate');
    });
    
    document.getElementById('rotate-mode').addEventListener('click', function() {
        transformControls.setMode('rotate');
    });
    
    document.getElementById('scale-mode').addEventListener('click', function() {
        transformControls.setMode('scale');
    });
    
    
    document.getElementById('deselect-model').addEventListener('click', function() {
        transformControls.detach();
        isModelSelected = false;
    });
}

function initCameraPreview() {
    
    const previewCanvas = document.getElementById('camera-preview');
    if (!previewCanvas) {
        console.error('Camera preview canvas not found');
        return;
    }
    
    cameraPreviewRenderer = new THREE.WebGLRenderer({ 
        canvas: previewCanvas, 
        antialias: true,
        alpha: true 
    });
    cameraPreviewRenderer.setSize(previewCanvas.clientWidth, previewCanvas.clientHeight);
    cameraPreviewRenderer.setClearColor(0x000000, 0.3); 
    
    
    cameraPreviewScene = new THREE.Scene();
    
    
    const previewGrid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    cameraPreviewScene.add(previewGrid);
    
    
    cameraPreviewCamera = new THREE.PerspectiveCamera(
        75, 
        previewCanvas.clientWidth / previewCanvas.clientHeight,
        0.1,
        1000
    );
    
    
    const cameraHelperPreview = new THREE.CameraHelper(camera);
    cameraPreviewScene.add(cameraHelperPreview);
    
    
    const previewLight = new THREE.DirectionalLight(0xffffff, 1);
    previewLight.position.set(5, 10, 7.5);
    cameraPreviewScene.add(previewLight);
    
    
    const previewAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
    cameraPreviewScene.add(previewAmbientLight);
    
    
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    if (aspectRatioSelect) {
        aspectRatioSelect.addEventListener('change', function(event) {
            updateCameraAspectRatio(event.target.value);
        });
    }
}

function initModelKeyframesContainer() {
    
    const keyframesContainer = document.createElement('div');
    keyframesContainer.className = 'model-keyframes-container';
    
    
    const modelControlsSection = document.querySelector('.model-keyframes-container');
    if (modelControlsSection) {
        
        return;
    } else {
        
        const modelSection = document.querySelector('.button-group');
        if (modelSection && modelSection.parentNode) {
            modelSection.parentNode.appendChild(keyframesContainer);
        } else {
            
            document.querySelector('.sidebar').appendChild(keyframesContainer);
        }
    }
}

function initKeyframesContainer() {
    
    const keyframesContainer = document.createElement('div');
    keyframesContainer.className = 'keyframes-container';
    
    
    const cameraControlsSection = document.querySelector('.camera-preview-container');
    if (cameraControlsSection) {
        cameraControlsSection.parentNode.insertBefore(keyframesContainer, cameraControlsSection.nextSibling);
    } else {
        console.error('Camera preview container not found');
        
        document.querySelector('.sidebar').appendChild(keyframesContainer);
    }
    
    
    document.getElementById('add-keyframe').addEventListener('click', addCameraKeyframe);
    document.getElementById('play-camera-path').addEventListener('click', playCameraPath);
    document.getElementById('stop-camera-path').addEventListener('click', stopCameraPath);
}

function addCameraKeyframe() {
    
    const keyframe = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        up: camera.up.clone(),
        time: cameraKeyframes.length > 0 ? cameraKeyframes[cameraKeyframes.length - 1].time + 2.0 : 0
    };
    
    cameraKeyframes.push(keyframe);
    
    
    const keyframesContainer = document.querySelector('.keyframes-container');
    const keyframeElement = document.createElement('div');
    keyframeElement.className = 'keyframe';
    keyframeElement.textContent = cameraKeyframes.length;
    keyframeElement.dataset.index = cameraKeyframes.length - 1;
    
    keyframeElement.addEventListener('click', function() {
        
        const index = parseInt(this.dataset.index);
        goToKeyframe(index);
    });
    
    keyframesContainer.appendChild(keyframeElement);
    
    
    if (cameraKeyframes.length >= 2) {
        updateCameraPathCurve();
    }
    
    infoPanel.innerHTML = `Added keyframe ${cameraKeyframes.length} at time ${keyframe.time}s`;
}

function updateCameraPathCurve() {
    
    const points = cameraKeyframes.map(kf => kf.position);
    cameraPathCurve = new THREE.CatmullRomCurve3(points);
}

function goToKeyframe(index) {
    if (index >= 0 && index < cameraKeyframes.length) {
        const keyframe = cameraKeyframes[index];
        
        
        camera.position.copy(keyframe.position);
        controls.target.copy(keyframe.target);
        camera.up.copy(keyframe.up);
        
        controls.update();
        
        
        document.querySelectorAll('.keyframe').forEach(el => el.classList.remove('active'));
        document.querySelector(`.keyframe[data-index="${index}"]`).classList.add('active');
        
        currentKeyframeIndex = index;
    }
}

function playCameraPath() {
    if (cameraKeyframes.length < 2) {
        infoPanel.innerHTML = "Need at least 2 keyframes to play a camera path";
        return;
    }
    
    cameraClock.start();
    cameraAnimating = true;
    currentKeyframeIndex = 0;
    
    infoPanel.innerHTML = "Playing camera path animation";
}

function stopCameraPath() {
    cameraAnimating = false;
    infoPanel.innerHTML = "Camera path animation stopped";
}

function updateCameraAnimation() {
    if (!cameraAnimating || cameraKeyframes.length < 2) return;
    
    const totalDuration = cameraKeyframes[cameraKeyframes.length - 1].time;
    let time = cameraClock.getElapsedTime() % totalDuration;
    
    
    let currentKeyframe, nextKeyframe;
    let alpha;
    
    for (let i = 0; i < cameraKeyframes.length - 1; i++) {
        if (time >= cameraKeyframes[i].time && time < cameraKeyframes[i + 1].time) {
            currentKeyframe = cameraKeyframes[i];
            nextKeyframe = cameraKeyframes[i + 1];
            alpha = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
            currentKeyframeIndex = i;
            break;
        }
    }
    
    if (currentKeyframe && nextKeyframe) {
        
        camera.position.lerpVectors(currentKeyframe.position, nextKeyframe.position, alpha);
        
        
        controls.target.lerpVectors(currentKeyframe.target, nextKeyframe.target, alpha);
        
        
        controls.update();
        
        
        document.querySelectorAll('.keyframe').forEach(el => el.classList.remove('active'));
        document.querySelector(`.keyframe[data-index="${currentKeyframeIndex}"]`).classList.add('active');
    }
}

function finishModelLoading(model, modelUrl) {
    
    scene.add(model);
    
    
    loadedModels.push({
        model: model,
        name: modelUrl.split('/').pop() || 'Model ' + (loadedModels.length + 1)
    });
    updateModelsList();
    
    
    model.traverse(function(node) {
        if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
    
    
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scale = autoScaleModel(model);
    
    model.position.sub(center.multiplyScalar(scale));
    
    
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) * scale;
    camera.position.set(0, maxDim, maxDim * 2);
    controls.target.set(0, maxDim/2, 0);
    controls.update();
    
    
    updatePreviewSceneWithModels();
    
    
    updateGUIWithModelControls();
    
    
    updateModelInfo(box, size, model);
    
    
    if (modelUrl && modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modelUrl);
    }
    
    
    if (dragControls) {
        model.traverse(function(child) {
            if (child instanceof THREE.Mesh) {
                dragControls.getObjects().push(child);
            }
        });
    }
    
    
    selectModel(loadedModels.length - 1);
}

function updateModelInfo(box, size, model) {
    
    let vertices = 0;
    let triangles = 0;
    let meshCount = 0;
    
    model.traverse(function(node) {
        if (node instanceof THREE.Mesh) {
            meshCount++;
            if (node.geometry) {
                if (node.geometry.attributes && node.geometry.attributes.position) {
                    vertices += node.geometry.attributes.position.count;
                }
                if (node.geometry.index) {
                    triangles += node.geometry.index.count / 3;
                } else if (node.geometry.attributes.position) {
                    triangles += node.geometry.attributes.position.count / 3;
                }
            }
        }
    });
    
    
    const sizeX = size.x.toFixed(2);
    const sizeY = size.y.toFixed(2);
    const sizeZ = size.z.toFixed(2);
    
    infoPanel.innerHTML = `
        <strong>Model Loaded</strong><br>
        Dimensions: ${sizeX} x ${sizeY} x ${sizeZ}<br>
        Meshes: ${meshCount}<br>
        Vertices: ${vertices}<br>
        Triangles: ${triangles}<br>
        ${mixer ? 'Animations: ' + mixer._actions.length : 'No animations'}
    `;
}

function updateAnimationInfo(animations) {
    if (!animations || animations.length === 0) return;
    
    let animInfo = '<br><strong>Animations:</strong><br>';
    animations.forEach((anim, index) => {
        animInfo += `${index + 1}. ${anim.name || 'Animation ' + (index + 1)} (${anim.duration.toFixed(2)}s)<br>`;
    });
    
    infoPanel.innerHTML += animInfo;
}

function updateGUIWithModelControls() {
    
    if (gui.__folders['Model']) {
        gui.__folders['Model'].__controllers.forEach(controller => controller.remove());
        gui.removeFolder(gui.__folders['Model']);
    }
    
    
    const modelFolder = gui.addFolder('Model');
    
    
    modelFolder.add(model.position, 'x', -10, 10).step(0.1).name('Position X');
    modelFolder.add(model.position, 'y', -10, 10).step(0.1).name('Position Y');
    modelFolder.add(model.position, 'z', -10, 10).step(0.1).name('Position Z');
    
    
    modelFolder.add(model.rotation, 'x', -Math.PI, Math.PI).step(0.1).name('Rotation X');
    modelFolder.add(model.rotation, 'y', -Math.PI, Math.PI).step(0.1).name('Rotation Y');
    modelFolder.add(model.rotation, 'z', -Math.PI, Math.PI).step(0.1).name('Rotation Z');
    
    
    const scaleController = modelFolder.add({ scale: 1 }, 'scale', 0.1, 5).step(0.1).name('Scale');
    scaleController.onChange(function(value) {
        model.scale.set(value, value, value);
    });
    
    
    if (mixer && mixer._actions.length > 0) {
        const animFolder = modelFolder.addFolder('Animations');
        
        
        const animations = {};
        mixer._actions.forEach((action, index) => {
            animations[action._clip.name || 'Animation ' + (index + 1)] = index;
        });
        
        
        const animController = animFolder.add({ animation: 0 }, 'animation', animations).name('Select Animation');
        animController.onChange(function(index) {
            
            mixer._actions.forEach(action => action.stop());
            
            
            currentAnimationAction = mixer._actions[index];
            currentAnimationAction.play();
            isPlaying = true;
        });
        
        
        const speedController = animFolder.add({ speed: animationSpeed }, 'speed', 0.1, 2).step(0.1).name('Speed');
        speedController.onChange(function(value) {
            animationSpeed = value;
        });
        
        
        if (currentAnimationAction) {
            const timeController = animFolder.add({ 
                time: 0 
            }, 'time', 0, currentAnimationAction._clip.duration).step(0.01).name('Time');
            timeController.onChange(function(value) {
                if (currentAnimationAction) {
                    currentAnimationAction.time = value;
                    if (!isPlaying) mixer.update(0);
                }
            });
        }
        
        animFolder.open();
    }
    
    
    if (model) {
        const materialFolder = modelFolder.addFolder('Materials');
        
        
        let hasMaterials = false;
        model.traverse(function(child) {
            if (child instanceof THREE.Mesh && child.material) {
                hasMaterials = true;
            }
        });
        
        if (hasMaterials) {
            
            const materialProps = {
                metalness: 0.5,
                roughness: 0.5,
                normalScale: 1.0,
                opacity: 1.0,
                emissiveIntensity: 1.0,
                wireframe: false
            };
            
            materialFolder.add(materialProps, 'metalness', 0, 1).step(0.01).onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material && child.material.metalness !== undefined) {
                        child.material.metalness = value;
                        child.material.needsUpdate = true;
                    }
                });
            });
            
            materialFolder.add(materialProps, 'roughness', 0, 1).step(0.01).onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material && child.material.roughness !== undefined) {
                        child.material.roughness = value;
                        child.material.needsUpdate = true;
                    }
                });
            });
            
            materialFolder.add(materialProps, 'normalScale', 0, 2).step(0.01).onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material && child.material.normalScale) {
                        child.material.normalScale.set(value, value);
                        child.material.needsUpdate = true;
                    }
                });
            });
            
            materialFolder.add(materialProps, 'opacity', 0, 1).step(0.01).onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material) {
                        child.material.opacity = value;
                        if (value < 1.0) {
                            child.material.transparent = true;
                        } else {
                            child.material.transparent = false;
                        }
                        child.material.needsUpdate = true;
                    }
                });
            });
            
            materialFolder.add(materialProps, 'emissiveIntensity', 0, 2).step(0.01).onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material && child.material.emissive) {
                        child.material.emissiveIntensity = value;
                        child.material.needsUpdate = true;
                    }
                });
            });
            
            materialFolder.add(materialProps, 'wireframe').onChange(function(value) {
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh && child.material) {
                        child.material.wireframe = value;
                        child.material.needsUpdate = true;
                    }
                });
            });
        }
    }
    
    modelFolder.open();
}


document.getElementById('play-animation').addEventListener('click', () => {
    if (mixer) {
        isPlaying = true;
        if (currentAnimationAction) {
            currentAnimationAction.paused = false;
        }
    }
});

document.getElementById('pause-animation').addEventListener('click', () => {
    if (mixer) {
        isPlaying = false;
        if (currentAnimationAction) {
            currentAnimationAction.paused = true;
        }
    }
});

document.getElementById('slow-animation').addEventListener('click', () => {
    animationSpeed = Math.max(0.1, animationSpeed - 0.1);
    infoPanel.innerHTML += `<br>Animation speed: ${animationSpeed.toFixed(1)}x`;
});

document.getElementById('fast-animation').addEventListener('click', () => {
    animationSpeed = Math.min(2.0, animationSpeed + 0.1);
    infoPanel.innerHTML += `<br>Animation speed: ${animationSpeed.toFixed(1)}x`;
});


document.getElementById('toggle-wireframe').addEventListener('change', function(event) {
    const showWireframe = event.target.checked;
    
    if (!model) return;
    
    model.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            if (showWireframe) {
                
                if (!wireframeMaterial) {
                    wireframeMaterial = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true
                    });
                }
                child.userData.originalMaterial = child.material;
                child.material = wireframeMaterial;
            } else {
                
                if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            }
        }
    });
});

document.getElementById('toggle-grid').addEventListener('change', function(event) {
    grid.visible = event.target.checked;
});

document.getElementById('toggle-axes').addEventListener('change', function(event) {
    axes.visible = event.target.checked;
});

document.getElementById('toggle-stats').addEventListener('change', function(event) {
    stats.dom.style.display = event.target.checked ? 'block' : 'none';
});


document.getElementById('environment').addEventListener('change', function(event) {
    currentEnvironment = event.target.value;
    setupEnvironment(currentEnvironment);
});


document.getElementById('start-recording').addEventListener('click', () => {
    if (!isRecording) {
        try {
            
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('MediaRecorder not supported in this browser');
            }
            
            let stream;
            
            if (selectedCameraId && selectedCameraId !== 'canvas') {
                
                navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: selectedCameraId },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                }).then(cameraStream => {
                    startRecordingWithStream(cameraStream);
                }).catch(err => {
                    console.error('Camera error:', err);
                    infoPanel.innerHTML += `<br>Camera error: ${err.message}`;
                });
            } else {
                
                stream = renderer.domElement.captureStream(60);
                startRecordingWithStream(stream);
            }
        } catch (err) {
            console.error('Recording error:', err);
            infoPanel.innerHTML += `<br>Recording error: ${err.message}`;
        }
    }
});

function startRecordingWithStream(stream) {
    const options = {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        bitsPerSecond: document.getElementById('video-quality').value,
        frameRate: document.getElementById('frame-rate').value,
        quality: 1 
    };
    
    recordRTC = RecordRTC(stream, options);
    recordRTC.startRecording();
    isRecording = true;
    
    
    document.getElementById('start-recording').disabled = true;
    document.getElementById('stop-recording').disabled = false;
    infoPanel.innerHTML += `<br><strong>Recording started with ${options.bitsPerSecond/1000000}Mbps bitrate...</strong>`;
}

document.getElementById('stop-recording').addEventListener('click', () => {
    if (isRecording) {
        recordRTC.stopRecording(() => {
            const blob = recordRTC.getBlob();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'LAX3D_recording.webm';
                a.click();
                URL.revokeObjectURL(url);
            }
            isRecording = false;
            
            
            document.getElementById('start-recording').disabled = false;
            document.getElementById('stop-recording').disabled = true;
            infoPanel.innerHTML += '<br><strong>Recording saved!</strong>';
        });
    }
});


document.getElementById('export-gltf').addEventListener('click', () => {
    exportModel('gltf');
});

document.getElementById('export-glb').addEventListener('click', () => {
    exportModel('glb');
});

document.getElementById('export-obj').addEventListener('click', () => {
    
    if (!model) {
        infoPanel.innerHTML += '<br>No model to export';
        return;
    }
    
    
    exportModel('gltf');
    infoPanel.innerHTML += '<br>OBJ export not implemented, exported as GLTF instead';
});

function exportModel(format) {
    if (!model) {
        infoPanel.innerHTML += '<br>No model to export';
        return;
    }
    
    try {
        const exporter = new THREE.GLTFExporter();
        const options = {
            binary: format === 'glb',
            trs: true,
            onlyVisible: true,
            truncateDrawRange: true,
            animations: mixer ? mixer._actions.map(a => a._clip) : []
        };
        
        exporter.parse(model, function(result) {
            let blob, filename;
            
            if (format === 'glb') {
                blob = new Blob([result], { type: 'application/octet-stream' });
                filename = 'LAX3D_model.glb';
            } else {
                
                const output = JSON.stringify(result, null, 2);
                blob = new Blob([output], { type: 'application/json' });
                filename = 'LAX3D_model.gltf';
            }
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            infoPanel.innerHTML += `<br>Exported as ${format.toUpperCase()}`;
        }, options);
    } catch (error) {
        console.error('Export error:', error);
        infoPanel.innerHTML += `<br>Export error: ${error.message}`;
    }
}


document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    
    infoPanel.innerHTML = `Loading ${file.name}...`;
    
    loadModel(url, fileExtension);
});


document.getElementById('sample-models').innerHTML = `
    <option value="">Select a sample model...</option>
    <option value="/human.obj">Human (OBJ)</option>
    <option value="/old_computer_v2.glb">Old Computer (GLB)</option>
    <option value="/spongebob.glb">SpongeBob (GLB)</option>
    <option value="/car.glb">Car (GLB)</option>
    <option value="/minecraft_-_steve.glb">Minecraft Steve (GLB)</option>
    <option value="/roblox_noob.glb">Roblox Noob (GLB)</option>
    <option value="/house-model.gltf">House (GLTF)</option>
    <option value="/chair.glb">Chair (GLB)</option>
    <option value="/tree.glb">Tree (GLB)</option>
    <option value="/gun.obj">Gun (OBJ)</option>
`;

document.getElementById('sample-models').addEventListener('change', function(event) {
    const url = event.target.value;
    if (!url) return;
    
    
    infoPanel.innerHTML = `Loading sample model...`;
    
    
    const fileExtension = url.split('.').pop().toLowerCase();
    loadModel(url, fileExtension);
});

function loadModel(url, fileExtension) {
    
    const modelUrl = url;
    
    
    const replaceMode = document.getElementById('replace-mode').checked;
    if (replaceMode && model) {
        scene.remove(model);
        if (mixer) {
            mixer.stopAllAction();
            mixer = null;
        }
        
        
        if (edgesHelper) {
            scene.remove(edgesHelper);
            edgesHelper = null;
        }
    }
    
    
    originalMaterials = [];
    
    let loader;
    switch(fileExtension) {
        case 'fbx':
            loader = new THREE.FBXLoader(loadingManager);
            break;
        case 'obj':
            loader = new THREE.OBJLoader(loadingManager);
            break;
        case 'stl':
            loader = new THREE.STLLoader(loadingManager);
            break;
        case 'gltf':
        case 'glb':
        default:
            loader = new THREE.GLTFLoader(loadingManager);
            break;
    }
    
    try {
        if (fileExtension === 'stl') {
            
            loader.load(modelUrl, function(geometry) {
                const material = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    metalness: 0.5,
                    roughness: 0.5
                });
                model = new THREE.Mesh(geometry, material);
                
                
                originalMaterials.push({ mesh: model, material: material.clone() });
                
                finishModelLoading(model, modelUrl);
            });
        } else if (fileExtension === 'obj') {
            loader.load(modelUrl, function(object) {
                model = object;
                
                
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        if (!child.material) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xaaaaaa,
                                metalness: 0.5,
                                roughness: 0.5
                            });
                        }
                        
                        originalMaterials.push({ mesh: child, material: child.material.clone() });
                    }
                });
                
                finishModelLoading(model, modelUrl);
            });
        } else if (fileExtension === 'fbx') {
            loader.load(modelUrl, function(object) {
                model = object;
                
                
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        originalMaterials.push({ mesh: child, material: child.material.clone() });
                        
                        
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.metalness = 0.5;
                                    mat.roughness = 0.5;
                                    mat.needsUpdate = true;
                                });
                            } else {
                                child.material.metalness = 0.5;
                                child.material.roughness = 0.5;
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });
                
                
                if (model.animations && model.animations.length) {
                    mixer = new THREE.AnimationMixer(model);
                    
                    
                    model.animations.forEach((clip, index) => {
                        const action = mixer.clipAction(clip);
                        action.play();
                        if (index > 0) action.stop(); 
                    });
                    
                    currentAnimationAction = mixer._actions[0];
                    isPlaying = true;
                    
                    
                    updateAnimationInfo(model.animations);
                    
                    
                    updateGUIWithModelControls();
                }
                
                finishModelLoading(model, modelUrl);
            });
        } else {
            
            loader.load(modelUrl, function(gltf) {
                model = gltf.scene;
                
                
                model.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        originalMaterials.push({ mesh: child, material: child.material.clone() });
                    }
                });
                
                
                if (gltf.animations && gltf.animations.length) {
                    mixer = new THREE.AnimationMixer(model);
                    currentAnimationAction = mixer.clipAction(gltf.animations[0]);
                    currentAnimationAction.play();
                    isPlaying = true;
                    
                    
                    updateAnimationInfo(gltf.animations);
                }
                
                finishModelLoading(model, modelUrl);
            });
        }
    } catch (error) {
        console.error("Error loading model:", error);
        infoPanel.innerHTML = `Error loading model: ${error.message}`;
        loadingOverlay.style.display = 'none';
    }
}


window.addEventListener('resize', () => {
    camera.aspect = document.getElementById('viewer').clientWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(document.getElementById('viewer').clientWidth, window.innerHeight);
});


function takeScreenshot() {
    screenshotMode = true;
    
    
    if (stats) stats.dom.style.display = 'none';
    if (gui) gui.domElement.style.display = 'none';
    
    
    renderer.render(scene, camera);
    
    
    screenshotCanvas.width = renderer.domElement.width;
    screenshotCanvas.height = renderer.domElement.height;
    
    
    const context = screenshotCanvas.getContext('2d');
    context.drawImage(renderer.domElement, 0, 0);
    
    
    try {
        const link = document.createElement('a');
        link.download = 'LAX3D_screenshot.png';
        link.href = screenshotCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        link.click();
    } catch (e) {
        console.error('Error saving screenshot:', e);
        infoPanel.innerHTML += '<br>Error saving screenshot';
    }
    
    
    if (stats && document.getElementById('toggle-stats').checked) stats.dom.style.display = 'block';
    if (gui) gui.domElement.style.display = 'block';
    
    screenshotMode = false;
}


function toggleEdges(show) {
    if (!model) return;
    
    if (show) {
        
        if (!edgesHelper) {
            const edgesGroup = new THREE.Group();
            
            model.traverse(function(child) {
                if (child instanceof THREE.Mesh && child.geometry) {
                    const edges = new THREE.EdgesGeometry(child.geometry);
                    const line = new THREE.LineSegments(
                        edges,
                        new THREE.LineBasicMaterial({ color: 0x00ffff })
                    );
                    
                    
                    line.matrix.copy(child.matrix);
                    line.matrixAutoUpdate = false;
                    
                    edgesGroup.add(line);
                }
            });
            
            edgesHelper = edgesGroup;
            scene.add(edgesHelper);
        } else {
            edgesHelper.visible = true;
        }
    } else if (edgesHelper) {
        edgesHelper.visible = false;
    }
}


function resetModelPosition() {
    if (!model) return;
    
    
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    
    model.scale.set(scale, scale, scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    model.rotation.set(0, 0, 0);
    
    
    camera.position.set(0, maxDim * scale, maxDim * scale * 2);
    controls.target.set(0, 0, 0);
    controls.update();
    
    
    for (const folder in gui.__folders) {
        for (const controller of gui.__folders[folder].__controllers) {
            controller.updateDisplay();
        }
    }
}


function autoScaleModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    
    let scale;
    
    if (model.type === "Group" && model.children.some(child => child.type === "SkinnedMesh")) {
        scale = 0.02; 
    } else if (maxDim > 100) {
        scale = 2 / maxDim;
    } else if (maxDim < 0.1) {
        scale = 20; 
    } else {
        scale = 2 / maxDim;
    }
    
    model.scale.multiplyScalar(scale);
    return scale;
}


function updateModelsList() {
    const modelsSelect = document.getElementById('loaded-models');
    modelsSelect.innerHTML = '';
    
    loadedModels.forEach((modelItem, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = modelItem.name;
        modelsSelect.appendChild(option);
    });
}

function selectModel(index) {
    if (index >= 0 && index < loadedModels.length) {
        model = loadedModels[index].model;
        updateGUIWithModelControls();
        
        
        transformControls.attach(model);
        isModelSelected = true;
        
        
        const options = document.getElementById('loaded-models').options;
        for (let i = 0; i < options.length; i++) {
            if (i === index) {
                options[i].classList.add('selected-model');
            } else {
                options[i].classList.remove('selected-model');
            }
        }
    }
}

function deleteSelectedModel() {
    const modelsSelect = document.getElementById('loaded-models');
    const selectedIndex = parseInt(modelsSelect.value);
    
    if (selectedIndex >= 0 && selectedIndex < loadedModels.length) {
        const modelToRemove = loadedModels[selectedIndex].model;
        scene.remove(modelToRemove);
        loadedModels.splice(selectedIndex, 1);
        updateModelsList();
        
        if (loadedModels.length > 0) {
            modelsSelect.value = 0;
            selectModel(0);
        } else {
            model = null;
        }
    }
}


function listAvailableCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log("enumerateDevices() not supported.");
        return;
    }
    
    
    availableCameras = [{
        deviceId: 'canvas',
        label: 'Scene Canvas (no webcam)'
    }];
    
    
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                if (device.kind === 'videoinput') {
                    availableCameras.push({
                        deviceId: device.deviceId,
                        label: device.label || `Camera ${availableCameras.length}`
                    });
                }
            });
            
            
            updateCameraSelect();
        })
        .catch(err => {
            console.error("Error accessing media devices:", err);
        });
}

function updateCameraSelect() {
    const cameraSelect = document.getElementById('camera-select');
    cameraSelect.innerHTML = '';
    
    availableCameras.forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label;
        cameraSelect.appendChild(option);
    });
    
    
    cameraSelect.value = 'canvas';
    selectedCameraId = 'canvas';
}


function updateSelectedCamera(cameraId) {
    selectedCameraId = cameraId;
}


document.getElementById('select-model').addEventListener('click', function() {
    const selectedIndex = parseInt(document.getElementById('loaded-models').value);
    selectModel(selectedIndex);
});

document.getElementById('delete-model').addEventListener('click', function() {
    deleteSelectedModel();
});


document.getElementById('camera-select').addEventListener('change', function(event) {
    updateSelectedCamera(event.target.value);
});


document.getElementById('replace-mode').addEventListener('change', function() {
    
    
});


function addModelKeyframe() {
    if (!model) {
        infoPanel.innerHTML = "No model selected for keyframes";
        return;
    }
    
    const keyframe = {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
        time: modelKeyframes.length > 0 ? modelKeyframes[modelKeyframes.length - 1].time + 2.0 : 0
    };
    
    modelKeyframes.push(keyframe);
    
    
    const keyframesContainer = document.querySelector('.model-keyframes-container');
    const keyframeElement = document.createElement('div');
    keyframeElement.className = 'keyframe model-keyframe';
    keyframeElement.textContent = modelKeyframes.length;
    keyframeElement.dataset.index = modelKeyframes.length - 1;
    
    keyframeElement.addEventListener('click', function() {
        
        const index = parseInt(this.dataset.index);
        goToModelKeyframe(index);
    });
    
    keyframesContainer.appendChild(keyframeElement);
    
    infoPanel.innerHTML = `Added model keyframe ${modelKeyframes.length} at time ${keyframe.time}s`;
}

function goToModelKeyframe(index) {
    if (index >= 0 && index < modelKeyframes.length) {
        const keyframe = modelKeyframes[index];
        
        
        model.position.copy(keyframe.position);
        model.rotation.copy(keyframe.rotation);
        model.scale.copy(keyframe.scale);
        
        
        document.querySelectorAll('.model-keyframe').forEach(el => el.classList.remove('active'));
        document.querySelector(`.model-keyframe[data-index="${index}"]`).classList.add('active');
        
        currentModelKeyframeIndex = index;
    }
}

function playModelAnimation() {
    if (modelKeyframes.length < 2) {
        infoPanel.innerHTML = "Need at least 2 model keyframes to play animation";
        return;
    }
    
    modelClock.start();
    modelAnimating = true;
    currentModelKeyframeIndex = 0;
    
    infoPanel.innerHTML = "Playing model keyframe animation";
}

function stopModelAnimation() {
    modelAnimating = false;
    infoPanel.innerHTML = "Model animation stopped";
}

function updateModelAnimation() {
    if (!modelAnimating || modelKeyframes.length < 2 || !model) return;
    
    const totalDuration = modelKeyframes[modelKeyframes.length - 1].time;
    let time = modelClock.getElapsedTime() % totalDuration;
    
    
    let currentKeyframe, nextKeyframe;
    let alpha;
    
    for (let i = 0; i < modelKeyframes.length - 1; i++) {
        if (time >= modelKeyframes[i].time && time < modelKeyframes[i + 1].time) {
            currentKeyframe = modelKeyframes[i];
            nextKeyframe = modelKeyframes[i + 1];
            alpha = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
            currentModelKeyframeIndex = i;
            break;
        }
    }
    
    if (currentKeyframe && nextKeyframe) {
        
        model.position.lerpVectors(currentKeyframe.position, nextKeyframe.position, alpha);
        
        
        const q1 = new THREE.Quaternion().setFromEuler(currentKeyframe.rotation);
        const q2 = new THREE.Quaternion().setFromEuler(nextKeyframe.rotation);
        q1.slerp(q2, alpha);
        model.quaternion.copy(q1);
        
        
        model.scale.lerpVectors(currentKeyframe.scale, nextKeyframe.scale, alpha);
        
        
        document.querySelectorAll('.model-keyframe').forEach(el => el.classList.remove('active'));
        document.querySelector(`.model-keyframe[data-index="${currentModelKeyframeIndex}"]`).classList.add('active');
    }
}

function renderAnimation() {
    if (modelKeyframes.length < 2) {
        infoPanel.innerHTML = "Need at least 2 model keyframes to render an animation";
        return;
    }
    
    
    document.getElementById('render-dialog').style.display = 'block';
}

function startRendering() {
    
    const format = document.getElementById('render-format').value;
    const quality = document.getElementById('render-quality').value;
    const fps = parseInt(document.getElementById('render-fps').value);
    const duration = parseFloat(document.getElementById('render-duration').value);
    const resolution = document.getElementById('render-resolution').value;
    
    
    renderSettings = {
        format: format,
        quality: quality,
        fps: fps,
        duration: duration,
        resolution: resolution
    };
    
    
    totalRenderFrames = fps * duration;
    renderFrameCount = 0;
    renderFrameCaptures = [];
    
    
    loadingOverlay.style.display = 'flex';
    document.querySelector('.loading-text').innerText = 'Rendering animation...';
    const progressBarInner = document.querySelector('.progress-bar-inner');
    progressBarInner.style.width = '0%';
    
    
    document.getElementById('render-dialog').style.display = 'none';
    
    
    renderingInProgress = true;
    renderNextFrame();
}

function renderNextFrame() {
    if (renderFrameCount >= totalRenderFrames) {
        
        finishRendering();
        return;
    }
    
    
    const totalDuration = modelKeyframes[modelKeyframes.length - 1].time;
    const time = (renderFrameCount / totalRenderFrames) * totalDuration;
    
    
    positionModelAtTime(time);
    
    
    renderer.render(scene, camera);
    
    
    const canvas = renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');
    renderFrameCaptures.push(dataURL);
    
    
    renderFrameCount++;
    const progress = (renderFrameCount / totalRenderFrames) * 100;
    document.querySelector('.progress-bar-inner').style.width = `${progress}%`;
    document.querySelector('.loading-text').innerText = 
        `Rendering animation... ${renderFrameCount}/${totalRenderFrames} frames`;
    
    
    setTimeout(renderNextFrame, 10); 
}

function positionModelAtTime(time) {
    if (!model || modelKeyframes.length < 2) return;
    
    
    let currentKeyframe, nextKeyframe;
    let alpha;
    
    for (let i = 0; i < modelKeyframes.length - 1; i++) {
        if (time >= modelKeyframes[i].time && time < modelKeyframes[i + 1].time) {
            currentKeyframe = modelKeyframes[i];
            nextKeyframe = modelKeyframes[i + 1];
            alpha = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
            break;
        }
    }
    
    
    if (!currentKeyframe && time >= modelKeyframes[modelKeyframes.length - 1].time) {
        currentKeyframe = modelKeyframes[modelKeyframes.length - 1];
        nextKeyframe = modelKeyframes[modelKeyframes.length - 1];
        alpha = 0;
    }
    
    
    if (!currentKeyframe && time < modelKeyframes[0].time) {
        currentKeyframe = modelKeyframes[0];
        nextKeyframe = modelKeyframes[0];
        alpha = 0;
    }
    
    if (currentKeyframe && nextKeyframe) {
        
        model.position.lerpVectors(currentKeyframe.position, nextKeyframe.position, alpha);
        
        
        const q1 = new THREE.Quaternion().setFromEuler(currentKeyframe.rotation);
        const q2 = new THREE.Quaternion().setFromEuler(nextKeyframe.rotation);
        q1.slerp(q2, alpha);
        model.quaternion.copy(q1);
        
        
        model.scale.lerpVectors(currentKeyframe.scale, nextKeyframe.scale, alpha);
    }
}

function finishRendering() {
    renderingInProgress = false;
    
    
    if (renderSettings.format === 'gif') {
        createAnimatedGIF();
    } else if (renderSettings.format === 'webm' || renderSettings.format === 'mp4') {
        createVideo();
    } else {
        
        saveFramesAsZip();
    }
}

function createVideo() {
    
    const [width, height] = renderSettings.resolution.split('x').map(Number);
    
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    
    const stream = canvas.captureStream(renderSettings.fps);
    const options = {
        mimeType: renderSettings.format === 'webm' ? 'video/webm;codecs=vp9' : 'video/mp4',
        videoBitsPerSecond: renderSettings.quality === 'high' ? 5000000 : 
                           (renderSettings.quality === 'medium' ? 2500000 : 1000000)
    };
    
    try {
        const mediaRecorder = new MediaRecorder(stream, options);
        const chunks = [];
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            const blob = new Blob(chunks, { type: renderSettings.format === 'webm' ? 'video/webm' : 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `model-animation.${renderSettings.format}`;
            a.click();
            URL.revokeObjectURL(url);
            
            
            loadingOverlay.style.display = 'none';
            infoPanel.innerHTML = `Animation rendered as ${renderSettings.format.toUpperCase()} video!`;
        };
        
        
        mediaRecorder.start();
        
        
        let frameIndex = 0;
        
        function processFrame() {
            if (frameIndex >= renderFrameCaptures.length) {
                
                mediaRecorder.stop();
                return;
            }
            
            
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, width, height);
                frameIndex++;
                
                
                const progress = (frameIndex / renderFrameCaptures.length) * 100;
                document.querySelector('.progress-bar-inner').style.width = `${progress}%`;
                document.querySelector('.loading-text').innerText = 
                    `Creating video... ${frameIndex}/${renderFrameCaptures.length} frames`;
                
                
                setTimeout(processFrame, 1000 / renderSettings.fps);
            };
            img.src = renderFrameCaptures[frameIndex];
        }
        
        
        processFrame();
        
    } catch (err) {
        console.error('Error creating video:', err);
        
        infoPanel.innerHTML = `Video creation failed: ${err.message}. Falling back to ZIP.`;
        saveFramesAsZip();
        loadingOverlay.style.display = 'none';
    }
}

function createAnimatedGIF() {
    
    const [width, height] = renderSettings.resolution.split('x').map(Number);
    const gif = new GIF({
        workers: 2,
        quality: renderSettings.quality === 'high' ? 1 : 10,
        width: width,
        height: height,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js'
    });
    
    
    renderFrameCaptures.forEach(dataURL => {
        const img = document.createElement('img');
        img.src = dataURL;
        gif.addFrame(img, { delay: 1000 / renderSettings.fps });
    });
    
    
    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'model-animation.gif';
        a.click();
        URL.revokeObjectURL(url);
        
        
        loadingOverlay.style.display = 'none';
        infoPanel.innerHTML = `Animation rendered as GIF (${renderFrameCaptures.length} frames)`;
    });
    
    gif.render();
}

function saveFramesAsZip() {
    
    const zip = new JSZip();
    const folder = zip.folder("frames");
    
    renderFrameCaptures.forEach((dataURL, index) => {
        const base64Data = dataURL.replace("data:image/png;base64,", "");
        folder.file(`frame_${index.toString().padStart(6, '0')}.png`, base64Data, {base64: true});
    });
    
    zip.generateAsync({type: "blob"}).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation-frames.zip';
        a.click();
        URL.revokeObjectURL(url);
        
        
        loadingOverlay.style.display = 'none';
        infoPanel.innerHTML = `Animation rendered as ${renderFrameCaptures.length} frames (ZIP)`;
    });
}


function animate() {
    requestAnimationFrame(animate);
    
    
    if (renderingInProgress) return;
    
    controls.update();
    
    const delta = clock.getDelta();
    
    if (mixer && isPlaying) {
        mixer.update(delta * animationSpeed); 
    }
    
    
    if (cameraAnimating) {
        updateCameraAnimation();
    }
    
    
    if (modelAnimating) {
        updateModelAnimation();
    }
    
    
    if (transformControls.object) {
        transformControls.update();
    }
    
    
    updateCameraPreview();
    
    stats.update();
    renderer.render(scene, camera);
    
    
    if (cameraHelper) {
        cameraHelper.update();
    }
    
    
    if (cameraGrid) {
        
        cameraGrid.position.copy(camera.position);
        cameraGrid.lookAt(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3())));
        cameraGrid.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5));
    }
}

function updateCameraPreview() {
    if (!cameraPreviewRenderer || !cameraPreviewScene || !cameraPreviewCamera) return;
    
    
    const radius = 15;
    const theta = Math.PI / 4; 
    
    cameraPreviewCamera.position.x = radius * Math.sin(theta) * Math.cos(Date.now() * 0.0005);
    cameraPreviewCamera.position.z = radius * Math.sin(theta) * Math.sin(Date.now() * 0.0005);
    cameraPreviewCamera.position.y = radius * Math.cos(theta);
    
    cameraPreviewCamera.lookAt(0, 0, 0);
    
    
    updatePreviewSceneWithModels();
    
    
    cameraPreviewRenderer.render(cameraPreviewScene, cameraPreviewCamera);
}

function updatePreviewSceneWithModels() {
    
    cameraPreviewScene.children.forEach(child => {
        if (child.userData && child.userData.isModelRepresentation) {
            cameraPreviewScene.remove(child);
        }
    });
    
    
    loadedModels.forEach(modelItem => {
        const box = new THREE.Box3().setFromObject(modelItem.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.position.copy(center);
        boxMesh.userData.isModelRepresentation = true;
        
        cameraPreviewScene.add(boxMesh);
    });
}

document.getElementById('render-animation').addEventListener('click', renderAnimation);
document.getElementById('start-rendering').addEventListener('click', startRendering);
document.getElementById('cancel-rendering').addEventListener('click', function() {
    document.getElementById('render-dialog').style.display = 'none';
});

document.getElementById('add-model-keyframe').addEventListener('click', addModelKeyframe);
document.getElementById('play-model-animation').addEventListener('click', playModelAnimation);
document.getElementById('stop-model-animation').addEventListener('click', stopModelAnimation);


function adjustCameraFOV(value) {
    camera.fov = value;
    camera.updateProjectionMatrix();
    cameraHelper.update();
    
    
    updateCameraGrid();
}

function adjustCameraPosition(axis, value) {
    camera.position[axis] = value;
    camera.updateProjectionMatrix();
    cameraHelper.update();
}

function updateCameraGrid() {
    if (!cameraGrid) return;
    
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFOV / 2) * 5; 
    const width = height * camera.aspect;
    
    cameraGrid.scale.set(width, height, 1);
    cameraGrid.position.z = -5; 
}


function toggleCameraGrid(visible) {
    if (cameraGrid) {
        cameraGrid.visible = visible;
    }
}


document.getElementById('camera-fov').addEventListener('input', function(event) {
    adjustCameraFOV(parseInt(event.target.value));
    document.getElementById('fov-value').textContent = event.target.value + '°';
});

document.getElementById('toggle-camera-grid').addEventListener('change', function(event) {
    toggleCameraGrid(event.target.checked);
});

document.addEventListener('DOMContentLoaded', function() {
    
    init();
    
    
    if (!THREE.TransformControls || !THREE.DragControls) {
        console.error('Required controls not loaded. Make sure to include TransformControls.js and DragControls.js');
    }
});

document.getElementById('take-screenshot').addEventListener('click', takeScreenshot);
document.getElementById('toggle-edges').addEventListener('change', function(event) {
    toggleEdges(event.target.checked);
});
document.getElementById('reset-model').addEventListener('click', resetModelPosition);

function updateCameraAspectRatio(ratio) {
    const [width, height] = ratio.split(':').map(Number);
    const aspectRatio = width / height;
    
    
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
    
    
    if (cameraHelper) {
        cameraHelper.update();
    }
    
    
    if (cameraGrid) {
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * 5; 
        const width = height * aspectRatio;
        
        cameraGrid.scale.set(width, height, 1);
        cameraGrid.position.z = -5; 
    }
    
    
    cameraPreviewCamera.aspect = aspectRatio;
    cameraPreviewCamera.updateProjectionMatrix();
    
    
    const container = document.getElementById('viewer');
    const containerWidth = container.clientWidth;
    
    
    let newHeight;
    
    if (containerWidth / window.innerHeight > aspectRatio) {
        
        newHeight = window.innerHeight;
        renderer.setSize(newHeight * aspectRatio, newHeight);
    } else {
        
        newHeight = containerWidth / aspectRatio;
        renderer.setSize(containerWidth, newHeight);
    }
    
    
    document.getElementById('aspect-ratio-info').textContent = ratio;
}