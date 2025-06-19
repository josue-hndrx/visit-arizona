/**
 * Standalone Algolia & Google Maps Integration (Final, Polished Version 3)
 *
 * This script powers a map-based search experience with Advanced Markers and a custom popup overlay.
 */

// --- CONFIGURATION ---
const ALGOLIA_CONFIG = {
  apiKey: "9ff98e053974ef9b01af86dfe17897f7",
  appId: "LF0CCFQRH3",
  indexName: "places_cms_items",
};

const PREFILTER_CONFIG = {
  Region: "#f-cards-filter_regions-prefilter",
  Amenities: "#f-cards-filter_amenities-prefilter",
  Categories: "#f-cards-filter_categories-prefilter",
  highlightTags: "#f-cards-filter_highlighttags-prefilter",
  Cities: "#f-cards-filter_cities-prefilter",
  placeType: {
    logic: "yesNoCheck",
    selectors: {
      // The keys here are the facet values we want to filter by
      "parks-monuments": "#f-cards-filter_pins-prefilter-parks",
      cities: "#f-cards-filter_pins-prefilter-cities",
      "american-indian": "#f-cards-filter_pins-prefilter-tribals",
      "rivers-lakes": "#f-cards-filter_pins-prefilter-rivers",
    },
  },
};

const SELECTORS = {
  searchBox: "#f-map-filter_searchbox",
  stats: "#f-map-filter_stats",
  mapListHits: "#f-map-filter_map-list-hits",
  mapCanvas: "#f-map-filter_map-canvas",
  filtersList: "#f-map-filter_place-type-list",
  prefiltersContainer: "#f-map-filter_prefilter-container",
};

const MAP_CONFIG = {
  defaultCenter: { lat: 34.2795424, lng: -111.406662 },
  defaultZoom: 6,
  mapId: "3b700e2e4c40105f8533da5d",
};

const FACET_LABEL_MAP = {
  Regions: {
    cities: "Cities & Towns",
    "parks-monuments": "Parks & Monuments",
    "rivers-lakes": "Rivers & Lakes",
    "american-indian": "American Indians",
  },
};

const FACET_ICON_MAP = {
  placeType: {
    cities:
      "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/6850e909fb6eff205ad3f992_cities.svg",
    "parks-monuments":
      "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/6850e90950b3f167c418c308_parks-monuments.svg",
    "rivers-lakes":
      "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/6850e9092f026d90c254477d_rivers-lakes.svg",
    "american-indian":
      "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/6850e9099cc6aa8c8688135c_tribal-lands.svg",
  },
};

const FACET_COLOR_MAP = {
  "parks-monuments": "var(--colors-brand--dark-green)",
  cities: "var(--colors-brand--orange)",
  "american-indian": "var(--colors-brand--brown-darker)",
  "rivers-lakes": "var(--colors-brand--duck-blue)",
};

// --- GLOBAL STATE & UTILITIES ---
const searchClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
let map;
let AdvancedMarkerElement;
let CustomPopup;
let currentMarkers = {};
let activeMarker = null;
let currentPopup = null;
let hasInitialZoomed = false;

// --- 1. GET ALL OUR ELEMENTS ---
const drawer = document.querySelector(
  ".f-cards-grid-layout-1_map-list-wrapper"
);
const handle = document.getElementById("drawer-handle");
const openTrigger = document.getElementById("filters-trigger-button");
const closeTrigger = document.getElementById("drawer-close-button");

