import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';

const canvas = document.querySelector('canvas.webgl')

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );


const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

function drawColumn(scene, height, numCircles, xpos, yoffset){
	//create a circle
	const cgeometry = new THREE.CircleGeometry( 3, 32 );
	const cmaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
	for(let i = 0; i < numCircles; i++){
		const circle = new THREE.Mesh( cgeometry, cmaterial );
		scene.add( circle );
		circle.position.x = xpos;
		circle.position.y = (height/numCircles)*(i+1/2) - height/2 +yoffset;
		circle.position.z = -500;
		console.log(circle.position.y);
	}
}
for(let i = 200; i > 0; i--)
{
	drawColumn(scene, 650, i, i*20 - 850, 100)
}

/* load images
var spriteMap = new THREE.TextureLoader().load( "./assets/sprite.png" );
var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff } );   
var sprite = new THREE.Sprite( spriteMaterial );
sprite.center.set(0,1); 
sprite.position.set(0,0,-40);   
sprite.scale.set(64,64,1.0); 
scene.add(sprite);
 */

//create a blue LineBasicMaterial
/* const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
const points = [];
points.push( new THREE.Vector3( - 10, 0, 0 ) );
points.push( new THREE.Vector3( 0, 10, 0 ) );
points.push( new THREE.Vector3( 10, 0, 0 ) );
const geometry = new THREE.BufferGeometry().setFromPoints( points );
const line = new THREE.Line( geometry, material );
scene.add( line ); */

camera.position.z = 100;

//var keydown = "";
/*

document.addEventListener('keydown', function(event) {
	alert(event.key)
	if(event.key=="ArrowRight"){
		rluddown[0] = true;
	}
	if(event.key=="ArrowLeft"){
		rluddown[1] = true;
	}
});

document.addEventListener('keyup', function(event) {
	//alert(event.key)
	if(event.key=="ArrowRight"){
		rluddown[0] = false;
	}
	if(event.key=="ArrowLeft"){
		rluddown[1] = false;
	}
});
*/

/* window.addEventListener("keydown", function (event) {
	if (event.defaultPrevented) {
	  return; // Do nothing if the event was already processed
	}
  
	switch (event.key) {
	  case "ArrowDown":
		keydown = "Down";
		break;
	  case "ArrowUp":
		keydown = "Up";
		break;
	  case "ArrowLeft":
		keydown = "Left";
		break;
	  case "ArrowRight":
		keydown = "Right";
		break;
	  default:
		return; // Quit when this doesn't handle the key event.
	}
  
	// Cancel the default action to avoid it being handled twice
	event.preventDefault();
  }, true);

  window.addEventListener("keyup", function (event) {
	if (event.defaultPrevented) {
	  return; // Do nothing if the event was already processed
	}
  
	switch (event.key) {
	  default:
		keydown = "";
		return; // Quit when this doesn't handle the key event.
	}
  
	// Cancel the default action to avoid it being handled twice
	event.preventDefault();
  }, true); */

function animate() {
/* 	requestAnimationFrame( animate );
	if(keydown == "Down"){
		sprite.position.y -= 1;
	}
	if(keydown == "Up"){
		sprite.position.y += 1;
	}
	if(keydown == "Left"){
		sprite.position.x -= 1;
	}
	if(keydown == "Right"){
		sprite.position.x += 1;
	}
	/*
	if(rluddown[1]){
		sprite.position.x -= 10;
	}*/ 
	renderer.render( scene, camera );
}
animate();