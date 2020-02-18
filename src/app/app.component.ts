import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ApiService } from './services/api.service';
import { Vehicle } from './interfaces/vehicle';
import { Snapshot } from './interfaces/snapshot';
import { Moment } from 'moment';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})

export class AppComponent implements AfterViewInit {
  constructor(private apiService: ApiService) {
    this.loadingVehicleDetailsProgress = new Subject<any>();
    this.loadingVehicleDetailsProgress.subscribe(next => {
      let value = Math.round(next.value);
      this.loadingVehicleDetailsProgressValue = value;
      this.progressLabel = next.label + value + "%";
    });
  }
  loadingVehicleDetailsProgress: Subject<any>;
  loadingVehicleDetailsProgressValue: number = 0;
  apiKey: string;
  dataVehicles: Array<Vehicle>;
  dataSnapshots: Array<Snapshot>;
  vehicleSelected: Vehicle;
  dataVehicleDetails: Array<object>;  
  displayedVehiclesColumns: string[] = ['objectName', 'speed', 'timestamp'];
  displayedVehiclesDataColumns: string[] = ['label', 'value'];
  dateSelected: {startDate: Moment, endDate: Moment};
  isLoadingVehicleDetails: boolean = false;
  isLoadingVehicles: boolean = false;
  map: google.maps.Map;
  directionsService: google.maps.DirectionsService;
  directionsRenderer: google.maps.DirectionsRenderer;

  progressLabel: string = "";

  @ViewChild('mapContainer', {static: false}) gmap: ElementRef;

  vehicleMarkers: Array<google.maps.Marker> = new Array<google.maps.Marker>();
  stopMarkers: Array<google.maps.Marker> = new Array<google.maps.Marker>();
  routes: Array<google.maps.DirectionsRenderer> = new Array<google.maps.DirectionsRenderer>();
  bounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();
  title: string = 'fleet-project';
  
  // Tallinn
  lat: number = 59.4339;
  lng: number = 24.7281;

  coordinates: google.maps.LatLng = new google.maps.LatLng(this.lat, this.lng);

  mapOptions: google.maps.MapOptions = {
   center: this.coordinates,
   zoom: 14
  };

  // ---------------------------

  labels = {
    noData: "No data for this period",
    calculating: "calculating... ",
    starting: "Starting process... ",
    recreating: "Recreating routes... ",
    recreatingShortestRoutes: "Calculating shortest routes... "
  }
  
  mapInitializer(): void {
    this.map = new google.maps.Map(this.gmap.nativeElement,
    this.mapOptions);

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer();
    this.directionsRenderer.setMap(this.map); 
  }

  getVehicles(key: string): void {
    this.apiKey = key;
    this.isLoadingVehicles = true;
    this.apiService.getVehicles(this.apiKey)
    .subscribe((resp: Vehicle[]) => {
      this.dataVehicles = resp;
      if (this.dataVehicles.length > 0) {
        this.isLoadingVehicles = false;
        this.vehicleSelected = this.dataVehicles[0]; // select the first one
        this.updateVehiclesMap(this.dataVehicles);
        this.map.fitBounds(this.bounds);
        this.map.panToBounds(this.bounds);
        this.map.setZoom(this.map.getZoom()-2);
      }
    });
  }

