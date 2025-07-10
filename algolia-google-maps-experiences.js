/**
 * Standalone Algolia & Google Maps Integration (Final, Polished Version 3)
 *
 * This script powers a map-based search experience with Advanced Markers and a custom popup overlay.
 */

// --- CONFIGURATION ---
const ALGOLIA_CONFIG = {
  apiKey: "9ff98e053974ef9b01af86dfe17897f7",
  appId: "LF0CCFQRH3",
  indexName: "experiences_cms_items",
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
    "american-indian": "Tribal Lands",
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

const EXPERIENCE_ICON_URL =
  "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/686f0345f8da8d13d5f6906f_Ticket%20Icon.svg";
const EXPERIENCE_COLOR = "#8A3A6E";

// --- GLOBAL STATE & UTILITIES ---
const searchClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
let map;
let AdvancedMarkerElement;
let CustomPopup;
let currentMarkers = {};
let activeMarker = null;
let currentPopup = null;
let hasInitialZoomed = false;
let isProgrammaticPan = false;
let searchOnIdle;

const truncateText = (text, limit = 230) => {
  if (!text || typeof text !== "string") return "";
  return text.length > limit ? text.slice(0, limit) + "…" : text;
};

// --- 1. GET ALL OUR ELEMENTS ---
const mainDrawer = document.querySelector(
  ".f-cards-grid-layout-1_map-list-wrapper"
);
const mainDrawerHandle = document.getElementById("drawer-handle");
const openTrigger = document.getElementById("filters-trigger-button");
const closeTrigger = document.getElementById("drawer-close-button");
const overlay = document.getElementById("drawer-bg-overlay");

function openMainDrawer() {
  const mainDrawer = document.querySelector(
    ".f-cards-grid-layout-1_map-list-wrapper"
  );
  const overlay = document.getElementById("drawer-bg-overlay");
  if (mainDrawer) mainDrawer.classList.add("is-open");
  if (overlay) overlay.classList.add("is-open");
  document.body.classList.add("no-scroll");
}

function closeMainDrawer() {
  const mainDrawer = document.querySelector(
    ".f-cards-grid-layout-1_map-list-wrapper"
  );
  const overlay = document.getElementById("drawer-bg-overlay");
  if (mainDrawer) mainDrawer.classList.remove("is-open");
  if (overlay) overlay.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
}

openTrigger.addEventListener("click", openMainDrawer);
closeTrigger.addEventListener("click", closeMainDrawer);
overlay.addEventListener("click", closeMainDrawer);

// Apply our reusable drag logic to the main drawer
makeDrawerDraggable(
  mainDrawer,
  mainDrawerHandle,
  openMainDrawer,
  closeMainDrawer
);

function openDrawer() {
  drawer.classList.add("is-open");
  overlay.classList.add("is-open");
  document.body.classList.add("no-scroll");
  // We remove the inline style to let the CSS class handle the final position
  drawer.style.transform = "";
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  overlay.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  // We remove the inline style to let the CSS class handle the final position
  drawer.style.transform = "";
}

/**
 * Makes a drawer element draggable via a handle.
 * @param {HTMLElement} drawer - The drawer element to be moved.
 * @param {HTMLElement} handle - The handle element that initiates the drag.
 * @param {Function} openFn - The function to call to snap the drawer open.
 * @param {Function} closeFn - The function to call to snap the drawer closed.
 */
function makeDrawerDraggable(drawer, handle, openFn, closeFn) {
  if (!drawer || !handle) return;

  let isDragging = false;
  let startY;
  let startTransform;

  handle.addEventListener("touchstart", onDragStart, { passive: false });
  handle.addEventListener("mousedown", onDragStart);

  function onDragStart(e) {
    if (e.type === "mousedown" && e.button !== 0) return;
    isDragging = true;
    drawer.classList.add("is-dragging");
    startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

    const currentTransform = window
      .getComputedStyle(drawer)
      .getPropertyValue("transform");
    startTransform =
      currentTransform && currentTransform !== "none"
        ? new DOMMatrix(currentTransform).m42
        : drawer.offsetTop;

    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
  }

  function onDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const currentY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
    const deltaY = currentY - startY;
    let newTransform = startTransform + deltaY;

    const minTransform = 0; // Fully open
    const maxTransform = window.innerHeight - handle.offsetHeight; // Fully closed
    newTransform = Math.max(minTransform, Math.min(newTransform, maxTransform));
    drawer.style.transform = `translateY(${newTransform}px)`;
  }

  function onDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    drawer.classList.remove("is-dragging");

    // ... remove listeners ...

    const finalTransform = new DOMMatrix(
      window.getComputedStyle(drawer).getPropertyValue("transform")
    ).m42;
    const endY =
      e.type === "touchend" ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = endY - startY; // How far the user dragged in total

    // --- NEW, MORE FORGIVING LOGIC ---
    const shouldClose =
      deltaY > 75 || // If user swiped down more than 75px (a clear flick)
      finalTransform > window.innerHeight * 0.6; // Or if it's over 60% down the screen

    drawer.style.transform = ""; // Let CSS handle the animation

    if (shouldClose) {
      if (closeFn) closeFn();
    } else {
      if (openFn) openFn();
    }
  }
}

