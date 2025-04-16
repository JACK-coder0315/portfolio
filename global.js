console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = location.hostname.includes("localhost") ? "/" : "/portfolio/";

let pages = [
  { url: "", title: "Home" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "projects/", title: "Projects" },
  { url: "https://github.com/JACK-coder0315", title: "GitHub" },
  { url: "hiking/hiking.html", title: "Hiking" },
];


let navHTML = `<nav class="nav">\n`;
for (let p of pages) {
  let url = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;
  navHTML += `<a href="${url}"${url.includes("http") ? ' target="_blank"' : ''}>${p.title}</a>\n`;
}
navHTML += `</nav>`;

document.getElementById("nav-container")?.insertAdjacentHTML("beforeend", navHTML);

$$(".nav a").forEach(a => {
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }
});


document.body.insertAdjacentHTML("afterbegin", `
  <label class="color-scheme" style="position:absolute;top:1rem;right:1rem;font-size:0.8rem;font-family:inherit;">
    Theme:
    <select>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="normal">Auto</option>
    </select>
  </label>
`);

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

select.addEventListener("input", (e) => {
  localStorage.colorScheme = e.target.value;
  setColorScheme(e.target.value);
});

document.getElementById("nav-container")?.insertAdjacentHTML("beforeend", navHTML);