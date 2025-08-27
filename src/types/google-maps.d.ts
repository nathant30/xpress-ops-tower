// Google Maps API type declarations
declare namespace google {
  namespace maps {
    interface Map {
      setCenter(latLng: LatLng): void;
      setZoom(zoom: number): void;
      getCenter(): LatLng;
      getZoom(): number;
      getBounds(): LatLngBounds;
      panTo(latLng: LatLng): void;
      fitBounds(bounds: LatLngBounds): void;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    interface LatLngBounds {
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      contains(latLng: LatLng): boolean;
      extend(latLng: LatLng): void;
    }

    interface Marker {
      setPosition(latLng: LatLng): void;
      getPosition(): LatLng;
      setMap(map: Map | null): void;
      setVisible(visible: boolean): void;
    }

    interface InfoWindow {
      setContent(content: string | Element): void;
      open(map: Map, marker?: Marker): void;
      close(): void;
      setPosition(latLng: LatLng): void;
    }

    interface DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult, status: DirectionsStatus) => void): void;
    }

    interface DirectionsRenderer {
      setMap(map: Map): void;
      setDirections(directions: DirectionsResult): void;
    }

    interface DirectionsRequest {
      origin: string | LatLng;
      destination: string | LatLng;
      travelMode: TravelMode;
      waypoints?: DirectionsWaypoint[];
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
    }

    interface DirectionsRoute {
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      bounds: LatLngBounds;
    }

    interface DirectionsLeg {
      start_location: LatLng;
      end_location: LatLng;
      distance: Distance;
      duration: Duration;
    }

    interface DirectionsWaypoint {
      location: string | LatLng;
      stopover?: boolean;
    }

    interface Distance {
      text: string;
      value: number;
    }

    interface Duration {
      text: string;
      value: number;
    }

    interface Circle {
      setCenter(center: LatLng): void;
      setRadius(radius: number): void;
      setMap(map: Map | null): void;
    }

    interface Polyline {
      setPath(path: LatLng[]): void;
      setMap(map: Map | null): void;
    }

    interface Polygon {
      setPath(path: LatLng[]): void;
      setMap(map: Map | null): void;
    }

    enum TravelMode {
      DRIVING = 'DRIVING',
      WALKING = 'WALKING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT'
    }

    enum DirectionsStatus {
      OK = 'OK',
      NOT_FOUND = 'NOT_FOUND',
      ZERO_RESULTS = 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }

    interface PlacesService {
      nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
    }

    interface PlaceSearchRequest {
      location: LatLng;
      radius: number;
      type?: string;
      keyword?: string;
    }

    interface PlaceResult {
      place_id: string;
      name: string;
      geometry: {
        location: LatLng;
      };
      formatted_address: string;
      types: string[];
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      NOT_FOUND = 'NOT_FOUND',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
  }
}