if (!drawer || !handle || !openTrigger || !closeTrigger) {
  console.error("One or more essential drawer elements are missing!");
} else {
  // --- 2. DEFINE STATE VARIABLES ---
  let isDragging = false;
  let startY;
  let startTransform;

  // --- 3. EVENT LISTENERS FOR OPEN/CLOSE BUTTONS ---
  openTrigger.addEventListener("click", openDrawer);
  closeTrigger.addEventListener("click", closeDrawer);

  function openDrawer() {
    drawer.classList.add("is-open");
    // We remove the inline style to let the CSS class handle the final position
    drawer.style.transform = "";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    // We remove the inline style to let the CSS class handle the final position
    drawer.style.transform = "";
  }

  // --- 4. TOUCH EVENT LISTENERS FOR DRAGGING ---
  handle.addEventListener("touchstart", onDragStart, { passive: false });
  handle.addEventListener("touchmove", onDragMove, { passive: false });
  handle.addEventListener("touchend", onDragEnd);

  // Also add mouse events for desktop testing
  handle.addEventListener("mousedown", onDragStart);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);

  function onDragStart(e) {
    // Only drag with the primary mouse button or a touch
    if (e.type === "mousedown" && e.button !== 0) return;

    isDragging = true;
    // Disable CSS transitions for instant feedback
    drawer.classList.add("is-dragging");

    // Record the starting Y position
    startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

    // Record the drawer's initial transform value
    const currentTransform = window
      .getComputedStyle(drawer)
      .getPropertyValue("transform");
    if (currentTransform && currentTransform !== "none") {
      startTransform = new DOMMatrix(currentTransform).m42; // m42 is the translateY value
    } else {
      startTransform = drawer.classList.contains("is-open")
        ? 0
        : window.innerHeight;
    }
  }

  function onDragMove(e) {
    if (!isDragging) return;

    // This is important to prevent the page from scrolling on mobile
    e.preventDefault();

    const currentY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
    const deltaY = currentY - startY;
    let newTransform = startTransform + deltaY;

    // --- Clamp the drag to stay within bounds ---
    const minTransform = 0; // Fully open
    const maxTransform = drawer.clientHeight - 60; // Fully collapsed (drawer height - handle height)
    newTransform = Math.max(minTransform, Math.min(newTransform, maxTransform));

    // Apply the new position directly as an inline style
    drawer.style.transform = `translateY(${newTransform}px)`;
  }

  function onDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    // Re-enable CSS transitions for the "snap" animation
    drawer.classList.remove("is-dragging");

    // --- Decide where to snap ---
    // Get the final position of the drawer
    const finalTransform = new DOMMatrix(
      window.getComputedStyle(drawer).getPropertyValue("transform")
    ).m42;
    const drawerMidPoint = drawer.clientHeight / 2;

    // If the drawer is dragged more than halfway down, snap it closed. Otherwise, snap it open.
    if (finalTransform > drawerMidPoint) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }
}

/**
 * Zooms and centers the map to fit all current markers
 * @param {Array} hits - Array of hit objects from Algolia
 * @param {Object} options - Configuration options
 */
function autoZoomToResults(hits, options = {}) {
  if (!map || !hits || hits.length === 0) {
    return;
  }

  const { padding = 50, maxZoom = 15 } = options;

  const validHits = hits.filter(
    (hit) => hit._geoloc && hit._geoloc.lat && hit._geoloc.lng
  );

  if (validHits.length === 0) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  validHits.forEach((hit) => {
    bounds.extend(new google.maps.LatLng(hit._geoloc.lat, hit._geoloc.lng));
  });

  if (validHits.length === 1) {
    map.panTo(validHits[0]._geoloc);
    map.setZoom(maxZoom);
    return;
  }

  map.fitBounds(bounds, padding);
}

/**
 * Scans the DOM for pre-filter elements and formats them for Algolia.
 * Handles two types of logic based on PREFILTER_CONFIG:
 * 1. Simple string selector: Finds all `[data-prefilter]` attributes within a container.
 * 2. Object with `logic: 'yesNoCheck'`: Checks specific selectors for 'yes' as innerText.
 * @returns {string[]} An array of facet filter strings, e.g., ["Region:taranaki", "placeType:rivers-lakes"].
 */
