import * as THREE from 'three';
import { OrbitControls } from "three/addons";
import { startSplatViewer, updateCameraMatrix, getContext } from "./src/Splatting.js";
import { remapCurveEaseOut2, mix, clamp } from './src/mathUtils.js';

let camera, scene, renderer;
let geometry, material, mesh;
let controls;

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
    })

    document.addEventListener('keydown', (e) => {
        if (e.key === 'f') {
            let position = camera.position;
            let target = controls.target;
            console.log(position, target);
            console.log(getCameraAngleAndDistance(position, target));
        }
    })

    let tStart = 0;
    let tEnd = 1;
    let t = tStart;
    document.addEventListener('wheel', (e) => {
        // console.log(e.deltaY);
        let actualT = remapCurveEaseOut2(t, tStart, tEnd, 0, 1, 2);
        let azimuthalAngle = mix(azimuthalAngleStart, azimuthalAngleEnd, actualT);
        let polarAngle = mix(polarAngleStart, polarAngleEnd, actualT);
        let cameraTargetDistance = mix(cameraTargetDistanceStart, cameraTargetDistanceEnd, actualT);
        let camTargetPos = new THREE.Vector3().lerpVectors(camTargetPosStart, camTargetPosEnd, actualT);
        let camPos = getCameraPosition(azimuthalAngle, polarAngle, cameraTargetDistance, camTargetPos);

        // update camera position
        updateCameraAndControls(camPos, camTargetPos);
        // update gl uAnimateTime
        let {gl, program} = getContext();
        if (gl !== null && program !== null) {
            // console.log(t)
            gl.uniform1f(gl.getUniformLocation(program, "uAnimateTime"), t);
        }

        t += clamp(e.deltaY, -5, 5) / 1000;
        t = clamp(t, tStart, tEnd);
    })
}

// {distance: 2.18548886703139, polarAngle: 1.109906013934148, azimuthalAngle: 0.7605214144197971}
let camTargetPosStart = new THREE.Vector3(0, 0, 0);
let camTargetPosEnd = new THREE.Vector3(-0.08, 0, 0.5);
let azimuthalAngleStart = -0.7605214144197971;
let azimuthalAngleEnd = -Math.PI;
let polarAngleStart = 1.109906013934148;
let polarAngleEnd = 0.8;
let cameraTargetDistanceStart = 2.18548886703139;
let cameraTargetDistanceEnd = 0.01;

function getCameraPosition(azimuthalAngle, polarAngle, distance, target) {
    const x = distance * Math.sin(polarAngle) * Math.sin(azimuthalAngle);
    const y = distance * Math.cos(polarAngle);
    const z = distance * Math.sin(polarAngle) * Math.cos(azimuthalAngle);

    return new THREE.Vector3(
        target.x + x,
        target.y + y,
        target.z + z
    );
}
let camPosStart = getCameraPosition(azimuthalAngleStart, polarAngleStart, cameraTargetDistanceStart, camTargetPosStart);

function updateCameraAndControls(position, targetPosition) {
    camera.position.copy(position);
    camera.lookAt(targetPosition);
}

function getCameraAngleAndDistance(position, target) { // return azimuthal & polar angles, and distance
    let v = new THREE.Vector3().subVectors(position, target);
    let distance = v.length();
    let polarAngle = Math.acos(v.y / distance);
    let azimuthalAngle = Math.acos(v.z / (distance * Math.sin(polarAngle)));
    return {
        distance,
        polarAngle,
        azimuthalAngle
    };
}

function init() {
    // renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    let canvas_parent_div = document.querySelector('#canvas-container');
    canvas_parent_div.style.position = 'absolute';
    canvas_parent_div.style.zIndex = '2';
    canvas_parent_div.appendChild(renderer.domElement);

    // scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.copy(camPosStart);
    camera.lookAt(camTargetPosStart);
    // camera.position.set(2, 2, 2);
    // camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    // lighting
    const light = new THREE.AmbientLight(0x404040, 10);
    scene.add(light);
    const light2 = new THREE.PointLight(0x404040, 1000, 100);
    light2.position.set(1, 2.5, 5);
    scene.add(light2);

    // mesh
    let meshSize = 0.1;
    geometry = new THREE.BoxGeometry(meshSize, meshSize, meshSize);
    material = new THREE.MeshStandardMaterial({color: 0x0000ff});
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(camTargetPosEnd);
    // scene.add(mesh);

    // scene.add(new THREE.AxesHelper());

    // start splat viewer
    startSplatViewer().catch((err) => {
        document.getElementById("spinner").style.display = "none";
        console.log(err);
    });

    // orbit control
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    setupEventListeners();
}

function animate() {
    requestAnimationFrame(animate);

    camera.updateMatrixWorld(true);
    let m = camera.matrixWorld.clone().elements;
    updateCameraMatrix(m);

    renderer.render(scene, camera);

}

init();
animate();