  getDataFromSelectedVehicle(date): void {
    this.dataVehicleDetails = [
      { label: "Total Distance", value: this.labels.calculating },
      { label: "Number of stops", value: this.labels.calculating },
      { label: "Shortest Distance", value: this.labels.calculating }
    ]
    // reset stop markers 
    this.resetMarkers(this.stopMarkers);
    this.resetRoutes(this.routes);
    this.isLoadingVehicleDetails = true;
    this.loadingVehicleDetailsProgress.next({label: this.labels.starting, value: 0});
    this.loadingVehicleDetailsProgressValue = 0;
    this.apiService.getDataFromVehicle(
      this.apiKey, 
      this.vehicleSelected.objectId, 
      date.startDate.format("YYYY-MM-DD"), 
      date.endDate.format("YYYY-MM-DD")
    ).subscribe((resp: Snapshot[]) => {
      this.dataSnapshots = resp;

      let coordinates = [];
      let parts = [];

      // get the stops
      let stops = [];
      let turnToStopSnapshot = false;
      let totalDistance: number = 0;

      // process snapshots regarding coordinates and stops
      this.dataSnapshots.forEach(snapshot => {
        if (snapshot.EngineStatus == null && !turnToStopSnapshot) { // engine is off
          turnToStopSnapshot = true;
          stops.push({lat: snapshot.Latitude, lng: snapshot.Longitude}) // add this point to a stop point

        } else if (snapshot.EngineStatus != null && turnToStopSnapshot) { // engine is on again
          turnToStopSnapshot = false;
        }

        // add it to the coordinates only when the engine is on
        if (snapshot.EngineStatus != null) {
          if (coordinates.length > 0) {
            let lastCoord = coordinates[coordinates.length-1];
            if (lastCoord.lat != snapshot.Latitude && lastCoord.lng != snapshot.Longitude) {
              coordinates.push({lat: snapshot.Latitude, lng: snapshot.Longitude, distance: snapshot.Distance})
            }
          } else {
            coordinates.push({lat: snapshot.Latitude, lng: snapshot.Longitude, distance: snapshot.Distance})
          }
          
        }
      })
      
      // update the stops info
      this.dataVehicleDetails[1]['value'] = stops.length;
      this.updateStopPointsMap(stops);
      
      if (coordinates.length > 0) {

        parts = [];
        for (let i = 0, max = 25 - 1; i < coordinates.length; i = i + max) {
          parts.push(coordinates.slice(i, i + max + 1));
        }
    
        this.calculateRoutes(parts, "totalRoute", "blue", 4, 1, (totalDistance: number) => {
          this.dataVehicleDetails[0]['value'] = (totalDistance / 1000).toFixed(2) + 'km';
          if (stops.length > 0) {
            parts = [];
            for (let i = 0, max = 25 - 1; i < stops.length; i = i + max) {
              parts.push(stops.slice(i, i + max + 1));
            }
            this.startShortestRoutes(parts, "shortestRoute", "red", 8, 2, (shortestDistance: number) => {
              this.isLoadingVehicleDetails = false;
              this.dataVehicleDetails[2]['value'] = (shortestDistance / 1000).toFixed(2) + 'km';
            })
          } else {
            this.isLoadingVehicleDetails = false;
          }
        });
      } else if (coordinates.length == 0 && stops.length > 0) {
        this.isLoadingVehicleDetails = false;
        this.dataVehicleDetails[0]['value'] = this.labels.noData;
        this.dataVehicleDetails[2]['value'] = this.labels.noData;
      } else if (coordinates.length == 0 && stops.length == 0) {
        this.isLoadingVehicleDetails = false;
        this.dataVehicleDetails[0]['value'] = this.labels.noData;
        this.dataVehicleDetails[1]['value'] = this.labels.noData;
        this.dataVehicleDetails[2]['value'] = this.labels.noData;
      }
    });
  }

  startShortestRoutes(points: Array<any>, typeOfCalc: string, routeColor: string, routeWeight: number, routezIndex: number = 1, callback: Function): void {
    this.calculateRoutes(points, typeOfCalc, routeColor, routeWeight, routezIndex, callback);
  }

  calculateRoutes(points: Array<any>, typeOfCalc: string, routeColor: string, routeWeight: number, routezIndex: number = 1, callback: Function): void {
    let totalDistance: number = 0;

    // Service callback to process service results
    let serviceCallback = (response: any, status: string, count: number, parts: Array<any>, typeOfCalc: string) => {
      if (status != 'OK') {
        console.log('Directions request failed due to ' + status);
      } else {
        this.routes.push(new google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: routeColor,
            strokeOpacity: 0.8,
            strokeWeight: routeWeight,
            zIndex: routezIndex
          }
        }));
        for (let i = 0; i < response.routes[0].legs.length; i++) {
          totalDistance += response.routes[0].legs[i].distance.value;
        }
        
