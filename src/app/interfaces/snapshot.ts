import BaseSnapshot from './baseSnapshot';

export class Snapshot implements BaseSnapshot{
    timestamp: string;
    ServerGenerated: null;
    Din1: null;
    SplitSegment: null;
    Distance: number;
    Power: string;
    EngineStatus: string;
    Direction: number;
    Longitude: number;
    Latitude: number;
    GPSState: number;
    DriverId: number;
    Speed: number;

    constructor(baseSnapshot: BaseSnapshot) {
        this.timestamp = baseSnapshot.timestamp;
        this.Speed = baseSnapshot.Speed;
        this.DriverId = baseSnapshot.DriverId;
        this.Latitude = baseSnapshot.Latitude;
        this.Longitude = baseSnapshot.Longitude;
        this.Distance = baseSnapshot.Distance;
        this.EngineStatus = baseSnapshot.EngineStatus;
    }
}
