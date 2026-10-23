// Phone number field with a searchable country-code dropdown (flags + dial codes).
// Click the flag to open the list, then type a code (e.g. "23") or a country
// name straight into the phone box to narrow it down.
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-phone-field]");
  if (!root) return;

  // ISO code | name | dial code
  const RAW = `AF|Afghanistan|93
AL|Albania|355
DZ|Algeria|213
AS|American Samoa|1684
AD|Andorra|376
AO|Angola|244
AI|Anguilla|1264
AG|Antigua and Barbuda|1268
AR|Argentina|54
AM|Armenia|374
AW|Aruba|297
AU|Australia|61
AT|Austria|43
AZ|Azerbaijan|994
BS|Bahamas|1242
BH|Bahrain|973
BD|Bangladesh|880
BB|Barbados|1246
BY|Belarus|375
BE|Belgium|32
BZ|Belize|501
BJ|Benin|229
BM|Bermuda|1441
BT|Bhutan|975
BO|Bolivia|591
BA|Bosnia and Herzegovina|387
BW|Botswana|267
BR|Brazil|55
VG|British Virgin Islands|1284
BN|Brunei|673
BG|Bulgaria|359
BF|Burkina Faso|226
BI|Burundi|257
KH|Cambodia|855
CM|Cameroon|237
CA|Canada|1
CV|Cape Verde|238
KY|Cayman Islands|1345
CF|Central African Republic|236
TD|Chad|235
CL|Chile|56
CN|China|86
CO|Colombia|57
KM|Comoros|269
CG|Congo|242
CD|Congo (DR)|243
CK|Cook Islands|682
CR|Costa Rica|506
CI|Côte d’Ivoire|225
HR|Croatia|385
CU|Cuba|53
CW|Curaçao|599
CY|Cyprus|357
CZ|Czechia|420
DK|Denmark|45
DJ|Djibouti|253
DM|Dominica|1767
DO|Dominican Republic|1809
EC|Ecuador|593
EG|Egypt|20
SV|El Salvador|503
GQ|Equatorial Guinea|240
ER|Eritrea|291
EE|Estonia|372
SZ|Eswatini|268
ET|Ethiopia|251
FK|Falkland Islands|500
FO|Faroe Islands|298
FJ|Fiji|679
FI|Finland|358
FR|France|33
GF|French Guiana|594
PF|French Polynesia|689
GA|Gabon|241
GM|Gambia|220
GE|Georgia|995
DE|Germany|49
GH|Ghana|233
GI|Gibraltar|350
GR|Greece|30
GL|Greenland|299
GD|Grenada|1473
GP|Guadeloupe|590
GU|Guam|1671
GT|Guatemala|502
GG|Guernsey|44
GN|Guinea|224
GW|Guinea-Bissau|245
GY|Guyana|592
HT|Haiti|509
HN|Honduras|504
HK|Hong Kong|852
HU|Hungary|36
IS|Iceland|354
IN|India|91
ID|Indonesia|62
IR|Iran|98
IQ|Iraq|964
IE|Ireland|353
IM|Isle of Man|44
IL|Israel|972
IT|Italy|39
JM|Jamaica|1876
JP|Japan|81
JE|Jersey|44
JO|Jordan|962
KZ|Kazakhstan|7
KE|Kenya|254
KI|Kiribati|686
XK|Kosovo|383
KW|Kuwait|965
KG|Kyrgyzstan|996
LA|Laos|856
LV|Latvia|371
LB|Lebanon|961
LS|Lesotho|266
LR|Liberia|231
LY|Libya|218
LI|Liechtenstein|423
LT|Lithuania|370
LU|Luxembourg|352
MO|Macao|853
MG|Madagascar|261
MW|Malawi|265
MY|Malaysia|60
MV|Maldives|960
ML|Mali|223
MT|Malta|356
MH|Marshall Islands|692
MQ|Martinique|596
MR|Mauritania|222
MU|Mauritius|230
YT|Mayotte|262
MX|Mexico|52
FM|Micronesia|691
MD|Moldova|373
MC|Monaco|377
MN|Mongolia|976
ME|Montenegro|382
MS|Montserrat|1664
MA|Morocco|212
MZ|Mozambique|258
MM|Myanmar|95
NA|Namibia|264
NR|Nauru|674
NP|Nepal|977
NL|Netherlands|31
NC|New Caledonia|687
NZ|New Zealand|64
NI|Nicaragua|505
NE|Niger|227
NG|Nigeria|234
NU|Niue|683
KP|North Korea|850
MK|North Macedonia|389
MP|Northern Mariana Islands|1670
NO|Norway|47
OM|Oman|968
PK|Pakistan|92
PW|Palau|680
PS|Palestine|970
PA|Panama|507
PG|Papua New Guinea|675
PY|Paraguay|595
PE|Peru|51
PH|Philippines|63
PL|Poland|48
PT|Portugal|351
PR|Puerto Rico|1787
QA|Qatar|974
RE|Réunion|262
RO|Romania|40
RU|Russia|7
RW|Rwanda|250
SH|Saint Helena|290
KN|Saint Kitts and Nevis|1869
LC|Saint Lucia|1758
PM|Saint Pierre and Miquelon|508
VC|Saint Vincent and the Grenadines|1784
WS|Samoa|685
SM|San Marino|378
ST|São Tomé and Príncipe|239
SA|Saudi Arabia|966
SN|Senegal|221
RS|Serbia|381
SC|Seychelles|248
SL|Sierra Leone|232
SG|Singapore|65
SX|Sint Maarten|1721
SK|Slovakia|421
SI|Slovenia|386
SB|Solomon Islands|677
SO|Somalia|252
ZA|South Africa|27
KR|South Korea|82
SS|South Sudan|211
ES|Spain|34
LK|Sri Lanka|94
SD|Sudan|249
SR|Suriname|597
SE|Sweden|46
CH|Switzerland|41
SY|Syria|963
TW|Taiwan|886
TJ|Tajikistan|992
TZ|Tanzania|255
TH|Thailand|66
TL|Timor-Leste|670
TG|Togo|228
TK|Tokelau|690
TO|Tonga|676
TT|Trinidad and Tobago|1868
TN|Tunisia|216
TR|Türkiye|90
TM|Turkmenistan|993
TC|Turks and Caicos Islands|1649
TV|Tuvalu|688
UG|Uganda|256
UA|Ukraine|380
AE|United Arab Emirates|971
GB|United Kingdom|44
US|United States|1
UY|Uruguay|598
VI|US Virgin Islands|1340
UZ|Uzbekistan|998
VU|Vanuatu|678
VA|Vatican City|379
VE|Venezuela|58
VN|Vietnam|84
WF|Wallis and Futuna|681
YE|Yemen|967
ZM|Zambia|260
ZW|Zimbabwe|263`;

  const flagOf = (iso) =>
    String.fromCodePoint(...[...iso].map((ch) => 127397 + ch.charCodeAt(0)));

  const COUNTRIES = RAW.split("\n")
    .map((line) => {
      const [iso, name, dial] = line.split("|");
      return { iso, name, dial, flag: flagOf(iso) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // When several countries share a code and the user typed a full number,
  // pick the most likely one.
  const PREFERRED = { 1: "US", 7: "RU", 44: "GB", 358: "FI", 262: "RE" };

  const button = root.querySelector(".auth-phone-country");
  const flagEl = root.querySelector(".auth-phone-flag");
  const dialEl = root.querySelector(".auth-phone-dial");
  const input = root.querySelector(".auth-phone-input");
  const fullInput = root.querySelector("[data-phone-full]");
  const list = root.querySelector(".auth-phone-list");

  const DEFAULT_PLACEHOLDER = input.getAttribute("placeholder") || "";
  const SEARCH_PLACEHOLDER = "Type a code, e.g. 23";

  let selected = COUNTRIES.find((c) => c.iso === "NG");
  let searching = false;
  let savedNumber = "";
  let shown = [];
  let activeIndex = -1;

  // ---- Value that gets submitted: +<code><number without leading 0> ----
  function updateFull() {
    const digits = input.value.replace(/\D/g, "").replace(/^0+/, "");
    fullInput.value = digits ? `+${selected.dial}${digits}` : "";
  }

  function paintSelected() {
    flagEl.textContent = selected.flag;
    dialEl.textContent = `+${selected.dial}`;
    button.setAttribute("aria-label", `Country code: ${selected.name} +${selected.dial}. Change country code`);
  }

  // ---- Filtering ----
  function filterCountries(query) {
    const q = query.trim().toLowerCase().replace(/^\+\s*/, "");
    if (!q) return COUNTRIES.slice();

    if (/^[\d\s]+$/.test(q)) {
      const d = q.replace(/\s/g, "");
      let matches = COUNTRIES.filter((c) => c.dial.startsWith(d));
      if (!matches.length) matches = COUNTRIES.filter((c) => c.dial.includes(d));
      return matches.sort(
        (a, b) =>
          (b.dial === d) - (a.dial === d) ||
          a.dial.length - b.dial.length ||
          a.dial.localeCompare(b.dial) ||
          a.name.localeCompare(b.name)
      );
    }

    const starts = COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(q));
    const contains = COUNTRIES.filter(
      (c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q)
    );
    return starts.concat(contains);
  }

  // Typed a whole international number ("+2348012345678")? Find the country
  // whose code it starts with.
  function countryFromFullNumber(digits) {
    const candidates = COUNTRIES.filter((c) => digits.startsWith(c.dial)).sort(
      (a, b) =>
        b.dial.length - a.dial.length ||
        (PREFERRED[b.dial] === b.iso) - (PREFERRED[a.dial] === a.iso) ||
        a.name.localeCompare(b.name)
    );
    return candidates[0] || null;
  }

  // ---- Rendering ----
  function render(items) {
    shown = items;
    list.textContent = "";

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "auth-phone-empty";
      empty.setAttribute("role", "option");
      empty.setAttribute("aria-disabled", "true");
      empty.textContent = "No matching country";
      list.appendChild(empty);
      activeIndex = -1;
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "auth-phone-option";
      li.id = `phoneOption-${c.iso}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", c.iso === selected.iso ? "true" : "false");
      li.dataset.index = String(i);

      const flag = document.createElement("span");
      flag.className = "auth-phone-option-flag";
      flag.setAttribute("aria-hidden", "true");
      flag.textContent = c.flag;

      const name = document.createElement("span");
      name.className = "auth-phone-option-name";
      name.textContent = c.name;

      const dial = document.createElement("span");
      dial.className = "auth-phone-option-dial";
      dial.textContent = `+${c.dial}`;

      li.append(flag, name, dial);
      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  function ensureVisible(li) {
    const top = li.offsetTop;
    const bottom = top + li.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 6;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
  }

  function setActive(index, center = false) {
    const options = list.querySelectorAll(".auth-phone-option");
    options.forEach((el, i) => el.classList.toggle("is-active", i === index));
    activeIndex = index;
    const li = options[index];
    if (!li) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    input.setAttribute("aria-activedescendant", li.id);
    if (center) list.scrollTop = Math.max(0, li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2);
    else ensureVisible(li);
  }

  function showResults(query) {
    const items = filterCountries(query);
    render(items);
    if (!items.length) return;
    if (query.trim()) {
      setActive(0);
      list.scrollTop = 0;
    } else {
      const at = items.findIndex((c) => c.iso === selected.iso);
      setActive(at >= 0 ? at : 0, true);
    }
  }

  // ---- Open / close ----
  function openSearch(query = "", keepNumber = true) {
    if (!searching) {
      savedNumber = keepNumber ? input.value : "";
      searching = true;
    }
    root.classList.add("is-open");
    list.hidden = false;
    button.setAttribute("aria-expanded", "true");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-autocomplete", "list");
    input.placeholder = SEARCH_PLACEHOLDER;
    input.value = query;
    showResults(query);
  }

  function closeSearch() {
    if (!searching) return;
    searching = false;
    root.classList.remove("is-open");
    list.hidden = true;
    button.setAttribute("aria-expanded", "false");
    ["role", "aria-expanded", "aria-controls", "aria-autocomplete", "aria-activedescendant"].forEach((a) =>
      input.removeAttribute(a)
    );
    input.placeholder = DEFAULT_PLACEHOLDER;
    input.value = savedNumber;
    updateFull();
  }

  function chooseCountry(country, number) {
    selected = country;
    if (typeof number === "string") savedNumber = number;
    paintSelected();
    closeSearch();
    input.focus();
  }

  // ---- Events ----
  // Keep focus in the phone box when clicking the flag button or the list.
  button.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("mousedown", (e) => e.preventDefault());

  button.addEventListener("click", () => {
    if (searching) {
      closeSearch();
    } else {
      input.focus();
      openSearch("");
    }
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest(".auth-phone-option");
    if (!li) return;
    chooseCountry(shown[Number(li.dataset.index)]);
  });

  list.addEventListener("mouseover", (e) => {
    const li = e.target.closest(".auth-phone-option");
    if (!li) return;
    const options = [...list.querySelectorAll(".auth-phone-option")];
    options.forEach((el) => el.classList.toggle("is-active", el === li));
    activeIndex = Number(li.dataset.index);
  });

  input.addEventListener("input", () => {
    if (searching) {
      const q = input.value;
      const digits = q.replace(/^\+\s*/, "").replace(/\s/g, "");
      // A full international number: switch to that country automatically.
      if (/^\d+$/.test(digits) && !COUNTRIES.some((c) => c.dial.startsWith(digits))) {
        const match = countryFromFullNumber(digits);
        if (match) {
          chooseCountry(match, digits.slice(match.dial.length));
          updateFull();
          return;
        }
      }
      showResults(q);
      return;
    }

    // Typing "+" at the start switches the box into country search.
    if (input.value.startsWith("+")) {
      openSearch(input.value, false);
      return;
    }

    const cleaned = input.value.replace(/[^\d\s()-]/g, "");
    if (cleaned !== input.value) input.value = cleaned;
    updateFull();
  });

  input.addEventListener("keydown", (e) => {
    if (!searching) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        openSearch("");
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[activeIndex]) chooseCountry(shown[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  });

  input.addEventListener("blur", closeSearch);

  document.addEventListener("mousedown", (e) => {
    if (searching && !root.contains(e.target)) closeSearch();
  });

  paintSelected();
  updateFull();
});
