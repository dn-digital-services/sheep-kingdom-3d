// 1. SETUP SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7bed9f);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// GROUND
const groundGeo = new THREE.PlaneGeometry(12, 12);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x2ed573 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 2. LOAD 3D MODEL
const sheepList = [];
const loader = new THREE.GLTFLoader();

// Online Model File URL
const MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'; 

let baseModel = null;

function spawnSheep(x, z, rotationY) {
    if (!baseModel) return;

    const sheep = baseModel.clone();
    sheep.position.set(x, 0, z);
    sheep.rotation.y = rotationY;
    sheep.scale.set(0.8, 0.8, 0.8);

    sheep.userData = {
        isMoving: false,
        forwardVector: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
    };

    scene.add(sheep);
    sheepList.push(sheep);
}

loader.load(
    MODEL_URL,
    (gltf) => {
        baseModel = gltf.scene;

        // Level Layout
        spawnSheep(0, 0, 0);
        spawnSheep(0, 2, Math.PI);
        spawnSheep(-2, 0, Math.PI / 2);
        spawnSheep(2, 0, -Math.PI / 2);

        document.getElementById('sheep-count').innerText = sheepList.length;
    },
    undefined,
    (err) => console.error(err)
);

// 3. TAP TO MOVE
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sheepList, true);

    if (intersects.length > 0) {
        let clickedObj = intersects[0].object;
        while (clickedObj.parent && clickedObj.parent !== scene) {
            clickedObj = clickedObj.parent;
        }
        tryMoveSheep(clickedObj);
    }
});

// 4. ESCAPE / BUMP LOGIC
function tryMoveSheep(sheep) {
    if (sheep.userData.isMoving) return;

    const dir = sheep.userData.forwardVector.clone();

    let isBlocked = false;
    for (let other of sheepList) {
        if (other === sheep) continue;
        const dist = sheep.position.clone().add(dir).distanceTo(other.position);
        if (dist < 1.3) {
            isBlocked = true;
            break;
        }
    }

    if (isBlocked) {
        sheep.userData.isMoving = true;
        const startPos = sheep.position.clone();
        const bumpPos = startPos.clone().add(dir.clone().multiplyScalar(0.3));

        let t = 0;
        const bumpInterval = setInterval(() => {
            t += 0.1;
            if (t <= 0.5) {
                sheep.position.lerpVectors(startPos, bumpPos, t * 2);
            } else if (t <= 1) {
                sheep.position.lerpVectors(bumpPos, startPos, (t - 0.5) * 2);
            } else {
                sheep.position.copy(startPos);
                sheep.userData.isMoving = false;
                clearInterval(bumpInterval);
            }
        }, 20);
    } else {
        sheep.userData.isMoving = true;
        const escapeInterval = setInterval(() => {
            sheep.position.add(dir.clone().multiplyScalar(0.2));

            if (sheep.position.length() > 15) {
                clearInterval(escapeInterval);
                scene.remove(sheep);
                const index = sheepList.indexOf(sheep);
                if (index > -1) sheepList.splice(index, 1);

                const remaining = sheepList.length;
                document.getElementById('sheep-count').innerText = remaining;

                if (remaining <= 0) {
                    document.getElementById('win-screen').classList.remove('hidden');
                }
            }
        }, 20);
    }
}

// 5. RENDER LOOP
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

