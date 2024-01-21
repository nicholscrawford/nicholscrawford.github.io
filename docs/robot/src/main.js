
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

import { RobotMathModel } from './robot.js';
import { createAxes, createLineSegment, addCircle, removeCircle } from './view.js';

export let scene, camera, renderer, robot_view_model, robot_math_model, controls, gui;

let x = 0;
let y = 0;
let z = 0.6;

const urlParams = new URLSearchParams(window.location.search);
const settings = {
    gui: urlParams.get('gui') === 'true',
    fk: urlParams.get('fk') === 'true',
    sm: urlParams.get('sm') === 'true',
    settings: urlParams.get('settings') !== 'false',
    // ik: urlParams.get('ik') === 'true',
    debug: urlParams.get('debug') === 'true',
    circlevis: urlParams.get('circlevis') === 'true',
    transrobot: urlParams.get('transrobot') === 'true',
    startpose: urlParams.get('startpose') || 'zero'
};

// const dhParameters = [
//     { alpha: -Math.PI / 2, a: 0, d: 0.340, theta: 0 },
//     { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
//     { alpha: Math.PI / 2, a: 0, d: 0.400, theta: 0 },
//     { alpha: -Math.PI / 2, a: 0, d: 0, theta: 0 },
//     { alpha: -Math.PI / 2, a: 0, d: 0.400, theta: 0 },
//     { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
//     { alpha: 0, a: 0, d: 0.126, theta: 0 }
// ]; 

// const homePosition = {
//     "iiwa_base_joint": 0,
//     "iiwa_joint_1": 0,
//     "iiwa_joint_2": -40,
//     "iiwa_joint_3": 0,
//     "iiwa_joint_4": -90,
//     "iiwa_joint_5": 0,
//     "iiwa_joint_6": 40,
//     "iiwa_joint_7": 0,
//     "iiwa_joint_ee": 0,
//     "tool0_joint": 0
// };


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

function loadRobot() {
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
  
    loader.loadMeshCb = function (path, manager, onComplete) {
      const objLoader = new OBJLoader(manager);
      objLoader.load(
        path,
        result => {
          onComplete(result.children[0]);
        },
        undefined,
        err => {
          onComplete(null, err);
        }
      );
    };
  
    loader.load('src/urdf/iiwa.urdf', result => {
        robot_view_model = result;
    });
    
    manager.onLoad = () => {
        initializeRobot();
        updateDisplay();
    };
}

function initializeRobot() {
    robot_math_model = new RobotMathModel(robot_view_model);
    
    
    
    // This is to deal with the y-up three.js convention.
    robot_view_model.rotation.x = - Math.PI / 2;
    robot_view_model.traverse(child => {
        child.castShadow = true;
    });
    
    // The robot has to be initially set to transparent if it ever will be made transparent in the future, though opacity can be set to 1.
    robot_view_model.traverse((child) => {
        if (child instanceof Mesh) {
        child.material.transparent = true;
        child.material.opacity = 1 - 0.5 * settings.transrobot;
        }
    });

    robot_math_model.setPose(settings.startpose);

    robot_view_model.updateMatrixWorld(true);

    const bb = new Box3();
    bb.setFromObject(robot_view_model);

    robot_view_model.position.y -= bb.min.y; // Places the robot on the ground plane

    scene.add(robot_view_model);
}

function updateDisplay() {
    const solutionContainer = document.createElement('div');
    solutionContainer.style.position = 'absolute';
    solutionContainer.style.top = '15px'; 
    solutionContainer.style.left = '15px';
    document.body.appendChild(solutionContainer);

    if(settings.gui){
        initGui();
    }
    if (settings.fk) {
        addFKSolution(solutionContainer);
        updateFKLabel(robot_math_model.getEEPos());
    }
    if (settings.sm){
        addSMSolution(solutionContainer);
        updateGCLabel(robot_math_model.getGC());
        updatePsiLabel(robot_math_model.getPsi());        
    }
    if (settings.circlevis){
        addCircle(math.flatten(robot_math_model.get2p6()), math.flatten(robot_math_model.get0p2()), math.flatten(robot_math_model.getShoulderElbow()));
    } else {
        removeCircle();
    }
}


