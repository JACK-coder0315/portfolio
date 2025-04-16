console.log("IT’S ALIVE!");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let navLinks = $$("nav a");
let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add("current");

const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio/";

let pages = [
    { url: "", title: "Home" },
    { url: "about/", title: "About" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "https://github.com/JACK-coder0315", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
    let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
    let a = document.createElement("a");
    a.href = url;
    a.textContent = p.title;

    a.classList.toggle(
        "current",
        a.host === location.host && a.pathname === location.pathname
    );

    if (a.host !== location.host) {
        a.target = "_blank";
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="normal">Auto</option>
      </select>
    </label>
  `
);

let select = document.querySelector("select");
function setColorScheme(scheme) {
    if (scheme === "normal") {
        document.documentElement.style.removeProperty("color-scheme");
    } else {
        document.documentElement.style.setProperty("color-scheme", scheme);
    }
    select.value = scheme;
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
} else {
    setColorScheme("normal");
}

select.addEventListener("input", (event) => {
    localStorage.colorScheme = event.target.value;
    setColorScheme(event.target.value);
});

let form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
    event.preventDefault();

    let data = new FormData(form);
    let params = [];

    for (let [key, value] of data) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }

    let mailto = form.action + "?" + params.join("&");
    location.href = mailto;
});