function getPrefiltersFromDOM() {
  const facetFilters = [];

  // Loop through each top-level key in the config (e.g., 'Region', 'placeType')
  for (const attributeName in PREFILTER_CONFIG) {
    const configValue = PREFILTER_CONFIG[attributeName];

    // --- NEW "yes/no" LOGIC ---
    // Check if the config is an object with our special logic flag
    if (typeof configValue === "object" && configValue.logic === "yesNoCheck") {
      const selectors = configValue.selectors;
      // Loop through the facet values and their corresponding selectors
      for (const facetValue in selectors) {
        const selector = selectors[facetValue];
        const element = document.querySelector(selector);

        // If the element exists and its text content is 'yes', create the filter
        if (element && element.innerText.trim().toLowerCase() === "yes") {
          facetFilters.push(`${attributeName}:${facetValue}`);
          // We could add a 'break;' here if you only ever expect one to be 'yes'
        }
      }
    }
    // --- ORIGINAL `data-prefilter` LOGIC ---
    // Check if the config is a simple string (the original way)
    else if (typeof configValue === "string") {
      const container = document.querySelector(configValue);
      if (container) {
        const prefilterElements =
          container.querySelectorAll("[data-prefilter]");
        prefilterElements.forEach((el) => {
          const filterValue = el.dataset.prefilter;
          if (filterValue) {
            facetFilters.push(`${attributeName}:${filterValue}`);
          }
        });
      }
    }
  }

  console.log("Applying pre-filters:", facetFilters); // For debugging
  return facetFilters;
}

function groupPrefilters(prefilterArray) {
  return prefilterArray.reduce((grouped, filter) => {
    const [attribute, value] = filter.split(":");
    grouped[attribute] = grouped[attribute]
      ? [...grouped[attribute], value]
      : [value];
    return grouped;
  }, {});
}

function injectDynamicStyles() {
  let cssRules = "";
  for (const placeType in FACET_COLOR_MAP) {
    const color = FACET_COLOR_MAP[placeType];
    const iconUrl = FACET_ICON_MAP.placeType[placeType];
    if (color) {
      cssRules += `.f-map-filter_filter-collection-item.is-active[data-value="${placeType}"] { background-color: ${color}; color: white; }\n`;
    }
    if (iconUrl) {
      const iconClass = `.icon--placeType-${placeType.replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      )}`;
      cssRules += `${iconClass} { background-image: url('${iconUrl}'); }\n`;
      cssRules += `.f-map-filter_filter-collection-item.is-active ${iconClass} { background-image: none; -webkit-mask-image: url('${iconUrl}'); mask-image: url('${iconUrl}'); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; background-color: white; }\n`;
    }
  }
  if (cssRules) {
    const styleElement = document.createElement("style");
    styleElement.textContent = cssRules;
    document.head.appendChild(styleElement);
  }
}

injectDynamicStyles();

async function initializeMap() {
  const mapContainer = document.getElementById(SELECTORS.mapCanvas.slice(1));
  if (!mapContainer) {
    return null;
  }
  try {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement: MarkerLib } =
      await google.maps.importLibrary("marker");
    AdvancedMarkerElement = MarkerLib;
    return new Map(mapContainer, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      mapId: MAP_CONFIG.mapId,
      mapTypeControl: false,
      streetViewControl: false,
    });
  } catch (error) {
    console.error("Error loading Google Maps libraries:", error);
    return null;
  }
}

