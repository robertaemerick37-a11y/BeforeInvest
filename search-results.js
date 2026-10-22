const pages = [
  {
    title: "Home dashboard",
    page: "index.html#top",
    section: "Dashboard",
    text: "Smart Investment Opportunities for Long-Term Growth. Access global markets, diversified portfolios, and advanced trading tools in one platform.",
  },
  {
    title: "Learn",
    page: "learn.html#learn-basics",
    section: "Learning the basics",
    text: "Understand the choices behind every investment. Learn about goals, diversification, risk, fees, and potential outcomes.",
  },
  {
    title: "Investments",
    page: "investments.html#plans",
    section: "Investment plans",
    text: "Choose investments with a clear view of the risk. Compare stocks, ETFs, bonds, cash, real assets, and investment plans.",
  },
  {
    title: "Resources",
    page: "resources.html#before-invest",
    section: "Before you invest",
    text: "Use practical checks when you research an opportunity, compare providers, or review your own investing plan.",
  },
  {
    title: "About Us",
    page: "about-us.html#purpose",
    section: "Our purpose",
    text: "KnowBeforeInvest helps people ask better questions and approach investment opportunities with more confidence.",
  },
];

const query = new URLSearchParams(window.location.search).get("q")?.trim() || "";
const input = document.querySelector("#resultsSearchInput");
const form = document.querySelector("#resultsSearchForm");
const heading = document.querySelector("#resultsHeading");
const count = document.querySelector("#resultsCount");
const results = document.querySelector("#searchResults");

function getSearchTerms(value) {
  const normalized = value.toLowerCase();
  const terms = [normalized];
  if (normalized.includes("invest")) terms.push("invest");
  return [...new Set(terms.filter(Boolean))];
}

function appendHighlightedText(parent, value, terms) {
  const normalizedTerms = [...new Set(terms.map((term) => term.toLowerCase()).filter(Boolean))]
    .sort((first, second) => second.length - first.length);
  const normalizedValue = value.toLowerCase();
  let cursor = 0;

  while (cursor < value.length) {
    let matchIndex = -1;
    let matchedTerm = "";
    normalizedTerms.forEach((term) => {
      const index = normalizedValue.indexOf(term, cursor);
      if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
        matchIndex = index;
        matchedTerm = term;
      }
    });

    if (matchIndex === -1) {
      parent.append(document.createTextNode(value.slice(cursor)));
      return;
    }
    if (matchIndex > cursor) parent.append(document.createTextNode(value.slice(cursor, matchIndex)));

    const mark = document.createElement("mark");
    mark.textContent = value.slice(matchIndex, matchIndex + matchedTerm.length);
    parent.append(mark);
    cursor = matchIndex + matchedTerm.length;
  }
}

function createHighlightedParagraph(className, value, terms) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  appendHighlightedText(paragraph, value, terms);
  return paragraph;
}

function renderResults() {
  const terms = getSearchTerms(query);
  const matches = pages.filter(({ text, title, section }) => {
    const searchableText = `${title} ${section} ${text}`.toLowerCase();
    return terms.some((term) => searchableText.includes(term));
  });

  input.value = query;
  heading.textContent = query ? `Results for “${query}”` : "Search results";
  count.textContent = query
    ? `${matches.length} ${matches.length === 1 ? "result" : "results"} found`
    : "Enter a word or phrase to search the site.";

  if (!query || matches.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "no-results";
    emptyState.textContent = query
      ? "No pages mention that search term. Try a shorter or related word."
      : "Try searching for invest, risk, goals, or resources.";
    results.replaceChildren(emptyState);
    return;
  }

  const resultElements = matches.map(({ title, page, section, text }) => {
    const article = document.createElement("article");
    article.className = "search-result";

    const copy = document.createElement("div");
    copy.append(createHighlightedParagraph("result-section", section, terms));

    const heading = document.createElement("h3");
    appendHighlightedText(heading, title, terms);
    copy.append(heading, createHighlightedParagraph("", text, terms));

    const link = document.createElement("a");
    link.className = "result-link";
    link.href = page;
    link.append(document.createTextNode("Read more "));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    link.append(arrow);

    article.append(copy, link);
    return article;
  });
  results.replaceChildren(...resultElements);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextQuery = input.value.trim();
  window.location.href = nextQuery
    ? `search-results.html?q=${encodeURIComponent(nextQuery)}`
    : "search-results.html";
});

renderResults();