/**
 * Smoothly animates the camera to show all markers with proper bounds
 * @param {Array} hits - Array of hit objects from Algolia
 * @param {Object} options - Configuration options
 */
function autoZoomToResults(hits, options = {}) {
  if (!map || !hits || hits.length === 0) {
    return;
  }

  const { padding = 50, maxZoom = 15, duration = 1000 } = options;

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
    // Smooth pan and zoom for single marker
    map.panTo(validHits[0]._geoloc);
    if (map.getZoom() < maxZoom) {
      setTimeout(() => map.setZoom(maxZoom), 200);
    }
    return;
  }

  // Smooth bounds fitting with animation
  map.fitBounds(bounds, padding);
}

/**
 * Smoothly animates camera movement for mobile with intelligent zoom control
 * @param {Object} targetPosition - The lat/lng to move to
 * @param {Object} options - Animation options
 */
function smoothCameraTransition(targetPosition, options = {}) {
  const {
    minZoom = 10,
    maxZoom = 14,
    yOffset = 150,
    duration = 1500,
    easing = "ease-out",
  } = options;

  const currentZoom = map.getZoom();
  const projection = map.getProjection();

  // Determine target zoom intelligently
  let targetZoom = currentZoom;
  if (currentZoom < minZoom) {
    targetZoom = minZoom;
  } else if (currentZoom > maxZoom) {
    targetZoom = maxZoom;
  }

  // Calculate offset position
  let targetCenter = targetPosition;
  if (projection && yOffset) {
    const point = projection.fromLatLngToPoint(targetPosition);
    const offsetPoint = new google.maps.Point(
      point.x,
      point.y + yOffset / Math.pow(2, targetZoom)
    );
    targetCenter = projection.fromPointToLatLng(offsetPoint);
  }

  // Use Google Maps' smooth pan and zoom
  if (Math.abs(currentZoom - targetZoom) > 0.1) {
    // If zoom needs to change, do it smoothly
    map.panTo(targetCenter);
    setTimeout(() => {
      map.setZoom(targetZoom);
    }, duration / 3); // Start zoom after 1/3 of pan duration
  } else {
    // Just pan smoothly
    map.panTo(targetCenter);
  }
}

/**
 * Sets the z-index for all markers, with active marker on top
 * @param {string} activeObjectID - The objectID of the currently active marker
 */
