/**
 * US state and city data via country-state-city.
 * Use for location dropdowns (e.g. doctor discovery).
 */
import { State, City } from 'country-state-city';

export const US_COUNTRY_CODE = 'US' as const;

/** All US states for location filters. */
export function getStates() {
    return State.getStatesOfCountry(US_COUNTRY_CODE);
}

/** Cities for a given state (stateCode = state.isoCode from getStates()). */
export function getCities(stateCode: string) {
    if (!stateCode) return [];
    return City.getCitiesOfState(US_COUNTRY_CODE, stateCode);
}
