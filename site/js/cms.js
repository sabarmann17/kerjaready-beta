// Konten landing yang diterbitkan dari Admin Console.
// Teks diterapkan dengan textContent (tidak pernah sebagai HTML), jadi aman
// dari script/HTML sisipan. Bila server tidak bisa dihubungi, teks bawaan
// di HTML tetap dipakai.
(function () {
  var URL = "https://puqvlnzjycwdcldzzwkq.supabase.co/rest/v1/rpc/get_site_content";
  var KEY = "sb_publishable_mW20pORGzgpDeJu0rGxjvA_OuSWabxX"; // kunci publik (publishable), bukan rahasia
  var CACHE = "pk_cms_v1";

  function apply(c) {
    if (!c || typeof c !== "object") return;
    var els = document.querySelectorAll("[data-cms]");
    for (var i = 0; i < els.length; i++) {
      var v = c[els[i].getAttribute("data-cms")];
      if (typeof v === "string" && v.trim()) els[i].textContent = v;
    }
    if (typeof c["seo.title"] === "string" && c["seo.title"].trim()) {
      document.title = c["seo.title"];
    }
    var m = document.querySelector('meta[name="description"]');
    if (m && typeof c["seo.description"] === "string" && c["seo.description"].trim()) {
      m.setAttribute("content", c["seo.description"]);
    }
  }

  function run() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE) || "null"); } catch (e) {}
    apply(cached);
    if (!window.fetch) return;
    fetch(URL, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: "{}",
      credentials: "omit"
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c) return;
        apply(c);
        try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch (e) {}
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
