import BaseVehicle from './baseVehicle';

export class Vehicle implements BaseVehicle {
    objectId: string;
    orgId: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    speed: string;
    enginestate: string;
    gpsstate: number;
    direction: string;
    fuel: string;
    power: string;
    driverId: string;
    driverName: string;
    lastEngineOnTime: string;
    inPrivateZone: string;
    address: string;
    addressArea: string;
    objectName: string;
    plate: string;
    constructor(vehicle: BaseVehicle) {
        this.objectId = vehicle.objectId;
        this.objectName = vehicle.objectName.toUpperCase();
        this.speed = vehicle.speed;
        this.timestamp = vehicle.timestamp;
        this.latitude = vehicle.latitude;
        this.longitude = vehicle.longitude;
    }
}
