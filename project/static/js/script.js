let parsedData = [];
const urlParams = new URLSearchParams(window.location.search);
const SourceURLParam = urlParams.get('sourceURL');
const RealURLParam = urlParams.get('realURL');
const sortSelect = document.getElementById("sort-select");
  const pageLevelSelect = document.getElementById("pageLevel-select");
 
async function fetchAndParseReport() {
  const response = await fetch('/static/reports/linkchecker/linkchecker-report.txt');
  const text = await response.text();
  const blocks = text.split(/\n(?=URL\s+)/g);

  parsedData = blocks.map(block => {
    const name = matchField(block, /Name\s+(.*?)(?=\s*(URL|Parent URL|Real URL|Result|$))/);

    const url = matchField(block, /URL\s+`([^`]+)'/);
    const parent = matchField(block, /Parent URL\s+(.+?)(?:,|$)/);
    const realUrl = matchField(block, /Real URL\s{3}(.*?)(?=\s*(Check time|Size|Result))/);
    const resultError = matchField(block, /Result\s+Error:\s+(.+)/);
    const resultValid = /Result\s+Valid/i.test(block);
    const resultOk = /Result\s+OK/i.test(block);

    let status;
if (resultError) {
  if (resultError.includes("403")) {
    status = "403";
  }
  else if(resultError.includes("401")){
  status="401";
  } else {
    status = "broken";
  }
} else if (resultValid || resultOk) {
  status = "valid";
} else {
  status = "unknown";
}

    const message = resultError
      ? resultError
      : resultValid
      ? "Valid link"
      : "No result line";

    return {
      url,
      parent,
      realUrl,
      name,
      status,
      message,
    };
  });

  generateReport(parsedData); // Initial render
}


function updateValidLinksBox(showBox, count) {
  const summaryBoxContainer = document.querySelector(".summary-boxes");
  const existingBox = document.getElementById("valid-links-box");

  if (showBox) {
    if (!existingBox) {
      const validBox = document.createElement("div");
      validBox.id = "valid-links-box";
      validBox.className = "box valid";
      validBox.style.backgroundColor = "darkgreen";
      validBox.style.color = "white";
      validBox.innerHTML = `<strong>Total Valid Links:</strong> <span id="valid-count">${count}</span>`;
      summaryBoxContainer.appendChild(validBox);
    } else {
      document.getElementById("valid-count").textContent = count;
    }
  } else {
    if (existingBox) {
      existingBox.remove();
    }
  }
}


