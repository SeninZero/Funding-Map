# Funding-Map
Single-file static web app showing funding opportunities from a Google Sheet CSV on an interactive map.

Filters and sorting are reflected in the URL; copy it to share a view. Bookmarks are saved in the current browser and are not shared with the link. Comparing two to four records is temporary. Distance sorting requires explicit browser location permission and does not send the location to the spreadsheet. Amount sorting uses the first numeric figure without converting currencies; nonnumeric amounts sort last.

The existing CSV columns are `Fund name`, `Website`, `Sector focus`, `City`, `Funding amount`, `City geo lat`, and `City geo long`. Optional columns are `Funding stage`, `Funding type`, `Eligibility`, `Deadline`, `Mandate`, `Supported regions`, `Application process`, `Last verified`, `Verification status`, and `Source link`. Missing fields are shown as not provided, not inferred. Dates used for filtering, sorting, and verification warnings must be in ISO `YYYY-MM-DD` format. A record is flagged as stale when its verification date is over one year old.

The app loads Leaflet, MarkerCluster, Papa Parse, map tiles, and its published CSV over the network. A funder's city is a map location, not necessarily its supported geography.

Run the offline fixture-based interaction test with `node --test test-funding-map.js` (requires Google Chrome on the PATH). The test substitutes local fixtures and map stubs; it does not fetch the spreadsheet or external libraries.
