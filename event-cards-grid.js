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

(function () {
  // Utility to load a script and return a Promise
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve(); // already loaded
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // Utility to load a CSS file
  function loadCSS(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  // Wait for Webflow's jQuery to be available
  function waitForJQuery(cb, tries = 30) {
    if (window.jQuery) return cb(window.jQuery);
    if (tries <= 0) return console.error("[DateFilter] jQuery not found after waiting");
    setTimeout(() => waitForJQuery(cb, tries - 1), 100);
  }

  waitForJQuery(function ($) {
    loadScript("https://cdn.jsdelivr.net/momentjs/latest/moment.min.js")
      .then(function () {
        // Ensure moment-timezone is loaded
        return loadScript(
          "https://cdn.jsdelivr.net/npm/moment-timezone@0.5.40/builds/moment-timezone-with-data.min.js"
        );
      })
      .then(function () {
        return loadScript("https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js");
      })
      .then(function () {
        loadCSS("https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css");
        if (!$.fn.daterangepicker) {
          console.error("[DateFilter] daterangepicker plugin still not loaded!");
          return;
        }

        // --- MAIN CODE STARTS HERE ---
        function runMain() {
          // Initialize Algolia search client
          const searchClient = algoliasearch("LF0CCFQRH3", "9ff98e053974ef9b01af86dfe17897f7");

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
           * Helper: Returns a Date object representing the current time in Arizona (UTC-7, no DST).
           */
          function getArizonaNow() {
            const now = new Date();
            // Get current UTC time in milliseconds
            const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
            // Arizona offset in milliseconds (UTC-7)
            const arizonaOffsetMillis = -7 * 60 * 60 * 1000;
            return new Date(utcMillis + arizonaOffsetMillis);
          }

          /**
           * Calculates the start and end of today in Arizona time as UTC timestamps.
           * @returns {{start: number, end: number}}
           */
          function getTodayRange() {
            // Get current moment in Arizona timezone
            const arizonaNow = moment.tz("America/Phoenix");

            // Get start and end of today in Arizona timezone
            const start = arizonaNow.clone().startOf("day");
            const end = arizonaNow.clone().endOf("day");

            return {
              start: start.unix(),
              end: end.unix(),
            };
          }

          /**
           * Calculates the start and end of this weekend (Saturday to Sunday) in Arizona time as UTC timestamps.
           * @returns {{start: number, end: number}}
           */
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
            // Convert back to UTC timestamps (seconds)
            const arizonaOffsetMillis = -7 * 60 * 60 * 1000;
            const startUTC = new Date(start.getTime() - arizonaOffsetMillis);
            const endUTC = new Date(end.getTime() - arizonaOffsetMillis);
            return {
              start: Math.floor(startUTC.getTime() / 1000),
              end: Math.floor(endUTC.getTime() / 1000),
            };
          }

          /**
           * Calculates the start and end of this week (Sunday to Saturday) in Arizona time as UTC timestamps.
           * @returns {{start: number, end: number}}
           */
          function getThisWeekRange() {
            const arizonaNow = getArizonaNow();
            const dayOfWeek = arizonaNow.getDay(); // Sunday = 0, Monday = 1, etc.
            const start = new Date(arizonaNow);
            start.setDate(arizonaNow.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            // Convert back to UTC timestamps (seconds)
            const arizonaOffsetMillis = -7 * 60 * 60 * 1000;
            const startUTC = new Date(start.getTime() - arizonaOffsetMillis);
            const endUTC = new Date(end.getTime() - arizonaOffsetMillis);
            return {
              start: Math.floor(startUTC.getTime() / 1000),
              end: Math.floor(endUTC.getTime() / 1000),
            };
          }

          /**
           * Calculates the start and end of next week (Sunday to Saturday) in Arizona time as UTC timestamps.
           * @returns {{start: number, end: number}}
           */
          function getNextWeekRange() {
            const thisWeek = getThisWeekRange();
            // Add 7 days (in seconds) to start and end
            const start = new Date((thisWeek.start + 7 * 24 * 60 * 60) * 1000);
            const end = new Date((thisWeek.end + 7 * 24 * 60 * 60) * 1000);
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
                const newValue = currentState.selected === value ? null : value;
                currentState.selected = newValue;

                // Use the helper's setState method to trigger a proper search
                if (this._helper) {
                  // Clear existing date refinements
                  let newState = this._helper.state.clearRefinements("startTimestamp").clearRefinements("endTimestamp");

                  // Apply new refinements if a date range is selected
                  if (newValue) {
                    const selectedRange = items.find((item) => item.label === newValue);
                    if (selectedRange) {
                      newState = newState
                        .addNumericRefinement("startTimestamp", "<=", selectedRange.end)
                        .addNumericRefinement("endTimestamp", ">=", selectedRange.start);
                    }
                  }

                  // Set the new state and search
                  this._helper.setState(newState).search();
                } else {
                  console.error("[Debug DateFilter] ERROR: Helper not found. Cannot trigger search.");
                }
              },

              init(initOptions) {
                // Store the helper reference
                this._helper = initOptions.helper;

                const container = document.querySelector(containerSelector);
                if (!container) {
                  console.error(`[Debug DateFilter] ERROR: Container element "${containerSelector}" not found.`);
                  return;
                }

                container.addEventListener("click", (event) => {
                  const element = event.target.closest("a");
                  if (element) {
                    event.preventDefault();
                    const value = element.dataset.value;
                    this._refine(value);
                  }
                });
              },

              render(renderOptions) {
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
                      <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H3V0H5V2H13V0H15V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V8H2V18ZM2 6H16V4H2V6ZM9 12C8.71667 12 8.47917 11.9042 8.2875 11.7125C8.09583 11.5208 8 11.2833 8 11C8 10.7167 8.09583 10.4792 8.2875 10.2875C8.47917 10.0958 8.71667 10 9 10C9.28333 10 9.52083 10.0958 9.7125 10.2875C9.90417 10.4792 10 10.7167 10 11C10 11.2833 9.90417 11.5208 9.7125 11.7125C9.52083 11.9042 9.28333 12 9 12ZM5 12C4.71667 12 4.47917 11.9042 4.2875 11.7125C4.09583 11.5208 4 11.2833 4 11C4 10.7167 4.09583 10.4792 4.2875 10.2875C4.47917 10.0958 4.71667 10 5 10C5.28333 10 5.52083 10.0958 5.7125 10.2875C5.90417 10.4792 6 10.7167 6 11C6 11.2833 5.90417 11.5208 5.7125 11.7125C5.52083 11.9042 5.28333 12 5 12ZM13 12C12.7167 12 12.4792 11.9042 12.2875 11.7125C12.0958 11.5208 12 11.2833 12 11C12 10.7167 12.0958 10.4792 12.2875 10.2875C12.4792 10.0958 12.7167 10 13 10C13.2833 10 13.5208 10.0958 13.7125 10.2875C13.9042 10.4792 14 10.7167 14 11C14 11.2833 13.9042 11.5208 13.7125 11.7125C13.52083 11.9042 13.2833 12 13 12ZM9 16C8.71667 16 8.47917 15.9042 8.2875 15.7125C8.09583 15.5208 8 15.2833 8 15C8 14.7167 8.09583 14.4792 8.2875 14.2875C8.47917 14.0958 8.71667 14 9 14C9.28333 14 9.52083 14.0958 9.7125 14.2875C9.90417 14.4792 10 14.7167 10 15C10 15.2833 9.90417 15.5208 9.7125 15.7125C9.52083 15.9042 9.28333 16 9 16ZM5 16C4.71667 16 4.47917 15.9042 4.2875 15.7125C4.09583 15.5208 4 15.2833 4 15C4 14.7167 4.09583 14.4792 4.2875 14.2875C4.47917 14.0958 4.71667 14 5 14C5.28333 14 5.52083 14.0958 5.7125 14.2875C5.90417 14.4792 6 14.7167 6 15C6 15.2833 5.90417 15.5208 5.7125 15.7125C5.52083 15.9042 5.28333 16 5 16ZM13 16C12.7167 16 12.4792 15.9042 12.2875 15.7125C12.0958 15.5208 12 15.2833 12 15C12 14.7167 12.0958 14.4792 12.2875 14.2875C12.4792 14.0958 12.7167 14 13 14C13.2833 14 13.5208 14.0958 13.7125 14.2875C13.9042 14.4792 14 14.7167 14 15C14 15.2833 13.9042 15.5208 13.7125 15.7125C13.52083 15.9042 13.2833 16 13 16Z" fill="#4F260A" style="fill:#4F260A;fill:color(display-p3 0.3098 0.1490 0.0392);fill-opacity:1;"/>
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
                // This should now fire every time because we're using helper.setState()
                const currentParams = searchParameters
                  .clearRefinements("startTimestamp")
                  .clearRefinements("endTimestamp");

                if (!currentState.selected) {
                  return currentParams;
                }

                const selectedRange = items.find((item) => item.label === currentState.selected);
                if (!selectedRange) {
                  return currentParams;
                }

                return currentParams
                  .addNumericRefinement("startTimestamp", "<=", selectedRange.end)
                  .addNumericRefinement("endTimestamp", ">=", selectedRange.start);
              },
            };
          }

          // --- 3. Define the filter options ---
          // Only keep quick-pick options (no months)
          const dateFilterItems = [
            { label: "Today", ...getTodayRange() },
            { label: "This Weekend", ...getThisWeekendRange() },
            { label: "This Week", ...getThisWeekRange() },
            { label: "Next Week", ...getNextWeekRange() },
          ];

          // --- 4. Create an INSTANCE of the widget by calling the factory ---
          // Refactor: The widget will only render quick-pick buttons and the date range input
          const customDateFilter = {
            _helper: null,
            _input: null,
            _currentRange: null, // {start, end} as moment objects
            _picker: null,
            _activeQuickPick: null,
            _quickPickEls: [],

            /**
             * Formats a moment date as "Thu, Jul 24" style
             */
            _formatDateNice(date) {
              const day = date.format("ddd"); // Mon, Tue, etc.
              const month = date.format("MMM"); // Jan, Feb, etc.
              const dayNum = date.format("D"); // 1, 2, 3, etc. (no suffix)
              return `${day}, ${month} ${dayNum}`;
            },

            /**
             * Updates the input display based on current filter state
             */
            _updateInputDisplay() {
              if (!this._currentRange) {
                // No active filter - show placeholder
                this._input.value = "";
                this._input.placeholder = "Select dates";
                this._clearBtn.style.display = "none";
                return;
              }

              const { start, end } = this._currentRange;
              if (start.isSame(end, "day")) {
                // Single day
                this._input.value = this._formatDateNice(start);
              } else {
                // Date range
                this._input.value = `${this._formatDateNice(start)}  —  ${this._formatDateNice(end)}`;
              }
              this._clearBtn.style.display = "block";
            },

            _setActiveButton(label) {
              this._activeQuickPick = label;
              this._quickPickEls.forEach((el) => {
                if (el.dataset.value === label) {
                  el.classList.add("is-active");
                } else {
                  el.classList.remove("is-active");
                }
              });
            },
            _clearActiveButtons() {
              this._activeQuickPick = null;
              this._quickPickEls.forEach((el) => el.classList.remove("is-active"));
            },
            _findMatchingQuickPick(start, end) {
              // start/end are moment objects (from daterangepicker)
              for (const item of dateFilterItems) {
                const itemStart = moment.tz(item.start * 1000, "America/Phoenix").startOf("day");
                const itemEnd = moment.tz(item.end * 1000, "America/Phoenix").startOf("day");
                if (start.isSame(itemStart, "day") && end.isSame(itemEnd, "day")) {
                  return item.label;
                }
              }
              return null;
            },
            _isSameRange(a, b) {
              if (!a || !b) return false;
              return a.start.isSame(b.start, "day") && a.end.isSame(b.end, "day");
            },

            /**
             * Fixes daterangepicker's broken "in-range" highlighting by removing incorrect classes
             */
            _fixPickerHighlighting() {
              if (!this._picker) return;

              // Check if picker is actually visible
              const pickerElement = document.querySelector(".daterangepicker");
              if (!pickerElement || !pickerElement.classList.contains("show-calendar")) {
                return;
              }

              // Step 1: Remove all in-range classes
              const allCells = pickerElement.querySelectorAll("td.in-range");
              allCells.forEach((cell) => cell.classList.remove("in-range"));

              // Step 2: Find start and end date cells
              const startDateCell = pickerElement.querySelector("td.start-date");
              const endDateCells = pickerElement.querySelectorAll("td.end-date");

              // Find the end-date cell that doesn't also have start-date
              let endDateCell = null;
              for (const cell of endDateCells) {
                if (!cell.classList.contains("start-date")) {
                  endDateCell = cell;
                  break;
                }
              }
              if (!endDateCell && endDateCells.length > 0) {
                endDateCell = endDateCells[endDateCells.length - 1];
              }

              if (!startDateCell || !endDateCell) {
                return;
              }

              // Step 3: Add in-range back to cells between start and end
              const startDate = this._picker.startDate.format("YYYY-MM-DD");
              const endDate = this._picker.endDate.format("YYYY-MM-DD");

              const allAvailableCells = pickerElement.querySelectorAll("td.available");

              allAvailableCells.forEach((cell) => {
                // Reconstruct the cell's date
                const cellText = cell.textContent.trim();
                if (!cellText || isNaN(cellText)) return;

                const calendar = cell.closest(".drp-calendar");
                const monthHeader = calendar?.querySelector(".month")?.textContent;
                if (!monthHeader) return;

                const [monthName, year] = monthHeader.split(" ");
                const monthIndex = moment().month(monthName).month();
                const cellDate = moment.utc(`${year}-${monthIndex + 1}-${cellText}`, "YYYY-M-D").format("YYYY-MM-DD");

                // Add in-range if cell date is between start and end (inclusive)
                if (cellDate >= startDate && cellDate <= endDate) {
                  cell.classList.add("in-range");
                }
              });
            },

            init(initOptions) {
              this._helper = initOptions.helper;
              const container = document.querySelector("#f-cards-grid-layout-1_events-filter-target");
              if (!container) {
                console.error("[DateFilter] Container not found for #f-cards-grid-layout-1_events-filter-target");
                return;
              }

              // Render quick-pick buttons and the date range input
              const quickPickHtml = dateFilterItems
                .map(
                  (item) => `
                    <a href="#" class="f-cards-grid-layout-1_events-filter-top-item" data-value="${item.label}">
                      <div class="f-cards-grid-layout-1_events-filter-label">${item.label}</div>
                    </a>`
                )
                .join("");
              container.innerHTML = `
                <div class="f-cards-grid-layout-1_events-filter-top">
                  <div class="date-input-wrapper">
                    <input type="text" id="date-range-picker" class="f-cards-grid-layout-1_events-filter-date-input" placeholder="Select dates" readonly />
                    <button type="button" class="date-clear-btn" style="display: none;">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.5 2.5L2.5 9.5M2.5 2.5L9.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div class="quick-picks-wrapper">
                    ${quickPickHtml}
                  </div>
                </div>
              `;

              // Save input reference
              this._input = container.querySelector("#date-range-picker");
              this._clearBtn = container.querySelector(".date-clear-btn");
              this._quickPickEls = Array.from(
                container.querySelectorAll(".f-cards-grid-layout-1_events-filter-top-item")
              );

              // On page load, start with no selection and placeholder
              this._clearActiveButtons();
              this._currentRange = null;
              this._updateInputDisplay();

              // Listen for quick-pick button clicks
              container.addEventListener("click", (event) => {
                const element = event.target.closest("a[data-value]");
                if (element) {
                  event.preventDefault();
                  const value = element.dataset.value;
                  // If already active, clear filter and input
                  if (this._activeQuickPick === value) {
                    this._clearAlgoliaRefinement();
                    this._clearActiveButtons();
                    this._currentRange = null;
                    if (this._picker) {
                      // Reset picker to no selection
                      this._picker.setStartDate(moment.tz("America/Phoenix"));
                      this._picker.setEndDate(moment.tz("America/Phoenix"));
                    }
                    this._updateInputDisplay();
                    return;
                  }
                  const quickPick = dateFilterItems.find((item) => item.label === value);
                  if (quickPick && this._input && this._picker) {
                    // Use Arizona timezone for display
                    let start = moment.tz(quickPick.start * 1000, "America/Phoenix").startOf("day");
                    let end = moment.tz(quickPick.end * 1000, "America/Phoenix").startOf("day");
                    // For single-day, set both start and end to the exact same moment
                    let pickerEnd = end;
                    if (start.isSame(end, "day")) {
                      // For single day, set end to the exact same moment as start
                      pickerEnd = start.clone();
                    } else {
                      // For multi-day ranges, set end to endOf('day')
                      pickerEnd = end.clone().endOf("day");
                    }

                    // Only update if range is different
                    if (!this._currentRange || !this._isSameRange(this._currentRange, { start, end })) {
                      this._picker.setStartDate(start);
                      this._picker.setEndDate(pickerEnd);
                      this._setActiveButton(value);
                      this._applyAlgoliaRefinement(start, end);
                      this._currentRange = { start, end };
                      this._updateInputDisplay();
                      // Fix will run when picker opens
                    }
                  }
                }
              });

              // Listen for input changes (date picker or manual)
              if (this._input) {
                this._input.addEventListener("change", (e) => {
                  const value = this._input.value;
                  // Only process if it's a date range format (manual entry)
                  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})\s*[-—]\s*(\d{2})\/(\d{2})\/(\d{4})/);
                  if (match) {
                    // Use Arizona timezone for parsing
                    let start = moment
                      .tz(`${match[1]}/${match[2]}/${match[3]}`, "MM/DD/YYYY", "America/Phoenix")
                      .startOf("day");
                    let end = moment
                      .tz(`${match[4]}/${match[5]}/${match[6]}`, "MM/DD/YYYY", "America/Phoenix")
                      .startOf("day");
                    // For single-day, force end = start
                    if (start.isSame(end, "day")) {
                      end = start.clone();
                    }
                    // Only update if range is different
                    if (!this._currentRange || !this._isSameRange(this._currentRange, { start, end })) {
                      this._applyAlgoliaRefinement(start, end);
                      const matchLabel = this._findMatchingQuickPick(start, end);
                      if (matchLabel) {
                        this._setActiveButton(matchLabel);
                      } else {
                        this._clearActiveButtons();
                      }
                      this._currentRange = { start, end };
                      this._updateInputDisplay();
                    }
                  } else if (!value || value === "Select dates") {
                    // Input cleared or placeholder text
                    this._clearAlgoliaRefinement();
                    this._clearActiveButtons();
                    this._currentRange = null;
                    this._updateInputDisplay();
                  }
                });
              }

              // Add event listener for the clear button
              if (this._clearBtn) {
                this._clearBtn.addEventListener("click", () => {
                  this._clearAlgoliaRefinement();
                  this._clearActiveButtons();
                  this._currentRange = null;
                  if (this._picker) {
                    this._picker.setStartDate(moment.tz("America/Phoenix"));
                    this._picker.setEndDate(moment.tz("America/Phoenix"));
                  }
                  this._updateInputDisplay();
                });
              }

              // // Add event listener for the search button
              // const searchBtn = container.querySelector(".date-search-btn");
              // if (searchBtn && this._input) {
              //   searchBtn.addEventListener("click", () => {
              //     // Check if picker has a selection that hasn't been applied yet
              //     if (this._picker && this._picker.startDate && this._picker.endDate) {
              //       let start = this._picker.startDate.clone().tz("America/Phoenix").startOf("day");
              //       let end = this._picker.endDate.clone().tz("America/Phoenix").startOf("day");
              //       // For single-day, force end = start
              //       if (start.isSame(end, "day")) {
              //         end = start.clone();
              //       }

              //       // Apply this range
              //       this._applyAlgoliaRefinement(start, end);
              //       const matchLabel = this._findMatchingQuickPick(start, end);
              //       if (matchLabel) {
              //         this._setActiveButton(matchLabel);
              //       } else {
              //         this._clearActiveButtons();
              //       }
              //       this._currentRange = { start, end };
              //       this._updateInputDisplay();
              //     } else if (this._currentRange) {
              //       // Re-apply current range
              //       const { start, end } = this._currentRange;
              //       this._applyAlgoliaRefinement(start, end);
              //     }
              //   });
              // }

              // Add event listener for the submit button
              const submitBtn = container.querySelector(".date-submit-btn");
              if (submitBtn && this._input) {
                submitBtn.addEventListener("click", () => {
                  // Check if picker has a selection that hasn't been applied yet
                  if (this._picker && this._picker.startDate && this._picker.endDate) {
                    let start = this._picker.startDate.clone().tz("America/Phoenix").startOf("day");
                    let end = this._picker.endDate.clone().tz("America/Phoenix").startOf("day");
                    // For single-day, force end = start
                    if (start.isSame(end, "day")) {
                      end = start.clone();
                    }

                    // Apply this range
                    this._applyAlgoliaRefinement(start, end);
                    const matchLabel = this._findMatchingQuickPick(start, end);
                    if (matchLabel) {
                      this._setActiveButton(matchLabel);
                    } else {
                      this._clearActiveButtons();
                    }
                    this._currentRange = { start, end };
                    this._updateInputDisplay();

                    // Close the picker after applying
                    if (this._picker) {
                      this._picker.hide();
                    }
                  } else if (this._currentRange) {
                    // Re-apply current range
                    const { start, end } = this._currentRange;
                    this._applyAlgoliaRefinement(start, end);
                  }
                });
              }

              // Add event listener for the cancel button
              const cancelBtn = container.querySelector(".date-cancel-btn");
              if (cancelBtn && this._input) {
                cancelBtn.addEventListener("click", () => {
                  // Reset to current range or clear if none
                  if (this._currentRange) {
                    // Keep the current range but don't change anything
                    this._updateInputDisplay();
                  } else {
                    // Clear everything
                    this._clearAlgoliaRefinement();
                    this._clearActiveButtons();
                    this._currentRange = null;
                    if (this._picker) {
                      this._picker.setStartDate(moment.tz("America/Phoenix"));
                      this._picker.setEndDate(moment.tz("America/Phoenix"));
                    }
                    this._updateInputDisplay();
                  }

                  // Close the picker
                  if (this._picker) {
                    this._picker.hide();
                  }
                });
              }

              // Algolia refinement helpers
              this._applyAlgoliaRefinement = (start, end) => {
                if (this._helper) {
                  // Only update if range is different
                  if (!this._currentRange || !this._isSameRange(this._currentRange, { start, end })) {
                    let newState = this._helper.state
                      .clearRefinements("startTimestamp")
                      .clearRefinements("endTimestamp")
                      .addNumericRefinement(
                        "startTimestamp",
                        "<=",
                        end.clone().endOf("day").tz("America/Phoenix").unix()
                      )
                      .addNumericRefinement(
                        "endTimestamp",
                        ">=",
                        start.clone().startOf("day").tz("America/Phoenix").unix()
                      );
                    this._helper.setState(newState).search();
                    this._currentRange = { start, end };
                    this._updateInputDisplay();
                  }
                }
              };
              this._clearAlgoliaRefinement = () => {
                if (this._helper) {
                  let newState = this._helper.state.clearRefinements("startTimestamp").clearRefinements("endTimestamp");
                  this._helper.setState(newState).search();
                  this._currentRange = null;
                  this._updateInputDisplay();
                }
              };

              // Initialize daterangepicker if available
              if (window.$ && window.$.fn && window.$.fn.daterangepicker && this._input) {
                this._picker = window
                  .$(this._input)
                  .daterangepicker({
                    opens: "center",
                    autoUpdateInput: false, // We'll handle input updates manually
                    locale: {
                      format: "MM/DD/YYYY",
                      separator: "  —  ",
                      applyLabel: "Apply",
                      cancelLabel: "Cancel",
                      fromLabel: "From",
                      toLabel: "To",
                      customRangeLabel: "Custom",
                      weekLabel: "W",
                      daysOfWeek: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
                      monthNames: [
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
                      ],
                    },
                  })
                  .data("daterangepicker");

                // Add custom buttons to the daterangepicker
                window.$(this._input).on("show.daterangepicker", (ev, picker) => {
                  // Run our fix after picker is shown and has time to render
                  setTimeout(() => {
                    this._fixPickerHighlighting();

                    // Add custom buttons to the picker
                    const pickerElement = document.querySelector(".daterangepicker");
                    if (pickerElement) {
                      // Check if we already added the buttons
                      if (!pickerElement.querySelector(".custom-picker-buttons")) {
                        // Create custom buttons container
                        const customButtonsContainer = document.createElement("div");
                        customButtonsContainer.className = "custom-picker-buttons";
                        customButtonsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 10px 15px;
            border-top: 1px solid #ddd;
            background: #f8f9fa;
          `;

                        // Create Apply button
                        const applyBtn = document.createElement("button");
                        applyBtn.textContent = "Apply";
                        applyBtn.className = "custom-apply-btn";
                        applyBtn.style.cssText = `
            padding: 6px 12px;
            background: #007bff;
            color: white;
            border: 1px solid #007bff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          `;

                        // Create Cancel button
                        const cancelBtn = document.createElement("button");
                        cancelBtn.textContent = "Cancel";
                        cancelBtn.className = "custom-cancel-btn";
                        cancelBtn.style.cssText = `
            padding: 6px 12px;
            background: white;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          `;

                        // Add event listeners
                        applyBtn.addEventListener("click", () => {
                          // Apply the current picker selection
                          if (this._picker && this._picker.startDate && this._picker.endDate) {
                            let start = this._picker.startDate.clone().tz("America/Phoenix").startOf("day");
                            let end = this._picker.endDate.clone().tz("America/Phoenix").startOf("day");
                            if (start.isSame(end, "day")) {
                              end = start.clone();
                            }

                            this._applyAlgoliaRefinement(start, end);
                            const matchLabel = this._findMatchingQuickPick(start, end);
                            if (matchLabel) {
                              this._setActiveButton(matchLabel);
                            } else {
                              this._clearActiveButtons();
                            }
                            this._currentRange = { start, end };
                            this._updateInputDisplay();
                          }

                          // Close the picker
                          this._picker.hide();
                        });

                        cancelBtn.addEventListener("click", () => {
                          // Reset picker to current range or clear
                          if (this._currentRange) {
                            this._picker.setStartDate(this._currentRange.start);
                            this._picker.setEndDate(this._currentRange.end);
                          } else {
                            this._picker.setStartDate(moment.tz("America/Phoenix"));
                            this._picker.setEndDate(moment.tz("America/Phoenix"));
                          }

                          // Close the picker
                          this._picker.hide();
                        });

                        // Add buttons to container
                        customButtonsContainer.appendChild(cancelBtn);
                        customButtonsContainer.appendChild(applyBtn);

                        // Add container to picker
                        pickerElement.appendChild(customButtonsContainer);
                      }
                    }
                  }, 100);
                });

                // Listen for apply event
                window.$(this._input).on("apply.daterangepicker", (ev, picker) => {
                  // Use Arizona timezone for picker
                  let start = picker.startDate.clone().tz("America/Phoenix").startOf("day");
                  let end = picker.endDate.clone().tz("America/Phoenix").startOf("day");
                  // For single-day, force end = start
                  if (start.isSame(end, "day")) {
                    end = start.clone();
                  }
                  // Only update if range is different
                  if (!this._currentRange || !this._isSameRange(this._currentRange, { start, end })) {
                    this._applyAlgoliaRefinement(start, end);
                    const matchLabel = this._findMatchingQuickPick(start, end);
                    if (matchLabel) {
                      this._setActiveButton(matchLabel);
                    } else {
                      this._clearActiveButtons();
                    }
                    this._currentRange = { start, end };
                    this._updateInputDisplay();
                  }
                });

                // Listen for picker show/hide events
                window.$(this._input).on("show.daterangepicker", (ev, picker) => {
                  // Run our fix after picker is shown and has time to render
                  setTimeout(() => {
                    this._fixPickerHighlighting();
                  }, 100);
                });

                window.$(this._input).on("hide.daterangepicker", (ev, picker) => {
                  // Picker closed
                });

                // Listen for clear/cancel
                window.$(this._input).on("cancel.daterangepicker", (ev, picker) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  this._clearAlgoliaRefinement();
                  this._clearActiveButtons();
                  this._currentRange = null;
                  this._updateInputDisplay();
                });
              } else {
                if (!window.$) {
                  console.error("[DateFilter] jQuery ($) is not loaded");
                } else if (!window.$.fn || !window.$.fn.daterangepicker) {
                  console.error("[DateFilter] daterangepicker plugin is not loaded");
                } else if (!this._input) {
                  console.error("[DateFilter] #date-range-picker input not found for daterangepicker");
                }
              }
            },
            render() {}, // No-op, handled in init
            getWidgetSearchParameters(searchParameters) {
              // Always clear date refinements; input change will handle them
              return searchParameters.clearRefinements("startTimestamp").clearRefinements("endTimestamp");
            },
          };

          // Replace your createCurrentRefinementsWidget function with this:

          function createCurrentRefinementsWidget(containerSelector) {
            return instantsearch.connectors.connectCurrentRefinements((renderOptions, isFirstRender) => {
              const { items, refine, widgetParams } = renderOptions;
              const container = document.querySelector(widgetParams.container);

              // Filter out date-related refinements (startTimestamp and endTimestamp)
              const filteredItems = items.filter(
                (group) => group.attribute !== "startTimestamp" && group.attribute !== "endTimestamp"
              );

              container.innerHTML = `
             <ul class="f-cards-layout-1_CurrentRefinements-list">
               ${filteredItems
                 .flatMap((group) =>
                   group.refinements.map(
                     (refinement) => `
                     <li class="ais-CurrentRefinements-item">
                       <span class="active-facet-tag ${FACET_CLASS_MAP[group.attribute] || "default-tag"}">
                         ${formatFacetValue(refinement.label, group.attribute)}
                         <button class="remove-refinement-button" data-value="${refinement.value}" data-attribute="${
                       group.attribute
                     }">
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
                  const refinementToRemove = filteredItems
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

          const todayStart = moment.tz("America/Phoenix").startOf("day").unix();

          const futureEventsFilter = {
            init(initOptions) {
              this.helper = initOptions.helper;

              // Apply the filter immediately
              this.helper.addNumericRefinement("endTimestamp", ">=", todayStart);
              this.helper.search();
            },

            render() {
              // No rendering needed
            },

            getWidgetSearchParameters(searchParameters) {
              return searchParameters.addNumericRefinement("endTimestamp", ">=", todayStart);
            },
          };

          const search = instantsearch({
            indexName: indexName,
            searchClient,
            routing: false,
            initialUiState: {
              [indexName]: {
                refinementList: prefilters,
                numericFilters: [`endTimestamp>=${todayStart}`],
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
            futureEventsFilter,
            instantsearch.widgets.searchBox({
              container: "#f-cards-filter_searchbox",
              placeholder: "Search Events",
              searchAsYouType: true,
              showSubmit: false,
            }),

            // instantsearch.widgets.stats({
            //   container: "#f-cards-filter_stats",
            //   templates: {
            //     text(data, { html }) {
            //       return html`${data.nbHits} events found.`;
            //     },
            //   },
            // }),

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
                    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    return months[month - 1] || "JAN";
                  };

                  // Check if it's a single day event
                  const isSingleDay =
                    hit.startYear === hit.endYear && hit.startMonth === hit.endMonth && hit.startDay === hit.endDay;

                  // Generate the date wrapper HTML
                  const dateWrapperHtml = isSingleDay
                    ? // Single day event - show only start date
                      html`<div
                        class="f-cards-grid-layout-1_events-date-wrapper"
                        style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;"
                      >
                        <div class="showcase-style-9_start-date-wrapper">
                          <div class="text-size-small text-style-allcaps">${getMonthAbbr(hit.startMonth)}</div>
                          <div class="showcase-style-9_date-day">${hit.startDay}</div>
                        </div>
                      </div>`
                    : // Multi-day event - show start and end dates with chevron
                      html`<div
                        class="f-cards-grid-layout-1_events-date-wrapper"
                        style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;"
                      >
                        <div class="showcase-style-9_start-date-wrapper">
                          <div class="text-size-small text-style-allcaps">${getMonthAbbr(hit.startMonth)}</div>
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
                          <div class="text-size-small text-style-allcaps">${getMonthAbbr(hit.endMonth)}</div>
                          <div class="showcase-style-9_date-day">${hit.endDay}</div>
                        </div>
                      </div>`;

                  return html`
                    <a href="${hit.webflowLink}" class="f-cards-grid-layout-1_card-link-wrapper">
                      <article class="f-cards-grid-layout-1_algolia-card">
                        ${dateWrapperHtml}
                        <img
                          src="${hit.thumbnailImage ||
                          "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif"}"
                          alt="${hit.thumbnailAltText || "Event Image"}"
                          class="f-cards-grid-layout-1_card-image"
                          onerror="this.style.display='none'"
                        />
                        <div class="f-cards-filter_tags-container">${renderFacetTags(hit, "Categories", html, 1)}</div>
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
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", runMain);
        } else {
          runMain();
        }
        // --- MAIN CODE ENDS HERE ---
      });
  });
})();
