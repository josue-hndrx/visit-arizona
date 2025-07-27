# Visit Arizona - Algolia Search Components

This repository contains JavaScript modules for powering search and display functionality on the Visit Arizona website using Algolia InstantSearch.js and Google Maps integration.

## 🏗️ Architecture Overview

The system consists of three main component types:

1. **Card Grids** - Searchable, filterable card displays with pagination
2. **Interactive Maps** - Google Maps with Algolia-synced pins and listings  
3. **Search Navigation** - Site-wide search functionality with URL parameter handling

## 📂 Component Files

### Card Grid Components
- `event-cards-grid.js` - Events with custom date filtering
- `experience-cards-grid.js` - General experiences grid
- `experiences-cards-grid-fancy-filters.js` - Enhanced filtering UI
- `experiences-cards-grid-simple-filters.js` - Basic filtering UI

### Map Components  
- `algolia-google-maps-experiences.js` - Experiences map
- `algolia-google-maps-places.js` - Places/destinations map

### Search Components
- `algolia-search.js` - Main search results page
- `algolia-search-nav-redirect.js` - Navigation search handlers

### Styles
- `styles.css` - General component styles
- `map-styles.css` - Google Maps specific styles

## 🎯 Card Grid Components

Card grids provide a comprehensive search and filter experience with real-time updates.

### Core Features

- **Real-time Search** - Algolia InstantSearch with snappy user feedback
- **Comprehensive Filtering** - Modal filters with live item counts
- **Active Filter Display** - Color-coded removable tags above search bar
- **Smart Pagination** - Fast loading with easy navigation
- **Prefiltering** - Integration with Webflow CMS data

### Technical Implementation

#### Prefiltering from Webflow CMS

Components scan the DOM for prefilter elements defined in Webflow:

```javascript
const PREFILTER_CONFIG = {
  Regions: "#f-cards-filter_regions-prefilter",
  Amenities: "#f-cards-filter_amenities-prefilter", 
  Categories: "#f-cards-filter_categories-prefilter",
  highlightTags: "#f-cards-filter_highlighttags-prefilter",
  Cities: "#f-cards-filter_cities-prefilter",
};

function getPrefiltersFromDOM() {
  const facetFilters = [];
  for (const attributeName in PREFILTER_CONFIG) {
    const container = document.querySelector(PREFILTER_CONFIG[attributeName]);
    if (container) {
      const prefilterElements = container.querySelectorAll("[data-prefilter]");
      prefilterElements.forEach((el) => {
        const filterValue = el.dataset.prefilter;
        if (filterValue) {
          facetFilters.push(`${attributeName}:${filterValue}`);
        }
      });
    }
  }
  return facetFilters;
}
```

#### Dynamic Icon Injection

Icons are injected as CSS background images for consistent styling:

```javascript
const FACET_ICON_MAP = {
  Regions: {
    "tucson-southern-arizona": "https://cdn.prod.website-files.com/...",
    "greater-phoenix-and-scottsdale": "https://cdn.prod.website-files.com/...",
    // ...
  },
  Categories: {
    "outdoors": "https://cdn.prod.website-files.com/...",
    "culinary": "https://cdn.prod.website-files.com/...",
    // ...
  }
};

function injectFacetIconStyles() {
  let cssRules = "";
  for (const attribute in FACET_ICON_MAP) {
    for (const value in FACET_ICON_MAP[attribute]) {
      const url = FACET_ICON_MAP[attribute][value];
      const sanitizedValue = value.replace(/[^a-zA-Z0-9-_]/g, "-");
      const className = `icon--${attribute}-${sanitizedValue}`;
      cssRules += `.${className} { background-image: url('${url}'); }\n`;
    }
  }
  
  const styleElement = document.createElement("style");
  styleElement.textContent = cssRules;
  document.head.appendChild(styleElement);
}
```

#### Custom Facet Labels

Slug-like values are converted to human-readable labels:

```javascript
const FACET_LABEL_MAP = {
  Regions: {
    "tucson-southern-arizona": "Tucson & Southern Arizona",
    "greater-phoenix-and-scottsdale": "Greater Phoenix and Scottsdale",
    // ...
  }
};

function formatFacetValue(str, attributeName) {
  // Check for custom label first
  if (attributeName && 
      FACET_LABEL_MAP[attributeName] && 
      FACET_LABEL_MAP[attributeName][str]) {
    return FACET_LABEL_MAP[attributeName][str];
  }
  
  // Fallback to auto-formatting
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
```

