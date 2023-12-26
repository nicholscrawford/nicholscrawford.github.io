import * as THREE from 'three';

import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneBufferGeometry,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    MathUtils,
} from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GPUStatsPanel } from 'three/addons/utils/GPUStatsPanel.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import * as GeometryUtils from 'three/addons/utils/GeometryUtils.js';


let scene, camera, renderer, controls, gui;
let robot = [];
let axes = []
let visible_axes = false

const urlParams = new URLSearchParams(window.location.search);
const fk = urlParams.get('fk');
const dhParameters = [
    { alpha: -Math.PI / 2, a: 0, d: 0.340, theta: 0 },
    { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
    { alpha: Math.PI / 2, a: 0, d: 0.400, theta: 0 },
    { alpha: -Math.PI / 2, a: 0, d: 0, theta: 0 },
    { alpha: -Math.PI / 2, a: 0, d: 0.400, theta: 0 },
    { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
    { alpha: 0, a: 0, d: 0.126, theta: 0 }
]; 

const dhParameterOptions = [
    { alpha: Math.PI / 2, a: 0, d: 0.400, theta: 0 },
    { alpha: -Math.PI / 2, a: 0, d: 0.400, theta: 0 },
    { alpha: Math.PI / 2, a: 0, d: 0.100, theta: 0 },
    { alpha: -Math.PI / 2, a: 0, d: 0.100, theta: 0 },
    { alpha: Math.PI / 2, a: 0, d: 0.00, theta: 0 },
    { alpha: -Math.PI / 2, a: 0, d: 0, theta: 0 }
  
];

init();
render();

function createAxes() {
    const group = new THREE.Group();
    // Add origin
    const originGeometry = new THREE.SphereGeometry(0.005);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const origin = new THREE.Mesh(originGeometry, originMaterial);

    // Add x-axis arrow
    const xAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.2, 0xff0000);

    // Add y-axis arrow
    const yAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.2, 0x00ff00);

    // Add z-axis arrow
    const zAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.2, 0x0000ff);

    group.add(origin);
    group.add(xAxisArrow);
    group.add(yAxisArrow);
    group.add(zAxisArrow);

    return group;
}

function setupScene() {
    scene = new Scene();
    scene.background = new Color(0xFFDBCD);
  
    camera = new PerspectiveCamera();
    camera.position.set(0.5, 0.4, 0.5);
    camera.lookAt(0, 0, 0);
  
    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
  
    const ground = new Mesh(new PlaneBufferGeometry(), new ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    scene.add(ground);
    
    scene.add(createAxes());
    
    onResize();
    window.addEventListener('resize', onResize);
}

function addRobotToScene() {
    const rlen = robot.length;
    for (let i = 0; i < rlen; i++) {
        scene.remove(robot.pop());
    }

    const alen = axes.length;
    for (let i = 0; i < alen; i++) {
        scene.remove(axes.pop());
    }
    
    var pastMatrix = new THREE.Matrix4().makeTranslation(0, 0, 0);

    // Iterate over DH parameters
    for (let i = 0; i < dhParameters.length; i++) {
        let { alpha, a, d, theta } = dhParameters[i];

        // −1Ti = Trans(di i−1zi−1)Rot(Rz (θi))Trans(ai ixi)Rot(Rx(αi)) 
        const translationZMatrix = new THREE.Matrix4().makeTranslation(0, 0, d); // Translate d along z_{i-1}
        const rotationZMatrix = new THREE.Matrix4().makeRotationZ(theta); // Rotate around z by theta
        const translationXMatrix = new THREE.Matrix4().makeTranslation(a, 0, 0); // Translate a along x_i
        const rotationXMatrix = new THREE.Matrix4().makeRotationX(alpha); // Rotate around x by alpha
        
        const homogMatrix = new THREE.Matrix4().multiplyMatrices(pastMatrix, translationZMatrix).multiply(rotationZMatrix).multiply(translationXMatrix).multiply(rotationXMatrix);
        
        // Create a cylinder representing the joint axis
        const jointAxisGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 32);
        const jointAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xb83b0d });
        const jointAxisMesh = new THREE.Mesh(jointAxisGeometry, jointAxisMaterial);
        jointAxisMesh.rotation.x = Math.PI / 2; // Rotate around x-axis to align with z-axis
        jointAxisMesh.position.set(0, 0, 0);
        jointAxisMesh.applyMatrix4(homogMatrix);
        scene.add(jointAxisMesh);
        robot.push(jointAxisMesh);

        //Add axis representing the tf
        let axisGroup = createAxes();
        axisGroup.applyMatrix4(homogMatrix);
        axisGroup.visible = visible_axes;
        axes.push(axisGroup);
        scene.add(axisGroup);

        // Create a line representing the link
        const points = [];
        const colors = [];
        // Extract translation components
        const xTranslation = pastMatrix.elements[12];
        const yTranslation = pastMatrix.elements[13];
        const zTranslation = pastMatrix.elements[14];
        // Push the extracted components to the points array
        points.push(xTranslation, yTranslation, zTranslation);

        // Extract translation components
        const xTranslation2 = homogMatrix.elements[12];
        const yTranslation2 = homogMatrix.elements[13];
        const zTranslation2 = homogMatrix.elements[14];
        // Push the extracted components to the points array
        points.push(xTranslation2, yTranslation2, zTranslation2);

        colors.push(92/255, 162/255, 171/255);
        colors.push(92/255, 162/255, 171/255);

        const geometry = new LineGeometry();
        geometry.setPositions( points );
        geometry.setColors( colors );

        let matLine = new LineMaterial( {

            color: 0xFFFFFF,
            linewidth: 0.002,
            vertexColors: true,
            dashed: false,
            alphaToCoverage: true,
        } );
        
        const line = new Line2( geometry, matLine );
        line.computeLineDistances();
        line.scale.set( 1, 1, 1 );
        scene.add(line);
        robot.push(line);
        pastMatrix = homogMatrix;
    }

}




