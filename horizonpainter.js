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

import * as d3 from "d3";
// import * as d3geoprojection from "d3-geo-projection";

import * as beck from "./beckersfunctions.js";


THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const bgColor = 0x000000;



// tree
let renderer, scene, camera, controls;
let mesh, geometry, material, containerObj;
let transcontrols;
let poi;
const knots = [];
const rayCasterObjects = [];
const materialhit = new THREE.MeshBasicMaterial( { color: 0xff6347, transparent: true, opacity:0.5 } );
const materialrays = new THREE.MeshBasicMaterial( { color: 0xff6347, transparent: true, opacity:0.5 } );


// Create ray casters in the scene
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const sphere = new THREE.SphereGeometry( 0.25, 20, 20 );
// const cylinder = new THREE.CylinderGeometry( 0.01, 0.01 );
// const pointDist = 25;

//
let width, height, size, box;
let projection, geoGenerator;
let geojson;
let svfMeshValues;



const params = {
	raysnum: 2000,
	transcontrolsvisible: true,
	poisize: 5.0,
	impactvisible: true,
	saveSvg: () => saveSvg(),
	saveIm: () => saveIm(),
};


init();
loadModel("cordoue.glb","glb");

// updateFromOptions();


// start();

// async function start() {
// 	const result = await loadModel("cordoue.glb","glb");
// 	// updateFromOptions();
// 	init();
// 	updateFromOptions();
// 	initHemi();
// 	// updateFromOptions();

// 	// rayCasterObjects.forEach( f => f.update() );
// 	// console.log("hi");
// 	// // await init();
// 	// // // do something else here after firstFunction completes
// 	// // await render();
// 	// // await updateFromOptions();
// 	// // renderer.render( scene, camera );
// 	// // await initHemi();
// 	// renderer.render( scene, camera );

