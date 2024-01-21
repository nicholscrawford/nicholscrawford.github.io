import * as THREE from 'three';


import {
    Mesh,
    CircleGeometry,
    MeshBasicMaterial,
    DoubleSide
} from 'three';


import { Line2 } from "three/addons/lines/Line2.js";

import { LineGeometry } from "three/addons/lines/LineGeometry.js";

import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { scene } from './main.js';

let circle;

export function createAxes() {
    const group = new THREE.Group();
    // Add origin
    const originGeometry = new THREE.SphereGeometry(0.005);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 16711680 });
    const origin = new THREE.Mesh(originGeometry, originMaterial);

    // Add x-axis arrow
    const xAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.2, 16711680);

    // Add y-axis arrow
    const yAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.2, 65280);

    // Add z-axis arrow
    const zAxisArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.2, 255);

    group.add(origin);
    group.add(xAxisArrow);
    group.add(yAxisArrow);
    group.add(zAxisArrow);

    return group;
}

const drawnLines = {};
export function createLineSegment(start, end, id = 1) {
    // Check if there is a line with the same ID
    if (drawnLines[id]) {
        // Remove the existing line
        scene.remove(drawnLines[id]);
    }

    // Create a line representing the link
    const points = [];
    const colors = [];

    // Extract translation components, apply coordinate transform to y up as opposed to z up.
    const xTranslation = math.subset(start, math.index(0));
    const yTranslation = math.subset(start, math.index(2));
    const zTranslation = -math.subset(start, math.index(1));
    // Push the extracted components to the points array
    points.push(xTranslation, yTranslation, zTranslation);

    // Extract translation components
    const xTranslation2 = math.subset(end, math.index(0));
    const yTranslation2 = math.subset(end, math.index(2));
    const zTranslation2 = -math.subset(end, math.index(1));
    // Push the extracted components to the points array
    points.push(xTranslation2, yTranslation2, zTranslation2);

    if (id == 3 || id == 4) {
        colors.push(255 / 255, 0 / 255, 0 / 255);
        colors.push(255 / 255, 0 / 255, 0 / 255);
    } else if (id == 6) {
        colors.push(0 / 255, 255 / 255, 0 / 255);
        colors.push(0 / 255, 255 / 255, 0 / 255);
    } else if (id == 7) {
        colors.push(0 / 255, 0 / 255, 255 / 255);
        colors.push(0 / 255, 0 / 255, 255 / 255);
    }
    else if (id == 30) {
        colors.push(0 / 255, 0 / 255, 55 / 255);
        colors.push(0 / 255, 0 / 255, 55 / 255);
    }
    else if (id == 31) {
        colors.push(0 / 255, 0 / 255, 0 / 255);
        colors.push(0 / 255, 0 / 255, 0 / 255);
    }
    else {
        colors.push(92 / 255, 162 / 255, 171 / 255);
        colors.push(92 / 255, 162 / 255, 171 / 255);
    }
    const geometry = new LineGeometry();
    geometry.setPositions(points);
    geometry.setColors(colors);

    let matLine = new LineMaterial({
        color: 16777215,
        linewidth: 0.002,
        vertexColors: true,
        dashed: false,
        alphaToCoverage: true,
    });

    const line = new Line2(geometry, matLine);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);

    // Store the line with its ID
    drawnLines[id] = line;

    scene.add(line);
}

export function removeCircle(){
    if (circle) {
        scene.remove(circle);
    }

    if (drawnLines[30]) {
        scene.remove(drawnLines[30]);
    }
    if (drawnLines[31]) {
        scene.remove(drawnLines[31]);
    }
    if (drawnLines[4]) {
        scene.remove(drawnLines[4]);
    }
}

export function addCircle(normal, base_to_shoulder, shoulder_to_elbow) {

    createLineSegment(base_to_shoulder, math.add(base_to_shoulder, shoulder_to_elbow), 30);
    createLineSegment(base_to_shoulder, math.add(base_to_shoulder, normal), 31);


    if (circle) {
        scene.remove(circle);
    }
    // Compute the projection of shoulder_to_elbow vector onto normal vector
    const normalMagnitude = math.norm(normal);
    const normalizedNormal = math.divide(normal, normalMagnitude);

    const projection = math.multiply(math.dot(shoulder_to_elbow, normalizedNormal), normalizedNormal);

    createLineSegment(math.add(base_to_shoulder, projection), math.add(base_to_shoulder, projection, math.subtract(shoulder_to_elbow, projection)), 4);
    const translation = math.add(projection, base_to_shoulder);
    const radius = math.norm(math.subtract(shoulder_to_elbow, projection));

    const geometry = new CircleGeometry(radius, 64);
    const material = new MeshBasicMaterial({
        color: 16711680,
        side: DoubleSide, // Make the material visible from both sides
        transparent: true, // Make the material transparent
        opacity: 0.2 // Set the transparency level (0: fully transparent, 1: fully opaque)
    });
    circle = new Mesh(geometry, material); scene.add(circle);
    scene.add(circle);

    // Convert the math.js vector to a Three.js vector
    const normalThree = new THREE.Vector3(normal.get([0]), normal.get([2]), -normal.get([1])).normalize();

    // Assuming normalThree is the normalized normal vector you want to align with
    const rotationAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), normalThree).normalize();

    const dotProduct = new THREE.Vector3(0, 0, 1).dot(normalThree);
    const angle = Math.acos(dotProduct);

    const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, angle);

    // Add the math.js translation component to the matrix
    rotationMatrix.setPosition(translation.get([0]), translation.get([2]), -translation.get([1]));


    // Apply the transformation matrix to the circle
    circle.applyMatrix4(rotationMatrix);
}

