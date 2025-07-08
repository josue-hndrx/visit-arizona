document.addEventListener("DOMContentLoaded", () => {
  // --- Configuration ---
  // This is the base key for the Algolia query parameter.
  // The script will correctly URL-encode it.
  const algoliaQueryKey = "prod_arizona_sitewide[query]";
  const searchResultsPage = "/search-results";

  // --- DOM Elements ---
  const searchInputs = document.querySelectorAll(".search_input");
  const searchButtons = document.querySelectorAll(".search_button");

  /**
   * Handles the redirection logic.
   * @param {string} query - The search term from the input.
   */
  function handleRedirect(query) {
    if (!query) {
      // Don't redirect if the query is empty
      console.log("Search query is empty. No redirect.");
      return;
    }

    // URL-encode the key and the value separately to build the query string.
    const encodedKey = encodeURIComponent(algoliaQueryKey);
    const encodedValue = encodeURIComponent(query);
    const redirectUrl = `${searchResultsPage}?${encodedKey}=${encodedValue}`;

    console.log("Redirecting to:", redirectUrl);

    window.location.href = redirectUrl;
  }

  // --- Event Listener for Enter Key on Inputs ---
  searchInputs.forEach((input) => {
    input.addEventListener("keydown", (event) => {
      // Check if the key pressed was 'Enter'
      if (event.key === "Enter") {
        // Prevent the default action (e.g., form submission)
        event.preventDefault();

        const query = event.target.value.trim();
        handleRedirect(query);
      }
    });
  });

  // --- Event Listener for Clicks on Buttons ---
  searchButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      // Find the closest parent container holding both button and input
      const container = event.target.closest(".search");

      if (container) {
        // Find the search input within that container
        const input = container.querySelector(".search_input");
        if (input) {
          const query = input.value.trim();
          handleRedirect(query);
        } else {
          console.error(
            "No '.search_input' found near the clicked button.",
            button
          );
        }
      } else {
        console.error(
          "Could not find a '.search-container' for the clicked button.",
          button
        );
      }
    });
  });
});
