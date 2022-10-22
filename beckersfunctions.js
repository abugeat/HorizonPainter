// B&B
export function beckersGeojsonFeature(ncell) {
    let bmesh = hemi_equi_LMTV(inc(ncell));

    let latb = bmesh.lat;
    let lonb = bmesh.lon;
    let meshgeojson = [];
    
    // zenith circle patch
    meshgeojson.push(createPatch(circlepolygon(latb[0][0]),0));

    // square patches
    let patch = [];
    let id;
    for (let ring = 1; ring < latb.length; ring++) {
        let nSteps = getnSteps(lonb[ring][0],-179.99,latb[ring][0]);
        // first patch
        patch = [
            [lonb[ring][0], latb[ring][0]],
            ...intermediatePoints(lonb[ring][0],-179.99,nSteps,latb[ring][0]),
            [-179.99,       latb[ring][0]],
            [-179.99,       latb[ring-1][0]],
            ...intermediatePoints(-179.99,lonb[ring][0],nSteps,latb[ring-1][0]),
            [lonb[ring][0], latb[ring-1][0]],
            [lonb[ring][0], latb[ring][0]]
        ];
        id = meshgeojson.length;
        meshgeojson.push(createPatch(patch,id));
        
        // other patches of the ring
        for (let i = 1; i < latb[ring].length; i++) { 
            patch = [
                [lonb[ring][i],     latb[ring][0]],
                ...intermediatePoints(lonb[ring][i],lonb[ring][i-1],nSteps,latb[ring][0]),
                [lonb[ring][i-1],   latb[ring][0]],
                [lonb[ring][i-1],   latb[ring-1][0]],
                ...intermediatePoints(lonb[ring][i-1],lonb[ring][i],nSteps,latb[ring-1][0]),
                [lonb[ring][i],     latb[ring-1][0]],
                [lonb[ring][i],     latb[ring][0]]
            ];
            id = meshgeojson.length;

            meshgeojson.push(createPatch(patch, id));        
        }
    }

    // other patches

    return meshgeojson;

}

export function inc(ncell) {
    // Input: number of mesh wanted
    // Output : number of cell per ring (cumulated) from zenith to horizon

    let tim1  = Math.PI/2;
    let rim1  = 2*Math.sin(tim1/2);

    // Input data
    let idep  = ncell; 
    let cim1  = idep;
    
    // Finding a tentative realistic number of rings
    let nring = Math.floor(Math.sqrt(idep));
    let ac    = new Array(nring).fill(0);
    let as    = new Array(nring).fill(0);
    let n     = new Array(nring).fill(0);
    // initializations
    let nucel = [];
    let nan   = 0;
    for (let i=0; i<nring; i++){
        n[i]  = cim1;                        // Number of cells in ring i
        let ti    = tim1-rim1*Math.sqrt(Math.PI/cim1);
        as[i] = 2*Math.PI/idep/(ti-tim1)**2;       // Aspect ratio on te sphere
        let ri    = 2*Math.sin(ti/2);
        ac[i] = 2*Math.PI/idep/(ri-rim1)**2;       // Aspect ratio on te disk
        let ci    = Math.round(cim1*(ri/rim1)**2);
        tim1  = ti;
        rim1  = ri;
        cim1  = ci;
        // Forcing the presence of a central disk
        if (cim1 == 2) {
            cim1=1;
            ci=1;
        }
        if (cim1 == 0) {
            cim1=1;
            ci=1;
        }
        if (cim1 == 1) {
            if (nan ==0) {
                nan=i+1;
            }
        }
    }
    let kk=nan;
    for (let i=0; i<nan; i++) {
        kk=kk-1;
        nucel[kk]=n[i];
    }

    // add top round patch
    nucel.unshift(1);

    return nucel;
}