### Event-Specific Features

The `event-cards-grid.js` includes sophisticated date filtering:

#### Arizona Timezone Handling

```javascript
function getArizonaNow() {
  const now = new Date();
  const utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000);
  const arizonaOffsetMillis = -7 * 60 * 60 * 1000; // UTC-7, no DST
  return new Date(utcMillis + arizonaOffsetMillis);
}
```

#### Smart Date Range Calculations

```javascript
function getTodayRange() {
  const arizonaNow = moment.tz('America/Phoenix');
  const start = arizonaNow.clone().startOf('day');
  const end = arizonaNow.clone().endOf('day');
  
  return {
    start: start.unix(),
    end: end.unix(),
  };
}

function getThisWeekendRange() {
  const arizonaNow = getArizonaNow();
  const dayOfWeek = arizonaNow.getDay(); // Sunday = 0, Saturday = 6
  
  // Find the upcoming Saturday
  const start = new Date(arizonaNow);
  start.setDate(arizonaNow.getDate() + (6 - dayOfWeek));
  start.setHours(0, 0, 0, 0);
  
  // Find the upcoming Sunday  
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(23, 59, 59, 999);
  
  // Convert to UTC timestamps
  const arizonaOffsetMillis = -7 * 60 * 60 * 1000;
  const startUTC = new Date(start.getTime() - arizonaOffsetMillis);
  const endUTC = new Date(end.getTime() - arizonaOffsetMillis);
  
  return {
    start: Math.floor(startUTC.getTime() / 1000),
    end: Math.floor(endUTC.getTime() / 1000),
  };
}
```

#### Custom Date Filter Widget

Events use a custom InstantSearch widget for date filtering:

```javascript
const customDateFilter = {
  _helper: null,
  _currentRange: null,
  _picker: null,
  
  init(initOptions) {
    this._helper = initOptions.helper;
    // Initialize daterangepicker and quick-pick buttons
  },
  
  _applyAlgoliaRefinement(start, end) {
    if (this._helper) {
      let newState = this._helper.state
        .clearRefinements("startTimestamp")
        .clearRefinements("endTimestamp")
        .addNumericRefinement("startTimestamp", "<=", end.clone().endOf('day').unix())
        .addNumericRefinement("endTimestamp", ">=", start.clone().startOf('day').unix());
      
      this._helper.setState(newState).search();
    }
  }
};
```

## 🗺️ Interactive Map Components

Maps provide an interactive experience with synchronized Algolia search and Google Maps pins.

### Core Features

- **Synchronized Display** - Hits list synced with map pins
- **Click Interactions** - Clicking hits or pins activates corresponding elements
- **Bounds-Based Search** - Moving map triggers new search with map bounds
- **Type-Based Styling** - Different pin colors/icons based on place type
- **Performance Optimization** - Limited to 75 results for optimal performance

### Technical Implementation

#### Map Bounds Integration

```javascript
// Configure widget sets pagination limit for performance
instantsearch.widgets.configure({
  hitsPerPage: 75,
  attributesToSnippet: ["description:10"],
})

// Custom map bounds connector
const mapBounds = instantsearch.connectors.connectGeoSearch(
  (renderOptions, isFirstRender) => {
    const { items, refine } = renderOptions;
    
    if (isFirstRender) {
      // Initialize map
      initMap().then(() => {
        // Set up map event listeners
        map.addListener("bounds_changed", () => {
          if (!isProgrammaticPan) {
            clearTimeout(searchOnIdle);
            searchOnIdle = setTimeout(() => {
              const bounds = map.getBounds();
              const boundsObject = {
                northEast: {
                  lat: bounds.getNorthEast().lat(),
                  lng: bounds.getNorthEast().lng(),
                },
                southWest: {
                  lat: bounds.getSouthWest().lat(), 
                  lng: bounds.getSouthWest().lng(),
                },
              };
              refine(boundsObject);
            }, 500);
          }
        });
      });
    }
    
    updateMapMarkers(items);
  }
);
```

#### Advanced Markers with Custom Styling

