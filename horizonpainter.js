// HorizonPainter


import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as THREE from 'three';
import {
	acceleratedRaycast, computeBoundsTree, disposeBoundsTree,
	SAH, MeshBVHVisualizer,
} from 'three-mesh-bvh';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import * as beck from "./beckersfunctions.js";


THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const bgColor = 0x000000;

let renderer, scene, camera, controls;
let mesh, geometry, material, containerObj;
let transcontrols;
let poi;
const knots = [];
const rayCasterObjects = [];

// Create ray casters in the scene
const raycaster = new THREE.Raycaster();
const sphere = new THREE.SphereGeometry( 0.25, 20, 20 );
// const cylinder = new THREE.CylinderGeometry( 0.01, 0.01 );
// const pointDist = 25;


const params = {
	raycasters: {
		count: 150,
	},

};

init();
render();
updateFromOptions();
// render();


function init() {

	// renderer setup
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( bgColor, 1 );
	document.body.appendChild( renderer.domElement );

	// scene setup
	scene = new THREE.Scene();
	// scene.fog = new THREE.Fog( 0x263238 / 2, 20, 60 );

    // ambient light
	const light = new THREE.DirectionalLight( 0xffffff, 0.75 );
	light.position.set( 100, 100, 100 );
	scene.add( light );
	scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );

	// geometry setup
	const radius = 1;
	const tube = 0.6;
	const tubularSegments = 400;
	const radialSegments = 100;

	containerObj = new THREE.Object3D();
	geometry = new THREE.TorusKnotGeometry( radius, tube, tubularSegments, radialSegments );
	// const knotGeometry = new THREE.TorusKnotGeometry(radius, tube, tubularSegments, radialSegments);
	material = new THREE.MeshPhongMaterial( { color: 0x999999 , side: THREE.DoubleSide} );
	// containerObj.scale.multiplyScalar( 0.10 );
	// containerObj.rotation.x = 10.989999999999943;
	// containerObj.rotation.y = 10.989999999999943;
	scene.add( containerObj );
    addKnot();

	


	// camera setup
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	// camera.position.set(0, 10, 10) ;
	camera.far = 100000;
	camera.updateProjectionMatrix();

	// control setup
	controls = new OrbitControls( camera, renderer.domElement );
	// controls.target.set( 25, 0, -25 );
	controls.target.set( 0, 0, 0 );
	controls.update();
	controls.addEventListener('change', function(){
		renderer.render( scene, camera );
	});


	//poi setup
	const materialpoi = new THREE.MeshBasicMaterial( { color: 0x0000ff} );
	poi = new THREE.Mesh( sphere, materialpoi );
	poi.scale.multiplyScalar( 5.0 );
	poi.position.set(0, 10, 0);
	scene.add(poi);
	console.log(poi);
	//poi controler
	transcontrols = new TransformControls(camera, renderer.domElement);
	transcontrols.addEventListener( 'change', function ( event ) {
		renderer.render( scene, camera );
	} );
	transcontrols.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = ! event.value;
	} );
	transcontrols.addEventListener( 'mouseUp', function ( event ) {
		updateFromOptions();

		// rayCasterObjects.forEach( f => f.remove() );
		// renderer.render( scene, camera );
		// rayCasterObjects.splice(0, rayCasterObjects.length);
		// rayCasterObjects.forEach( f => f.update() );
	} );
	transcontrols.attach(poi);
	scene.add(transcontrols);


	// Run
	const gui = new dat.GUI();
	const rcFolder = gui.addFolder( 'Raycasters' );
	rcFolder.add( params.raycasters, 'count' ).min( 1 ).max( 1000 ).step( 1 ).onChange( () => updateFromOptions() );
	rcFolder.open();

	// resize eventlistener
	window.addEventListener( 'resize', function () {

		console.log("resize");
		
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		renderer.setSize( window.innerWidth, window.innerHeight );
	
		renderer.render( scene, camera );
	
	}, false );

}

function addKnot() {
	loadModel("cordoue.glb","glb");
	// const mesh = new THREE.Mesh( geometry, material );
	// mesh.rotation.x = Math.random() * 10;
	// mesh.rotation.y = Math.random() * 10;
	// knots.push( mesh );
	// containerObj.add( mesh );

}



