document.documentElement.classList.add("js");
// Cadangan login Google: bila Supabase mengembalikan pengguna ke halaman utama
// (bukan /app/), teruskan kode login ke web app di origin yang sama.
(function () {
  var q = location.search, h = location.hash;
  if (/[?&]code=/.test(q) || /(access_token|error_description)=/.test(h)) {
    location.replace("/app/" + q + h);
  }
})();
