
import {OrbitControls} from 'https://unpkg.com/three@0.149.0/examples/jsm/controls/OrbitControls.js'
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
} from 'https://unpkg.com/three@0.149.0/build/three.module.js';

import { OBJLoader } from 'https://unpkg.com/three@0.149.0/examples/jsm/loaders/OBJLoader.js'
import URDFLoader from 'https://unpkg.com/urdf-loader@0.10.4/src/URDFLoader.js';

let scene, camera, renderer, robot, controls;

init();
render();

function init() {

    scene = new Scene();
    scene.background = new Color(0xFFDBCD);

    camera = new PerspectiveCamera();
    camera.position.set(3, 1, 3);
    camera.lookAt(0, 0, 0);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(-5, 30, -5);
    scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const ground = new Mesh(new PlaneBufferGeometry(), new ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    scene.add(ground);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.enablePan = false;
    controls.enableZoom = false;
    //controls.maxPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI /2;
    controls.target.y = 0.5;
    controls.update();

    // Load robot
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);

    loader.loadMeshCb = function( path, manager, onComplete ) {

        const objLoader = new OBJLoader( manager );
        objLoader.load(
            path,
            result => {
                onComplete( result );
            },
            undefined,
            err => {
                // try to load again, notify user, etc
                onComplete( null, err );  
            }
        );
    };

    loader.load('src/urdf/iiwa.urdf', result => {

        robot = result;

    });

    // wait until all the geometry has loaded to add the model to the scene
    manager.onLoad = () => {

        robot.rotation.x = - Math.PI / 2;
        robot.traverse(c => {
            c.castShadow = true;
        });
        
        // for (let jointname in robot.joints) {
        //     robot.joints[jointname].setJointValue(MathUtils.degToRad(90));
        // }
        robot.joints["iiwa_base_joint"].setJointValue(MathUtils.degToRad(0));
        robot.joints["iiwa_joint_1"].setJointValue(MathUtils.degToRad(0));
        robot.joints["iiwa_joint_2"].setJointValue(MathUtils.degToRad(-40));
        robot.joints["iiwa_joint_3"].setJointValue(MathUtils.degToRad(0));
        robot.joints["iiwa_joint_4"].setJointValue(MathUtils.degToRad(-90));
        robot.joints["iiwa_joint_5"].setJointValue(MathUtils.degToRad(0));
        robot.joints["iiwa_joint_6"].setJointValue(MathUtils.degToRad(40));
        robot.joints["iiwa_joint_7"].setJointValue(MathUtils.degToRad(0));
        robot.joints["iiwa_joint_ee"].setJointValue(MathUtils.degToRad(0));
        robot.joints["tool0_joint"].setJointValue(MathUtils.degToRad(0));


        robot.updateMatrixWorld(true);

        const bb = new Box3();
        bb.setFromObject(robot);

        robot.position.y -= bb.min.y;

        //robot.position.x = -window.innerWidth/1000;
        //robot.position.z = window.innerWidth/1000;
        scene.add(robot);

    };

    onResize();
    window.addEventListener('resize', onResize);

}

function onResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // if(typeof robot !== 'undefined'){
    //     robot.position.x = -window.innerWidth/1000;
    //     robot.position.z = window.innerWidth/1000;
    // }

}

function render() {

    requestAnimationFrame(render);
    // if(typeof robot !== 'undefined'){
    //     robot.joints["iiwa_joint_4"].setJointValue(robot.joints["iiwa_joint_4"].angle + 0.01);
    // }
    renderer.render(scene, camera);

}

render();