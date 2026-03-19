// ==========================================
// THE EVIDENCE ROOM - Escape Game Prototype
// ==========================================

// Variables globales
let scene, camera, renderer;
let flashlight, ambientLight;
let floor;
let evidenceCubes = [];
let raycaster, mouse;
let targetPosition = null;
let isMoving = false;
let capturedCount = 0;
let totalEvidence = 5;
let clock = new THREE.Clock();
let gameTime = 300; // 5 minutes en secondes
let hoveredCube = null;

// Initialisation
function init() {
    // 1. Création de la scène
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 5, 30);

    // 2. Création de la caméra
    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);

    // 3. Création du renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Lumière d'ambiance (très faible, bleu froid)
    ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);

    // 5. Lampe torche (SpotLight attachée à la caméra)
    flashlight = new THREE.SpotLight(0xffffff, 2);
    flashlight.position.set(0, 0, 0);
    flashlight.angle = Math.PI / 6;
    flashlight.penumbra = 0.3;
    flashlight.decay = 2;
    flashlight.distance = 30;
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    
    // Cible de la lampe torche
    flashlight.target.position.set(0, 0, -10);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera);

    // 6. Création du sol
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "floor";
    scene.add(floor);

    // Grille au sol pour référence
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 7. Génération des preuves (cubes)
    generateEvidence();

    // 8. Raycaster pour les interactions
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 9. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('dblclick', onDoubleClick, false);
    document.addEventListener('click', onClick, false);

    // 10. Démarrer la boucle de rendu et le timer
    animate();
    startTimer();
}

// Génération des preuves (cubes aléatoires)
function generateEvidence() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    
    for (let i = 0; i < totalEvidence; i++) {
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({
            color: colors[i],
            roughness: 0.3,
            metalness: 0.5,
            emissive: 0x000000,
            emissiveIntensity: 0
        });
        
        const cube = new THREE.Mesh(geometry, material);
        
        // Position aléatoire sur le sol
        const x = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 30;
        
        cube.position.set(x, 0.4, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData = { 
            id: i, 
            isEvidence: true,
            originalColor: colors[i],
            isCaptured: false
        };
        
        scene.add(cube);
        evidenceCubes.push(cube);
    }
}

// Gestion du mouvement de la souris (lampe torche)
function onMouseMove(event) {
    // Normaliser les coordonnées de la souris (-1 à +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Faire pivoter la cible de la lampe torche selon la souris
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(20));
    
    flashlight.target.position.copy(pos);
    flashlight.target.updateMatrixWorld();

    // Vérifier si un cube est éclairé
    checkIlluminatedCube();
}

// Vérifier quel cube est éclairé par la lampe torche
function checkIlluminatedCube() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); // Centre de l'écran
    
    const intersects = raycaster.intersectObjects(evidenceCubes.filter(c => !c.userData.isCaptured));
    
    // Réinitialiser le cube précédemment survolé
    if (hoveredCube && (!intersects.length || intersects[0].object !== hoveredCube)) {
        hoveredCube.material.emissive.setHex(0x000000);
        hoveredCube.material.emissiveIntensity = 0;
        hoveredCube = null;
        document.body.style.cursor = 'default';
    }

    // Nouveau cube éclairé
    if (intersects.length > 0) {
        const cube = intersects[0].object;
        if (cube !== hoveredCube) {
            hoveredCube = cube;
            // Faire briller le cube (effet de feedback)
            hoveredCube.material.emissive.setHex(0x444444);
            hoveredCube.material.emissiveIntensity = 0.5;
            document.body.style.cursor = 'pointer';
        }
    }
}

// Double-clic : déplacement sur rails
function onDoubleClick(event) {
    if (isMoving) return;

    // Raycaster pour détecter le sol
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        // Garder la hauteur de la caméra, déplacer seulement sur X et Z
        targetPosition = new THREE.Vector3(point.x, camera.position.y, point.z);
        isMoving = true;
    }
}

// Clic simple : capture d'objet
function onClick(event) {
    if (hoveredCube && !hoveredCube.userData.isCaptured) {
        captureEvidence(hoveredCube);
    }
}

// Animation de capture d'une preuve
function captureEvidence(cube) {
    cube.userData.isCaptured = true;
    capturedCount++;
    
    // Animation de rotation et disparition
    const startY = cube.position.y;
    const startTime = Date.now();
    const duration = 600; // ms

    function animateCapture() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Rotation rapide
            cube.rotation.y += 0.3;
            cube.rotation.x += 0.2;
            
            // Montée et rétrécissement
            cube.position.y = startY + Math.sin(progress * Math.PI) * 3;
            const scale = 1 - progress;
            cube.scale.set(scale, scale, scale);
            
            requestAnimationFrame(animateCapture);
        } else {
            // Supprimer de la scène
            scene.remove(cube);
            // Mettre à jour l'UI
            document.getElementById('evidence-count').textContent = capturedCount;
            
            // Vérifier victoire
            if (capturedCount === totalEvidence) {
                setTimeout(() => {
                    alert('🎉 Félicitations ! Vous avez trouvé toutes les preuves !');
                }, 500);
            }
        }
    }
    
    animateCapture();
}

// Redimensionnement de la fenêtre
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Timer du jeu
function startTimer() {
    const timerElement = document.getElementById('timer');
    
    const timerInterval = setInterval(() => {
        gameTime--;
        
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Alertes visuelles quand le temps diminue
        if (gameTime === 60) {
            timerElement.style.color = '#ff8800';
        } else if (gameTime === 30) {
            timerElement.style.color = '#ff0000';
            timerElement.style.animation = 'pulse 1s infinite';
        }
        
        // Game Over
        if (gameTime <= 0) {
            clearInterval(timerInterval);
            alert('⏰ Temps écoulé ! Game Over.');
            location.reload();
        }
    }, 1000);
}

// Animation principale
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();

    // Déplacement fluide de la caméra (lerp)
    if (isMoving && targetPosition) {
        const speed = 3 * delta;
        camera.position.lerp(targetPosition, speed);
        
        // Vérifier si on est arrivé à destination
        if (camera.position.distanceTo(targetPosition) < 0.1) {
            isMoving = false;
            targetPosition = null;
        }
    }

    // Animation flottante des cubes non-capturés
    const time = Date.now() * 0.001;
    evidenceCubes.forEach((cube, index) => {
        if (!cube.userData.isCaptured) {
            cube.position.y = 0.4 + Math.sin(time + index) * 0.1;
            cube.rotation.y += 0.01;
        }
    });

    // Mise à jour de la cible de la lampe torche
    flashlight.target.updateMatrixWorld();

    renderer.render(scene, camera);
}

// Démarrer le jeu
init();