        this.routes[this.routes.length - 1].setMap(this.map);
        this.routes[this.routes.length - 1].setOptions({ suppressMarkers: true, preserveViewport: true });
        this.routes[this.routes.length - 1].setDirections(response);
      }
      if (count >= (parts.length - 1)) {
        callback(totalDistance);
      }
      
    };

    // Send requests to service to get route (for stations count <= 25 only one request will be sent)
    for (let i = 0; i < points.length; i++) {
      let waypoints = [];
      let serviceOptions = {
        origin: null,
        destination: null,
        waypoints: null,
        travelMode: null,
        optimizeWaypoints: null
      };

      // analyse the type and fill with options
      for (var j = 1; j < points[i].length - 1; j++) {
        waypoints.push({location: points[i][j], stopover: typeOfCalc == "totalRoute" ? false : true});
      }
      serviceOptions.origin = points[i][0];
      serviceOptions.destination = points[i][points[i].length - 1];
      serviceOptions.waypoints = waypoints;
      serviceOptions.travelMode = google.maps.TravelMode.DRIVING;
      serviceOptions.optimizeWaypoints = typeOfCalc == "totalRoute" ? false : true;
      
      // Send request async + allocating a memory queue
      // Google Maps API doesnt allow to many requests at short times.
      // To avoid this for long point lists, it creates an async queue requests 
      // With independently memory allocation for each request
      new function(_service_options: object, callback: Function, count: number, typeOfCalc: string, app: AppComponent) {
        setTimeout(() => {
          app.directionsService.route(_service_options, (response, status) => { 
            const value = ((count + 1) / points.length) * 100;
            let label: string = "";
            if (typeOfCalc == "totalRoute") {
              label = app.labels.recreating;
            } else if (typeOfCalc == "shortestRoute") {
              label = app.labels.recreatingShortestRoutes;
            }
            app.loadingVehicleDetailsProgress.next({label: label, value: value});
            callback(response, status, count, points, typeOfCalc);
          });
          
        }, 1200 * count);
      }(serviceOptions, serviceCallback, i, typeOfCalc, this);
    }
  } 

  selectVehicle(vehicle: Vehicle): void {
    this.vehicleSelected = vehicle;
    this.map.panTo(this.vehicleMarkers[vehicle.objectId].getPosition());
  }

  updateVehiclesMap(dataVehicles: Array<Vehicle>):void {
    
    this.resetMarkers(this.vehicleMarkers);

    dataVehicles.map(vehicle => {
      this.vehicleMarkers[vehicle.objectId] = new google.maps.Marker({
        position: new google.maps.LatLng(vehicle.latitude, vehicle.longitude),
        map: this.map,
        icon: '../assets/car-icon.png',
      });
      this.vehicleMarkers[vehicle.objectId].setMap(this.map);

      const loc = new google.maps.LatLng(
        this.vehicleMarkers[vehicle.objectId].position.lat(), 
        this.vehicleMarkers[vehicle.objectId].position.lng()
      );
      this.bounds.extend(loc);
    })
  }

  updateStopPointsMap(dataStops: Array<any>):void {
    dataStops.map(stop => {
      this.stopMarkers.push(new google.maps.Marker({
        position: new google.maps.LatLng(stop.lat, stop.lng),
        map: this.map,
        icon: '../assets/stop-icon.png',
      }));
      this.stopMarkers[this.stopMarkers.length-1].setMap(this.map);

    })
  }

  resetMarkers(markers: Array<google.maps.Marker>): void {
    markers.map(marker => {
      marker.setMap(null);
    })
  }

  resetRoutes(routes: Array<google.maps.DirectionsRenderer>): void {
    routes.map(routes => {
      routes.setMap(null);
    })
  }

  ngAfterViewInit(): void {
    this.mapInitializer();
  }
}
