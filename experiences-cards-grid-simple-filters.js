/**
 * Algolia Search Integration for Partner CMS
 *
 * This module sets up a complete search interface with faceted filtering,
 * pagination, and dynamic UI updates using Algolia InstantSearch.
 *
 * Main features:
 * - Search box with AI-powered search
 * - Faceted filtering with custom display names, CSS-injected icons, and static sort order
 * - Dynamic result cards with highlighting
 * - Pagination with custom styling
 * - Pre-filters from Webflow CMS
 */

// Get the current script tag (the one currently executing)
const currentScript = document.currentScript;

// Create a URL object to parse query parameters
const url = new URL(currentScript.src);

document.addEventListener("DOMContentLoaded", function () {
  // Initialize Algolia search client
  const searchClient = algoliasearch(
    "LF0CCFQRH3",
    "9ff98e053974ef9b01af86dfe17897f7"
  );

  const indexName = url.searchParams.get("index") || "experiences_cms_items";

  /**
   * NEW: Central mapping for custom facet display names.
   */
  const FACET_LABEL_MAP = {
    Regions: {
      "tucson-southern-arizona": "Tucson & Southern Arizona",
      "greater-phoenix-and-scottsdale": "Greater Phoenix and Scottsdale",
      "sedona-verde-valley": "Sedona & The Verde Valley",
      "lake-havasu-western-arizona": "Lake Havasu & Western Arizona",
      "grand-canyon-northern-wonders": "Grand Canyon & Northern Wonders",
      "white-mountains-eastern-arizona": "White Mountains & Eastern Arizona",
    },
    Categories: {
      seasons: "Seasons",
      "trip-ideas-itineraries": "Trip Ideas & Itineraries",
      "culture-traditions": "Culture & Traditions",
      culinary: "Culinary",
      entertainment: "Entertainment",
      "family-activities": "Family Activities",
      outdoors: "Outdoors",
      sports: "Sports",
      "places-to-stay": "Places to Stay",
      shopping: "Shopping",
      sustainability: "Sustainability",
      "wellness-relaxation": "Wellness & Relaxation",
    },
  };

  const FACET_CLASS_MAP = {
    Regions: "region-tag",
    Amenities: "amenity-tag",
    Categories: "category-tag",
    highlightTags: "highlight-tag",
    Cities: "cities-tag",
  };

  /**
   * UPDATED: Converts a slug-like string into a human-readable title.
   * It first checks for a custom label in FACET_LABEL_MAP, then falls back to auto-formatting.
   * @param {string} str - The slug string to format.
   * @param {string} attributeName - The attribute the slug belongs to.
   */
  function formatFacetValue(str, attributeName) {
    if (!str) return "";

    // First, try to find a specific label in our map.
    if (
      attributeName &&
      FACET_LABEL_MAP[attributeName] &&
      FACET_LABEL_MAP[attributeName][str]
    ) {
      return FACET_LABEL_MAP[attributeName][str];
    }

    // Fallback to the original auto-formatting logic.
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function renderFacetTags(hit, attributeName, html, maxCount) {
    const attributeData = hit[attributeName];
    if (!attributeData || attributeData.length === 0) {
      return [];
    }
    const cssClass = FACET_CLASS_MAP[attributeName] || "default-tag";
    return attributeData
      .slice(0, maxCount || attributeData.length)
      .map((value) => {
        // UPDATED: Pass attributeName to formatFacetValue
        const formattedValue = formatFacetValue(value, attributeName);
        return html`<span class="on-card-facet-tag ${cssClass}"
          >${formattedValue}</span
        >`;
      });
  }

  const search = instantsearch({
    indexName: indexName,
    searchClient,
    routing: false,
  });

  // Store the SVG for a "selected" filter item as specified.
  const selectedSvgIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 0C13.9706 0 18 4.02944 18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0ZM9.16699 8L6.16699 5L5 6.16699L8 9.14551L5 12.1455L6.16699 13.3125L9.16699 10.3125L12.1455 13.3125L13.3125 12.1455L10.3125 9.14551L13.3125 6.16699L12.1455 5L9.16699 8Z" fill="black" style="fill:black;fill-opacity:1;"/>
</svg>`;

  // 1. Before we do anything, we find all your custom filter radio buttons
  // and store their original HTML (the "unselected" state).
  const allRadioButtons = document.querySelectorAll(
    ".f-cards-grid-layout-1_simple-filter-radio"
  );
  allRadioButtons.forEach((radio) => {
    radio.setAttribute("data-original-state", radio.innerHTML);
  });

  function syncCustomFilterUI() {
    const helper = search.helper;

    // Guard against running before the first search has completed.
    if (!helper.lastResults) {
      return;
    }

    // Get the list of currently active "highlightTags" refinements.
    const currentRefinements =
      helper.getRefinements("highlightTags").map((r) => r.value) || [];

    // Create a Map of facet counts for easy lookup (e.g., "outdoors" => 12).
    const facetValues = helper.lastResults.getFacetValues("highlightTags");
    const countMap = new Map();
    if (facetValues) {
      facetValues.forEach((facet) => {
        countMap.set(facet.name, facet.count);
      });
    }

    const allFilterItems = document.querySelectorAll(
      ".f-cards-grid-layout-1_fancy-filter-item"
    );

    allFilterItems.forEach((item) => {
      const categorySlug = item.getAttribute("data-highlight-tag-slug");
      const radioElement = item.querySelector(
        ".f-cards-grid-layout-1_simple-filter-radio"
      );
      // Target the new span for the count.
      const countElement = item.querySelector(".facet-count");

      // 1. Update the radio button's active state (the SVG icon).
      if (radioElement) {
        if (currentRefinements.includes(categorySlug)) {
          radioElement.innerHTML = selectedSvgIcon;
          item.classList.add("is-active");
        } else {
          radioElement.innerHTML = radioElement.getAttribute(
            "data-original-state"
          );
          item.classList.remove("is-active");
        }
      }

      // 2. Update the facet count text.
      if (countElement) {
        const count = countMap.get(categorySlug) || 0;
        countElement.textContent = `(${count})`;
      }
    });
  }

  search.addWidgets([
    instantsearch.widgets.configure({
      disjunctiveFacets: ["highlightTags"],
    }),

    instantsearch.widgets.searchBox({
      container: "#f-cards-filter_searchbox",
      placeholder: "Search Destinations, Experiences, Travel Content",
      searchAsYouType: true,
      showSubmit: false,
    }),

    instantsearch.widgets.hits({
      container: "#f-cards-filter_hits-grid",
      templates: {
        item: (hit, { html, components }) => html`
          <a
            href="${hit.webflowLink}"
            class="f-cards-grid-layout-1_card-link-wrapper"
          >
            <article class="f-cards-grid-layout-1_algolia-card">
              <div class="f-cards-grid-layout-1_heart-icon-wrapper">
                <div class="f-cards-grid-layout-1_heart-icon">
                  <svg
                    width="12"
                    height="10"
                    viewBox="0 0 12 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M6.44284 1.55103C5.88275 0.788484 4.97997 0.292969 3.96214 0.292969C2.26451 0.292969 0.886719 1.67154 0.886719 3.36919C0.886719 4.63118 1.74616 5.96101 2.81122 7.0843C4.33161 8.68817 6.23169 9.88242 6.23169 9.88242C6.36088 9.96356 6.52473 9.96356 6.65394 9.88242C6.65394 9.88242 8.55403 8.68817 10.0744 7.0843C11.1395 5.96095 11.9989 4.63122 11.9989 3.36919C11.9989 1.67156 10.6211 0.292969 8.9235 0.292969C7.90571 0.292969 7.00299 0.788463 6.44284 1.55103ZM6.07574 2.5058C6.1364 2.65547 6.28134 2.75316 6.44284 2.75316C6.60354 2.75316 6.74927 2.65548 6.80993 2.5058C7.15103 1.67392 7.96873 1.08703 8.9234 1.08703C10.183 1.08703 11.2055 2.10954 11.2055 3.36909C11.2055 4.45541 10.4145 5.57169 9.49758 6.53828C8.34429 7.75538 6.96263 8.72435 6.44274 9.07162C5.92282 8.72421 4.54029 7.75528 3.38789 6.53828C2.47093 5.57169 1.68002 4.45547 1.68002 3.36909C1.68002 2.10946 2.70253 1.08703 3.96208 1.08703C4.91685 1.08703 5.73475 1.67392 6.07574 2.5058Z"
                      fill="black"
                      style="fill:black;fill-opacity:1;"
                    />
                  </svg>
                </div>
              </div>
              <img
                src="${hit.thumbnailImage ||
                "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif"}"
                alt="${hit.thumbnailAltText}"
                class="f-cards-grid-layout-1_card-image"
                onerror="this.style.display='none'"
              />
              <div class="f-cards-filter_tags-container">
                ${renderFacetTags(hit, "Categories", html, 1)}
              </div>
              <h3 class="f-cards-grid-layout-1_card-h3 heading-style-h5">
                ${components.Highlight({ attribute: "Name", hit })}
              </h3>
              <p class="f-cards-grid-layout-1_card-desc">
                ${components.Snippet({ attribute: "description", hit })}
              </p>
            </article>
          </a>
        `,
      },
    }),

    instantsearch.widgets.pagination({
      container: "#f-cards-filter_pagination",
      showFirst: false,
      showLast: false,
      scrollTo: ".f-cards-grid-layout-1_body",
      templates: {
        previous: () => `
         <div class="f-cards-grid-layout-1_direction-button prev">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M13.2929 6.29297L7.58594 12L13.2929 17.707L14.7069 16.293L10.4139 12L14.7069 7.70697L13.2929 6.29297Z" fill="#171717" style="fill:#171717;fill:color(display-p3 0.0902 0.0902 0.0902);fill-opacity:1;"/>
           </svg>
           <div>Prev</div>
         </div>`,
        next: () => `
         <div class="f-cards-grid-layout-1_direction-button next">
           <div>Next</div>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M9.70697 16.9492L15.414 11.2422L9.70697 5.53516L8.29297 6.94916L12.586 11.2422L8.29297 15.5352L9.70697 16.9492Z" fill="#171717" style="fill:#171717;fill:color(display-p3 0.0902 0.0902 0.0902);fill-opacity:1;"/>
           </svg>          
         </div>`,
      },
    }),
  ]);

  search.start();

  // 2. We add a single click listener to the document to handle all filter clicks.
  document.addEventListener("click", function (event) {
    // Check if the clicked element or its parent is a filter item
    const filterItem = event.target.closest(
      ".f-cards-grid-layout-1_fancy-filter-item"
    );

    if (filterItem) {
      event.preventDefault(); // Prevent any default link behavior

      const categorySlug = filterItem.getAttribute("data-highlight-tag-slug");
      const facetAttribute = "highlightTags"; // We are refining the 'highlightTags' facet

      if (categorySlug) {
        // This is the magic part: we toggle the refinement on the helper
        // and then trigger a new search.
        search.helper.toggleRefinement(facetAttribute, categorySlug).search();
      }
    }
  });

  // 3. We listen for the 'render' event from InstantSearch. This fires every
  // time new results are displayed.
  search.on("render", () => {
    // Every time a search completes, we sync our custom UI to match.
    syncCustomFilterUI();
  });
});
