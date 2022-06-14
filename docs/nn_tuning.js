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

    const sgeometry = new THREE.CircleGeometry( 4, 32 );
	const smaterial = new THREE.MeshBasicMaterial( { color: 0xafafaf } )

    let Ys = Array();
	for(let i = 0; i < numCircles; i++){
		const circle = new THREE.Mesh( cgeometry, cmaterial );
		scene.add( circle );
		circle.position.x = xpos;
		circle.position.y = (height/numCircles)*(i+1/2) - height/2 +yoffset;
        Ys.push(circle.position.y);
		circle.position.z = -500;

        const scircle = new THREE.Mesh( sgeometry, smaterial );
		scene.add( scircle );
		scircle.position.x = xpos;
		scircle.position.y = (height/numCircles)*(i+1/2) - height/2 +yoffset;
		scircle.position.z = -500.1;
    }
    return Ys;
}

function drawLines(scene, lastX, lastYs, X, Ys){
    for(let i = 0; i < lastYs.length; i++){
        for(let j = 0; j < Ys.length; j++){
            const material = new THREE.LineBasicMaterial( { color: 0x77fdff, linewidth: 1 } );
            const points = [];
            points.push( new THREE.Vector3( lastX, lastYs[i], -500.2 ) );
            points.push( new THREE.Vector3( X, Ys[j], -500.2 ) );
            const geometry = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( geometry, material );
            scene.add( line ); 


        }
    }

}

//Initialize basic setup
let lastX = -850;
let lastYs = drawColumn(scene, 650, 1, -850, 100);

for(let i = 2; i <= 40; i++)
{
    let X = i*42.5-850;
	let Ys = drawColumn(scene, 650, Math.floor(Math.random() * 10), X, 100);
    drawLines(scene, lastX, lastYs, X, Ys);
    lastX = X;
    lastYs = Ys;
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