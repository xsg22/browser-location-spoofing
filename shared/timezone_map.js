// shared/timezone_map.js
// A dictionary to infer timezones based on Country Code and Region(State/City) name.
const TIMEZONE_MAP = {
    // Simple mapping for single-timezone countries (or primary timezone)
    "CN": "Asia/Shanghai",
    "GB": "Europe/London",
    "JP": "Asia/Tokyo",
    "DE": "Europe/Berlin",
    "SG": "Asia/Singapore",
    "IN": "Asia/Kolkata",
    "KR": "Asia/Seoul",
    "FR": "Europe/Paris",
    "IT": "Europe/Rome",
    "ES": "Europe/Madrid",
    "ZA": "Africa/Johannesburg",

    // Multi-timezone mapping by Region (Abbreviation, Full Name, or Major City)
    "US": {
        "default": "America/New_York",
        // Eastern
        "CT": "America/New_York", "CONNECTICUT": "America/New_York",
        "DE": "America/New_York", "DELAWARE": "America/New_York",
        "DC": "America/New_York", "DISTRICT OF COLUMBIA": "America/New_York",
        "FL": "America/New_York", "FLORIDA": "America/New_York",
        "GA": "America/New_York", "GEORGIA": "America/New_York",
        "IN": "America/Indiana/Indianapolis", "INDIANA": "America/Indiana/Indianapolis",
        "ME": "America/New_York", "MAINE": "America/New_York",
        "MD": "America/New_York", "MARYLAND": "America/New_York",
        "MA": "America/New_York", "MASSACHUSETTS": "America/New_York",
        "MI": "America/Detroit", "MICHIGAN": "America/Detroit",
        "NH": "America/New_York", "NEW HAMPSHIRE": "America/New_York",
        "NJ": "America/New_York", "NEW JERSEY": "America/New_York",
        "NY": "America/New_York", "NEW YORK": "America/New_York",
        "NC": "America/New_York", "NORTH CAROLINA": "America/New_York",
        "OH": "America/New_York", "OHIO": "America/New_York",
        "PA": "America/New_York", "PENNSYLVANIA": "America/New_York",
        "RI": "America/New_York", "RHODE ISLAND": "America/New_York",
        "SC": "America/New_York", "SOUTH CAROLINA": "America/New_York",
        "VT": "America/New_York", "VERMONT": "America/New_York",
        "VA": "America/New_York", "VIRGINIA": "America/New_York",
        "WV": "America/New_York", "WEST VIRGINIA": "America/New_York",
        // Central
        "AL": "America/Chicago", "ALABAMA": "America/Chicago",
        "AR": "America/Chicago", "ARKANSAS": "America/Chicago",
        "IL": "America/Chicago", "ILLINOIS": "America/Chicago", "CHICAGO": "America/Chicago",
        "IA": "America/Chicago", "IOWA": "America/Chicago",
        "KS": "America/Chicago", "KANSAS": "America/Chicago",
        "KY": "America/Kentucky/Louisville", "KENTUCKY": "America/Kentucky/Louisville",
        "LA": "America/Chicago", "LOUISIANA": "America/Chicago",
        "MN": "America/Chicago", "MINNESOTA": "America/Chicago",
        "MS": "America/Chicago", "MISSISSIPPI": "America/Chicago",
        "MO": "America/Chicago", "MISSOURI": "America/Chicago",
        "NE": "America/Chicago", "NEBRASKA": "America/Chicago",
        "ND": "America/North_Dakota/Center", "NORTH DAKOTA": "America/North_Dakota/Center",
        "OK": "America/Chicago", "OKLAHOMA": "America/Chicago",
        "SD": "America/Chicago", "SOUTH DAKOTA": "America/Chicago",
        "TN": "America/Chicago", "TENNESSEE": "America/Chicago",
        "TX": "America/Chicago", "TEXAS": "America/Chicago", "DALLAS": "America/Chicago",
        "WI": "America/Chicago", "WISCONSIN": "America/Chicago",
        // Mountain
        "AZ": "America/Phoenix", "ARIZONA": "America/Phoenix", "PHOENIX": "America/Phoenix",
        "CO": "America/Denver", "COLORADO": "America/Denver", "DENVER": "America/Denver",
        "ID": "America/Boise", "IDAHO": "America/Boise",
        "MT": "America/Denver", "MONTANA": "America/Denver",
        "NM": "America/Denver", "NEW MEXICO": "America/Denver",
        "UT": "America/Denver", "UTAH": "America/Denver",
        "WY": "America/Denver", "WYOMING": "America/Denver",
        // Pacific
        "CA": "America/Los_Angeles", "CALIFORNIA": "America/Los_Angeles", "LOS ANGELES": "America/Los_Angeles",
        "NV": "America/Los_Angeles", "NEVADA": "America/Los_Angeles",
        "OR": "America/Los_Angeles", "OREGON": "America/Los_Angeles",
        "WA": "America/Los_Angeles", "WASHINGTON": "America/Los_Angeles", "SEATTLE": "America/Los_Angeles",
        // Non-contiguous
        "AK": "America/Anchorage", "ALASKA": "America/Anchorage", "ANCHORAGE": "America/Anchorage",
        "HI": "Pacific/Honolulu", "HAWAII": "Pacific/Honolulu", "HONOLULU": "Pacific/Honolulu",
        "PR": "America/Puerto_Rico", "PUERTO RICO": "America/Puerto_Rico"
    },
    "AU": {
        "default": "Australia/Sydney",
        "NSW": "Australia/Sydney", "NEW SOUTH WALES": "Australia/Sydney", "SYDNEY": "Australia/Sydney",
        "VIC": "Australia/Melbourne", "VICTORIA": "Australia/Melbourne", "MELBOURNE": "Australia/Melbourne",
        "QLD": "Australia/Brisbane", "QUEENSLAND": "Australia/Brisbane", "BRISBANE": "Australia/Brisbane",
        "WA": "Australia/Perth", "WESTERN AUSTRALIA": "Australia/Perth", "PERTH": "Australia/Perth",
        "SA": "Australia/Adelaide", "SOUTH AUSTRALIA": "Australia/Adelaide", "ADELAIDE": "Australia/Adelaide",
        "TAS": "Australia/Hobart", "TASMANIA": "Australia/Hobart", "HOBART": "Australia/Hobart",
        "NT": "Australia/Darwin", "NORTHERN TERRITORY": "Australia/Darwin", "DARWIN": "Australia/Darwin"
    },
    "CA": { // Canada
        "default": "America/Toronto",
        "ON": "America/Toronto", "ONTARIO": "America/Toronto", "TORONTO": "America/Toronto",
        "QC": "America/Toronto", "QUEBEC": "America/Toronto", "MONTREAL": "America/Toronto",
        "BC": "America/Vancouver", "BRITISH COLUMBIA": "America/Vancouver", "VANCOUVER": "America/Vancouver",
        "AB": "America/Edmonton", "ALBERTA": "America/Edmonton", "CALGARY": "America/Edmonton",
        "MB": "America/Winnipeg", "MANITOBA": "America/Winnipeg",
        "NS": "America/Halifax", "NOVA SCOTIA": "America/Halifax",
        "NL": "America/St_Johns", "NEWFOUNDLAND AND LABRADOR": "America/St_Johns"
    }
};

window.inferTimezone = function (countryCode, region) {
    if (!countryCode) return null;
    const upperCode = countryCode.toUpperCase();
    const mapping = TIMEZONE_MAP[upperCode];

    if (!mapping) return null;

    if (typeof mapping === 'string') {
        return mapping;
    }

    // Multi-timezone country
    if (region) {
        const upperRegion = region.trim().toUpperCase();
        if (mapping[upperRegion]) {
            return mapping[upperRegion];
        }
        // Partial matching (e.g. if the user enters "California (CA)")
        for (let key in mapping) {
            if (key !== "default" && upperRegion.includes(key)) {
                return mapping[key];
            }
        }
    }

    return mapping["default"] || null;
};
