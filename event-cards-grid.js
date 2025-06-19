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

document.addEventListener("DOMContentLoaded", function () {
  // Initialize Algolia search client
  const searchClient = algoliasearch(
    "LF0CCFQRH3",
    "9ff98e053974ef9b01af86dfe17897f7"
  );

  const indexName = "events_cms_items";

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
      seasons:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84bc3b96909871c2c906_Vector%20(1).svg",
      "trip-ideas-itineraries":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84ca4bbab778955875a1_Vector%20(2).svg",
      "culture-traditions":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c78bde8cc5698acc7d49_Tribal%20Lands%20Icon.svg",
      culinary:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c78369c9fc20fd2c6ca4_Savor%20Arizona%20Icon.svg",
      entertainment:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84d29a8a37ea84366f45_Vector%20(3).svg",
      "family-activities":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c74ae9329898fb11c2da_Family%20Fun%20%26%20Sports%20Icon.svg",
      outdoors:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/6848c7634ad9085c99c8cd41_Outdoor%20Adventure%20Icon.svg",
      sports:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84d9133f5c2c8a1c7d1f_Vector%20(4).svg",
      "places-to-stay":
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84e0d0b3b34f0857e2c0_Vector.svg",
      shopping:
        "https://cdn.prod.website-files.com/683a4969614808c01cd0d378/684f84e4b49956b356b74b29_Vector%20(5).svg",
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

  // --- START: CUSTOM DATE WIDGET CODE ---

  /**
   * =================================================================
   * CUSTOM DATE FILTER WIDGET
   * =================================================================
   * This custom widget provides filtering for predefined date ranges like
   * "Today", "This Weekend", etc., by calculating Unix timestamp ranges
   * and applying the correct numeric filters for event overlaps.
   */

  // --- 1. Date Calculation Helpers ---

  /**
   * Calculates the start and end of today in UTC as Unix timestamps.
   * @returns {{start: number, end: number}}
   */
  function getTodayRange() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);
    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
    };
  }

  /**
   * Calculates the start and end of this weekend (Saturday to Sunday) in UTC.
   * @returns {{start: number, end: number}}
   */
  function getThisWeekendRange() {
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // Sunday = 0, Saturday = 6

    // Find the upcoming Saturday
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() + (6 - dayOfWeek));
    start.setUTCHours(0, 0, 0, 0);

    // Find the upcoming Sunday
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCHours(23, 59, 59, 999);

    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
    };
  }

  /**
   * Calculates the start and end of this week (Sunday to Saturday) in UTC.
   * @returns {{start: number, end: number}}
   */
  function getThisWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // Sunday = 0, Monday = 1, etc.
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - dayOfWeek);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
    };
  }

  /**
   * Calculates the start and end of next week (Sunday to Saturday) in UTC.
   * @returns {{start: number, end: number}}
   */
  function getNextWeekRange() {
    const thisWeek = getThisWeekRange();
    const start = new Date((thisWeek.start + 7 * 24 * 60 * 60) * 1000);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date((thisWeek.end + 7 * 24 * 60 * 60) * 1000);
    end.setUTCHours(23, 59, 59, 999);

    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
    };
  }

  /**
   * Generates start and end timestamps for each month of the current year.
   * @returns {Array<{label: string, range: {start: number, end: number}}>}
   */
  function getMonthRanges() {
    const currentYear = new Date().getUTCFullYear();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return months.map((month, index) => {
      const start = new Date(Date.UTC(currentYear, index, 1));
      const end = new Date(Date.UTC(currentYear, index + 1, 0));
      end.setUTCHours(23, 59, 59, 999);
      return {
        label: month,
        range: {
          start: Math.floor(start.getTime() / 1000),
          end: Math.floor(end.getTime() / 1000),
        },
      };
    });
  }

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
        const prefilterElements =
          container.querySelectorAll("[data-prefilter]");
        prefilterElements.forEach((el) => {
          const filterValue = el.dataset.prefilter;
          if (filterValue) {
            // Format for Algolia: 'attribute:value'
            facetFilters.push(`${attributeName}:${filterValue}`);
          }
        });
      }
    }
    console.log("Applying pre-filters:", facetFilters); // Optional: for debugging
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

  // --- 2. Custom Date Filter Widget Factory (FINAL - Instance-based) ---

  function createDateFilterWidget(options) {
    const { containerSelector, title, items } = options;

    let currentState = {
      selected: null,
    };

    return {
      // Store the helper reference
      _helper: null,

      _refine(value) {
        console.log(`[Debug DateFilter] 6. Refining state to: "${value}"`);
        const newValue = currentState.selected === value ? null : value;
        currentState.selected = newValue;

        // Use the helper's setState method to trigger a proper search
        if (this._helper) {
          console.log(
            "[Debug DateFilter] 7. Using helper.setState() to trigger search..."
          );

          // Clear existing date refinements
          let newState = this._helper.state
            .clearRefinements("startTimestamp")
            .clearRefinements("endTimestamp");

          // Apply new refinements if a date range is selected
          if (newValue) {
            const selectedRange = items.find((item) => item.label === newValue);
            if (selectedRange) {
              console.log(
                `[Debug DateFilter] Applying range for "${newValue}":`,
                selectedRange
              );
              newState = newState
                .addNumericRefinement("startTimestamp", "<=", selectedRange.end)
                .addNumericRefinement(
                  "endTimestamp",
                  ">=",
                  selectedRange.start
                );
            }
          }

          // Set the new state and search
          this._helper.setState(newState).search();
        } else {
          console.error(
            "[Debug DateFilter] ERROR: Helper not found. Cannot trigger search."
          );
        }
      },

      init(initOptions) {
        console.log("[Debug DateFilter] 1. Initializing widget...");
        // Store the helper reference
        this._helper = initOptions.helper;
        console.log("[Debug DateFilter] Saved helper:", this._helper);

        const container = document.querySelector(containerSelector);
        if (!container) {
          console.error(
            `[Debug DateFilter] ERROR: Container element "${containerSelector}" not found.`
          );
          return;
        }

        container.addEventListener("click", (event) => {
          console.log("[Debug DateFilter] 4. Click event detected.");
          const element = event.target.closest("a");
          if (element) {
            event.preventDefault();
            const value = element.dataset.value;
            console.log(`[Debug DateFilter] 5. Clicked on value: "${value}"`);
            this._refine(value);
          }
        });
      },

      render(renderOptions) {
        console.log("[Debug DateFilter] 2. Rendering UI...");
        const container = document.querySelector(containerSelector);

        if (container) {
          const firstGroup = items
            .slice(0, 4)
            .map(
              (item) => `
              <a href="#" 
                 class="f-cards-grid-layout-1_events-filter-top-item ${
                   currentState.selected === item.label ? "is-active" : ""
                 }" 
                 data-value="${item.label}">
                <div class="f-cards-grid-layout-1_events-filter-label">
                  ${item.label}
                </div>
              </a>`
            )
            .join("");

          const secondGroup = items
            .slice(4)
            .map(
              (item) => `
              <a href="#" 
                 class="f-cards-grid-layout-1_events-filter-bottom-item ${
                   currentState.selected === item.label ? "is-active" : ""
                 }" 
                 data-value="${item.label}">
                <div class="f-cards-grid-layout-1_events-filter-label">
                  ${item.label}
                </div>
              </a>`
            )
            .join("");

          container.innerHTML = `
          <div class="f-cards-grid-layout-1_events-filter-top">
            <div class="f-cards-grid-layout-1_events-filter-when-tag">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H3V0H5V2H13V0H15V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V8H2V18ZM2 6H16V4H2V6ZM9 12C8.71667 12 8.47917 11.9042 8.2875 11.7125C8.09583 11.5208 8 11.2833 8 11C8 10.7167 8.09583 10.4792 8.2875 10.2875C8.47917 10.0958 8.71667 10 9 10C9.28333 10 9.52083 10.0958 9.7125 10.2875C9.90417 10.4792 10 10.7167 10 11C10 11.2833 9.90417 11.5208 9.7125 11.7125C9.52083 11.9042 9.28333 12 9 12ZM5 12C4.71667 12 4.47917 11.9042 4.2875 11.7125C4.09583 11.5208 4 11.2833 4 11C4 10.7167 4.09583 10.4792 4.2875 10.2875C4.47917 10.0958 4.71667 10 5 10C5.28333 10 5.52083 10.0958 5.7125 10.2875C5.90417 10.4792 6 10.7167 6 11C6 11.2833 5.90417 11.5208 5.7125 11.7125C5.52083 11.9042 5.28333 12 5 12ZM13 12C12.7167 12 12.4792 11.9042 12.2875 11.7125C12.0958 11.5208 12 11.2833 12 11C12 10.7167 12.0958 10.4792 12.2875 10.2875C12.4792 10.0958 12.7167 10 13 10C13.2833 10 13.5208 10.0958 13.7125 10.2875C13.9042 10.4792 14 10.7167 14 11C14 11.2833 13.9042 11.5208 13.7125 11.7125C13.5208 11.9042 13.2833 12 13 12ZM9 16C8.71667 16 8.47917 15.9042 8.2875 15.7125C8.09583 15.5208 8 15.2833 8 15C8 14.7167 8.09583 14.4792 8.2875 14.2875C8.47917 14.0958 8.71667 14 9 14C9.28333 14 9.52083 14.0958 9.7125 14.2875C9.90417 14.4792 10 14.7167 10 15C10 15.2833 9.90417 15.5208 9.7125 15.7125C9.52083 15.9042 9.28333 16 9 16ZM5 16C4.71667 16 4.47917 15.9042 4.2875 15.7125C4.09583 15.5208 4 15.2833 4 15C4 14.7167 4.09583 14.4792 4.2875 14.2875C4.47917 14.0958 4.71667 14 5 14C5.28333 14 5.52083 14.0958 5.7125 14.2875C5.90417 14.4792 6 14.7167 6 15C6 15.2833 5.90417 15.5208 5.7125 15.7125C5.52083 15.9042 5.28333 16 5 16ZM13 16C12.7167 16 12.4792 15.9042 12.2875 15.7125C12.0958 15.5208 12 15.2833 12 15C12 14.7167 12.0958 14.4792 12.2875 14.2875C12.4792 14.0958 12.7167 14 13 14C13.2833 14 13.5208 14.0958 13.7125 14.2875C13.9042 14.4792 14 14.7167 14 15C14 15.2833 13.9042 15.5208 13.7125 15.7125C13.5208 15.9042 13.2833 16 13 16Z" fill="#4F260A" style="fill:#4F260A;fill:color(display-p3 0.3098 0.1490 0.0392);fill-opacity:1;"/>
              </svg>
              <div class="f-cards-grid-layout-1_events-filter-when-tag-label">WHEN</div>
            </div>
              ${firstGroup}
            </div>
            <div class="f-cards-grid-layout-1_events-filter-bottom">${secondGroup}</div>
          `;
        }
      },

      getWidgetSearchParameters(searchParameters, searchOptions) {
        console.log(
          `[Debug DateFilter] 3. Applying search parameters. Current selection: "${currentState.selected}"`
        );

        // This should now fire every time because we're using helper.setState()
        const currentParams = searchParameters
          .clearRefinements("startTimestamp")
          .clearRefinements("endTimestamp");

        if (!currentState.selected) {
          console.log(
            "[Debug DateFilter] No selection, returning cleared params"
          );
          return currentParams;
        }

        const selectedRange = items.find(
          (item) => item.label === currentState.selected
        );
        if (!selectedRange) {
          console.log(
            "[Debug DateFilter] Selected range not found, returning cleared params"
          );
          return currentParams;
        }

        console.log(
          `[Debug DateFilter] Found range for "${currentState.selected}". Applying filters...`,
          `Start: ${selectedRange.start}, End: ${selectedRange.end}`
        );
        return currentParams
          .addNumericRefinement("startTimestamp", "<=", selectedRange.end)
          .addNumericRefinement("endTimestamp", ">=", selectedRange.start);
      },
    };
  }

  // --- 3. Define the filter options ---
  const dateFilterItems = [
    { label: "Today", ...getTodayRange() },
    { label: "This Weekend", ...getThisWeekendRange() },
    { label: "This Week", ...getThisWeekRange() },
    { label: "Next Week", ...getNextWeekRange() },
    ...getMonthRanges().map((m) => ({
      label: m.label,
      start: m.range.start,
      end: m.range.end,
    })),
  ];

  // --- 4. Create an INSTANCE of the widget by calling the factory ---
  const customDateFilter = createDateFilterWidget({
    containerSelector: "#f-cards-grid-layout-1_events-filter-target",
    title: "Filter by Date",
    items: dateFilterItems,
  });

  // Replace your createCurrentRefinementsWidget function with this:

  function createCurrentRefinementsWidget(containerSelector) {
    return instantsearch.connectors.connectCurrentRefinements(
      (renderOptions, isFirstRender) => {
        const { items, refine, widgetParams } = renderOptions;
        const container = document.querySelector(widgetParams.container);

        // Filter out date-related refinements (startTimestamp and endTimestamp)
        const filteredItems = items.filter(
          (group) =>
            group.attribute !== "startTimestamp" &&
            group.attribute !== "endTimestamp"
        );

        container.innerHTML = `
       <ul class="f-cards-layout-1_CurrentRefinements-list">
         ${filteredItems
           .flatMap((group) =>
             group.refinements.map(
               (refinement) => `
               <li class="ais-CurrentRefinements-item">
                 <span class="active-facet-tag ${
                   FACET_CLASS_MAP[group.attribute] || "default-tag"
                 }">
                   ${formatFacetValue(refinement.label, group.attribute)}
                   <button class="remove-refinement-button" data-value="${
                     refinement.value
                   }" data-attribute="${group.attribute}">
                     <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M14.6261 14.2725L14.2725 14.6261C14.0772 14.8213 13.7607 14.8213 13.5654 14.6261L9.49954 10.5602L5.43364 14.626C5.23842 14.8213 4.92183 14.8213 4.72657 14.626L4.37301 14.2725C4.17775 14.0772 4.17775 13.7607 4.37301 13.5654L8.43889 9.49954L4.37301 5.43364C4.17775 5.23842 4.17775 4.92183 4.37301 4.72657L4.72656 4.37302C4.92182 4.17775 5.23842 4.17775 5.43364 4.37302L9.49954 8.43889L13.5654 4.37301C13.7607 4.17775 14.0772 4.17775 14.2725 4.37301L14.6261 4.72656C14.8213 4.92182 14.8213 5.23842 14.6261 5.43364L10.5602 9.49954L14.6261 13.5654C14.8213 13.7607 14.8213 14.0772 14.6261 14.2725Z" fill="white" style="fill:white;fill-opacity:1;"/>
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
            const refinementToRemove = filteredItems
              .flatMap((group) => group.refinements)
              .find((ref) => ref.value === button.dataset.value);

            if (refinementToRemove) {
              refine(refinementToRemove);
            }
          }
        });
      }
    )({
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
      const hasIcon =
        FACET_ICON_MAP[attributeName] &&
        FACET_ICON_MAP[attributeName][item.value];
      let iconHtml = "";

      if (hasIcon) {
        const sanitizedValue = item.value.replace(/[^a-zA-Z0-9-_]/g, "-");
        const iconClass = `icon--${attributeName}-${sanitizedValue}`;
        iconHtml = html`<span
          class="f-cards-grid-layout-1_filter-item-icon ${iconClass}"
        ></span>`;
      }

      return html` <a
        href="#"
        class="f-cards-grid-layout-1_filter-collection-item ${item.isRefined
          ? "is-active"
          : ""}"
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
      placeholder: "Looking for something? Start typing.",
      searchAsYouType: true,
      showSubmit: false,
    }),

    instantsearch.widgets.stats({
      container: "#f-cards-filter_stats",
      templates: {
        text(data, { html }) {
          return html`${data.nbHits} events found.`;
        },
      },
    }),

    instantsearch.widgets.stats({
      container: "#apply-results-text",
      templates: {
        text(data, { html }) {
          return html`(${data.nbHits} results)`;
        },
      },
    }),

    customDateFilter,

    // Replace your hits widget with this updated version:

    instantsearch.widgets.hits({
      container: "#f-cards-filter_hits-grid",
      templates: {
        item: (hit, { html, components }) => {
          // Helper function to get month abbreviation
          const getMonthAbbr = (month) => {
            const months = [
              "JAN",
              "FEB",
              "MAR",
              "APR",
              "MAY",
              "JUN",
              "JUL",
              "AUG",
              "SEP",
              "OCT",
              "NOV",
              "DEC",
            ];
            return months[month - 1] || "JAN";
          };

          // Check if it's a single day event
          const isSingleDay =
            hit.startYear === hit.endYear &&
            hit.startMonth === hit.endMonth &&
            hit.startDay === hit.endDay;

          // Generate the date wrapper HTML
          const dateWrapperHtml = isSingleDay
            ? // Single day event - show only start date
              html`<div
                class="f-cards-grid-layout-1_events-date-wrapper"
                style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;"
              >
                <div class="showcase-style-9_start-date-wrapper">
                  <div class="text-size-small text-style-allcaps">
                    ${getMonthAbbr(hit.startMonth)}
                  </div>
                  <div class="showcase-style-9_date-day">${hit.startDay}</div>
                </div>
              </div>`
            : // Multi-day event - show start and end dates with chevron
              html`<div
                class="f-cards-grid-layout-1_events-date-wrapper"
                style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;"
              >
                <div class="showcase-style-9_start-date-wrapper">
                  <div class="text-size-small text-style-allcaps">
                    ${getMonthAbbr(hit.startMonth)}
                  </div>
                  <div class="showcase-style-9_date-day">${hit.startDay}</div>
                </div>
                <div class="showcase-style-9_chevron w-embed">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    viewBox="0 0 8 12"
                    fill="none"
                  >
                    <path
                      d="M1.414 11.414L7.121 5.707L1.414 0L0 1.414L4.293 5.707L0 10L1.414 11.414Z"
                      fill="#171717"
                      style="fill:#171717;fill:color(display-p3 0.0902 0.0902 0.0902);fill-opacity:1;"
                    ></path>
                  </svg>
                </div>
                <div class="showcase-style-9_end-date-wrapper">
                  <div class="text-size-small text-style-allcaps">
                    ${getMonthAbbr(hit.endMonth)}
                  </div>
                  <div class="showcase-style-9_date-day">${hit.endDay}</div>
                </div>
              </div>`;

          return html`
            <a
              href="${hit.webflowLink}"
              class="f-cards-grid-layout-1_card-link-wrapper"
            >
              <article class="f-cards-grid-layout-1_algolia-card">
                ${dateWrapperHtml}
                <img
                  src="${hit.thumbnailImage ||
                  "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif"}"
                  alt="${components.Highlight({ attribute: "Name", hit })}"
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
          `;
        },
      },
    }),

    instantsearch.widgets.pagination({
      container: "#f-cards-filter_pagination",
      showFirst: false,
      showLast: false,
      scrollTo: ".f-cards-grid-layout-1_algolia-testing-area",
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
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("Regions") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_amenities-list",
      attribute: "Amenities",
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("Amenities") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_cities-list",
      attribute: "Cities",
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("Cities") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_categories-list",
      attribute: "Categories",
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("Categories") },
    }),
    instantsearch.widgets.refinementList({
      container: "#f-cards-filter_highlighttags-list",
      attribute: "highlightTags",
      sortBy: ["name:asc"],
      templates: { item: createRefinementListItemTemplate("highlightTags") },
    }),
  ]);

  search.start();
});