```javascript
function createAdvancedMarker(hit) {
  const iconUrl = getIconForPlaceType(hit.placeType);
  const color = getColorForPlaceType(hit.placeType);
  
  const markerElement = document.createElement('div');
  markerElement.className = 'custom-marker';
  markerElement.innerHTML = `
    <div class="marker-content" style="background-color: ${color}">
      <img src="${iconUrl}" alt="${hit.placeType}" />
    </div>
  `;
  
  const marker = new AdvancedMarkerElement({
    map: map,
    position: { lat: hit._geoloc.lat, lng: hit._geoloc.lng },
    content: markerElement,
    title: hit.Name,
  });
  
  marker.addListener('click', () => {
    activateMarker(marker, hit);
  });
  
  return marker;
}
```

#### Place Type Filtering

Maps include toggle filters for different place types:

```javascript
const PREFILTER_CONFIG = {
  placeType: {
    logic: "yesNoCheck",
    selectors: {
      "parks-monuments": "#f-cards-filter_pins-prefilter-parks",
      "cities": "#f-cards-filter_pins-prefilter-cities", 
      "american-indian": "#f-cards-filter_pins-prefilter-tribals",
      "rivers-lakes": "#f-cards-filter_pins-prefilter-rivers",
    },
  },
};

// OR logic for place type filters
function getPlaceTypeFilters() {
  const activeFilters = [];
  for (const [value, selector] of Object.entries(PREFILTER_CONFIG.placeType.selectors)) {
    const element = document.querySelector(selector);
    if (element && element.checked) {
      activeFilters.push(`placeType:${value}`);
    }
  }
  return activeFilters;
}
```

## 🔍 Search Navigation

The search system provides site-wide search functionality with synchronized inputs.

### URL Parameter Handling

```javascript
const algoliaQueryKey = "prod_arizona_sitewide[query]";
const searchResultsPage = "/search-results";

function handleRedirect(query) {
  if (!query) return;
  
  const encodedKey = encodeURIComponent(algoliaQueryKey);
  const encodedValue = encodeURIComponent(query);
  const redirectUrl = `${searchResultsPage}?${encodedKey}=${encodedValue}`;
  
  window.location.href = redirectUrl;
}
```

### Synchronized Search Inputs

All search inputs across the site stay synchronized:

```javascript
const searchInputs = document.querySelectorAll(".search_input");
const searchButtons = document.querySelectorAll(".search_button");

// Listen for Enter key on all inputs
searchInputs.forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = event.target.value.trim();
      handleRedirect(query);
    }
  });
});

// Handle search button clicks
searchButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const container = event.target.closest(".search");
    const input = container.querySelector(".search_input");
    if (input) {
      const query = input.value.trim();
      handleRedirect(query);
    }
  });
});
```

### Search Results Page

The main search page uses Algolia's crawler index:

```javascript
const indexName = "prod_arizona_sitewide";

const search = instantsearch({
  indexName: indexName,
  searchClient,
  routing: true,
  searchFunction(helper) {
    // Only search if there is a query
    if (helper.state.query) {
      helper.search();
    }
  },
});
```

## 🔧 Configuration

### Algolia Settings

```javascript
const searchClient = algoliasearch(
  "LF0CCFQRH3",  // Application ID
  "9ff98e053974ef9b01af86dfe17897f7" // Search API Key
);
```

### Index Names
- `events_cms_items` - Events data
- `experiences_cms_items` - Experiences data  
- `prod_arizona_sitewide` - Site-wide content (crawler-generated)

### Performance Considerations

1. **Map Components**: Limited to 75 results to balance coverage with performance
2. **Crawler Updates**: Site-wide index crawls every 7 days for fresh content while controlling costs
3. **Lazy Loading**: Components only initialize after DOM ready
4. **Debounced Search**: Map bounds changes are debounced by 500ms

## 📱 Responsive Behavior

- **Desktop**: 5 search bars (4 in main tabs + 1 in sidebar)
- **Mobile**: 1 search bar in main menu  
- **All search inputs**: Synchronized via site-wide JavaScript (not in this repo)

## 🚀 Getting Started

1. Include the appropriate component file in your page
2. Ensure required DOM containers exist with correct IDs
3. Set up Webflow CMS prefilter elements with `data-prefilter` attributes
4. Initialize Google Maps API for map components
5. Include required external dependencies (moment.js, daterangepicker, etc.)

## 🔗 Dependencies

- Algolia InstantSearch.js
- Google Maps JavaScript API (for map components)
- Moment.js + Moment Timezone (for date components)
- Bootstrap Daterangepicker (for date components)
- jQuery (legacy dependency for daterangepicker)

This system provides a powerful, flexible search experience tailored specifically for Arizona tourism content with sophisticated filtering, mapping, and date handling capabilities. 