export function hemi_equi_LMTV(nucel) {
    
    let nan =       nucel.length;                             // number of sky rings
    let lat =       new Array(nucel[nan-1]).fill(0);          // patch latitud
    let latb =      new Array(nucel[nan-1]).fill(0);
    let lon =       new Array(nucel[nan-1]).fill(0);          // patch longitud 
    let directions =new Array(nucel[nan-1]).fill([0,0,0]);    // patch direction 
    
    // tracé des segments de méridiens
    let vr = new Array(nan).fill(1); // ones(nan,1);
    for (let i=1; i<nan; i++) {
        vr[i] = vr[i-1]*Math.sqrt(nucel[i]/nucel[i-1]);
    }

    // vr = vr/vr(nan); // need .map!
    vr = vr.map(x => x/vr[nan-1]);

    let hauteur = new Array(nan).fill(0); // zeros(nan,1);
    let dis = new Array(nan).fill(1); //ones(nan,1);
    let lati_b_cell = new Array(nan).fill(0); //zeros(nan,1);
    let lati_cell = new Array(nan).fill(0); // zeros(nan,1);
    
    for (let i = 0; i<nan; i++) {
        hauteur[i]=Math.sqrt((1-vr[i]**2)**2/(2-vr[i]**2)); 
        dis[i]=Math.sqrt(hauteur[i]**2+vr[i]**2);
        lati_b_cell[i]=Math.acos(vr[i]/dis[i]);
    }
    
    lati_cell[0]=0; 
    for (let i=0; i<(nan-1); i++) {
        lati_cell[i+1]=(lati_b_cell[i]+lati_b_cell[i+1])/2;
    }
    
    let ipoi=0;
    let nmerid, longi;
    for (let i=0; i<(nan-1); i++) {
        nmerid = nucel[i+1]-nucel[i]; // nombre de cellules dans 1 anneau
        longi = -Math.PI/nmerid;
        for (let j=0; j<nmerid; j++) {
            ipoi += 1;
            lat[ipoi]=lati_cell[i+1];
            longi=longi+2*Math.PI/nmerid;
            lon[ipoi]=longi;
            latb[ipoi]=lati_b_cell[i+1];
        }
    }
        
    // Affichage des latitudes et longitudes des cellules en radians
    let nmesh = lat.length;
    let as = new Array(nmesh).fill(1); //*(2*pi/nmesh); //Angle solide de chaque maille (supposé égaux)
    as = as.map(x => x*(2*Math.PI/nmesh));
    lat[0] = Math.PI/2;

    let skymesh = new Array(nmesh).fill([0,0,0]);
    for (let i = 0; i <nmesh; i++) {
        skymesh[i] = [lat[i], lon[i], as[i]];
    }

    // reshape in list of list from top to bottom
    let newlat = [[lati_b_cell[0]]];
    let newlon = [[0]];
    for (let i = 0; i< nucel.length-1; i++) {
        newlat.push(latb.slice(nucel[i],nucel[i+1]));
        newlon.push(lon.slice(nucel[i],nucel[i+1]));
    }

    // shift lon
    for (let i = 1; i< nucel.length; i++) {
        let shift = newlon[i][0];
        newlon[i] = newlon[i].map(x => x+shift - Math.PI);
    }
  
    // convert radians to degrees
    for (let i = 0; i< nucel.length; i++) {
        newlon[i] = newlon[i].map(x => x*180/Math.PI);
        newlat[i] = newlat[i].map(x => x*180/Math.PI);
    }

    // direction of each patch (middle) xyz x:east y:north z:up
    for (let i = 0; i <nmesh; i++) {
        directions[i] = [-Math.sin(lon[i])*Math.cos(lat[i]),  Math.sin(lat[i]),  -Math.cos(lon[i])*Math.cos(lat[i])];
    }

    let bmesh = {
        lat: newlat,
        lon: newlon,
        directions: directions,
        nucel: nucel,
    };

    return bmesh;
}

function createPatch(patches, id) {
    let patchjson = {
        "type": "Feature",
        "properties": {
            "name": "beckersmesh"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [patches],
        },
        "id": parseInt(id),
    }; 
    return patchjson;
}

function getnSteps(lonStart, lonEnd, lat) {
    let lonDif = lonEnd - lonStart;
    let newSteps = Math.round( (Math.abs(lonDif) / 2.5)); //  * Math.cos(lat/180*Math.PI)  
    return newSteps;
}

function circle(lat) {
    let lon1 = [[-180, lat]];
    for (let i=0; i<145; i++) {
        let lon = -180 + i * 2.5;
        lon1.push([lon, lat]);
    }
    return lon1.reverse();
} 

function circlepolygon(lat) {
    let lon1 = [[-180, lat]];
    let lon;
    for (let i=0; i<145; i++) {
        lon = -180 + i * 2.5;
        lon1.push([lon, lat]);
    }
    lon1.push([-180, lat]);
    return lon1.reverse();
} 

function intermediatePoints(lonStart, lonEnd, nSteps, lat) {
    
    // nSteps = 50;
    let interPoints = []; 
    if (nSteps != 0) {

        let lonSteps = (lonEnd - lonStart) / nSteps;
        interPoints = new Array(nSteps);
        let newLon = lonStart+lonSteps;

        for (let i = 0; i < nSteps; i++) {
            interPoints[i] = [newLon, lat];
            newLon += lonSteps;
        }
    }
        
    return interPoints;
}