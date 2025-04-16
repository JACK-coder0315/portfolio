console.log("IT’S ALIVE!");

const BASE_PATH = location.hostname.includes("localhost") ? "/" : "/portfolio/";

let pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "resume/", title: "Resume" },
    { url: "hiking/hiking.html", title: "Hiking" },
    { url: "https://github.com/JACK-coder0315", title: "GitHub" }
  ];

let navHTML = `<nav class="nav">\n`;
for (let p of pages) {
  let url = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;
  navHTML += `<a href="${url}"${url.startsWith("http") ? ' target="_blank"' : ''}>${p.title}</a>\n`;
}
navHTML += `</nav>`;

document.getElementById("nav-container")?.insertAdjacentHTML("beforeend", navHTML);

document.querySelectorAll(".nav a").forEach((a) => {
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }
});

let themeHTML = `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="normal">Auto</option>
    </select>
  </label>
`;

document.getElementById("nav-container")?.insertAdjacentHTML("beforeend", navHTML + themeHTML);

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

