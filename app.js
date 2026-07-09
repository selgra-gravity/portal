const MEMBER_PASSWORD = "selgra-demo";
const STORAGE_KEY = "selgraMemberMode";
const SAVED_KEY = "selgraSavedItems";

const state = {
  feed: [],
  events: [],
  professionals: [],
  opportunities: [],
  calendarDate: null,
  savedItems: JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"),
  memberMode: localStorage.getItem(STORAGE_KEY) === "true"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const formatDate = (value) => new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric"
}).format(new Date(`${value}T12:00:00`));

const makeTags = (items = []) => items.map((item) => `<span class="tag">${item}</span>`).join("");
const initials = (name) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const itemId = (type, label) => `${type}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const compactDate = (value) => value.replaceAll("-", "");
const nextDay = (value) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `SELGRA: ${event.title}`,
    dates: `${compactDate(event.date)}/${compactDate(nextDay(event.date))}`,
    details: `${event.description}\n\nType: ${event.type}\nTags: ${event.tags.join(", ")}\n\nSELGRA event.`,
    location: event.location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const includesText = (values, query) => values.join(" ").toLowerCase().includes(query.toLowerCase());
const isSaved = (id) => state.savedItems.some((item) => item.id === id);

function saveButton(item) {
  return `<button class="link-button save-button ${isSaved(item.id) ? "is-saved" : ""}" type="button" data-save-id="${item.id}" data-save-type="${item.type}" data-save-title="${item.title}" data-save-meta="${item.meta}">
    ${isSaved(item.id) ? "Saved" : "Save"}
  </button>`;
}

function persistSavedItems() {
  localStorage.setItem(SAVED_KEY, JSON.stringify(state.savedItems));
}

function toggleSavedItem(item) {
  if (isSaved(item.id)) {
    state.savedItems = state.savedItems.filter((saved) => saved.id !== item.id);
  } else {
    state.savedItems = [...state.savedItems, item];
  }

  persistSavedItems();
  renderDashboard();
  renderPublicViews();
  renderProfessionals();
  renderOpportunities();
}

async function loadData() {
  const [feed, events, professionals, opportunities] = await Promise.all([
    fetch("data/feed.json").then((res) => res.json()),
    fetch("data/events.json").then((res) => res.json()),
    fetch("data/professionals.json").then((res) => res.json()),
    fetch("data/opportunities.json").then((res) => res.json())
  ]);

  Object.assign(state, { feed, events, professionals, opportunities });
}

function renderPublicViews() {
  $("#feedGrid").innerHTML = state.feed.map((item) => `
    <article class="feed-card">
      <div class="feed-meta"><span class="feed-dot"></span>${formatDate(item.date)}</div>
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
      <div class="tag-list">${makeTags(item.tags)}</div>
      ${item.link ? `<a class="link-button" href="${item.link}" target="_blank" rel="noreferrer">Open link</a>` : ""}
    </article>
  `).join("");

  if (!$("#eventsGrid")) return;

  if (!state.events.length) {
    $("#eventsGrid").innerHTML = "";
    $("#calendarGrid").innerHTML = "";
    $("#calendarCurrentMonth").textContent = "";
    return;
  }

  if (!state.calendarDate) {
    const firstEvent = [...state.events].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    state.calendarDate = new Date(`${firstEvent.date}T12:00:00`);
  }
  renderCalendar();

  $("#eventsGrid").innerHTML = state.events.map((event) => `
    <article class="card">
      <div class="event-date"><strong>${new Date(`${event.date}T12:00:00`).toLocaleString("en", { day: "2-digit" })}</strong><span>${new Date(`${event.date}T12:00:00`).toLocaleString("en", { month: "short" })}</span></div>
      <div class="card-meta">${event.location}</div>
      <h3>${event.title}</h3>
      <p>${event.description}</p>
      <strong>${event.type}</strong>
      <div class="tag-list">${makeTags(event.tags)}</div>
      <div class="card-actions">
        <a class="link-button" href="${googleCalendarUrl(event)}" target="_blank" rel="noreferrer">Add to Google Calendar</a>
        ${saveButton({
          id: itemId("event", event.title),
          type: "Event",
          title: event.title,
          meta: formatDate(event.date)
        })}
      </div>
    </article>
  `).join("");
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;
  const eventsByDate = state.events.reduce((groups, event) => {
    groups[event.date] = groups[event.date] || [];
    groups[event.date].push(event);
    return groups;
  }, {});

  $("#calendarCurrentMonth").textContent = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(monthStart);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayCells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - mondayFirstOffset + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const cellDate = inMonth ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}` : "";
    const events = eventsByDate[cellDate] || [];

    return `
      <div class="calendar-cell ${inMonth ? "" : "is-empty"} ${events.length ? "has-event" : ""}">
        ${inMonth ? `<span class="calendar-number">${dayNumber}</span>` : ""}
        ${events.map((event) => `
          <a class="calendar-event" href="${googleCalendarUrl(event)}" target="_blank" rel="noreferrer" title="Add ${event.title} to Google Calendar">
            ${event.title}
          </a>
        `).join("")}
      </div>
    `;
  }).join("");

  $("#calendarGrid").innerHTML = `
    ${weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
    ${dayCells}
  `;
}