function updateFromOptions() {

	rayCasterObjects.forEach( f => f.remove() );
	rayCasterObjects.splice(0, rayCasterObjects.length);

	// Update raycaster count
	while ( rayCasterObjects.length > params.raycasters.count ) {

		rayCasterObjects.pop().remove();

	}

	// while ( rayCasterObjects.length < params.raycasters.count ) {

	// 	addRaycaster();

	// }

	// list of rays directions
	let beckmsh = beck.hemi_equi_LMTV(beck.inc(params.raycasters.count));
	let directions = beckmsh.directions;
	// origin
	let poiorigin = poi.position;

	for (let r = 0; r<directions.length; r++) {
		addRaycasterNew(poiorigin,directions[r]);
	}

	if ( ! geometry ) {
        console.log("! geometry");
		return;
	}

	if ( ! geometry.boundsTree ) {

		console.time( 'computing bounds tree' );
		geometry.computeBoundsTree( {
			// maxLeafTris: 5,
			strategy: parseFloat( SAH ),
		} );
		geometry.boundsTree.splitStrategy = SAH;
		console.timeEnd( 'computing bounds tree' );

	}


    render();

}

function render() {


	// renderer.render( scene, camera );
	rayCasterObjects.forEach( f => f.update() );
	renderer.render( scene, camera );


}

function loadModel(url, fileExt) {
	let loader;

	switch (fileExt) {
		case "glb":
			loader = new GLTFLoader();
			loader.load(url, (gltf) => { //./cordoba.glb sacrecoeur.glb cordoue.glb torino.glb
				
				let subGeoList = [];
				gltf.scene.traverse( c => {
					if ( c.isMesh) { 
						subGeoList.push(c.geometry);

					}
				} );

				let meshgeometriesmerged = BufferGeometryUtils.mergeBufferGeometries(subGeoList, false);  
				
				// mesh = new THREE.Mesh( subMesh.geometry, new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true }) );
				mesh = new THREE.Mesh( meshgeometriesmerged, material );

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);

				// scene.add( mesh );
				knots.push( mesh );
				containerObj.add( mesh );

	
				camera.position.set( 0, 40, 60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
	
				// disable loading animation
				// document.getElementById("loading").style.display = "none";
	
			});
			break;
		
		case "stl":
			loader = new STLLoader();
			loader.load(url, (geometry) => {				
			
				mesh = new THREE.Mesh(geometry, material);

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);
											
				scene.add(mesh);

				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
	
				newBVH();
				
				resetSamples();

				// disable loading animation
				document.getElementById("loading").style.display = "none";
			}
			// (xhr) => {
			// 	console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
			// },
			// (error) => {
			// 	console.log(error)
			// }
			);
			break;

		case "obj":
			loader = new OBJLoader();
			loader.load(url, (object) => {
				// console.log(object);
				let subGeoList = [];
				for (let i=0; i< object.children.length; i++) {
					let children = object.children[i];
					if (children.isMesh) {
						subGeoList.push(children.geometry);
					}
				}

				let meshgeometriesmerged = BufferGeometryUtils.mergeBufferGeometries(subGeoList, false);  
				
				// mesh = new THREE.Mesh( subMesh.geometry, new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true }) );
				mesh = new THREE.Mesh( meshgeometriesmerged, material );

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);

				scene.add( mesh );
	
				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
	
				newBVH();
				
				resetSamples();

				// disable loading animation
				document.getElementById("loading").style.display = "none";

			}
			);
			break;

		case "ifc":
			loader = new IFCLoader();
			loader.ifcManager.setWasmPath("wasm/");
			loader.load(url, (ifcModel) => {
				
				// TO avoid Multi-root error when building bvh!
				ifcModel.geometry.clearGroups(); 

				mesh = new THREE.Mesh(ifcModel.geometry, material);

				// move mesh barycenter to global origin
				let center = getCenterPoint(mesh);
				mesh.geometry.translate(-center.x, -center.y, -center.z);
											
				scene.add(mesh);

				camera.position.set( 0, 40, -60 );
				controls.target.set( 0, 0, 0 );
				controls.update();
				
				newBVH();
				
				resetSamples();

				// disable loading animation
				document.getElementById("loading").style.display = "none";
			}
			);
			break;

		default:
			console.log(`Sorry, file format not recognized.`);
	}
	
}

function getCenterPoint(mesh) {
	var geometry = mesh.geometry;
	geometry.computeBoundingBox();
	var center = new THREE.Vector3();
	geometry.boundingBox.getCenter( center );
	mesh.localToWorld( center );
	return center;
}

