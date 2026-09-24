import "server-only";

export type ProjectAddress = {
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postal: string | null;
};

export type GeocodedAddress = {
  addressLabel: string;
  latitude: number;
  longitude: number;
};

function addressPart(value: string | null) {
  return value?.trim() ?? "";
}

export function buildProjectAddressLabel(address: ProjectAddress) {
  const parts = [address.address1, address.address2, address.city, address.state, address.postal]
    .map(addressPart)
    .filter(Boolean);
  return parts.length > 0 ? [...parts, "US"].join(", ") : "";
}

function getGeocodingKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? null;
}

export function isGoogleMapsGeocodingConfigured() {
  return Boolean(getGeocodingKey());
}

export function canGeocodeProjectAddress(address: ProjectAddress) {
  return Boolean(addressPart(address.address1) && addressPart(address.city) && addressPart(address.state));
}

export async function geocodeProjectAddress(address: ProjectAddress): Promise<GeocodedAddress | null> {
  const apiKey = getGeocodingKey();
  if (!apiKey || !canGeocodeProjectAddress(address)) {
    return null;
  }

  const addressLabel = buildProjectAddressLabel(address);
  const query = new URLSearchParams({ address: addressLabel, key: apiKey });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google Maps could not look up this address. Please try again.");
  }

  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{ formatted_address?: string; geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  if (payload.status === "ZERO_RESULTS") {
    return null;
  }
  if (payload.status !== "OK") {
    throw new Error(payload.error_message || "Google Maps could not look up this address.");
  }

  const match = payload.results?.[0];
  const latitude = match?.geometry?.location?.lat;
  const longitude = match?.geometry?.location?.lng;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return { addressLabel: match?.formatted_address || addressLabel, latitude, longitude };
}
