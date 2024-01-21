import * as THREE from 'three';

import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneBufferGeometry,
    CircleGeometry,
    MeshBasicMaterial,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    DoubleSide,
    MathUtils,
} from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { OBJLoader } from 'https://unpkg.com/three@0.149.0/examples/jsm/loaders/OBJLoader.js';
import URDFLoader from 'https://unpkg.com/urdf-loader@0.10.4/src/URDFLoader.js';

export class RobotMathModel {
    constructor(robot_view_model) {
        this.robot_view_model = robot_view_model;

      this.dhParameters = [
        { alpha: -Math.PI / 2, a: 0, d: 0.340, theta: 0 },
        { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
        { alpha: Math.PI / 2, a: 0, d: 0.400, theta: 0 },
        { alpha: -Math.PI / 2, a: 0, d: 0, theta: 0 },
        { alpha: -Math.PI / 2, a: 0, d: 0.400, theta: 0 },
        { alpha: Math.PI / 2, a: 0, d: 0, theta: 0 },
        { alpha: 0, a: 0, d: 0.126, theta: 0 }
      ];
  
      this.poses = {
        "home" : [
            0,
            -40,
            0,
            -90,
            0,
            40,
            0,
        ],
        "zero" : [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
        ],
        "redundancy_vis" : [
            0,
            -30,
            45,
            55,
            0,
            0,
            0,
        ]
      };

      this.d_bs = this.dhParameters[0].d;
      this.d_se = this.dhParameters[2].d;
      this.d_ew = this.dhParameters[4].d;
      this.d_wf = this.dhParameters[6].d;
    }

    get_transform(final_idx = 7, thetav1 = null, thetav2 = null, thetav4 = null) {
        let T = math.identity(4); // Initialize transformation matrix
        let thetas = [thetav1, thetav2, 0, thetav4];
        for (let idx = 0; idx < final_idx; idx++) {
            let { alpha, a, d, theta } = this.dhParameters[idx];
            if(thetav1){
                theta = thetas[idx]
            }
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
        return T
    }
  
    getShoulderWristUnit() {

        const _0pv6 = this.get_transform(6).subset(math.index([0, 1, 2], [3]));
        const _0pv2 = this.get_transform(2).subset(math.index([0, 1, 2], [3]));

        const _2pv6 = math.subtract(_0pv6, _0pv2);

        const shoulder_wrist_unit = math.divide(_2pv6, math.norm(math.flatten(_2pv6)));

        return shoulder_wrist_unit;
    }

    getShoulderElbowUnit() {
        const _2pv4 = this.getShoulderElbow();
        
        const shoulder_elbow_unit = math.divide(_2pv4, math.norm(math.flatten(_2pv4)));
        return shoulder_elbow_unit;
    }

    getShoulderElbow() {
        const _0p4 = this.get_transform(4).subset(math.index([0, 1, 2], [3]));
        const _0p2 = this.get_transform(2).subset(math.index([0, 1, 2], [3]));

        const _2p4 = math.subtract(_0p4, _0p2);
        return _2p4;
    }

    getVirtualShoulderElbowUnit (thetav1, thetav2, thetav4){

        // Since shoulder and wrist position for virtual and real manipulators are the same, we use real
        const _0pv2 = this.get_transform(2).subset(math.index([0, 1, 2], [3]));
        const _0pv4 = this.get_transform(4, thetav1, thetav2, thetav4).subset(math.index([0, 1, 2], [3]));
    
        const _2pv4 = math.subtract(_0pv4, _0pv2);
    
        const shoulder_elbow_unit = math.divide(_2pv4, math.norm(math.flatten(_2pv4)));
    
        return shoulder_elbow_unit;
    }

    getEEPos() {
        // Get joint angles
        const jointAngles = Array.from({ length: 7 }, (_, i) => this.robot_view_model.joints[`iiwa_joint_${i + 1}`].angle);
        // Update theta values in DH parameters
        this.dhParameters.forEach((param, i) => param.theta = jointAngles[i]);
    
        // Forward kinematics
        const T = this.get_transform(7);
    
        // Extract end-effector position with precision of 2 decimal places
        const endEffectorPos = [T.get([0, 3]).toFixed(2), T.get([1, 3]).toFixed(2), T.get([2, 3]).toFixed(2)];
    
        return endEffectorPos.map(parseFloat); // Convert strings to numbers
    }

    setJointPosDeg(idx, value) {
        const jointName = `iiwa_joint_${idx + 1}`;
        this.dhParameters[idx].theta = value * Math.PI / 180;
        const angle = MathUtils.degToRad(parseFloat(value));
        this.robot_view_model.joints[jointName].setJointValue(angle);
    }

    setPose(posename, jointPositions) {
        // Check if posename is in this.poses. If it is, set the joints to this.poses accordingly. If it isn't, set posename to be zero, and log the error.
        if (posename in this.poses) {
            const poseJoints = this.poses[posename];
            for (let idx = 0; idx < poseJoints.length; idx++) {
                this.setJointPosDeg(idx, poseJoints[idx]);
            }
        } else {
            console.error(`Error: Pose '${posename}' not found. Setting to zero.`);
            this.setPose("zero");  // Setting to zero pose as a fallback
        }
    }


    getGC() {
        const jointAngles = Array.from({ length: 7 }, (_, i) => this.robot_view_model.joints[`iiwa_joint_${i + 1}`].angle);
    
        // Determine the values for joints 2, 4, and 6
        const gcValues = jointAngles.map((angle, index) => {
            // Check if the joint is 2, 4, or 6 and if the angle is negative or positive
            if ((index + 1) % 2 === 0) { // joints 2, 4, and 6
                return angle < 0 ? -1 : 1;
            }
            return null; // Return null for other joints
        });
    
        // Filter out null values and join the remaining values into a string
        const resultString = gcValues.filter(value => value !== null).join(', ');
    
        return resultString;
    }

    get0p2() { 
        return math.matrix([[0], [0], [this.d_bs]]);
    }

    get2p4() {
        return math.matrix([[0], [this.d_se], [0]]);
    }
    get4p6() {
        return math.matrix([[0], [0], [this.d_ew]]);
    }
    get6p7() {
        return math.matrix([[0], [0], [this.d_wf]]);
    }

    get2p6() {
        const T = this.get_transform();
        const _0p7 = T.subset(math.index([0, 1, 2], [3]));
        const  _0R7 = T.subset(math.index([0, 1, 2], [0, 1, 2]));
        const _6p7 = this.get6p7();
        const _0p2 = this.get0p2();

        return math.subtract(math.subtract(_0p7, _0p2) , (math.multiply(_0R7, _6p7)));
    }
    
    getPsi() {
        // Get joint angles
        const jointAngles = Array.from({ length: 7 }, (_, i) => this.robot_view_model.joints[`iiwa_joint_${i + 1}`].angle);
    
        // Update theta values in DH parameters
        //dhParameters.forEach((param, i) => param.theta = jointAngles[i]);
        
        // Grab the z-vector of joint 1
        const {alpha, a, d, theta} = this.dhParameters[0];
        const [cosTheta, sinTheta, cosAlpha, sinAlpha] = [Math.cos(theta), Math.sin(theta), Math.cos(alpha), Math.sin(alpha)];    
        let _0R1z = [
            [sinTheta * sinAlpha],
            [-cosTheta * sinAlpha],
            [cosAlpha]
        ];    

        // Get position components.
        const _0p2 = this.get0p2();
        const _6p7 = this.get6p7();
    

        let _2p6 = this.get2p6();
    
        const _2p6x = _2p6.subset(math.index(0, 0));
        const _2p6y = _2p6.subset(math.index(1, 0));
        const _2p6z = _2p6.subset(math.index(2, 0));

        // if(debug=="true"){
        //     createLineSegment(math.matrix([_2p6x, _2p6y, 0]), math.matrix([0, 0, 0]));    
        //     createLineSegment(math.flatten(_0p2), math.add(math.flatten(_2p6), math.flatten(_0p2)), 4);
        // }
        const gc_4 = math.sign(this.robot_view_model.joints[`iiwa_joint_4`].angle);
        
        const thetav4 = gc_4 * math.acos(
            (math.pow(math.norm(math.flatten(_2p6)), 2) - math.pow(this.d_se, 2) - math.pow(this.d_ew, 2) ) / 
            (2 * this.d_se * this.d_ew)
        );
        
        const _2p6AlignedWithJ1 = 0 == math.norm(math.cross(math.flatten(_2p6), math.flatten(_0R1z)));
        console.log("Is 2p6 aligned with join 1 axis?", _2p6AlignedWithJ1);
        
        const thetav1 = _2p6AlignedWithJ1 ? 0 : math.atan2(_2p6y, _2p6x);
    
        let norm_2p6 = math.norm(math.flatten(_2p6));
        const phi = math.acos(
            ( math.subtract(math.add(math.square(this.d_se), math.square(norm_2p6)) , math.square(this.d_ew)) ) / 
            math.multiply(math.multiply(2, this.d_se),norm_2p6)
            );
            
        const thetav2 = math.atan2(
            math.sqrt(math.pow(_2p6x,2) + math.pow(_2p6y,2)),
            _2p6z)
            + gc_4 * phi;
            
        const shoulder_wrist_unit = math.flatten(this.getShoulderWristUnit());
        const virtual_shoulder_elbow_unit = math.flatten(this.getVirtualShoulderElbowUnit(thetav1, thetav2, 0, thetav4));
        const shoulder_elbow_unit = math.flatten(this.getShoulderElbowUnit());
        
    
        // if(debug == "true"){
        //     createLineSegment(math.matrix([0, 0, 0]), virtual_shoulder_elbow_unit, 3)
        //     createLineSegment(math.matrix([0, 0, 0]), shoulder_elbow_unit, 6)
        //     createLineSegment(math.matrix([0, 0, 0]), shoulder_wrist_unit, 7)
        // }
    
        const virtual_sew_plan_normal = math.cross(virtual_shoulder_elbow_unit, shoulder_wrist_unit);
        const sew_plan_normal = math.cross(shoulder_elbow_unit, shoulder_wrist_unit);
        
        const virtual_sew_plane_normal_unit = math.divide(virtual_sew_plan_normal, math.norm(virtual_sew_plan_normal))
        const sew_plane_normal_unit = math.divide(sew_plan_normal, math.norm(sew_plan_normal))
    
        // if(debug == "true"){
        //     createLineSegment(math.matrix([0, 0, 0]), virtual_sew_plane_normal_unit, 30)
        //     createLineSegment(math.matrix([0, 0, 0]), sew_plane_normal_unit, 31)
        // }
    
        const psi_sign = math.sign(math.dot(math.cross(virtual_sew_plane_normal_unit, sew_plane_normal_unit), _2p6));
        const psi = psi_sign * math.acos(math.dot(virtual_sew_plane_normal_unit, sew_plane_normal_unit));
    
        return psi;
    }
    
}