// UPDATED: Now has single smooth pan logic
function handleMarkerOrResultClick(hit) {
  if (activeMarker) {
    activeMarker.marker.content.classList.remove("is-active");
    const oldListItem = document.querySelector(
      `.f-map-filter_item-card[data-object-id="${activeMarker.hit.objectID}"]`
    );
    if (oldListItem) oldListItem.classList.remove("is-active");
    activeMarker = null;
  }

  if (currentPopup) {
    currentPopup.setMap(null);
    currentPopup = null;
  }

  if (!hit) return;

  const newMarker = currentMarkers[hit.objectID];
  const newListItem = document.querySelector(
    `.f-map-filter_item-card[data-object-id="${hit.objectID}"]`
  );

  if (newMarker) {
    // --- Single Smooth Pan Logic ---
    const projection = map.getProjection();
    if (projection) {
      const point = projection.fromLatLngToPoint(newMarker.position);
      // Offset the center point by -150px on the Y axis to move the map down
      const newPoint = new google.maps.Point(
        point.x,
        point.y - 150 / Math.pow(2, map.getZoom())
      );
      const newCenter = projection.fromPointToLatLng(newPoint);
      map.panTo(newCenter);
    } else {
      // Fallback for when projection is not ready
      map.panTo(newMarker.position);
    }

    newMarker.content.classList.add("is-active");
    activeMarker = { marker: newMarker, hit: hit };

    const popupContent = document.createElement("div");
    const placeTypeTag = formatFacetValue(hit.placeType, "Regions");
    const color = FACET_COLOR_MAP[hit.placeType] || "#333";
    const iconUrl = FACET_ICON_MAP.placeType[hit.placeType] || "";

    // UPDATED: Popup HTML with colored elements, icon, and restored button structure
    popupContent.innerHTML = `
          <div class="f-map-filter_info-card">
            <div class="f-map-filter_info-card-header">
              <div class="f-map-filter_info-card-head-content">
                 <div class="info-pane-icon-container" style="background-color: ${color};">
                    <img src="${iconUrl}" alt="${placeTypeTag}">
                 </div>
                <div class="f-map-filter_info-card-head-text-content">
                  <div class="f-map-filter_info-card-heading">${hit.Name}</div>
                  <div class="f-map-filter_info-card-tag" style="color: ${color};">${placeTypeTag}</div>
                </div>
              </div>
              <div id="popup-close-button" class="f-map-filter_info-card-close-button w-embed">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none"><rect x="0.759766" y="0.757812" width="20.48" height="20.48" rx="2.56" fill="#F6F6F6"></rect><path fill-rule="evenodd" clip-rule="evenodd" d="M11 11.1269L7.85691 14.27L7.5957 14.0088L10.7388 10.8657L7.85691 7.98387L8.11811 7.72266L11 10.6045L13.8819 7.72266L14.1431 7.98386L11.2612 10.8657L14.4043 14.0088L14.1431 14.27L11 11.1269Z" fill="#939392" stroke="#780C57" stroke-width="0.64"></path></svg>
              </div>
            </div>
            <img src="${hit.thumbnailImage}" loading="lazy" alt="${
      hit.thumbnailAltText || hit.Name
    }" class="f-map-filter_info-card-image">
            <div class="f-map-filter_info-card-bottom">
              <div class="f-map-filter_info-card-about-text">About this location</div>
              <p class="f-map-filter_info-card-paragraph">${
                hit.description || ""
              }</p>
              <a href="${
                hit.webflowLink || "#"
              }" target="_blank" class="arizona-button w-inline-block" style="background-color: ${color};">
                <div>Know more</div>
                <div class="arizona-button_arrow">
                  <div class="arizona-arrow-icon w-embed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                      <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="white"></path>
                    </svg>
                  </div>
                  <div class="arizona-arrow-icon is-second w-embed">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                       <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="${color}"></path>
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        `;

    popupContent
      .querySelector("#popup-close-button")
      .addEventListener("click", () => handleMarkerOrResultClick(null));
    currentPopup = new CustomPopup(newMarker.position, popupContent);
    currentPopup.setMap(map);
  }

  if (newListItem) {
    newListItem.classList.add("is-active");
    newListItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function updateMapMarkers(hits) {
  if (!map || !AdvancedMarkerElement) return;
  const newHitIds = new Set(hits.map((hit) => hit.objectID));

  for (const objectID in currentMarkers) {
    if (!newHitIds.has(objectID)) {
      currentMarkers[objectID].map = null;
      delete currentMarkers[objectID];
    }
  }

  hits.forEach((hit) => {
    if (!currentMarkers[hit.objectID] && hit._geoloc?.lat && hit._geoloc?.lng) {
      const markerContent = document.createElement("div");
      markerContent.classList.add("advanced-marker");
      const color = FACET_COLOR_MAP[hit.placeType];
      if (color) markerContent.style.backgroundColor = color;
      const iconUrl = FACET_ICON_MAP.placeType[hit.placeType];
      if (iconUrl)
        markerContent.innerHTML = `<img src="${iconUrl}" alt="${hit.placeType}">`;
      const marker = new AdvancedMarkerElement({
        position: hit._geoloc,
        map: map,
        title: hit.Name,
        content: markerContent,
      });
      marker.addListener("click", () => handleMarkerOrResultClick(hit));
      currentMarkers[hit.objectID] = marker;
    }
  });
}

function formatFacetValue(str, attributeName) {
  if (!str) return "";
  if (
    attributeName &&
    FACET_LABEL_MAP[attributeName] &&
    FACET_LABEL_MAP[attributeName][str]
  ) {
    return FACET_LABEL_MAP[attributeName][str];
  }
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function setupMapSearch() {
  const createRefinementListItemTemplate =
    (attributeName) =>
    (item, { html }) => {
      const placeTypeTag = formatFacetValue(item.label, "Regions");
      const iconClass = `icon--placeType-${item.value.replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      )}`;
      return html`<a
        href="#"
        class="f-map-filter_filter-collection-item ${item.isRefined
          ? "is-active"
          : ""}"
        data-value="${item.value}"
      >
        <span
          class="f-cards-grid-layout-1_filter-item-icon ${iconClass}"
        ></span>
        <div class="f-cards-grid-layout-1_filter-name-and-result">
          ${placeTypeTag}
          <span class="facet-count"> (${item.count})</span>
        </div>
      </a>`;
    };

  const prefiltersArray = getPrefiltersFromDOM(); // CHANGED: Call this once at the top
  const prefilters = groupPrefilters(prefiltersArray);
  const initialPrefiltersApplied = prefiltersArray.length > 0; // ADDED: The flag we'll use later

  const mapSearch = instantsearch({
    indexName: ALGOLIA_CONFIG.indexName,
    searchClient,
    routing: false,
    initialUiState: {
      [ALGOLIA_CONFIG.indexName]: {
        refinementList: prefilters,
      },
    },
  });

  const customInfiniteHits = instantsearch.connectors.connectInfiniteHits(
    (renderOptions, isFirstRender) => {
      const { hits, showMore, isLastPage, widgetParams } = renderOptions;
      const container = widgetParams.container;

      if (isFirstRender) {
        container.innerHTML = `<div class="hits-container"></div>`;
        container.addEventListener("click", (event) => {
          event.preventDefault();
          const listItem = event.target.closest(".f-map-filter_item-card");
          const objectId = listItem ? listItem.dataset.objectId : null;
          if (objectId) {
            const marker = currentMarkers[objectId];
            if (marker) {
              google.maps.event.trigger(marker, "click");
            } else {
              console.warn(`Marker with ObjectID ${objectId} not found.`);
            }
          }
        });
      }

      const hitsContainer = container.querySelector(".hits-container");
      if (!isFirstRender) handleMarkerOrResultClick(null);

      if (hits.length === 0) {
        hitsContainer.innerHTML = `<div class="f-map-filter_no-results">No results found.</div>`;
      } else {
        // UPDATED: Replaced text tag with icon tag and added heart icon back
        hitsContainer.innerHTML = hits
          .map((hit) => {
            const placeholderImage =
              "https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg";
            const color = FACET_COLOR_MAP[hit.placeType] || "#333";
            const iconUrl = FACET_ICON_MAP.placeType[hit.placeType] || "";

            return `
              <a href="#" data-object-id="${
                hit.objectID
              }" class="f-map-filter_item-card w-inline-block">
                <div class="f-map-filter_item-card-image-wrapper">
                  <img src="${
                    hit.thumbnailImage || placeholderImage
                  }" loading="lazy" alt="${
              hit.thumbnailAltText || hit.Name
            }" class="f-map-filter_item-card-image">
                  <div class="list-item-icon-tag" style="background-color: ${color};">
                    <img src="${iconUrl}" alt="${hit.placeType}">
                  </div>
                  <div class="f-map-filter_item-card-heart w-embed">
                     <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 22 22" fill="none"><rect x="1" y="1.25" width="19.84" height="19.84" rx="4.096" fill="white"></rect><path fill-rule="evenodd" clip-rule="evenodd" d="M10.9205 7.45974C10.328 6.65309 9.37302 6.12891 8.2963 6.12891C6.50046 6.12891 5.04297 7.58723 5.04297 9.38309C5.04297 10.7181 5.95213 12.1249 7.07881 13.3131C8.68715 15.0098 10.6972 16.2731 10.6972 16.2731C10.8338 16.359 11.0072 16.359 11.1438 16.2731C11.1438 16.2731 13.1538 15.0098 14.7622 13.3131C15.8888 12.1248 16.798 10.7181 16.798 9.38309C16.798 7.58725 15.3405 6.12891 13.5447 6.12891C12.468 6.12891 11.5131 6.65307 10.9205 7.45974ZM10.5322 8.46975C10.5964 8.62808 10.7497 8.73142 10.9205 8.73142C11.0905 8.73142 11.2447 8.62809 11.3088 8.46975C11.6697 7.58975 12.5347 6.96891 13.5446 6.96891C14.8771 6.96891 15.9587 8.05057 15.9587 9.38299C15.9587 10.5321 15.122 11.713 14.152 12.7355C12.932 14.023 11.4704 15.0481 10.9204 15.4154C10.3704 15.0479 8.90791 14.0229 7.68884 12.7355C6.71883 11.713 5.88216 10.5322 5.88216 9.38299C5.88216 8.05049 6.96382 6.96891 8.29624 6.96891C9.30624 6.96891 10.1715 7.58975 10.5322 8.46975Z" fill="black"></path></svg>
                  </div>
                </div>
                <div class="f-map-filter_item-card-content">
                  <div class="f-map-filter_item-card-content-head">
                    <h3 class="f-map-filter_item-card-h3">${instantsearch.highlight(
                      { attribute: "Name", hit }
                    )}</h3>
                    <div class="f-map-filter_item-card-arrow-button w-embed">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" fill="none">
                        <rect x="0.5" y="0.5" width="25" height="25" rx="4" fill="${color}"></rect>
                        <rect x="1" y="1" width="24" height="24" rx="3.5" stroke="white" stroke-opacity="0.08"></rect>
                        <path d="M8.43555 12.447C8.13016 12.447 7.88259 12.6946 7.88259 13C7.88259 13.3054 8.13016 13.553 8.43555 13.553V12.447ZM17.9552 13.391C18.1712 13.1751 18.1712 12.8249 17.9552 12.609L14.4362 9.08998C14.2203 8.87404 13.8702 8.87404 13.6542 9.08998C13.4383 9.30593 13.4383 9.65604 13.6542 9.87199L16.7822 13L13.6542 16.128C13.4383 16.344 13.4383 16.6941 13.6542 16.91C13.8702 17.126 14.2203 17.126 14.4362 16.91L17.9552 13.391ZM8.43555 13V13.553L17.5642 13.553V13V12.447L8.43555 12.447V13Z" fill="white"></path>
                      </svg>
                    </div>
                  </div>
                  <p class="f-map-filter_item-card-paragraph">${
                    instantsearch.snippet({ attribute: "description", hit }) ||
                    ""
                  }</p>
                </div>
              </a>
            `;
          })
          .join("");
      }

      if (isFirstRender) {
        const sentinel = document.createElement("div");
        sentinel.id = "infinite-scroll-sentinel";
        container.appendChild(sentinel);
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isLastPage) showMore();
          });
        });
        observer.observe(sentinel);
      }
    }
  );

  mapSearch.addWidgets([
    instantsearch.widgets.configure({ hitsPerPage: 75 }),
    instantsearch.widgets.searchBox({
      container: SELECTORS.searchBox,
      placeholder: "Looking for something? Start typing.",
    }),
    instantsearch.widgets.stats({ container: SELECTORS.stats }),
    instantsearch.widgets.refinementList({
      container: SELECTORS.filtersList,
      attribute: "placeType",
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("placeType") },
    }),

    instantsearch.widgets.refinementList({
      container: SELECTORS.prefiltersContainer,
      attribute: "Region",
      sortBy: ["name:asc"],
    }),

    customInfiniteHits({
      container: document.querySelector(SELECTORS.mapListHits),
    }),
    instantsearch.connectors.connectGeoSearch(
      (renderOptions, isFirstRender) => {
        const { items } = renderOptions;
        updateMapMarkers(items);

        if (!hasInitialZoomed && items.length > 0) {
          if (initialPrefiltersApplied) {
            autoZoomToResults(items, {
              padding: 80,
              maxZoom: 12,
              minZoom: 6,
            });
            hasInitialZoomed = true;
          } else if (isFirstRender) {
            // No prefilters, use default zoom/center only on true first render
            const bounds = new google.maps.LatLngBounds();
            items.forEach((hit) => {
              if (hit._geoloc) bounds.extend(hit._geoloc);
            });
            map.fitBounds(bounds);
            hasInitialZoomed = true; // Crucial: set the flag
          }
        }
      }
    )({}),
  ]);

  mapSearch.start();

  let isMapMoving = false;
  let searchOnIdle;
  map.addListener("dragstart", () => {
    isMapMoving = true;
    clearTimeout(searchOnIdle);
  });
  map.addListener("idle", () => {
    if (isMapMoving) {
      isMapMoving = false;
      clearTimeout(searchOnIdle);
      searchOnIdle = setTimeout(() => {
        const bounds = map.getBounds();
        if (bounds) {
          handleMarkerOrResultClick(null);
          mapSearch.helper
            .setQueryParameter("insideBoundingBox", bounds.toUrlValue())
            .search();
        }
      }, 200);
    }
  });
  map.addListener("zoom_changed", () => {
    isMapMoving = true;
  });
}

