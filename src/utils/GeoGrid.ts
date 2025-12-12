/**
 * GeoGrid - A grid system for dividing the world into unique coded cells
 * Similar to India's DigiPin system or Google's Plus Codes
 * 
 * Each grid cell is approximately 10m x 10m at the equator
 * The code format: XXXX-YYYY-ZZ where:
 * - XXXX: Latitude component (base32 encoded)
 * - YYYY: Longitude component (base32 encoded)
 * - ZZ: Sub-grid precision
 */

// Base32 alphabet (excluding confusing characters like 0, O, I, L)
const ALPHABET = '23456789BCDFGHJKMNPQRSTVWXZ';
const BASE = ALPHABET.length;

// Grid precision - approximately 10 meters per cell
const LATITUDE_PRECISION = 0.00009; // ~10 meters
const LONGITUDE_PRECISION = 0.00009; // ~10 meters at equator

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GridCell {
  code: string;
  center: GeoCoordinate;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Encode a number to base32 string
 */
function encodeBase32(num: number, length: number): string {
  let result = '';
  let n = Math.floor(num);
  
  for (let i = 0; i < length; i++) {
    result = ALPHABET[n % BASE] + result;
    n = Math.floor(n / BASE);
  }
  
  return result;
}

/**
 * Decode a base32 string to number
 */
function decodeBase32(str: string): number {
  let result = 0;
  
  for (let i = 0; i < str.length; i++) {
    result = result * BASE + ALPHABET.indexOf(str[i]);
  }
  
  return result;
}

/**
 * Generate a unique grid code for a GPS coordinate
 */
export function coordinateToGridCode(coord: GeoCoordinate): string {
  // Normalize latitude from -90 to 90 -> 0 to 180
  const normalizedLat = coord.latitude + 90;
  // Normalize longitude from -180 to 180 -> 0 to 360
  const normalizedLng = coord.longitude + 180;
  
  // Calculate grid indices
  const latIndex = Math.floor(normalizedLat / LATITUDE_PRECISION);
  const lngIndex = Math.floor(normalizedLng / LONGITUDE_PRECISION);
  
  // Encode to base32 (4 characters each for lat/lng, 2 for sub-precision)
  const latCode = encodeBase32(latIndex, 4);
  const lngCode = encodeBase32(lngIndex, 4);
  
  // Sub-grid precision based on decimal remainders
  const latRemainder = (normalizedLat % LATITUDE_PRECISION) / LATITUDE_PRECISION;
  const lngRemainder = (normalizedLng % LONGITUDE_PRECISION) / LONGITUDE_PRECISION;
  const subIndex = Math.floor(latRemainder * 5) * 5 + Math.floor(lngRemainder * 5);
  const subCode = encodeBase32(subIndex, 2);
  
  return `${latCode}-${lngCode}-${subCode}`;
}

/**
 * Decode a grid code back to coordinates (returns center of cell)
 */
export function gridCodeToCoordinate(code: string): GeoCoordinate {
  const parts = code.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid grid code format');
  }
  
  const [latCode, lngCode, subCode] = parts;
  
  const latIndex = decodeBase32(latCode);
  const lngIndex = decodeBase32(lngCode);
  const subIndex = decodeBase32(subCode);
  
  // Calculate base coordinates
  let latitude = latIndex * LATITUDE_PRECISION - 90;
  let longitude = lngIndex * LONGITUDE_PRECISION - 180;
  
  // Add sub-grid offset
  const subLat = Math.floor(subIndex / 5);
  const subLng = subIndex % 5;
  latitude += (subLat + 0.5) * (LATITUDE_PRECISION / 5);
  longitude += (subLng + 0.5) * (LONGITUDE_PRECISION / 5);
  
  return { latitude, longitude };
}

/**
 * Get the full grid cell information
 */
export function getGridCell(coord: GeoCoordinate): GridCell {
  const code = coordinateToGridCode(coord);
  const center = gridCodeToCoordinate(code);
  
  const halfLat = LATITUDE_PRECISION / 2;
  const halfLng = LONGITUDE_PRECISION / 2;
  
  return {
    code,
    center,
    bounds: {
      north: center.latitude + halfLat,
      south: center.latitude - halfLat,
      east: center.longitude + halfLng,
      west: center.longitude - halfLng,
    },
  };
}

/**
 * Get all grid codes within a radius (in meters) of a coordinate
 */
export function getGridCodesInRadius(
  center: GeoCoordinate,
  radiusMeters: number
): string[] {
  const codes: Set<string> = new Set();
  
  // Approximate meters to degrees
  const latDegrees = radiusMeters / 111000;
  const lngDegrees = radiusMeters / (111000 * Math.cos(center.latitude * Math.PI / 180));
  
  // Step through the bounding box
  for (let lat = center.latitude - latDegrees; lat <= center.latitude + latDegrees; lat += LATITUDE_PRECISION) {
    for (let lng = center.longitude - lngDegrees; lng <= center.longitude + lngDegrees; lng += LONGITUDE_PRECISION) {
      // Check if point is within radius
      const distance = getDistance(center, { latitude: lat, longitude: lng });
      if (distance <= radiusMeters) {
        codes.add(coordinateToGridCode({ latitude: lat, longitude: lng }));
      }
    }
  }
  
  return Array.from(codes);
}

/**
 * Calculate distance between two coordinates in meters
 */
export function getDistance(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = coord1.latitude * Math.PI / 180;
  const lat2Rad = coord2.latitude * Math.PI / 180;
  const deltaLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const deltaLng = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Validate a grid code format
 */
export function isValidGridCode(code: string): boolean {
  const pattern = /^[23456789BCDFGHJKMNPQRSTVWXZ]{4}-[23456789BCDFGHJKMNPQRSTVWXZ]{4}-[23456789BCDFGHJKMNPQRSTVWXZ]{2}$/;
  return pattern.test(code);
}

