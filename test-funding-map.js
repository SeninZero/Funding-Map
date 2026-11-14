const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("funding map interactions with fixture data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "funding-map-test-"));
  try {
    let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
    html = html.replace(/<link rel="stylesheet" href="https:[^"]+">\s*/g, "")
      .replace(/<script src="https:[^"]+"><\/script>\s*/g, "");
    const fixtures = [
      { "Fund name": "Alpha", "City": "Cape Town", "Sector focus": "Health", "Funding amount": "$1m", "City geo lat": "-33.9", "City geo long": "18.4", "Funding stage": "Seed", "Funding type": "Grant", "Eligibility": "Startups", "Deadline": "2027-01-01", "Supported regions": "Africa", "Mandate": "Health impact", "Application process": "Online", "Last verified": "2020-01-01", "Verification status": "Unverified", "Source link": "https://example.org/a" },
      { "Fund name": "Beta", "City": "Nairobi", "Sector focus": "Energy", "Funding amount": "$500k", "City geo lat": "-1.2", "City geo long": "36.8", "Deadline": "2026-12-01" },
      { "Fund name": "Gamma", "City": "Cape Town", "Funding amount": "Small", "City geo lat": "-33.9", "City geo long": "18.4" },
      { "Fund name": "Delta", "City": "Lagos", "Funding amount": "$2m" },
      { "Fund name": "Epsilon", "City": "Lagos", "Website": "javascript:alert(1)" }
    ];
    const mock = `
      const fixture = ${JSON.stringify(fixtures)};
      const mapMock = { setView(){return this}, fitBounds(){return this} };
      const clusterMock = {
        addTo(){return this}, clearLayers(){this.layers=[]}, addLayers(layers){this.layers=layers},
        getBounds(){return {pad(){return this}}}, getVisibleParent(marker){return marker},
        zoomToShowLayer(marker, cb){cb()}
      };
      const L = {
        map(){return mapMock}, tileLayer(){return {addTo(){}}},
        markerClusterGroup(){return clusterMock},
        marker(){return { handlers:{}, element:document.createElement("div"),
          bindPopup(){return this}, on(name, fn){this.handlers[name]=fn;return this},
          getElement(){return this.element}, openPopup(){return this} }}
      };
      mapMock.addLayer = () => {};
      const Papa = { parse(url, options){options.complete({data:fixture,errors:[]})} };
    `;
    const checks = `
      const results = [];
      function check(condition, message) { if (!condition) throw new Error(message); results.push(message); }
      function change(id, value) { const el=document.getElementById(id); el.value=value; el.dispatchEvent(new Event("change")); }
      function click(selector) { document.querySelector(selector).click(); }
      function names() { return [...document.querySelectorAll(".card h3")].map(el=>el.textContent); }
      try {
        if (location.search.includes("stage=Seed")) {
          check(names().join()==="Alpha", "shared filters restored on load");
          check(document.getElementById("savedOnly").checked, "saved-only preference restored on load");
          saved.clear(); localStorage.removeItem("funding-map-bookmarks-v1"); click("#reset");
        }
        check(names().length===5, "all fixture records rendered");
        check(document.querySelector(".trust").textContent.includes("over a year old"), "stale warning");
        check(document.querySelector(".trust").textContent.includes("Not verified"), "unverified warning");
        change("stage","Seed"); change("location","Africa"); change("type","Grant");
        change("eligibility","Startups"); change("amountFilter","$1m"); change("deadline","2027-01-01");
        check(names().join()==="Alpha", "combined filters and supported geography");
        check(location.search.includes("stage=Seed"), "filters encoded in URL");
        change("deadline","2026-01-01");
        check(!document.getElementById("empty").hidden, "empty state shown");
        click("#emptyReset");
        check(names().length===5 && !location.search, "empty reset clears filters and URL");
        change("sort","deadline");
        check(names().slice(0,2).join()==="Beta,Alpha", "deadline sorting and missing values");
        change("sort","amount");
        check(names().slice(0,3).join()==="Delta,Alpha,Beta", "numeric amount sorting");
        origin = {lat:-33.9,lng:18.4}; change("sort","distance");
        check(names().slice(0,2).join()==="Alpha,Gamma" && names().at(-1)==="Epsilon", "distance sorting and missing coordinates");
        document.getElementById("search").value="nairobi";
        document.getElementById("search").dispatchEvent(new Event("input"));
        check(names().join()==="Beta", "location search");
        click("#reset");
        click(".save-button");
        check(JSON.parse(localStorage.getItem("funding-map-bookmarks-v1")).length===1, "bookmark persisted");
        document.getElementById("savedOnly").click();
        check(names().join()==="Alpha", "saved-only filter");
        click("#reset");
        [...document.querySelectorAll(".compare-button")].slice(0,4).forEach(button => {
          const label=button.closest(".card").querySelector("h3").textContent;
          [...document.querySelectorAll(".card")].find(card=>card.querySelector("h3").textContent===label).querySelector(".compare-button").click();
        });
        check(document.querySelectorAll("#compare thead th").length===5, "comparison contains four opportunities");
        [...document.querySelectorAll(".card")].find(card=>card.querySelector("h3").textContent==="Gamma").querySelector(".compare-button").click();
        check(document.getElementById("status").textContent.includes("up to four"), "comparison limit enforced");
        click("#compare button");
        check(document.querySelectorAll("#compare thead th").length===4, "comparison removal");
        const alpha=items.find(item=>item.company==="Alpha");
        alpha.marker.handlers.click();
        check([...document.querySelectorAll(".card")].find(card=>card.querySelector("h3").textContent==="Alpha").classList.contains("selected"), "marker selects card");
        const beta=items.find(item=>item.company==="Beta");
        [...document.querySelectorAll(".card")].find(card=>card.querySelector("h3").textContent==="Beta").dispatchEvent(new Event("mouseenter"));
        check(beta.marker.element.classList.contains("map-highlight"), "card hover highlights marker");
        check(!document.querySelector('a[href^="javascript:"]'), "unsafe links rejected");
        document.body.dataset.testResult = "PASS " + results.length;
      } catch (error) { document.body.dataset.testResult = "FAIL " + error.stack; }
    `;
    html = html.replace("<script>\nconst CSV_URL", `<script>${mock}</script>\n<script>\nconst CSV_URL`);
    html = html.replace("</body>", `<script>${checks}</script></body>`);
    const fixturePath = path.join(dir, "fixture.html");
    fs.writeFileSync(fixturePath, html);
    for (const query of ["", "?stage=Seed&savedOnly=1"]) {
      const output = execFileSync("google-chrome", ["--headless", "--no-sandbox", "--disable-gpu",
        "--disable-background-networking", "--no-proxy-server", `--user-data-dir=${path.join(dir, "profile")}`,
        "--dump-dom", `file://${fixturePath}${query}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 30000 });
      const result = output.match(/data-test-result="([^"]+)"/);
      assert.ok(result, "browser produced a test result");
      assert.match(result[1], /^PASS /, result[1]);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
