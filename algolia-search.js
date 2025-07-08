/**
 * Algolia Search Results Page - searches index created by Algolia Crawler
 */

document.addEventListener("DOMContentLoaded", function () {
  // Initialize Algolia search client
  const searchClient = algoliasearch(
    "LF0CCFQRH3",
    "9ff98e053974ef9b01af86dfe17897f7"
  );

  const indexName = "prod_arizona_sitewide";

  const FACET_CLASS_MAP = {
    Experience: "experience-tag",
    "Like A Local": "local-tag",
    Event: "event-tag",
    "Parks & Monuments": "parks-tag",
    Page: "page-tag",
    City: "cities-tag",
    "Native Americans": "native-americans-tag",
    Region: "region-tag",
    "Rivers & Lakes": "rivers-tag",
  };

  function renderFacetTags(hit, attributeName, html, maxCount) {
    const attributeData = hit[attributeName];
    if (!attributeData || attributeData.length === 0) {
      return [];
    }
    const cssClass = FACET_CLASS_MAP[attributeData] || "default-tag";
    return html`<span class="on-card-facet-tag ${cssClass}"
      >${attributeData}</span
    >`;
  }

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

  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#algolia-search_search-target",
      placeholder: "Search Destinations, Experiences, Travel Content",
      searchAsYouType: true,
      showSubmit: false,
    }),

    instantsearch.widgets.hits({
      container: "#algolia-search_results-target",
      templates: {
        empty: (results, { html }) => html`
          <div class="no-results-message">
            <p>
              No results found for <strong>"${results.query}"</strong>. Please
              try another search.
            </p>
          </div>
        `,
        item: (hit, { html, components }) => html`
          <a href="${hit.url}" class="f-cards-grid-layout-1_card-link-wrapper">
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
                src="${hit.image ||
                "https://cdn.prod.website-files.com/683a4969614808c01cd0d34f/684fa625ddd0c993bb2496d7_Card%20Listing%20(Empty).avif"}"
                class="f-cards-grid-layout-1_card-image"
                onerror="this.style.display='none'"
              />
              <div class="f-cards-filter_tags-container">
                ${renderFacetTags(hit, "type", html, 1)}
              </div>
              <h3 class="f-cards-grid-layout-1_card-h3 heading-style-h5">
                ${components.Highlight({ attribute: "title", hit })}
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
      scrollTo: ".container_search-results",
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
});