function addRaycasterNew(origin,direction) {
	
	// reusable vectors
	const origVec = origin;

	const dirVec = new THREE.Vector3();
	dirVec.x = direction[0];
	dirVec.y = direction[1];
	dirVec.z = direction[2];
	dirVec.normalize();

	// Objects
	const objRay = new THREE.Object3D();
	// Hit ball
	const materialhit = new THREE.MeshBasicMaterial( { color: 0xff00ff, transparent: true, opacity:0.5 } );
	const hitMesh = new THREE.Mesh( sphere, materialhit );
	hitMesh.scale.multiplyScalar( 1.0 );
	// objRay.add( hitMesh );
	// origin ball
	const material = new THREE.MeshBasicMaterial( { color: 0x00ffff } );
	const origMesh = new THREE.Mesh( sphere, material );	
	origMesh.scale.multiplyScalar( 1.0 );

	// fill rayCasterObjects list 
	rayCasterObjects.push( {
		update: () => {

			raycaster.set( origVec, dirVec );
			raycaster.firstHitOnly = true;

			const res = raycaster.intersectObject( containerObj, true );
			console.log('raytrace');
			if (res.length > 0) {
				// hitPoint
				hitMesh.position.set(res[0].point.x, res[0].point.y, res[0].point.z);
				objRay.add( hitMesh );

				// rayline
				const geometryLine = new THREE.BufferGeometry().setFromPoints( [origVec, res[0].point] );
				const materialLine = new THREE.LineBasicMaterial( { color: 0x0000ff } );
				const line = new THREE.Line( geometryLine, materialhit );
				objRay.add( line );

				// add to scene
				scene.add( objRay );
			}
		},

		remove: () => {

			scene.remove( objRay );

		}
	});
}










// function addRaycaster() {

// 	// Objects
// 	const obj = new THREE.Object3D();
// 	const material = new THREE.MeshBasicMaterial( { color: 0x00ffff } );
// 	const materialhit = new THREE.MeshBasicMaterial( { color: 0xff00ff } );
// 	const origMesh = new THREE.Mesh( sphere, material );
// 	const hitMesh = new THREE.Mesh( sphere, materialhit );
// 	hitMesh.scale.multiplyScalar( 0.5 );
// 	origMesh.scale.multiplyScalar( 1.0 );

// 	const cylinderMesh = new THREE.Mesh( cylinder, new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.25 } ) );

// 	// Init the rotation root
// 	obj.add( cylinderMesh );
// 	obj.add( origMesh );
// 	obj.add( hitMesh );
// 	scene.add( obj );

// 	// set transforms
// 	origMesh.position.set( pointDist, 0, 0 );
// 	obj.rotation.x = Math.random() * 10;
// 	obj.rotation.y = Math.random() * 10;
// 	obj.rotation.z = Math.random() * 10;

// 	// reusable vectors
// 	const origVec = new THREE.Vector3();
// 	const dirVec = new THREE.Vector3();
// 	// const xDir = ( Math.random() - 0.5 );
// 	// const yDir = ( Math.random() - 0.5 );
// 	// const zDir = ( Math.random() - 0.5 );
// 	rayCasterObjects.push( {
// 		update: () => {

// 			// obj.rotation.x += xDir * 0.0001 * deltaTime;
// 			// obj.rotation.y += yDir * 0.0001 * deltaTime;
// 			// obj.rotation.z += zDir * 0.0001 * deltaTime;

// 			// console.log(origVec);
// 			// console.log(dirVec);

// 			origMesh.updateMatrixWorld();
// 			origVec.setFromMatrixPosition( origMesh.matrixWorld );
// 			// dirVec.copy( origVec ).multiplyScalar( 1 ).normalize();
// 			dirVec.copy( origVec ).multiplyScalar( - 1 ).normalize();


// 			raycaster.set( origVec, dirVec );
// 			raycaster.firstHitOnly = true;

// 			const res = raycaster.intersectObject( containerObj, true );
// 			const length = res.length ? res[ 0 ].distance : pointDist;

// 			// point.x = res.length ? res[ 0 ].point.x: 0;
// 			// point.y = res.length ? res[ 0 ].point.y: 0;
// 			// point.z = res.length ? res[ 0 ].point.z: 0;

// 			// point.setFromMatrixPosition( origMesh.matrixWorld );

// 			hitMesh.position.set( pointDist - length, 0, 0 );
// 			// hitMesh.position.set(point.x, point.y, point.z);

// 			// let pospointres = res.length ? [res[ 0 ].point.x,res[ 0 ].point.y, res[ 0 ].point.x] : [0,0,0];
// 			// hitMesh.position.set( pospointres );

// 			// console.log(point);


// 			cylinderMesh.position.set( pointDist - ( length / 2 ), 0, 0 );
// 			cylinderMesh.scale.set( 1, length, 1 );

// 			// console.log(origMesh);
// 			// console.log(res[0]);

// 			cylinderMesh.rotation.z = Math.PI / 2;

// 		},

// 		remove: () => {

// 			scene.remove( obj );

// 		}
// 	} );

// }