// };



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
	scene.background = new THREE.Color( 0xffffff );
	scene.add( light );
	scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );

	// geometry setup
	const radius = 1;
	const tube = 0.6;
	const tubularSegments = 400;
	const radialSegments = 100;

	containerObj = new THREE.Object3D();
	// geometry = new THREE.TorusKnotGeometry( radius, tube, tubularSegments, radialSegments );
	// const knotGeometry = new THREE.TorusKnotGeometry(radius, tube, tubularSegments, radialSegments);
	material = new THREE.MeshPhongMaterial( { color: 0x999999 , side: THREE.DoubleSide} );
	// containerObj.scale.multiplyScalar( 0.10 );
	// containerObj.rotation.x = 10.989999999999943;
	// containerObj.rotation.y = 10.989999999999943;
	scene.add( containerObj );

    
	
	
	// addKnot();
	// loadModel("cordoue.glb","glb");
	


	// camera setup
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	// camera.position.set(0, 10, 10) ;
	camera.far = 100000;
	camera.updateProjectionMatrix();

	// control setup
	controls = new OrbitControls( camera, renderer.domElement );
	// controls.target.set( 25, 0, -25 );
	controls.target.set(-25, -6, 0);
	controls.update();
	controls.addEventListener('change', function(){
		renderer.render( scene, camera );
	});


	//poi setup
	const materialpoi = new THREE.MeshBasicMaterial( { color: 0xb24531} );
	poi = new THREE.Mesh( sphere, materialpoi );
	poi.scale.multiplyScalar( 5.0 );
	poi.position.set(-25, -6, 0);
	scene.add(poi);
	//poi controler
	transcontrols = new TransformControls(camera, renderer.domElement);
	transcontrols.addEventListener( 'change', function ( event ) {
		renderer.render( scene, camera );
	} );
	transcontrols.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = ! event.value;
	} );
	transcontrols.addEventListener( 'mouseDown', function ( event ) {
		rayCasterObjects.forEach( f => f.remove() );
		rayCasterObjects.splice(0, rayCasterObjects.length);
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

	// lil-gui
	const gui = new dat.GUI();
	gui.title("HorizonPainter");
	const folderComputation = gui.addFolder( 'Computation parameters' );
	folderComputation.add( params, 'raysnum', 10, 10000, 1).name( 'Number of rays' ).onChange( () => updateFromOptions() );
	const folderOptions = gui.addFolder( 'Options' );
	folderOptions.add( params, 'poisize', 0.1, 10, 0.01).name( 'POI size' ).onChange( () => {
		poi.scale.multiplyScalar( params.poisize/poi.scale.x );
		renderer.render( scene, camera );
	});
	folderOptions.add( poi.position, 'x').name( 'POI x' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderOptions.add( poi.position, 'y').name( 'POI y' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderOptions.add( poi.position, 'z').name( 'POI z' ).listen().onFinishChange( () => {
		updateFromOptions();
		renderer.render( scene, camera );
	});
	folderOptions.add( params, 'transcontrolsvisible').name( 'POI controler').onChange( () => {
		if (params.transcontrolsvisible) {
			transcontrols.attach(poi);
			renderer.render( scene, camera );
		} else {
			transcontrols.detach(poi);
			renderer.render( scene, camera );
		}
	});
	folderOptions.add( params, 'impactvisible').name( 'Impact points').onChange( () => {
		if (params.impactvisible) {
			materialhit.visible = true;
			renderer.render( scene, camera );
		} else {
			materialhit.visible = false;
			renderer.render( scene, camera );
		}
	});
	folderOptions.add( params, 'impactvisible').name( 'Rays').onChange( () => {
		if (params.impactvisible) {
			materialrays.visible = true;
			renderer.render( scene, camera );
		} else {
			materialrays.visible = false;
			renderer.render( scene, camera );
		}
	});
	const folderExport = gui.addFolder( 'Export' );
	folderExport.add( params, 'saveSvg').name( 'Save projection as .SVG' );
	folderExport.add( params, "saveIm").name( 'Save 3D view as .PNG' );

	// resize eventlistener
	window.addEventListener( 'resize', function () {
		resizeHemi();
		
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

	svfMeshValues = new Array(params.raysnum).fill(0);

	rayCasterObjects.forEach( f => f.remove() );
	rayCasterObjects.splice(0, rayCasterObjects.length);

	// Update raycaster count
	while ( rayCasterObjects.length > params.raysnum ) {

		rayCasterObjects.pop().remove();

	}

	// while ( rayCasterObjects.length < params.raysnum ) {

	// 	addRaycaster();

	// }

	// list of rays directions
	let beckmsh = beck.hemi_equi_LMTV(beck.inc(params.raysnum));
	let directions = beckmsh.directions;
	// origin
	let poiorigin = poi.position;

	for (let r = 0; r<directions.length; r++) {
		addRaycasterNew(poiorigin,directions[r],r);
	}

	if ( ! geometry ) {
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

	resizeHemi();

}

function render() {


	// renderer.render( scene, camera );
	// rayCasterObjects.forEach( f => f.update() );
	renderer.render( scene, camera );


}

function loadModel(url, fileExt) {
	let loader;
	let result;
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
				geometry = mesh.geometry;
				containerObj.add( mesh );

				console.time( 'computing bounds tree' );
				geometry.computeBoundsTree( {
					// maxLeafTris: 5,
					strategy: parseFloat( SAH ),
				} );
				geometry.boundsTree.splitStrategy = SAH;
				console.timeEnd( 'computing bounds tree' );
				result = mesh;
	
				camera.position.set( -45, 20, 20);
				controls.target.set( -25, -6, 0);
				controls.update();

				updateFromOptions();

				initHemi();
	
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
	var geome = mesh.geometry;
	geome.computeBoundingBox();
	var center = new THREE.Vector3();
	geome.boundingBox.getCenter( center );
	mesh.localToWorld( center );
	return center;
}

function addRaycasterNew(origin,direction,id) {

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
	const hitMesh = new THREE.Mesh( sphere, materialhit );
	hitMesh.scale.multiplyScalar( 0.5 );
	// objRay.add( hitMesh );
	// origin ball
	// const origMesh = new THREE.Mesh( sphere, material );	
	// origMesh.scale.multiplyScalar( 1.0 );

	// fill rayCasterObjects list 
	rayCasterObjects.push( {
		update: () => {
			raycaster.set( origVec, dirVec );
			// raycaster.firstHitOnly = true;
			// console.log(containerObj);
			const res = raycaster.intersectObject( containerObj, true );
			// console.log(res);
			// console.log(dirVec);
			if (res.length > 0) {
				// change svfmeshvalues value
				svfMeshValues[id] = 1.0;

				// hitPoint
				hitMesh.position.set(res[0].point.x, res[0].point.y, res[0].point.z);
				objRay.add( hitMesh );

				// rayline
				const geometryLine = new THREE.BufferGeometry().setFromPoints( [origVec, res[0].point] );
				const line = new THREE.Line( geometryLine, materialrays );
				objRay.add( line );

				// add to scene
				scene.add( objRay );
			}
		},

		remove: () => {

			scene.remove( objRay );

		}
	});

	rayCasterObjects[id].update();

}

function saveIm() {
	renderer.render(scene, camera); 
	requestAnimationFrame(render);
	// 
	let imgData = renderer.domElement.toDataURL();
	// getImageData = false;
	const a = document.createElement("a");
	a.href = imgData.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
	a.download = "image.png";
	a.click();
}




// hemisphere mesh



function initHemi() {
	console.log('initHemi');
    // lil-gui

    getShape();

    // setProjandgeoGene();
	projection = d3.geoAzimuthalEqualArea()
                .scale(size / 3 ) //.scale(size/(1.414213*2))
                .rotate([0, -90])
                .translate([size / 2, size / 2]);
	geoGenerator = d3.geoPath()
		.projection(projection);

    makegeojson();

    update(geojson);
}
 
function getShape() {
	console.log('getShape');
	d3.select('#svg').remove();

    // resize div content and get size
    box = document.getElementById('content');
    width = box.offsetWidth;
    height = box.offsetHeight;
    size = Math.min(width,height);
    // box.style.width = size+"px"; 
    // box.style.height = size+"px";

    // create svg in div content
    d3.select("#content").append("svg").attr("id","svg").attr("width","100%").attr("height","100%");
	d3.select("#svg").append('g').attr("class","map");
}

function resizeHemi() {
	console.log('resizeHemi');
	getShape();  

    // setProjandgeoGene();
	projection = d3.geoAzimuthalEqualArea()
                .scale(size / 3 ) //.scale(size/(1.414213*2))
                .rotate([0, -90])
                .translate([size / 2, size / 2]);
	geoGenerator = d3.geoPath()
		.projection(projection);
		
    makegeojson();
    update(geojson);
}

function makegeojson() {
    geojson = {
        "type": "FeatureCollection",
        "features": beck.beckersGeojsonFeature(params.raysnum),
    };
}
  
function update(geojson) {
	console.log('updategeojson');
    let u = d3.select('#content g.map')
        .selectAll('path')
        .data(geojson.features)
        // .attr("d",)
        .enter()
        .append('path')  
        .attr('d', geoGenerator)
        // .attr('stroke', 'white')
        // .attr("fill", 'rgb(100,100,100)');
		.attr("stroke", function (d) {
			let colorfactor = svfMeshValues[d.id];
			let color = 'rgba('+255+','+(255-((255-99)*colorfactor))+','+(255-((255-71)*colorfactor))+',1)';
			return color;
            // return 'rgba('+color+','+color+','+color+',1)';
			// return 'rgb('+(1-(d.id/params.patchnumber))*255+','+(1-(d.id/params.patchnumber))*255+','+(1-(d.id/params.patchnumber))*255+')';
            // return 'rgba(255,255,255,1)';

        })
        .attr("fill", function (d) {
			let colorfactor = svfMeshValues[d.id];
			let color = 'rgba('+255+','+(255-((255-99)*colorfactor))+','+(255-((255-71)*colorfactor))+',1)';
			return color;
			// let color = (1-0.75*svfMeshValues[d.id])*255;
            // return 'rgba('+color+','+color+','+color+',1)';
			// return 'rgb('+(1-(d.id/params.patchnumber))*255+','+(1-(d.id/params.patchnumber))*255+','+(1-(d.id/params.patchnumber))*255+')';
            // return 'rgba(255,255,255,1)';

        });
}

function saveSvg() {
    let svgEl = document.getElementById("svg");
    let name = 'beckersmesh_abugeat.svg';
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml; charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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