function updateMarkerZIndices(activeObjectID = null) {
  Object.keys(currentMarkers).forEach((objectID) => {
    const marker = currentMarkers[objectID];
    if (objectID === activeObjectID) {
      // Active marker gets highest z-index
      marker.zIndex = 1000;
    } else {
      // All other markers get default z-index
      marker.zIndex = 1;
    }
  });
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

const infoDrawer = document.getElementById("info-drawer");

function handleMarkerOrResultClick(hit) {
  clearTimeout(searchOnIdle);

  // --- 1. UNIFIED CLEANUP ---
  // Deactivate any currently active marker
  if (activeMarker) {
    activeMarker.marker.content.classList.remove("is-active");
    const oldListItem = document.querySelector(
      `.f-map-filter_item-card[data-object-id="${activeMarker.hit.objectID}"]`
    );
    if (oldListItem) oldListItem.classList.remove("is-active");
    activeMarker = null;
  }

  // Close the desktop popup if it exists
  if (currentPopup) {
    currentPopup.setMap(null);
    currentPopup = null;
  }

  // Find and remove the mobile info drawer if it exists
  const existingInfoDrawer = document.getElementById("info-drawer-card");
  if (existingInfoDrawer) {
    // Hide it first for the animation out
    existingInfoDrawer.classList.remove("is-open");
    // Remove from DOM after animation
    setTimeout(() => {
      existingInfoDrawer.remove();
    }, 400);
  }

  if (!hit) {
    // Reset all z-indices when closing
    updateMarkerZIndices();
    return;
  }

  // --- 2. PREPARE FOR NEW MARKER ---
  const newMarker = currentMarkers[hit.objectID];
  const newListItem = document.querySelector(
    `.f-map-filter_item-card[data-object-id="${hit.objectID}"]`
  );

  if (newMarker) {
    // Update z-indices with this marker as active
    updateMarkerZIndices(hit.objectID);

    // Shared logic: Pan map, set active marker
    isProgrammaticPan = true;
    newMarker.content.classList.add("is-active");
    activeMarker = { marker: newMarker, hit: hit };

    const placeTypeTag = formatFacetValue(hit.placeType, "Regions");
    const color = FACET_COLOR_MAP[hit.placeType] || "#333";
    const iconUrl = FACET_ICON_MAP.placeType[hit.placeType] || "";

    // --- 3. RESPONSIVE UI LOGIC ---
    const isMobileView = window.matchMedia("(max-width: 991px)").matches;

    if (isMobileView) {
      // --- MOBILE: SMOOTH CAMERA TRANSITION ---
      smoothCameraTransition(newMarker.position, {
        minZoom: 10,
        maxZoom: 14,
        yOffset: 150,
        duration: 1200,
      });

      // 3. Build the drawer's HTML with full content
      const drawerContainer = document.createElement("div");
      drawerContainer.id = "info-drawer-card";
      drawerContainer.className = "info-drawer-card";
      drawerContainer.innerHTML = `
          <div id="info-drawer-handle" class="info-drawer-handle"></div>
          <div class="info-drawer-content">
              <div class="info-card_image-wrapper">
                  <img src="${
                    hit.thumbnailImage ||
                    "https://assets-global.website-files.com/62434fa732124a0fb112aab4/62434fa732124a332a12aaf8_placeholder-image.svg"
                  }" 
                       alt="${hit.thumbnailAltText || hit.Name}" 
                       class="info-card_image">
                  
                      <button type="button" id="info-drawer-close-button" class="info-card_icon-button close" aria-label="Close">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path></svg>
                      </button>
                      <button type="button" class="info-card_icon-button heart" aria-label="Favorite">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"></path></svg>
                      </button>
              </div>
              <div class="info-card_content">
                  <div class="info-card_header">
                      <div class="info-pane-icon-container small" style="background-color: ${EXPERIENCE_COLOR};">
                        <img src="${EXPERIENCE_ICON_URL}" alt="${placeTypeTag}">
                      </div>
                      <h3 class="info-card_heading">${hit.Name}</h3>
                  </div>
                  <div>
                      <div class="info-card_about-title">About this location</div>
                      <p class="info-card_paragraph">${
                        hit.description || ""
                      }</p>
                  </div>
                  <a href="${
                    hit.webflowLink || "#"
                  }" target="_blank" class="arizona-button w-inline-block" style="background-color: ${EXPERIENCE_COLOR};">
                    <div>Know more</div>
                    <div class="arizona-button_arrow">
                      <div class="arizona-arrow-icon w-embed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="white"></path>
                        </svg>
                      </div>
                      <div class="arizona-arrow-icon is-second w-embed">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                           <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="${EXPERIENCE_COLOR}"></path>
                        </svg>
                      </div>
                    </div>
                  </a>
              </div>
          </div>
      `;
      document.body.appendChild(drawerContainer);

      const infoDrawerOverlay = document.getElementById("info-drawer-overlay");

      // 4. Define its open/close functions
      const closeInfoDrawer = () => {
        drawerContainer.classList.remove("is-open");
        if (infoDrawerOverlay) infoDrawerOverlay.classList.remove("is-open");
        setTimeout(() => drawerContainer.remove(), 400); // Clean up from DOM
        if (activeMarker) {
          activeMarker.marker.content.classList.remove("is-active");
          activeMarker = null;
        }
        // Reset z-indices when closing
        updateMarkerZIndices();
      };

      const openInfoDrawer = () => {
        drawerContainer.classList.add("is-open");
        if (infoDrawerOverlay) infoDrawerOverlay.classList.add("is-open");
      };

      // 5. Add Listeners and make it draggable
      const infoDrawerHandle = drawerContainer.querySelector(
        "#info-drawer-handle"
      );
      drawerContainer
        .querySelector("#info-drawer-close-button")
        .addEventListener("click", closeInfoDrawer);
      if (infoDrawerOverlay)
        infoDrawerOverlay.addEventListener("click", closeInfoDrawer);
      makeDrawerDraggable(
        drawerContainer,
        infoDrawerHandle,
        openInfoDrawer,
        closeInfoDrawer
      );

      // 6. Snap it open
      setTimeout(openInfoDrawer, 50);
    } else {
      // --- DESKTOP: RESTORE OFFSET PANNING AND CREATE POPUP ---

      // 1. Restore the intelligent panning for desktop
      const projection = map.getProjection();
      if (projection) {
        const point = projection.fromLatLngToPoint(newMarker.position);
        // This number (-150) determines how much the map moves up.
        // It's divided by the zoom power to feel consistent at different zoom levels.
        const yOffset = -150;
        const newPoint = new google.maps.Point(
          point.x,
          point.y + yOffset / Math.pow(2, map.getZoom())
        );
        const newCenter = projection.fromPointToLatLng(newPoint);
        map.panTo(newCenter);
      } else {
        // Fallback for when projection isn't ready
        map.panTo(newMarker.position);
      }

      const popupContent = document.createElement("div");

      popupContent.innerHTML = `
        <div class="f-map-filter_info-card">
          <div class="f-map-filter_info-card-header">
            <div class="f-map-filter_info-card-head-content">
               <div class="info-pane-icon-container" style="background-color: ${EXPERIENCE_COLOR};">
                  <img src="${EXPERIENCE_ICON_URL}" alt="${placeTypeTag}">
               </div>
              <div class="f-map-filter_info-card-head-text-content">
                <div class="f-map-filter_info-card-heading">${hit.Name}</div>
                <div class="f-map-filter_info-card-tag" style="color: ${EXPERIENCE_COLOR};">${placeTypeTag}</div>
              </div>
            </div>
            <div id="popup-close-button" class="f-map-filter_info-card-close-button w-embed">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none"><rect x="0.759766" y="0.757812" width="20.48" height="20.48" rx="2.56" fill="#F6F6F6"></rect><path fill-rule="evenodd" clip-rule="evenodd" d="M11 11.1269L7.85691 14.27L7.5957 14.0088L10.7388 10.8657L7.85691 7.98387L8.11811 7.72266L11 10.6045L13.8819 7.72266L14.1431 7.98386L11.2612 10.8657L14.4043 14.0088L14.1431 14.27L11 11.1269Z" fill="#939392" stroke="#780C57" stroke-width="0.64"></path></svg>
            </div>
          </div>
          <img src="${
            hit.thumbnailImage ||
            "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif"
          }"" loading="lazy" alt="${
        hit.thumbnailAltText || hit.Name
      }" class="f-map-filter_info-card-image">
          <div class="f-map-filter_info-card-bottom">
            <div class="f-map-filter_info-card-about-text">About this location</div>
            <p class="f-map-filter_info-card-paragraph">${
              truncateText(hit.description) || ""
            }</p>
            <a href="${
              hit.webflowLink || "#"
            }" target="_blank" class="arizona-button w-inline-block" style="background-color: ${EXPERIENCE_COLOR};">
              <div>Know more</div>
              <div class="arizona-button_arrow">
                <div class="arizona-arrow-icon w-embed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                    <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="white"></path>
                  </svg>
                </div>
                <div class="arizona-arrow-icon is-second w-embed">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                     <path d="M1.62036 5.36739C1.23862 5.36739 0.929161 5.67685 0.929161 6.05859C0.929161 6.44033 1.23862 6.74979 1.62036 6.74979L1.62036 5.36739ZM13.52 6.54735C13.7899 6.27742 13.7899 5.83977 13.52 5.56984L9.1212 1.17107C8.85127 0.901141 8.41362 0.901141 8.14369 1.17107C7.87376 1.441 7.87376 1.87865 8.14369 2.14858L12.0537 6.05859L8.14369 9.96861C7.87376 10.2385 7.87376 10.6762 8.14369 10.9461C8.41362 11.216 8.85127 11.216 9.1212 10.9461L13.52 6.54735ZM1.62036 6.74979L13.0312 6.74979V5.36739L1.62036 5.36739L1.62036 6.74979Z" fill="${EXPERIENCE_COLOR}"></path>
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

      if (hit.placeType) markerContent.dataset.placeType = hit.placeType;

      if (color) markerContent.style.backgroundColor = color;
      const iconUrl = "FACET_ICON_MAP.placeType[hit.placeType];";
      if (iconUrl)
        markerContent.innerHTML = `<img src="${EXPERIENCE_ICON_URL}" alt="${hit.placeType}">`;
      const marker = new AdvancedMarkerElement({
        position: hit._geoloc,
        map: map,
        title: hit.Name,
        content: markerContent,
      });

      marker.addListener("click", (e) => {
        // --- MODIFICATION HERE ---
        // Only stop propagation if it's a real DOM event
        if (e && e.domEvent) {
          e.domEvent.stopPropagation();
        }
        handleMarkerOrResultClick(hit);
      });

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
          if (!listItem) return;

          const objectId = listItem.dataset.objectId;
          const marker = currentMarkers[objectId];
          if (!marker) return;

          // --- NEW RESPONSIVE LOGIC ---
          const isMobileView = window.matchMedia("(max-width: 991px)").matches;

          if (isMobileView) {
            // On mobile, close the main drawer first, then open the info drawer
            closeMainDrawer();
            setTimeout(() => {
              google.maps.event.trigger(marker, "click");
            }, 350); // Wait for the main drawer's close animation
          } else {
            // On desktop, the original behavior is correct
            google.maps.event.trigger(marker, "click");
          }
        });
      }

      const hitsContainer = container.querySelector(".hits-container");
      // if (!isFirstRender) handleMarkerOrResultClick(null);

      if (hits.length === 0) {
        hitsContainer.innerHTML = `<div class="f-map-filter_no-results">No results found.</div>`;
      } else {
        // UPDATED: Replaced text tag with icon tag and added heart icon back
        hitsContainer.innerHTML = hits
          .map((hit) => {
            const placeholderImage =
              "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif";

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
                    <div class="list-item-icon-tag" style="background-color: ${EXPERIENCE_COLOR};">
                      <img src="${EXPERIENCE_ICON_URL}" alt="${hit.placeType}">
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
                          <rect x="0.5" y="0.5" width="25" height="25" rx="4" fill="${EXPERIENCE_COLOR}"></rect>
                          <rect x="1" y="1" width="24" height="24" rx="3.5" stroke="white" stroke-opacity="0.08"></rect>
                          <path d="M8.43555 12.447C8.13016 12.447 7.88259 12.6946 7.88259 13C7.88259 13.3054 8.13016 13.553 8.43555 13.553V12.447ZM17.9552 13.391C18.1712 13.1751 18.1712 12.8249 17.9552 12.609L14.4362 9.08998C14.2203 8.87404 13.8702 8.87404 13.6542 9.08998C13.4383 9.30593 13.4383 9.65604 13.6542 9.87199L16.7822 13L13.6542 16.128C13.4383 16.344 13.4383 16.6941 13.6542 16.91C13.8702 17.126 14.2203 17.126 14.4362 16.91L17.9552 13.391ZM8.43555 13V13.553L17.5642 13.553V13V12.447L8.43555 12.447V13Z" fill="white"></path>
                        </svg>
                      </div>
                    </div>
                    <p class="f-map-filter_item-card-paragraph">${
                      instantsearch.snippet({
                        attribute: "description",
                        hit,
                      }) || ""
                    }</p>
                  </div>
                </a>
              `;
          })
          .join("");
      }

      // --- NEW: RESTORE ACTIVE STATE AFTER RENDER ---
      // After the list is re-rendered, we check our global state
      // and re-apply the active class if necessary.
      if (activeMarker && activeMarker.hit) {
        const activeObjectID = activeMarker.hit.objectID;
        const newActiveListItem = hitsContainer.querySelector(
          `.f-map-filter_item-card[data-object-id="${activeObjectID}"]`
        );
        if (newActiveListItem) {
          newActiveListItem.classList.add("is-active");
        }
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
    instantsearch.widgets.configure({
      hitsPerPage: 75,
      attributesToSnippet: ["description:10"],
    }),
    instantsearch.widgets.searchBox({
      container: SELECTORS.searchBox,
      placeholder: "Looking for something? Start typing.",
    }),

    instantsearch.widgets.refinementList({
      container: document.createElement("div"),
      attribute: "highlightTags",
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
  // NEW: Close any open window as soon as the user starts dragging the map.
  map.addListener("dragstart", () => {
    handleMarkerOrResultClick(null);
  });

  // SIMPLIFIED: The idle listener now ONLY handles searching.
  map.addListener("idle", () => {
    // We can get rid of the isProgrammaticPan flag check as well.
    // The timeout prevents a rapid-fire search on every tiny movement.
    clearTimeout(searchOnIdle);
    searchOnIdle = setTimeout(() => {
      const bounds = map.getBounds();
      if (bounds) {
        mapSearch.helper
          .setQueryParameter("insideBoundingBox", bounds.toUrlValue())
          .search();
      }
    }, 300); // 300ms is a good debounce delay
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
