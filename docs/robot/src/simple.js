
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

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.149.0/examples/jsm/loaders/OBJLoader.js';
import URDFLoader from 'https://unpkg.com/urdf-loader@0.10.4/src/URDFLoader.js';

let scene, camera, renderer, robot, controls, gui;

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

const homePosition = {
    "iiwa_base_joint": 0,
    "iiwa_joint_1": 0,
    "iiwa_joint_2": -40,
    "iiwa_joint_3": 0,
    "iiwa_joint_4": -90,
    "iiwa_joint_5": 0,
    "iiwa_joint_6": 40,
    "iiwa_joint_7": 0,
    "iiwa_joint_ee": 0,
    "tool0_joint": 0
};


init();
render();


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
  
    onResize();
    window.addEventListener('resize', onResize);
}

function setupControls(minDistance = 1.8) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = minDistance;
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enablePan = false;
    controls.enableZoom = false;
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


function loadRobot(initialPositions = null) {
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
  
    loader.loadMeshCb = function (path, manager, onComplete) {
      const objLoader = new OBJLoader(manager);
      objLoader.load(
        path,
        result => {
          onComplete(result);
        },
        undefined,
        err => {
          onComplete(null, err);
        }
      );
    };
  
    loader.load('src/urdf/iiwa.urdf', result => {
      robot = result;
    });
  
    manager.onLoad = () => {
        initializeRobot(initialPositions);
    };
}

function initializeRobot(jointPositions = null) {
    robot.rotation.x = - Math.PI / 2;
    robot.traverse(c => {
        c.castShadow = true;
    });

    if (jointPositions) {
        for (let jointName in jointPositions) {
            robot.joints[jointName].setJointValue(MathUtils.degToRad(jointPositions[jointName]));
        }
    } else {
        for (let jointname in robot.joints) {
            robot.joints[jointname].setJointValue(MathUtils.degToRad(0));
        }
    }

    robot.updateMatrixWorld(true);

    const bb = new Box3();
    bb.setFromObject(robot);

    robot.position.y -= bb.min.y;

    scene.add(robot);

    updateDisplay();
}


function updateDisplay() {
    if (fk == "true") {
        //addFKSliders();
        initGui();
        addFKSolution();
        updateLabel(getEEPos());
    }
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

// I think this method of changing the joint angles was interesting, but using the lil gui is cleaner and easier.
//
// function addFKSliders() {
//     // Create a container for sliders
//     const slidersContainer = document.createElement('div');
//     slidersContainer.style.position = 'absolute';
//     slidersContainer.style.top = '10px'; 
//     slidersContainer.style.left = '10px';
//     document.body.appendChild(slidersContainer);

//     // Create sliders for joint angles
//     const sliders = {};

//     for (let jointName in robot.joints) {
//         // Exclude specific joints from having sliders
//         if (jointName !== 'iiwa_base_joint' && jointName !== 'iiwa_joint_ee' && jointName !== 'tool0_joint') {
//             const jointSlider = document.createElement('input');
//             jointSlider.type = 'range';
//             jointSlider.min = -180; 
//             jointSlider.max = 180;  
//             jointSlider.value = 0;
//             jointSlider.step = 1;
//             jointSlider.addEventListener('input', function () {
//                 const angle = MathUtils.degToRad(parseFloat(this.value));
//                 robot.joints[jointName].setJointValue(angle);
//             });
//             sliders[jointName] = jointSlider;

//             // Create label for the slider
//             const label = document.createElement('label');
//             label.innerHTML = `${jointName}:`;
//             slidersContainer.appendChild(label);

//             // Append slider to the container
//             slidersContainer.appendChild(jointSlider);
//         }
//     }

//     // Render the scene when sliders are released
//     slidersContainer.addEventListener('mouseup', function () {
//         render();
//         updateLabel(getEEPos());
//     });
// }

function getEEPos() {
    // Get joint angles
    const jointAngles = Array.from({ length: 7 }, (_, i) => robot.joints[`iiwa_joint_${i + 1}`].angle);

    // Update theta values in DH parameters
    dhParameters.forEach((param, i) => param.theta = jointAngles[i]);

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

function initGui() {
    gui = new GUI();
    gui.title("joint angles");

    // Add input fields for robot DH parameters
    for (let i = 0; i < dhParameters.length; i++) {
        let labelname = `joint ${i} angle`;
        let guiObject = {};
        guiObject[labelname] = dhParameters[i].theta;
    
        gui.add(guiObject, labelname, -180, 180, 0.1).onChange((value) => {
            dhParameters[i].theta = value;
    
            const jointName = `iiwa_joint_${i + 1}`;
            const angle = MathUtils.degToRad(parseFloat(value));
            robot.joints[jointName].setJointValue(angle);
    
            updateLabel(getEEPos());
        });
    }
}

function init() {
    let initialPositions = homePosition
    let minViewDistance = 1.4
    if (fk == 'true'){
        initialPositions = null;
        minViewDistance = 2.0
    } 

    setupScene();
    setupControls(minViewDistance);
    setupLights();
    loadRobot(initialPositions);


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

render();