function uniqueOptions(values) {
  return [...new Set(values.flat().filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(selector, values) {
  const select = $(selector);
  const first = select.querySelector("option").outerHTML;
  select.innerHTML = first + uniqueOptions(values).map((value) => `<option value="${value}">${value}</option>`).join("");
}

function setupFilters() {
  [
    "#opportunitySearch"
  ].forEach((selector) => $(selector).addEventListener("input", renderOpportunities));
}

function renderDashboard() {
  const stats = [
    ["Open opportunities", state.opportunities.length],
    ["Saved items", state.savedItems.length]
  ];

  $("#statsGrid").innerHTML = stats.map(([label, value]) => `
    <article class="stat-card">
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `).join("");

  $("#savedItemsList").innerHTML = state.savedItems.length ? state.savedItems.map((item) => `
    <article class="saved-item">
      <span class="status-pill">${item.type}</span>
      <div>
        <strong>${item.title}</strong>
        <small>${item.meta}</small>
      </div>
      <button class="link-button save-button is-saved" type="button" data-save-id="${item.id}" data-save-type="${item.type}" data-save-title="${item.title}" data-save-meta="${item.meta}">Remove</button>
    </article>
  `).join("") : `<p class="empty-state">Nothing saved yet. Save opportunities to build a shortlist.</p>`;
}

function renderProfessionals() {
  if (!$("#professionalsGrid")) return;

  const query = $("#professionalSearch").value.trim();
  const field = $("#fieldFilter").value;
  const country = $("#countryFilter").value;
  const availability = $("#availabilityFilter").value;
  const verifiedOnly = $("#verifiedFilter").checked;

  const results = state.professionals.filter((person) => {
    const matchesText = !query || includesText([
      person.name,
      person.role,
      person.affiliation,
      person.country,
      person.city,
      ...person.fields,
      ...person.skills
    ], query);
    return matchesText
      && (!field || person.fields.includes(field))
      && (!country || person.country === country)
      && (!availability || person.availability === availability)
      && (!verifiedOnly || person.verified);
  });

  $("#professionalsGrid").innerHTML = results.map((person, index) => `
    <article class="card">
      <div class="person-head">
        <span class="avatar">${initials(person.name)}</span>
        <span class="status-pill ${person.verified ? "is-verified" : ""}">${person.verified ? "Verified" : "Unverified"}</span>
      </div>
      <div class="card-meta">${person.city}, ${person.country} · ${person.verified ? "Verified" : "Unverified"}</div>
      <h3>${person.name}</h3>
      <p><strong>${person.role}</strong><br>${person.affiliation}</p>
      <p>${person.availability}</p>
      <div class="tag-list">${makeTags([...person.fields, ...person.skills.slice(0, 3)])}</div>
      <div class="card-actions">
        <button class="link-button" type="button" data-profile="${index}">View profile</button>
        ${saveButton({
          id: itemId("professional", person.email),
          type: "Professional",
          title: person.name,
          meta: `${person.role} · ${person.country}`
        })}
      </div>
    </article>
  `).join("") || `<p>No professionals match the current filters.</p>`;

  $$("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => openProfile(results[Number(button.dataset.profile)]));
  });
}

function renderOpportunities() {
  const query = $("#opportunitySearch").value.trim();

  const results = state.opportunities
    .filter((item) => {
      const matchesText = !query || includesText([
        item.title,
        item.description,
        item.url
      ], query);
      return matchesText;
    });

  $("#opportunitiesGrid").innerHTML = results.map((item, index) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="card-actions">
        <button class="link-button" type="button" data-opportunity="${index}">Details</button>
        ${saveButton({
          id: itemId("opportunity", item.title),
          type: "Opportunity",
          title: item.title,
          meta: "Open call"
        })}
      </div>
    </article>
  `).join("") || `<p>No opportunities match the current search.</p>`;

  $$("[data-opportunity]").forEach((button) => {
    button.addEventListener("click", () => openOpportunity(results[Number(button.dataset.opportunity)]));
  });
}

function openProfile(person) {
  $("#detailContent").innerHTML = `
    <p class="eyebrow">${person.verified ? "Verified profile" : "Unverified profile"}</p>
    <h2 id="detailTitle">${person.name}</h2>
    <p><strong>${person.role}</strong><br>${person.affiliation}</p>
    <p>${person.city}, ${person.country}</p>
    <p>${person.bio}</p>
    <p><strong>Email:</strong> <a href="mailto:${person.email}">${person.email}</a></p>
    <p><strong>Availability:</strong> ${person.availability}</p>
    <div class="tag-list">${makeTags([...person.fields, ...person.skills])}</div>
  `;
  openDetail();
}

function openOpportunity(item) {
  $("#detailContent").innerHTML = `
    <p class="eyebrow">Open call</p>
    <h2 id="detailTitle">${item.title}</h2>
    <p>${item.description}</p>
    <div class="card-actions"><a class="link-button" href="${item.url}" target="_blank" rel="noreferrer">Open source</a></div>
  `;
  openDetail();
}

function openDetail() {
  $("#detailModal").hidden = false;
}

function closeDetail() {
  $("#detailModal").hidden = true;
}

function applyMemberMode(enabled) {
  state.memberMode = enabled;
  document.body.classList.toggle("member-mode", enabled);
  $("[data-member-zone]").hidden = !enabled;
  $("[data-mode-ribbon]").hidden = !enabled;

  if (enabled) {
    localStorage.setItem(STORAGE_KEY, "true");
    renderDashboard();
    renderProfessionals();
    renderOpportunities();
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function openLogin() {
  $("#loginModal").hidden = false;
  $("#loginError").textContent = "";
  $("#passwordInput").value = "";
  setTimeout(() => $("#passwordInput").focus(), 0);
}

function closeLogin() {
  $("#loginModal").hidden = true;
}

function setupInteractions() {
  $$("[data-open-login]").forEach((button) => button.addEventListener("click", openLogin));
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeLogin));
  $$("[data-close-detail]").forEach((button) => button.addEventListener("click", closeDetail));
  $$("[data-exit-member]").forEach((button) => button.addEventListener("click", () => applyMemberMode(false)));

  $("#loginModal").addEventListener("click", (event) => {
    if (event.target.id === "loginModal") closeLogin();
  });
  $("#detailModal").addEventListener("click", (event) => {
    if (event.target.id === "detailModal") closeDetail();
  });

  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("#passwordInput").value === MEMBER_PASSWORD) {
      closeLogin();
      applyMemberMode(true);
      location.hash = "#dashboard";
    } else {
      $("#loginError").textContent = "Incorrect password.";
    }
  });

  $(".nav-toggle").addEventListener("click", () => {
    const links = $("#navLinks");
    const isOpen = links.classList.toggle("open");
    $(".nav-toggle").setAttribute("aria-expanded", String(isOpen));
  });

  $("#navLinks").addEventListener("click", (event) => {
    if (event.target.matches("a, button")) {
      $("#navLinks").classList.remove("open");
      $(".nav-toggle").setAttribute("aria-expanded", "false");
    }
  });

  if ($("#calendarPrev") && $("#calendarNext")) {
    $("#calendarPrev").addEventListener("click", () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      renderCalendar();
    });

    $("#calendarNext").addEventListener("click", () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-save-id]");
    if (!button) return;

    toggleSavedItem({
      id: button.dataset.saveId,
      type: button.dataset.saveType,
      title: button.dataset.saveTitle,
      meta: button.dataset.saveMeta
    });
  });
}

async function init() {
  await loadData();
  renderPublicViews();
  setupFilters();
  setupInteractions();
  applyMemberMode(state.memberMode);
}

init().catch((error) => {
  document.body.innerHTML = `<main class="section"><h1>Unable to load SELGRA</h1><p>${error.message}</p></main>`;
});