function setupControls(minDistance = 1.8) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = minDistance;
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enablePan = false;
    controls.enableZoom = true;
    //controls.maxPolarAngle = Math.PI / 2;
    controls.target.y = 0.5;
    controls.update();
}

function setupLights() {
    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(-5, 30, -5);
    scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
}



function addFKSolution() {
    // Create a container for fk solution
    const fkContainer = document.createElement('div');
    fkContainer.style.position = 'absolute';
    fkContainer.style.top = '15px'; 
    fkContainer.style.left = '15px';
    document.body.appendChild(fkContainer);

    // Create label for the solution
    const label = document.createElement('label');
    // Set an id for the label so it can be easily targeted
    label.id = 'fkLabel';
    label.innerHTML = `End effector position: <span id="fkValue">Drag the sliders to update!</span>`;
    fkContainer.appendChild(label);
}

function updateLabel(newValue) {
    // Get the label element by id
    const label = document.getElementById('fkValue');
    if (label) {
        // Update the innerHTML with the new value
        label.innerHTML = newValue;
    }
}

function getEEPos() {
    // Forward kinematics
    let T = math.identity(4); // Initialize transformation matrix

    for (const { alpha, a, d, theta } of dhParameters) {
        const [cosTheta, sinTheta, cosAlpha, sinAlpha] = [Math.cos(theta), Math.sin(theta), Math.cos(alpha), Math.sin(alpha)];

        // Update transformation matrix
        const A = math.matrix([
            [cosTheta, -sinTheta * cosAlpha, sinTheta * sinAlpha, a * cosTheta],
            [sinTheta, cosTheta * cosAlpha, -cosTheta * sinAlpha, a * sinTheta],
            [0, sinAlpha, cosAlpha, d],
            [0, 0, 0, 1]
        ]);

        T = math.multiply(T, A);
    }

    // Extract end-effector position with precision of 2 decimal places
    const endEffectorPos = [T.get([0, 3]).toFixed(2), T.get([1, 3]).toFixed(2), T.get([2, 3]).toFixed(2)];

    return endEffectorPos.map(parseFloat); // Convert strings to numbers
}

function init() {
    let minViewDistance = 1.4

    setupScene();
    setupControls(minViewDistance);
    setupLights();
    addRobotToScene();
    addFKSolution();
    updateLabel(getEEPos());
    initGui();
    document.body.style.display = 'flex';
    document.body.style.flexDirection = 'column';
    document.body.style.alignItems = 'center';

}

function onResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

}

function render() {

    requestAnimationFrame(render);
    renderer.render(scene, camera);

}

// Function to randomly choose DH parameters
function getRandomDHParameters() {
    var randomIndex = Math.floor(Math.random() * dhParameterOptions.length);
    return dhParameterOptions[randomIndex];
}

function initGui(numJoints = 7) {
    gui = new GUI();
    gui.title("controls");

    const param = {
        'number of joints': dhParameters.length,
        'show axes': visible_axes,

    };
    
    // Input field to adjust the number of joints
    gui.add(param, 'number of joints', 1, 10, 1).onChange(function (value) {
        // Update the number of joints and regenerate the GUI
        numJoints = value;

        if(dhParameters.length >= numJoints){
            while(dhParameters.length != numJoints){
                dhParameters.pop();
            }
        } else {
            while(dhParameters.length != numJoints){
                dhParameters.push(getRandomDHParameters());
            }
        }

        regenerateGUI(numJoints);
    });

    gui.add(param, 'show axes').onChange(function (value) {
        // Update the number of joints and regenerate the GUI
        visible_axes = value;
        for(let i = 0; i < axes.length; i++){
            axes[i].visible = value;
        }
    });

    // Add input fields for robot DH parameters
    const jointfolder = gui.addFolder(`joint parameters`);
    jointfolder.close();

    for (let i = 0; i < numJoints; i++) {
        const folder = jointfolder.addFolder(`joint ${i + 1} parameters`);

        if (i < dhParameters.length) {
            folder.add(dhParameters[i], 'theta', -3.1416, 3.1416, 0.0001).onChange((value) => {
                dhParameters[i].theta = value;
                updateRobot();
            });

            folder.add(dhParameters[i], 'd').onChange((value) => {
                dhParameters[i].d = value;
                updateRobot();
            });

            folder.add(dhParameters[i], 'a').onChange((value) => {
                dhParameters[i].a = value;
                updateRobot();
            });

            folder.add(dhParameters[i], 'alpha', -3.1416, 3.1416, 0.0001).onChange((value) => {
                dhParameters[i].alpha = value;
                updateRobot();
            });
        }

        folder.close();
    }



    // Function to regenerate the GUI based on the number of joints
    function regenerateGUI(numJoints = 7) {
        gui.destroy();
        initGui(numJoints);
        // Update the robot based on the new parameters
        updateRobot();
    }
    // Function to handle changes in robot parameters
    function updateRobot() {
        // Update robot based on DH parameters
        // console.log('Robot parameters updated:', dhParameters);
        addRobotToScene();
        updateLabel(getEEPos());
    }
}


render();