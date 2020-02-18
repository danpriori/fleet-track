import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Vehicle } from '../interfaces/vehicle';
import { Snapshot } from '../interfaces/snapshot';

@Injectable()
export class ApiService {
  constructor(private http: HttpClient) { }

  getVehicles(key: string): Observable<Vehicle[]> {
    const url = 'https://cors-anywhere.herokuapp.com/https://app.ecofleet.com/seeme/Api/Vehicles/getLastData?key=' + key + '&json';
    return this.http
    .get<Vehicle[]>(url)
    // @ts-ignore
    .pipe(map((vehicles: Vehicle[]) => vehicles.response.map((vehicle: Vehicle) => new Vehicle(vehicle))));
  }

  getDataFromVehicle(key: string, objectId: string, startAt: string, endAt: string): Observable<Snapshot[]> {
    
    const url = 'https://cors-anywhere.herokuapp.com/https://app.ecofleet.com/seeme/Api/Vehicles/getRawData?' +
      'objectId=' + objectId + 
      '&begTimestamp=' + startAt + 
      '&endTimestamp=' + endAt + 
      '&key=' + key + 
      '&json';
    return this.http
    .get<Snapshot[]>(url)
    // @ts-ignore
    .pipe(map((snapshots: Snapshot[]) => snapshots.response.map((snapshot: Snapshot) => new Snapshot(snapshot))));
  }
}
