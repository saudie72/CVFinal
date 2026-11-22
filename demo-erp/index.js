(function () {
  "use strict";
  var box = document.getElementById("patch");
  var state = document.getElementById("patch-state");
  var KEY = "demoerp.simulatePatch";
  function apply(on) {
    var links = document.querySelectorAll("a[data-page]");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", links[i].getAttribute("data-page") + (on ? "/after.html" : "/before.html"));
    }
    state.textContent = on ? "Showing: after patch" : "Showing: before";
    state.className = on ? "on" : "";
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* storage may be unavailable */ }
  }
  var start = false;
  try { start = localStorage.getItem(KEY) === "1"; } catch (e) { start = false; }
  box.checked = start;
  box.addEventListener("change", function () { apply(box.checked); });
  apply(start);
})();