function matchField(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function getUrlLevel(url) {
  const path = new URL(url).pathname;
  // Filter out empty segments to avoid counting trailing slashes
  const segments = path.split('/').filter(Boolean);
  return segments.length;
}

function generateReport(data, sortBy = "count", showPageLevel = "level-all") {
  const linkList = document.getElementById("link-list");
  linkList.innerHTML = ""; // Clear previous output
  const showValid = document.getElementById("ValidLinks")?.checked;
  const show403 = document.getElementById("403Links")?.checked;
console.log(data)
  const filteredData = data.filter(link => {
    if (link.status === "broken") return true; // always show broken
    if (showValid && link.status === "valid") return true;
    if (show403 && link.status === "403") return true;
    return false; // hide everything else
  });
  // Group by parent URL
  const grouped = {};

  filteredData.forEach(link => {
    if (!link.parent) return;
    if (!grouped[link.parent]) {
      grouped[link.parent] = [];
    }
    // Include all links (not just broken ones)
    grouped[link.parent].push(link);
  });

  // Convert grouped object to array for sorting
  const groupedArray = Object.entries(grouped);

  switch (sortBy) {
    case "az":
      groupedArray.sort((a, b) => a[0].localeCompare(b[0]));
      break;
    case "za":
      groupedArray.sort((a, b) => b[0].localeCompare(a[0]));
      break;
    case "count":
    default:
groupedArray.sort((a, b) => {
  const countA = a[1].filter(link =>
    link.status === "broken" || (show403 && link.status === "403")
  ).length;
  const countB = b[1].filter(link =>
    link.status === "broken" || (show403 && link.status === "403")
  ).length;
  return countB - countA;
});     break;
  }

  let advFilteredArray = [];
  switch (showPageLevel) {
    case "level-1":
      groupedArray.forEach(([parentUrl, children]) => {
        if (getUrlLevel(parentUrl) === 1) {
          advFilteredArray.push([parentUrl, children]);
        }
      });
      break;

    case "level-2":
      groupedArray.forEach(([parentUrl, children]) => {
        if (getUrlLevel(parentUrl) === 2) {
          advFilteredArray.push([parentUrl, children]);
        }
      });
      break;

    case "level-3":
      groupedArray.forEach(([parentUrl, children]) => {
        if (getUrlLevel(parentUrl) >= 3) {
          advFilteredArray.push([parentUrl, children]);
        }
      });
      break;

    case "level-all":
    default:
      advFilteredArray = groupedArray;
      break;
  }

  let totalLinks = 0;

  advFilteredArray.forEach(([parentUrl, links]) => {
    // Count only broken links here
     let brokenCount = links.filter(link => link.status === "broken").length;

  // Add 403 count if checkbox checked
  if (show403) {
    brokenCount += links.filter(link => link.status === "403").length;
  }

  totalLinks += brokenCount;

    const wrapper = document.createElement("details");
    wrapper.className = "link-item grouped";
    const summary = document.createElement("summary");
    summary.innerHTML = `<span class="link-url">${parentUrl}</span> <span class="status-label">Broken Links: ${brokenCount}</span>`;
    wrapper.appendChild(summary);

    const detailContent = document.createElement("div");
    detailContent.className = "link-details";

    links.forEach(link => {
      let linkText ="";
      const block = document.createElement("div");
      block.classList.add("child-link");
      block.dataset.url = link.url;  // Set data-url
      block.dataset.realUrl = link.realUrl;  // Set data-real-url
      block.dataset.status = link.status; // <-- Add status for filtering counts
      if (link.name != ""){
        linkText = `<p><strong>Link Text:</strong> ${link.name}</p>`
      }
      block.innerHTML = ` 
        <p><strong>URL:</strong> <a href="${link.url}" target="_blank">${link.url}</a></p>
        <p><strong>Real URL:</strong> <a href="${link.realUrl}" target="_blank">${link.realUrl}</a></p>
        ${linkText}
        <p><strong>Result:</strong> ${link.message}</p>
        <hr>
      `;

      detailContent.appendChild(block);
    });

    wrapper.appendChild(detailContent);
    linkList.appendChild(wrapper);
  });

  // Update total link count (broken links only)
  updateLinkCounts(totalLinks);


if (showValid) {
  const validLinksCount = filteredData.filter(link => link.status === "valid").length;
  updateValidLinksBox(true, validLinksCount);
} else {
  updateValidLinksBox(false);
}
}

function updateLinkCounts(totalLinks) {
  // Update only the total broken link count in your page
  const el = document.getElementById("total-count");
  if (el) {
    el.textContent = totalLinks;
  }
}

function setupSearchFilters() {
  const parentInput = document.getElementById("search-parent");
  const urlInput = document.getElementById("search-url");
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");

  // Search by Parent URL and URL/Real URL
  const filterLinks = () => {
    const parentQuery = parentInput.value.toLowerCase();  // For Parent URL search
    const urlQuery = urlInput.value.toLowerCase();  // For URL/Real URL search

    const parentGroups = document.querySelectorAll(".link-item");

    let totalBrokenLinks = 0;

    parentGroups.forEach(group => {
      const summaryText = group.querySelector("summary")?.innerText.toLowerCase() || "";
      const parentMatches = parentQuery ? summaryText.includes(parentQuery) : true;  // Parent match condition

      let anyVisible = false;

      const childLinks = group.querySelectorAll(".child-link");

      childLinks.forEach(child => {
        const url = child.dataset.url?.toLowerCase() || "";
        const realUrl = child.dataset.realUrl?.toLowerCase() || "";

        // Check for URL or Real URL matches
        const urlMatches = urlQuery ? (url.includes(urlQuery) || realUrl.includes(urlQuery)) : true;

        const matches = parentMatches && urlMatches;

        child.style.display = matches ? "block" : "none";
        if (matches) anyVisible = true;
      });

      group.style.display = anyVisible ? "block" : "none";

      // Count broken visible links inside this group
      if (anyVisible) {
        childLinks.forEach(child => {
          if (child.style.display !== "none" && child.dataset.status === "broken") {
            totalBrokenLinks++;
          }
        });
      }
    });

    updateLinkCounts(totalBrokenLinks);
  };

  // Button and Enter key listeners
  searchBtn.addEventListener("click", filterLinks);
  parentInput.addEventListener("keydown", e => {
    if (e.key === "Enter") filterLinks();
  });
  urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") filterLinks();
  });
  document.getElementById("ValidLinks").addEventListener("change", () => {
    generateReport(parsedData, sortSelect.value, pageLevelSelect.value);
  });
  document.getElementById("403Links").addEventListener("change", () => {
    generateReport(parsedData, sortSelect.value, pageLevelSelect.value);
  });

  // Reset button
  resetBtn.addEventListener("click", () => {
    parentInput.value = "";
    urlInput.value = "";
    document.getElementById("ValidLinks").checked = false;
    document.getElementById("403Links").checked = false;
    const parentGroups = document.querySelectorAll(".link-item");
    parentGroups.forEach(g => g.style.display = "block");

    const childLinks = document.querySelectorAll(".child-link");
    childLinks.forEach(c => (c.style.display = "block"));

    // Reset broken links count from parsedData
    const totalBroken = parsedData.filter(link => link.status === "broken").length;
    updateLinkCounts(totalBroken);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAndParseReport();

   sortSelect.addEventListener("change", (e) => {
    generateReport(parsedData, e.target.value, pageLevelSelect.value);
  });

  pageLevelSelect.addEventListener("change", (e) => {
    generateReport(parsedData, sortSelect.value, e.target.value);
  });

  setupSearchFilters();

  if (SourceURLParam != null) {
    document.getElementById("search-parent").value = SourceURLParam;
    let searchButton = document.getElementById("search-btn");
    setTimeout(() => {
      searchButton.click();
    }, 100); // Ensure event listeners ready
  }
});