async function initAlgoliaMap() {
  map = await initializeMap();
  if (!map) return;

  CustomPopup = class extends google.maps.OverlayView {
    constructor(position, content) {
      super();
      this.position = position;
      this.content = content;
      this.content.classList.add("custom-popup-container");
      this.anchor = document.createElement("div");
      this.anchor.classList.add("popup-anchor");
      this.stopEventPropagation();
    }
    onAdd() {
      this.getPanes().floatPane.appendChild(this.anchor);
      this.anchor.appendChild(this.content);
    }
    onRemove() {
      if (this.anchor.parentElement)
        this.anchor.parentElement.removeChild(this.anchor);
    }
    draw() {
      const divPosition = this.getProjection().fromLatLngToDivPixel(
        this.position
      );
      if (divPosition) {
        this.anchor.style.left = `${divPosition.x}px`;
        this.anchor.style.top = `${divPosition.y}px`;
      }
    }
    stopEventPropagation() {
      const events = [
        "click",
        "dblclick",
        "mousedown",
        "mouseup",
        "pointerdown",
        "pointerup",
        "touchstart",
        "touchend",
        "wheel",
      ];
      events.forEach((event) =>
        this.content.addEventListener(event, (e) => e.stopPropagation())
      );
    }
  };

  setupMapSearch();
}

window.initAlgoliaMap = initAlgoliaMap;