function addFKSolution(container) {
    // Create label for the solution
    const label = document.createElement('p');
    // Set an id for the label so it can be easily targeted
    label.id = 'fkLabel';
    label.innerHTML = `End effector position: <span id="fkValue"></span>`;
    container.appendChild(label);
}

function addSMSolution(container) {
    // Create label for the solution
    const label = document.createElement('p');
    // Set an id for the label so it can be easily targeted
    label.id = 'smLabel';
    label.innerHTML = `Self Motion Parameters: Arm Angle ψ: <span id="psi"></span> Global Configuration 2, 4, 6: <span id="globalconf"></span> `;
    container.appendChild(label);
}

function updateFKLabel(newValue) {
    // Get the label element by id
    const label = document.getElementById('fkValue');
    if (label) {
        // Update the innerHTML with the new value
        label.innerHTML = newValue;
    }
}

function updatePsiLabel(newValue) {
    // Get the label element by id
    const label = document.getElementById('psi');
    if (label) {
        // Update the innerHTML with the new value
        label.innerHTML = newValue;
    }
}

function updateGCLabel(newValue) {
    // Get the label element by id
    const label = document.getElementById('globalconf');
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


function initGui() {
    gui = new GUI();
    gui.title("joint angles");

    // Add input fields for robot DH parameters
    for (let i = 0; i < robot_math_model.dhParameters.length; i++) {
        let labelname = `joint ${i + 1} angle`;
        let guiObject = {};
        guiObject[labelname] = robot_math_model.dhParameters[i].theta * 180 / Math.PI;
    
        const jointName = `iiwa_joint_${i + 1}`;
        gui.add(guiObject, labelname, robot_view_model.joints[jointName].limit.lower * 180 / Math.PI, robot_view_model.joints[jointName].limit.upper * 180 / Math.PI, 0.1).onChange((value) => {
            
            robot_math_model.setJointPosDeg(i, value);
            updateFKLabel(robot_math_model.getEEPos());
            if (settings.sm){
                updateGCLabel(robot_math_model.getGC());
                updatePsiLabel(robot_math_model.getPsi());
            }
            if (settings.circlevis){
                addCircle(math.flatten(robot_math_model.get2p6()), math.flatten(robot_math_model.get0p2()), math.flatten(robot_math_model.getShoulderElbow()));
            }
        });
    }

    if(settings.settings){
        // Create a settings folder
        const settingsFolder = gui.addFolder('settings');

        // Add GUI element for circle visualization inside the settings folder
        let circleVisibility = { 'redundancy circle visualization': settings.circlevis };
        settingsFolder.add(circleVisibility, 'redundancy circle visualization').onChange((value) => {
            // Handle circle visibility change
            settings.circlevis = value;
            if(settings.circlevis){    
                addCircle(math.flatten(robot_math_model.get2p6()), math.flatten(robot_math_model.get0p2()), math.flatten(robot_math_model.getShoulderElbow()));
            } else {
                removeCircle();
            }

        });

        // Add GUI element for robot transparency inside the settings folder
        let robotTransparency = { 'transparent robot': settings.transrobot };
        settingsFolder.add(robotTransparency, 'transparent robot').onChange((value) => {
            settings.transrobot = value;

            // Handle robot transparency change
            set_robot_transparancy(settings.transrobot);
        });
    }
}

function set_robot_transparancy(make_transparent){
    robot_view_model.traverse((child) => {
        if (child instanceof Mesh) {
        child.material.opacity = 1 - 0.5 * make_transparent;
        }
    });
}

function init() {
    // let initialPositions = homePosition
    let minViewDistance = 1.4
    if (settings.fk){
        // initialPositions = null;
        minViewDistance = 2.0
    } 

    setupScene();
    setupControls(minViewDistance);
    setupLights();
    loadRobot();

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