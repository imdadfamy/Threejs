import * as THREE from 'three';

const canvas = document.querySelector('.webgl');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight, 
    0.1,
    1000,
);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(window.innerWidth, window.innerHeight);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({color: "red"});
renderer.render(scene, camera);

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

renderer.render(scene, camera);

resizeBy(camera, renderer);

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();

const group = new THREE.Group();
group.position.x = -2;
group.rotation.x = Math.PI /4;
scene.add(group);

const greenMaterial = new THREE.MeshBasicMaterial({color: "green"});
const blueMaterial = new THREE.MeshBasicMaterial({color: "blue"});
const leftCube = new THREE.Mesh(geometry, greenMaterial);
leftCube.position.x = -2;
const rightCube = new THREE.Mesh(geometry, blueMaterial);
rightCube.position.x = 4;
const topCube = new THREE.Mesh(geometry, blueMaterial);
topCube.position.x = -2;
group.add(rightCube);
group.add(leftCube);
group.add(topCube);

function animateGroup() {
    requestAnimationFrame(animateGroup);
    group.rotation.y += 0.01;
    group.rotation.x += 0.03;
    renderer.render(scene, camera);
}
animateGroup();
camera.lookAt(group.position);