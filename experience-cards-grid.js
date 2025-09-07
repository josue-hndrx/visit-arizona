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
  const searchClient = algoliasearch("LF0CCFQRH3", "9ff98e053974ef9b01af86dfe17897f7");

  const baseIndexName = url.searchParams.get("index") || "experiences_cms_items";

  const indexName =
    baseIndexName === "like_a_local_cms_items"
      ? "like_a_local_cms_items_date_desc" // Use the replica
      : baseIndexName; // Use primary index

  const sortBy =
    baseIndexName === "like_a_local_cms_items"
      ? ["publishTimestamp:desc"] // Sort by date, newest first
      : ["name:asc"]; // Default alphabetical sorting

  const PREFILTER_CONFIG = {
    Regions: "#f-cards-filter_regions-prefilter",
    Amenities: "#f-cards-filter_amenities-prefilter",
    Categories: "#f-cards-filter_categories-prefilter",
    highlightTags: "#f-cards-filter_highlighttags-prefilter",
    Cities: "#f-cards-filter_cities-prefilter",
  };

  const FACET_CLASS_MAP = {
    Regions: "region-tag",
    Amenities: "amenity-tag",
    Categories: "category-tag",
    highlightTags: "highlight-tag",
    Cities: "cities-tag",
  };

  /**
   * Central mapping for facet icons.
   */
  const FACET_ICON_MAP = {
    Regions: {
      "tucson-southern-arizona":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c6df8983e74e68e2291f_Tucson%20%26%20Southern%20Arizona%20Icon.svg",
      "greater-phoenix-and-scottsdale":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c6be0c3c88d7950008dd_Greater%20Phoenix%20%26%20Scottsdale%20Icon.svg",
      "sedona-verde-valley":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c6d1342e10d61f957d27_Sedona%20%26%20The%20Verde%20Valley%20Icon.svg",
      "lake-havasu-western-arizona":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c6e468e9d09881e3e0e1_Western%20Arizona%20%26%20Lake%20Havasu%20Icon.svg",
      "grand-canyon-northern-wonders":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f7f063229bf45a3845c1d_Grand%20Canyon%20%26%20Northern%20Wonders.svg",
      "white-mountains-eastern-arizona":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c6ecff31a56294ab0aaf_White%20Mountains%20%26%20Eastern%20Arizona%20Icon.svg",
    },
    Categories: {
      seasons: "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84bc3b96909871c2c906_Vector%20(1).svg",
      "trip-ideas-itineraries":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84ca4bbab778955875a1_Vector%20(2).svg",
      "culture-traditions":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/68abbd8f5309c4340d7ffe40_culture-traditions-new.svg",
      culinary:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c78369c9fc20fd2c6ca4_Savor%20Arizona%20Icon.svg",
      entertainment:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84d29a8a37ea84366f45_Vector%20(3).svg",
      "family-activities":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c74ae9329898fb11c2da_Family%20Fun%20%26%20Sports%20Icon.svg",
      outdoors:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c7634ad9085c99c8cd41_Outdoor%20Adventure%20Icon.svg",
      sports: "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84d9133f5c2c8a1c7d1f_Vector%20(4).svg",
      "places-to-stay":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84e0d0b3b34f0857e2c0_Vector.svg",
      shopping: "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84e4b49956b356b74b29_Vector%20(5).svg",
      sustainability:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84e967f0201dbb4f4c4b_Vector%20(6).svg",
      "wellness-relaxation":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c79199fcf15ecb3631cc_Wellness%20%26%20Relaxation%20Icon.svg",
    },
  };

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

  /**
   * Injects CSS rules into the document head for each icon.
   */
  function injectFacetIconStyles() {
    let cssRules = "";
    for (const attribute in FACET_ICON_MAP) {
      for (const value in FACET_ICON_MAP[attribute]) {
        const url = FACET_ICON_MAP[attribute][value];
        if (url) {
          const sanitizedValue = value.replace(/[^a-zA-Z0-9-_]/g, "-");
          const className = `icon--${attribute}-${sanitizedValue}`;
          cssRules += `.${className} { background-image: url('${url}'); }\n`;
        }
      }
    }

    if (cssRules) {
      const styleElement = document.createElement("style");
      styleElement.textContent = cssRules;
      document.head.appendChild(styleElement);
    }
  }

  // --- Run the CSS injector as soon as the script starts ---
  injectFacetIconStyles();

  /**
   * Scans the DOM for pre-filter elements defined in Webflow CMS
   * and formats them for Algolia's facetFilters.
   * @returns {string[]} An array of facet filter strings, e.g., ["Regions:taranaki", "Categories:guided-tours"].
   */
  function getPrefiltersFromDOM() {
    const facetFilters = [];

    // Loop through each facet configuration
    for (const attributeName in PREFILTER_CONFIG) {
      const containerSelector = PREFILTER_CONFIG[attributeName];
      const container = document.querySelector(containerSelector);

      if (container) {
        // Find all elements with the 'data-prefilter' attribute within the container
        const prefilterElements = container.querySelectorAll("[data-prefilter]");
        prefilterElements.forEach((el) => {
          const filterValue = el.dataset.prefilter;
          if (filterValue) {
            // Format for Algolia: 'attribute:value'
            facetFilters.push(`${attributeName}:${filterValue}`);
          }
        });
      }
    }
    return facetFilters;
  }

  function groupPrefilters(prefilterArray) {
    return prefilterArray.reduce((grouped, filter) => {
      const [attribute, value] = filter.split(":");
      grouped[attribute] = grouped[attribute] ? [...grouped[attribute], value] : [value];
      return grouped;
    }, {});
  }

  /**
   * UPDATED: Converts a slug-like string into a human-readable title.
   * It first checks for a custom label in FACET_LABEL_MAP, then falls back to auto-formatting.
   * @param {string} str - The slug string to format.
   * @param {string} attributeName - The attribute the slug belongs to.
   */
  function formatFacetValue(str, attributeName) {
    if (!str) return "";

    // First, try to find a specific label in our map.
    if (attributeName && FACET_LABEL_MAP[attributeName] && FACET_LABEL_MAP[attributeName][str]) {
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
    return attributeData.slice(0, maxCount || attributeData.length).map((value) => {
      // UPDATED: Pass attributeName to formatFacetValue
      const formattedValue = formatFacetValue(value, attributeName);
      return html`<span class="on-card-facet-tag ${cssClass}">${formattedValue}</span>`;
    });
  }

  function createCurrentRefinementsWidget(containerSelector) {
    return instantsearch.connectors.connectCurrentRefinements((renderOptions, isFirstRender) => {
      const { items, refine, widgetParams } = renderOptions;
      const container = document.querySelector(widgetParams.container);

      container.innerHTML = `
         <ul class="f-cards-layout-1_CurrentRefinements-list">
           ${items
             .flatMap((group) =>
               group.refinements.map(
                 (refinement) => `
                 <li class="ais-CurrentRefinements-item">
                   <span class="active-facet-tag ${FACET_CLASS_MAP[group.attribute] || "default-tag"}">
                     ${formatFacetValue(refinement.label, group.attribute)}
                     <button class="remove-refinement-button" data-value="${refinement.value}">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.88893 7.62073L7.62067 7.88893C7.47258 8.03702 7.23243 8.03702 7.08428 7.88893L4 4.8046L0.915674 7.88887C0.767579 8.03702 0.527419 8.03702 0.379296 7.88887L0.111092 7.62067C-0.0370308 7.47258 -0.0370308 7.23243 0.111092 7.08428L3.19541 4L0.111092 0.915674C-0.0370308 0.767579 -0.0370308 0.527419 0.111092 0.379296L0.37929 0.111098C0.527413 -0.0370254 0.767579 -0.0370254 0.915674 0.111098L4 3.19541L7.08428 0.111092C7.23243 -0.0370308 7.47258 -0.0370308 7.62067 0.111092L7.88893 0.37929C8.03702 0.527413 8.03702 0.767579 7.88893 0.915674L4.8046 4L7.88893 7.08428C8.03702 7.23243 8.03702 7.47258 7.88893 7.62073Z" fill="white" style="fill:white;fill-opacity:1;"/>
                      </svg>                 
                     </button>
                   </span>
                 </li>
               `
               )
             )
             .join("")}
         </ul>
       `;

      container.addEventListener("click", (event) => {
        const button = event.target.closest(".remove-refinement-button");
        if (button) {
          event.preventDefault();
          const refinementToRemove = items
            .flatMap((group) => group.refinements)
            .find((ref) => ref.value === button.dataset.value);

          if (refinementToRemove) {
            refine(refinementToRemove);
          }
        }
      });
    })({
      container: containerSelector,
    });
  }

  const prefilters = groupPrefilters(getPrefiltersFromDOM());

  const search = instantsearch({
    indexName: indexName,
    searchClient,
    routing: false,
    initialUiState: {
      [indexName]: {
        refinementList: prefilters,
      },
    },
  });

  const createRefinementListItemTemplate =
    (attributeName) =>
    (item, { html }) => {
      const hasIcon = FACET_ICON_MAP[attributeName] && FACET_ICON_MAP[attributeName][item.value];
      let iconHtml = "";

      if (hasIcon) {
        const sanitizedValue = item.value.replace(/[^a-zA-Z0-9-_]/g, "-");
        const iconClass = `icon--${attributeName}-${sanitizedValue}`;
        iconHtml = html`<span class="f-cards-grid-layout-1_filter-item-icon ${iconClass}"></span>`;
      }

      return html` <a
        href="#"
        class="f-cards-grid-layout-1_filter-collection-item ${item.isRefined ? "is-active" : ""}"
        data-value="${item.value}"
      >
        ${iconHtml}
        <div class="f-cards-grid-layout-1_filter-name-and-result">
          ${formatFacetValue(item.label, attributeName)}
          <span class="facet-count"> (${item.count})</span>
        </div>
      </a>`;
    };

  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#f-cards-filter_searchbox",
      placeholder: "Search Destinations, Experiences, Travel Content",
      searchAsYouType: true,
      showSubmit: false,
    }),

    // instantsearch.widgets.stats({
    //   container: "#f-cards-filter_stats",
    // }),

    instantsearch.widgets.stats({
      container: "#apply-results-text",
      templates: {
        text(data, { html }) {
          return html`(${data.nbHits} results)`;
        },
      },
    }),

    instantsearch.widgets.hits({
      container: "#f-cards-filter_hits-grid",
      transformItems(items) {
        // Filter items to only show English articles (nonEnglishArticle: false)
        return items.filter(item => item.nonEnglishArticle === false);
      },
      templates: {
        item: (hit, { html, components }) => html`
          <a href="${hit.webflowLink}" class="f-cards-grid-layout-1_card-link-wrapper">
            <article class="f-cards-grid-layout-1_algolia-card">
              <div class="f-cards-grid-layout-1_heart-icon-wrapper">
                <div class="f-cards-grid-layout-1_heart-icon">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                alt="${components.Highlight({ attribute: "Name", hit })}"
                class="f-cards-grid-layout-1_card-image"
                onerror="this.style.display='none'"
              />
              <div class="f-cards-filter_tags-container">${renderFacetTags(hit, "Categories", html, 1)}</div>
              <h3 class="f-cards-grid-layout-1_card-h3 heading-style-h5">
                ${components.Highlight({ attribute: "Name", hit })}
              </h3>
              <p class="f-cards-grid-layout-1_card-desc">${components.Snippet({ attribute: "description", hit })}</p>
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

    instantsearch.widgets.clearRefinements({
      container: "#f-cards-filter_clear-refinements",
      templates: { resetLabel: "Clear all" },
    }),

    createCurrentRefinementsWidget("#f-cards-filter_current-refinements"),

    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_regions-list",
      attribute: "Regions",
      sortBy: sortBy,
      templates: { item: createRefinementListItemTemplate("Regions") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_amenities-list",
      attribute: "Amenities",
      sortBy: sortBy,
      templates: { item: createRefinementListItemTemplate("Amenities") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_cities-list",
      attribute: "Cities",
      sortBy: sortBy,
      templates: { item: createRefinementListItemTemplate("Cities") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_categories-list",
      attribute: "Categories",
      sortBy: sortBy,
      templates: { item: createRefinementListItemTemplate("Categories") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_highlighttags-list",
      attribute: "highlightTags",
      sortBy: sortBy,
      templates: { item: createRefinementListItemTemplate("highlightTags") },
    }),
  ]);

  search.start();
});
