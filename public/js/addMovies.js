// public/js/addMovies.js
/* eslint-disable no-unused-vars */

import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let logoutBtn;
let movieGrid;
let mainModal;
let closeModalBtn;
let modalPoster;
let modalTitle;
let modalCategories;
let modalStreaming;
let rememberStreaming;
let modalSinopse;
let btnGerarSinopse;
let btnLimparSinopse;
let modalCategorySelectContainer;
let btnDeleteMovie;
let btnSaveMovie;
let modalFetchPoster;
let modalUploadBtn;
let modalUploadInput;
let modalRemovePoster;
let toastEl;
let btnTranslateSinopse;

let confirmDialog;
let confirmTitle;
let confirmMessage;
let confirmOKBtn;
let confirmCancelBtn;
let modalPosterUrl;

// ==================================================
// 💎 CONFIGURAÇÕES DA API TMDb 💎
// ==================================================
const TMDB_API_KEY = "fc5a1abc31f9c3ba52d39c83b6892956";
const TMDB_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_LANGUAGE = "pt-BR";
let genreMap = new Map();

// ==================================================
// 🎬 PLAYERS — FILMES (melhor → pior)
// ==================================================
const PLAYERS_MOVIE = [
  { name: "EmbedAPI",   url: (id) => `https://player.embed-api.stream/?id=${id}` },
  { name: "MultiEmbed", url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { name: "VidSrc",     url: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { name: "AutoEmbed",  url: (id) => `https://player.autoembed.cc/embed/movie/${id}` },
  { name: "VidKing",    url: (id) => `https://www.vidking.net/embed/movie/${id}` },
];

// ==================================================
// 🎬 PLAYERS — SÉRIES (melhor → pior)
// ==================================================
const PLAYERS_SERIES = [
  { name: "EmbedAPI",   url: (id, s, e) => `https://player.embed-api.stream/?id=${id}&s=${s}&e=${e}` },
  { name: "VidSrc",     url: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { name: "MultiEmbed", url: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: "AutoEmbed",  url: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
];

// Tipo de mídia: "movie" ou "tv"
let currentMediaType = "movie";

/* ------------------------- HELPERS ------------------------- */
const $ = id => document.getElementById(id);

function showToast(msg, type = "info") {
  if (!toastEl) {
    toastEl = $("toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
  }
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  toastEl.className = `toast show toast-${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.className = "toast";
    toastEl.style.display = "none";
  }, 2800);
}

function safeText(s) {
  return (s || "").toString();
}

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function searchMoviesTMDb(term, lang = TMDB_LANGUAGE) {
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.results && data.results.length > 0) return data.results;
    return [];
  } catch (e) {
    console.error("Erro ao buscar sugestões:", e);
    return [];
  }
}

// 📺 Busca séries na TMDB
async function searchTVTMDb(term, lang = TMDB_LANGUAGE) {
  try {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.results && data.results.length > 0) return data.results;
    return [];
  } catch (e) {
    console.error("Erro ao buscar séries:", e);
    return [];
  }
}

async function fetchMovieDetailsTMDb(movieId, lang = TMDB_LANGUAGE) {
  try {
    const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=${lang}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.id) return data;
    return null;
  } catch (e) {
    console.error("Erro ao buscar detalhes:", e);
    return null;
  }
}

// 📺 Busca detalhes de série na TMDB
async function fetchTVDetailsTMDb(tvId, lang = TMDB_LANGUAGE) {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}&language=${lang}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.id) return data;
    return null;
  } catch (e) {
    console.error("Erro ao buscar detalhes da série:", e);
    return null;
  }
}

async function loadGenresTMDb() {
  try {
    const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.genres) {
      data.genres.forEach(genre => {
        genreMap.set(genre.id, genre.name);
      });
    }
  } catch (e) {
    console.error("Erro ao carregar gêneros:", e);
  }
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ------------------------- CONTROL STATE ------------------------- */
let userId = null;
let movies = [];
let editingId = null;
let userPreferences = {};
let categoriesSet = new Set([
  "Ação", "Terror", "Comédia", "Romance", "Fantasia",
  "Thriller", "Suspense", "Drama", "Ficção Científica"
]);
let tmpPosterDataUrl = "";
let tmpPosterUrl = "";
let multiSelectMode = false;
let selectedMovies = new Set();
let deleteSelectedBtn;
let currentSortBy = "date";
let activeCategoryFilters = new Set();
let currentLang = "pt-BR";
let tmpOriginalTitle = "";
let tmpTmdbId = "";
let currentPlayerIndex = 0;
let playingTmdbId = "";
let playingSeason  = 1;
let playingEpisode = 1;

// ❤️ FAVORITOS: controla se o filtro de favoritos está ativo
let showOnlyFavorites = false;
// 📺 Tipo de mídia sendo adicionado no modal de adição
let addMediaType = "movie";

const textMap = {
  "pt-BR": {
    brand: "Meus Filmes",
    select_toggle_off: "Selecionar",
    select_toggle_on: "Cancelar Seleção",
    delete_selected: "Excluir Selecionados",
    sort_by: "Ordenar por:",
    sort_date: "Mais Recentes",
    sort_title: "Título (A-Z)",
    logout: "Sair",
    read_more: "Leia mais",
    favorites_filter: "❤️ Favoritos",
    favorites_filter_active: "❤️ Favoritos",
    "Ação": "Ação", "Terror": "Terror", "Comédia": "Comédia", "Romance": "Romance",
    "Fantasia": "Fantasia", "Thriller": "Thriller", "Suspense": "Suspense",
    "Drama": "Drama", "Ficção Científica": "Ficção Científica",
    "Todos": "Todos"
  },
  "en-US": {
    brand: "My Watchlist",
    select_toggle_off: "Select",
    select_toggle_on: "Cancel Selection",
    delete_selected: "Delete Selected",
    sort_by: "Sort by:",
    sort_date: "Most Recent",
    sort_title: "Title (A-Z)",
    logout: "Logout",
    read_more: "Read more",
    favorites_filter: "❤️ Favorites",
    favorites_filter_active: "❤️ Favorites",
    "Ação": "Action", "Terror": "Horror", "Comédia": "Comedy", "Romance": "Romance",
    "Fantasia": "Fantasy", "Thriller": "Thriller", "Suspense": "Suspense",
    "Drama": "Drama", "Ficção Científica": "Science Fiction",
    "Todos": "All"
  }
};

/* ------------------------- AUTH ------------------------- */
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  userId = user.uid;
  await initApp();
});

/* ------------------------- INITIALIZATION ------------------------- */
async function initApp() {
  logoutBtn = $("logoutBtn");
  movieGrid = $("movieGrid");
  mainModal = $("modal");
  closeModalBtn = $("closeModal");
  modalPoster = $("modalPoster");
  modalTitle = $("modalTitle");
  modalCategories = $("modalCategories");
  modalStreaming = $("modalStreaming");
  rememberStreaming = $("rememberStreaming");
  modalSinopse = $("modalSinopse");
  btnGerarSinopse = $("btnGerarSinopse");
  btnLimparSinopse = $("btnLimparSinopse");
  modalCategorySelectContainer = $("modalCategorySelect");
  btnDeleteMovie = $("btnDeleteMovie");
  btnSaveMovie = $("btnSaveMovie");
  modalFetchPoster = $("modalFetchPoster");
  modalUploadBtn = $("modalUploadBtn");
  modalUploadInput = $("modalUploadInput");
  modalRemovePoster = $("modalRemovePoster");
  toastEl = $("toast");
  btnTranslateSinopse = $("btnTranslateSinopse");
  modalPosterUrl = $("modalPosterUrl");
  confirmDialog = $("confirmDialog");
  confirmTitle = $("confirmTitle");
  confirmMessage = $("confirmMessage");
  confirmOKBtn = $("confirmOKBtn");
  confirmCancelBtn = $("confirmCancelBtn");

  await loadGenresTMDb();
  await loadUserPreferences();
  buildAddMovieUI();
  createPlayerModal();
  await loadMovies();
  applyLocalization();
  rebuildCategoryOptions();
  renderSortFilters();
  attachGlobalEvents();
}

async function loadUserPreferences() {
  if (!userId) return;
  const prefRef = doc(db, "users", userId, "preferences", "main");
  const docSnap = await getDoc(prefRef);
  if (docSnap.exists()) {
    userPreferences = docSnap.data();
  } else {
    userPreferences = { defaultStreaming: "", defaultCategories: [] };
  }
}

async function saveUserPreferences() {
  if (!userId) return;
  const prefRef = doc(db, "users", userId, "preferences", "main");
  try {
    await setDoc(prefRef, userPreferences);
  } catch (e) {
    console.error("Erro ao salvar preferências: ", e);
    showToast("Erro ao salvar suas preferências", "error");
  }
}

/* ============================================================
   [PLAYER] MODAL DE REPRODUÇÃO COM FALLBACK
============================================================ */
function createPlayerModal() {
  if ($("playerModal")) return;

  const modal = document.createElement("div");
  modal.id = "playerModal";
  modal.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.92);
    z-index: 99999;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  `;

  modal.innerHTML = `
    <div style="
      position: relative;
      width: 92%;
      max-width: 1000px;
      background: #111;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
      ">
        <span id="playerTitle" style="color:#fff; font-weight:bold; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:60%;"></span>
        <button id="playerCloseBtn" style="
          background: #e53e3e; color: white; border: none; border-radius: 6px;
          padding: 5px 14px; cursor: pointer; font-size: 14px; font-weight: bold;
        ">✕ Fechar</button>
      </div>
      <div style="position:relative; width:100%; aspect-ratio:16/9; background:#000;">
        <iframe id="playerIframe"
          style="width:100%; height:100%; border:none; display:block;"
          allowfullscreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        ></iframe>
        <div id="playerSpinner" style="
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          color:#aaa; font-size:14px; pointer-events:none;
        ">Carregando player...</div>
      </div>
      <div id="playerEpisodeRow" style="
        display: none; align-items: center; gap: 10px;
        padding: 8px 16px; background: #141414;
        border-top: 1px solid #222; flex-wrap: wrap;
      ">
        <span style="color:#aaa; font-size:13px;">Temporada:</span>
        <input id="playerSeasonInput" type="number" min="1" value="1" style="
          width:60px; padding:3px 6px; border-radius:5px;
          background:#222; color:#fff; border:1px solid #444; font-size:13px;
        " />
        <span style="color:#aaa; font-size:13px;">Episódio:</span>
        <input id="playerEpisodeInput" type="number" min="1" value="1" style="
          width:60px; padding:3px 6px; border-radius:5px;
          background:#222; color:#fff; border:1px solid #444; font-size:13px;
        " />
        <button onclick="window.__loadEpisode()" style="
          padding:4px 14px; border-radius:6px; border:none;
          background:#4f46e5; color:#fff; font-size:12px;
          font-weight:bold; cursor:pointer;
        ">▶ Ir</button>
      </div>
      <div style="
        display: flex; align-items: center; gap: 8px;
        padding: 10px 16px; background: #1a1a1a;
        flex-wrap: wrap; border-top: 1px solid #333;
      ">
        <span style="color:#aaa; font-size:13px; margin-right:4px;">Trocar servidor:</span>
        <div id="playerServerBtns" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
        <span id="playerServerLabel" style="color:#666; font-size:12px; margin-left:auto;"></span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closePlayerModal(); });
  modal.querySelector("#playerCloseBtn").addEventListener("click", closePlayerModal);
}

async function openPlayerModal(movie) {
  const modal = $("playerModal");
  if (!modal) return;

  let tmdbId = movie.tmdbId || "";
  if (!tmdbId) {
    const isTV = movie.mediaType === "tv";
    showToast(isTV ? "Buscando série na base de dados..." : "Buscando filme na base de dados...");
    const results = isTV
      ? await searchTVTMDb(movie.title)
      : await searchMoviesTMDb(movie.title);
    if (results && results.length > 0) tmdbId = String(results[0].id);
  }
  if (!tmdbId) {
    showToast("Não foi possível encontrar este filme para reproduzir.", "warning");
    return;
  }

  playingTmdbId = tmdbId;
  currentPlayerIndex = 0;
  currentMediaType = movie.mediaType || "movie";
  playingSeason  = 1;
  playingEpisode = 1;

  const epRow = $("playerEpisodeRow");
  if (epRow) epRow.style.display = currentMediaType === "tv" ? "flex" : "none";

  const titleEl = $("playerTitle");
  if (titleEl) titleEl.textContent = movie.title || "";

  buildServerButtons(tmdbId);
  loadPlayer(tmdbId, 0);
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

window.__loadEpisode = function() {
  const s = parseInt($("playerSeasonInput")?.value) || 1;
  const e = parseInt($("playerEpisodeInput")?.value) || 1;
  playingSeason  = s;
  playingEpisode = e;
  if (playingTmdbId) loadPlayer(playingTmdbId, 0);
};

function closePlayerModal() {
  const modal = $("playerModal");
  if (!modal) return;
  const iframe = $("playerIframe");
  if (iframe) iframe.src = "about:blank";
  modal.style.display = "none";
  document.body.style.overflow = "";
  playingTmdbId = "";
  currentPlayerIndex = 0;
  currentMediaType = "movie";
  playingSeason    = 1;
  playingEpisode   = 1;
  const epRow = $("playerEpisodeRow");
  if (epRow) epRow.style.display = "none";
}

function loadPlayer(tmdbId, index) {
  const iframe = $("playerIframe");
  const spinner = $("playerSpinner");
  const label = $("playerServerLabel");
  if (!iframe) return;

  currentPlayerIndex = index;
  const activeList = currentMediaType === "tv" ? PLAYERS_SERIES : PLAYERS_MOVIE;
  const player = activeList[index];

  if (spinner) spinner.style.display = "block";
  iframe.src = "about:blank";

  setTimeout(() => {
    const season  = playingSeason  || 1;
    const episode = playingEpisode || 1;
    iframe.src = currentMediaType === "tv"
      ? player.url(tmdbId, season, episode)
      : player.url(tmdbId);
    if (label) label.textContent = player.name;
    if (spinner) setTimeout(() => { spinner.style.display = "none"; }, 2000);
  }, 150);

  updateServerButtonsState(index);
}

function buildServerButtons(tmdbId) {
  const container = $("playerServerBtns");
  if (!container) return;
  container.innerHTML = "";

  const activeList = currentMediaType === "tv" ? PLAYERS_SERIES : PLAYERS_MOVIE;
  activeList.forEach((player, index) => {
    const btn = document.createElement("button");
    btn.textContent = player.name;
    btn.dataset.index = index;
    btn.style.cssText = `
      padding: 4px 12px; border-radius: 6px; border: none;
      cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s;
    `;
    btn.onclick = () => loadPlayer(tmdbId, index);
    container.appendChild(btn);
  });
  updateServerButtonsState(0);
}

function updateServerButtonsState(activeIndex) {
  const container = $("playerServerBtns");
  if (!container) return;
  Array.from(container.children).forEach((btn, i) => {
    btn.style.background = i === activeIndex ? "#4f46e5" : "#333";
    btn.style.color      = i === activeIndex ? "#fff"    : "#ccc";
  });
}

/* ============================================================
   ❤️ FAVORITOS
============================================================ */

/**
 * Alterna o favorito de um filme no Firestore e atualiza o estado local.
 * @param {string} movieId
 * @param {boolean} currentFav - valor atual do favorito
 */
async function toggleFavorite(movieId, currentFav) {
  if (!userId || !movieId) return;

  const newFav = !currentFav;

  // Atualiza localmente de imediato (UI otimista)
  const movie = movies.find(m => m.id === movieId);
  if (movie) movie.favorite = newFav;

  // Persiste no Firestore
  try {
    const ref = doc(db, "users", userId, "movies", movieId);
    await updateDoc(ref, { favorite: newFav });
  } catch (e) {
    console.error("Erro ao atualizar favorito:", e);
    // Reverte em caso de erro
    if (movie) movie.favorite = currentFav;
    showToast("Erro ao atualizar favorito", "error");
  }

  // Re-renderiza só os cards (sem buscar do Firestore de novo)
  renderMovies();
}

/**
 * Cria o botão de coração para um card.
 * @param {object} movie
 * @returns {HTMLButtonElement}
 */
function createFavoriteBtn(movie) {
  const btn = document.createElement("button");
  btn.className = "fav-btn";
  btn.setAttribute("aria-label", movie.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos");
  btn.setAttribute("title", movie.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos");
  btn.innerHTML = movie.favorite ? "❤️" : "🤍";
  btn.dataset.movieId = movie.id;

  btn.onclick = async (e) => {
    e.stopPropagation(); // Não dispara o click do card
    btn.disabled = true; // Evita cliques duplos
    await toggleFavorite(movie.id, movie.favorite || false);
    btn.disabled = false;
  };

  return btn;
}

/* ============================================================
      CRIA BOTÃO E MODAL DE ADIÇÃO
============================================================ */
function buildAddMovieUI() {
  if (!$("addMovieFab")) {
    const fab = document.createElement("button");
    fab.id = "addMovieFab";
    fab.textContent = "+ Adicionar";
    fab.className =
      "fixed bottom-6 right-6 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-xl hover:scale-105";
    fab.onclick = () => openAddModal();
    document.body.appendChild(fab);
  }

  if (!$("addModal")) {
    const modal = document.createElement("div");
    modal.id = "addModal";
    modal.className =
      "hidden fixed inset-0 z-60 flex items-center justify-center modal-overlay p-4";

    modal.innerHTML = `
      <div class="bg-neutral-800 w-full max-w-2xl rounded-xl p-4 md:p-6 relative max-h-[95vh] h-full overflow-y-auto flex flex-col overscroll-contain">
        <button id="closeAddModal" class="absolute top-4 right-4 text-gray-300 hover:text-white">✕</button>
        <h3 id="addModalTitle" class="text-2xl font-bold mb-4 flex-shrink-0">Adicionar filme</h3>

        <!-- 📺 Seletor Filme / Série -->
        <div class="flex gap-2 mb-4 flex-shrink-0">
          <button id="addTypeMovie" type="button"
            class="px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white">
            🎬 Filme
          </button>
          <button id="addTypeSeries" type="button"
            class="px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300">
            📺 Série
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
          <div class="relative">
            <label class="block mb-1">Título</label>
            <input id="addTitle" class="w-full rounded p-2 bg-neutral-700" autocomplete="off" />
            <div id="addTitleSuggestions"
                class="absolute z-10 w-full bg-neutral-800 border border-neutral-600 rounded-b-md shadow-lg max-h-48 overflow-y-auto hidden">
            </div>
            <label class="block mt-3 mb-1">Sinopse</label>
            <textarea id="addSynopsis" class="w-full rounded p-2 bg-neutral-700 min-h-28"></textarea>
            <div class="flex gap-2 mt-2">
              <button id="addGenerateSynopsis" type="button" class="px-3 py-1 bg-indigo-600 rounded">Gerar</button>
              <button id="addClearSynopsis" type="button" class="px-3 py-1 bg-neutral-700 rounded">Limpar</button>
            </div>
          </div>
          <div>
            <label class="block mb-1">Pôster (URL)</label>
            <input id="addPosterUrl" class="w-full rounded p-2 bg-neutral-700" placeholder="https://..." />
            <div class="flex gap-2 mt-2">
              <button id="addFetchPoster" type="button" class="px-3 py-1 bg-indigo-600 rounded">Buscar da API</button>
              <button id="addUploadBtn" type="button" class="px-3 py-1 bg-neutral-700 rounded">Upload</button>
              <input id="addUploadInput" type="file" accept="image/*" class="hidden" />
              <button id="addRemovePoster" type="button" class="px-3 py-1 bg-red-600 rounded">Remover</button>
            </div>
            <img id="addPosterPreview"
              class="w-full h-44 object-cover rounded mt-3 bg-neutral-700"
              style="display:none" />
            <label class="block mt-3 mb-1">Categorias</label>
            <select id="addCategories" multiple class="w-full rounded p-2 bg-neutral-700"></select>
            <div class="flex gap-2 mt-2">
              <input id="addNewCategory" class="rounded p-2 bg-neutral-700 w-full" placeholder="Nova categoria" />
              <button id="addCategoryBtnLocal" type="button" class="px-3 py-1 bg-green-600 rounded">Criar</button>
            </div>
            <label class="block mt-3 mb-1">URL streaming (opcional)</label>
            <input id="addStreaming" class="w-full rounded p-2 bg-neutral-700" />
            <div class="flex items-center gap-2 mt-2">
              <input id="addRemember" type="checkbox" />
              <label class="text-sm">Lembrar preferências</label>
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-6 flex-shrink-0">
          <button id="cancelAddBtn" type="button" class="px-4 py-2 bg-neutral-700 rounded">Cancelar</button>
          <button id="confirmAddBtn" type="button" class="px-4 py-2 bg-green-600 rounded">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    $("closeAddModal").onclick = () => modal.classList.add("hidden");
    $("cancelAddBtn").onclick  = () => modal.classList.add("hidden");
    $("addFetchPoster").onclick = handleFetchPoster;
    $("addUploadBtn").onclick   = () => $("addUploadInput").click();
    $("addUploadInput").onchange = handlePosterUpload;
    $("addRemovePoster").onclick = () => resetPosterPreview("");

    // 📺 Seletor Filme / Série
    const btnTypeMovie   = $("addTypeMovie");
    const btnTypeSeries  = $("addTypeSeries");
    const addModalTitle  = $("addModalTitle");

    function setAddMediaType(type) {
      addMediaType = type;
      if (type === "movie") {
        btnTypeMovie.className  = "px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white";
        btnTypeSeries.className = "px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300";
        addModalTitle.textContent = "Adicionar filme";
      } else {
        btnTypeSeries.className = "px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white";
        btnTypeMovie.className  = "px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300";
        addModalTitle.textContent = "Adicionar série";
      }
      // Limpa sugestões ao trocar o tipo
      $("addTitleSuggestions").innerHTML = "";
      $("addTitleSuggestions").classList.add("hidden");
    }

    btnTypeMovie.onclick  = () => setAddMediaType("movie");
    btnTypeSeries.onclick = () => setAddMediaType("tv");

    $("addGenerateSynopsis").onclick = () => {
      const t = $("addTitle").value.trim();
      if (!t) return showToast("Digite o título primeiro");
      $("addSynopsis").value = `Sinopse: ${t} — breve resumo do enredo.`;
      showToast("Sinopse gerada (local)");
    };

    $("addClearSynopsis").onclick = () => {
      $("addSynopsis").value = "";
      showToast("Sinopse limpa");
    };

    $("addCategoryBtnLocal").onclick = () => {
      const v = $("addNewCategory").value.trim();
      if (!v) return showToast("Digite um nome para categoria");
      categoriesSet.add(v);
      $("addNewCategory").value = "";
      rebuildCategoryOptions();
      showToast("Categoria criada!");
    };

    $("confirmAddBtn").onclick = () => handleAddConfirm();

    let typingTimer;
    const doneTypingInterval = 500;
    const addTitleInput = $("addTitle");
    const addTitleSuggestions = $("addTitleSuggestions");

    addTitleInput.addEventListener("input", () => {
      clearTimeout(typingTimer);
      if (addTitleInput.value.length < 3) {
        addTitleSuggestions.classList.add("hidden");
        return;
      }
      typingTimer = setTimeout(async () => {
        const term = addTitleInput.value.trim();
        if (term.length >= 3) {
          const suggestions = addMediaType === "tv"
            ? await searchTVTMDb(term)
            : await searchMoviesTMDb(term);
          renderSuggestions(suggestions);
        } else {
          addTitleSuggestions.classList.add("hidden");
        }
      }, doneTypingInterval);
    });

    addTitleInput.addEventListener("blur",  () => { setTimeout(() => addTitleSuggestions.classList.add("hidden"), 150); });
    addTitleInput.addEventListener("focus", () => {
      if (addTitleSuggestions.innerHTML.trim() !== "" && addTitleInput.value.length >= 3) {
        addTitleSuggestions.classList.remove("hidden");
      }
    });

    async function renderSuggestions(suggestions) {
      addTitleSuggestions.innerHTML = "";
      if (suggestions.length === 0) { addTitleSuggestions.classList.add("hidden"); return; }
      addTitleSuggestions.classList.remove("hidden");
      suggestions.slice(0, 5).forEach(item => {
        const div = document.createElement("div");
        div.className = "px-4 py-2 cursor-pointer hover:bg-neutral-700 flex items-center";
        div.onmousedown = (e) => { e.preventDefault(); selectSuggestedItem(item.id); };
        const posterPath = item.poster_path ? `${TMDB_IMG_BASE_URL}${item.poster_path}` : "https://via.placeholder.com/50x75?text=NP";
        // TV usa name, filme usa title
        const displayName = item.title || item.name || "";
        const dateField = item.release_date || item.first_air_date || "";
        const releaseYear = dateField ? `(${dateField.split("-")[0]})` : "";
        div.innerHTML = `
          <img src="${posterPath}" class="w-8 h-12 object-cover mr-3 rounded" />
          <span>${escapeHtml(displayName)} ${releaseYear}</span>
        `;
        addTitleSuggestions.appendChild(div);
      });
    }

    async function selectSuggestedItem(itemId) {
      const isTV = addMediaType === "tv";
      showToast(isTV ? "Carregando detalhes da série..." : "Carregando detalhes do filme...");
      const details = isTV
        ? await fetchTVDetailsTMDb(itemId)
        : await fetchMovieDetailsTMDb(itemId);
      addTitleSuggestions.classList.add("hidden");
      if (details) {
        tmpTmdbId = String(details.id);
        // TV usa name/original_name, filme usa title/original_title
        const displayTitle   = details.title    || details.name    || "";
        const originalTitle  = details.original_title || details.original_name || displayTitle;
        tmpOriginalTitle = originalTitle;
        $("addTitle").value    = displayTitle;
        $("addSynopsis").value = details.overview || "Sinopse não disponível.";
        const posterUrl = details.poster_path ? `${TMDB_IMG_BASE_URL}${details.poster_path}` : "";
        $("addPosterUrl").value = posterUrl;
        resetPosterPreview(posterUrl);
        const newCategories = details.genres ? details.genres.map(g => g.name) : [];
        newCategories.forEach(c => categoriesSet.add(c));
        rebuildCategoryOptions();
        const addSel = $("addCategories");
        if (addSel) Array.from(addSel.options).forEach(option => { option.selected = newCategories.includes(option.value); });
        showToast(isTV ? "Série preenchida automaticamente!" : "Filme preenchido automaticamente!", "success");
      } else {
        showToast("Não foi possível carregar os detalhes.", "warning");
      }
    }
  }

  const addSel = $("addCategories");
  if (!addSel) rebuildCategoryOptions();
}

/* ---------------- POSTER ACTIONS ---------------- */
async function handleFetchPoster() {
  const title = $("addTitle").value.trim();
  if (!title) return showToast("Digite o título primeiro");
  const isTV = addMediaType === "tv";
  showToast(isTV ? "Buscando detalhes da série..." : "Buscando detalhes do filme e pôster...");

  const searchResults = isTV ? await searchTVTMDb(title) : await searchMoviesTMDb(title);
  if (!searchResults || searchResults.length === 0) {
    return showToast(isTV ? "Nenhuma série encontrada na TMDb." : "Nenhum filme encontrado na TMDb.", "warning");
  }

  const itemId = searchResults[0].id;
  tmpTmdbId = String(itemId);
  const details = isTV ? await fetchTVDetailsTMDb(itemId) : await fetchMovieDetailsTMDb(itemId);

  if (details) {
    const displayTitle  = details.title    || details.name    || "";
    const originalTitle = details.original_title || details.original_name || displayTitle;
    tmpOriginalTitle = originalTitle;
    $("addTitle").value = displayTitle;
    const posterUrl = details.poster_path ? `${TMDB_IMG_BASE_URL}${details.poster_path}` : "";
    resetPosterPreview(posterUrl);
    $("addSynopsis").value = details.overview || "Sinopse não disponível.";
    const newCategories = details.genres ? details.genres.map(g => g.name) : [];
    newCategories.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions();
    const addSel = $("addCategories");
    if (addSel) Array.from(addSel.options).forEach(option => { option.selected = newCategories.includes(option.value); });
    showToast(isTV ? "Série preenchida!" : "Filme preenchido!", "success");
  } else {
    showToast("Nenhum pôster ou detalhes encontrados para o título.", "warning");
  }
}

async function handlePosterUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const data = await fileToDataURL(file);
  tmpPosterDataUrl = data;
  tmpPosterUrl = "";
  const addPosterPreview = $("addPosterPreview");
  if (addPosterPreview) { addPosterPreview.src = data; addPosterPreview.style.display = "block"; }
  const addPosterUrl = $("addPosterUrl");
  if (addPosterUrl) addPosterUrl.value = "";
}

function resetPosterPreview(posterUrl = "") {
  tmpPosterDataUrl = "";
  tmpPosterUrl = posterUrl;
  const addPosterPreview = $("addPosterPreview");
  if (addPosterPreview) { addPosterPreview.src = posterUrl; addPosterPreview.style.display = posterUrl ? "block" : "none"; }
  const addPosterUrl = $("addPosterUrl");
  if (addPosterUrl) addPosterUrl.value = posterUrl;
}

/* ----------------- LOCALIZATION ----------------- */
function applyLocalization() {
  const texts = textMap[currentLang];
  const brand = $("brand");
  if (brand) brand.textContent = texts.brand;
  const logoutBtnEl = $("logoutBtn");
  if (logoutBtnEl) logoutBtnEl.textContent = texts.logout;
  const toggleBtn = $("toggleSelectModeBtn");
  if (toggleBtn) toggleBtn.textContent = multiSelectMode ? texts.select_toggle_on : texts.select_toggle_off;
  if (deleteSelectedBtn) updateDeleteSelectedButton();
  rebuildCategoryOptions();
  renderSortFilters();
  renderMovies();
}

function toggleLanguage() {
  currentLang = currentLang === "pt-BR" ? "en-US" : "pt-BR";
  activeCategoryFilters.clear();
  currentSortBy = "date";
  applyLocalization();
}

/* ---------------- CATEGORY OPTIONS ---------------- */
function rebuildCategoryOptions() {
  const texts = textMap[currentLang];

  const addSel = $("addCategories");
  if (addSel) {
    addSel.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = texts[c] || c;
      addSel.appendChild(opt);
    });
  }

  const filterContainer = $("categoryFilters");
  if (!filterContainer) return;

  filterContainer.innerHTML = "";

  // Botão "Todos"
  const allBtn = document.createElement("button");
  allBtn.textContent = texts.Todos;
  allBtn.className = (activeCategoryFilters.size === 0 && !showOnlyFavorites) ? "filter-btn-active" : "filter-btn";
  allBtn.onclick = () => {
    activeCategoryFilters.clear();
    showOnlyFavorites = false;
    rebuildCategoryOptions();
    renderMovies();
  };
  filterContainer.appendChild(allBtn);

  // ❤️ Botão Favoritos
  const favBtn = document.createElement("button");
  favBtn.textContent = texts.favorites_filter;
  favBtn.className = showOnlyFavorites ? "filter-btn-active fav-filter-btn" : "filter-btn fav-filter-btn";
  favBtn.onclick = () => {
    showOnlyFavorites = !showOnlyFavorites;
    if (showOnlyFavorites) activeCategoryFilters.clear();
    rebuildCategoryOptions();
    renderMovies();
  };
  filterContainer.appendChild(favBtn);

  [...categoriesSet].sort().forEach(category => {
    const btn = document.createElement("button");
    btn.textContent = texts[category] || category;
    const isActive = activeCategoryFilters.has(category);
    btn.className = isActive ? "filter-btn-active" : "filter-btn";
    btn.onclick = () => setCategoryFilter(category);
    filterContainer.appendChild(btn);
  });
}

function setCategoryFilter(category) {
  showOnlyFavorites = false;
  if (activeCategoryFilters.has(category)) {
    activeCategoryFilters.delete(category);
  } else {
    activeCategoryFilters.add(category);
  }
  rebuildCategoryOptions();
  renderMovies();
}

/* ----------------- RENDER/CONTROL SORT ----------------- */
function renderSortFilters() {
  const texts = textMap[currentLang];
  const dateBtn  = $("sortByDateBtn");
  const titleBtn = $("sortByTitleBtn");
  if (dateBtn) {
    dateBtn.textContent = texts.sort_date;
    dateBtn.className = currentSortBy === "date" ? "filter-btn-active" : "filter-btn";
    dateBtn.onclick = () => setSortBy("date");
  }
  if (titleBtn) {
    titleBtn.textContent = texts.sort_title;
    titleBtn.className = currentSortBy === "title" ? "filter-btn-active" : "filter-btn";
    titleBtn.onclick = () => setSortBy("title");
  }
}

function setSortBy(sortBy) {
  if (currentSortBy === sortBy) return;
  currentSortBy = sortBy;
  renderSortFilters();
  renderMovies();
}

/* ============================================================
                ADICIONAR FILME
============================================================ */
async function openAddModal() {
  const addTitle = $("addTitle");
  if (!addTitle) { console.error("Modal de adição não está pronto!"); return; }
  addTitle.value = "";
  $("addSynopsis").value = "";
  $("addPosterUrl").value = "";
  resetPosterPreview();
  tmpTmdbId = "";
  tmpOriginalTitle = "";
  // 📺 Reseta para filme ao abrir o modal
  addMediaType = "movie";
  const btnTypeMovie2  = $("addTypeMovie");
  const btnTypeSeries2 = $("addTypeSeries");
  const addModalTitle2 = $("addModalTitle");
  if (btnTypeMovie2)  btnTypeMovie2.className  = "px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white";
  if (btnTypeSeries2) btnTypeSeries2.className = "px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300";
  if (addModalTitle2) addModalTitle2.textContent = "Adicionar filme";
  $("addStreaming").value = userPreferences.defaultStreaming || "";
  $("addRemember").checked = !!(userPreferences.defaultStreaming);
  const defaultCats = userPreferences.defaultCategories || [];
  const addSel = $("addCategories");
  if (addSel) Array.from(addSel.options).forEach(o => { o.selected = defaultCats.includes(o.value); });
  const addModal = $("addModal");
  if (addModal) addModal.classList.remove("hidden");
}

async function handleAddConfirm() {
  if (!userId) return;
  const title = safeText($("addTitle").value).trim();
  if (!title) return showToast("Digite o título", "warning");
  const synopsis = safeText($("addSynopsis").value).trim();
  const addSel = $("addCategories");
  const categories = addSel ? Array.from(addSel.selectedOptions).map(o => o.value) : [];
  categories.forEach(c => categoriesSet.add(c));
  const streamingUrlVal = safeText($("addStreaming").value).trim() || null;
  const remember = $("addRemember").checked;
  const poster = tmpPosterDataUrl || $("addPosterUrl").value.trim() || tmpPosterUrl || "";
  const payload = {
    title, description: synopsis, categories,
    streamingUrl: streamingUrlVal, remember, poster,
    createdAt: Date.now(),
    originalTitle: tmpOriginalTitle || title,
    tmdbId: tmpTmdbId || "",
    mediaType: addMediaType || "movie",  // 📺 salva o tipo
    favorite: false
  };
  try {
    await addDoc(collection(db, "users", userId, "movies"), payload);
    showToast("Filme adicionado!", "success");
    const addModal = $("addModal");
    if (addModal) addModal.classList.add("hidden");
    if (remember) {
      userPreferences.defaultStreaming = streamingUrlVal;
      userPreferences.defaultCategories = categories;
    } else {
      userPreferences.defaultStreaming = "";
      userPreferences.defaultCategories = [];
    }
    await saveUserPreferences();
    await loadMovies();
  } catch (e) {
    console.error(e);
    showToast("Erro ao salvar filme", "error");
  }
}

/* ============================================================
   💀 SKELETON LOADING — helpers
============================================================ */
function createSkeletonCard() {
  const card = document.createElement("div");
  card.className = "skeleton-card";
  card.innerHTML = `
    <div class="skeleton-shimmer skeleton-poster"></div>
    <div class="skeleton-footer">
      <div class="skeleton-shimmer skeleton-title"></div>
      <div class="skeleton-shimmer skeleton-subtitle"></div>
    </div>
  `;
  return card;
}

function showSkeletons(count = 12) {
  if (!movieGrid) return;
  movieGrid.innerHTML = "";
  for (let i = 0; i < count; i++) movieGrid.appendChild(createSkeletonCard());
}

/* ---------------- LOAD MOVIES ---------------- */
async function loadMovies() {
  if (!userId) return;
  if (!movieGrid) { console.error("movieGrid não foi encontrado!"); return; }

  showSkeletons(12);

  try {
    const q = query(collection(db, "users", userId, "movies"));
    const snap = await getDocs(q);
    movies = [];
    snap.forEach(d => {
      const data = d.data();
      movies.push({ id: d.id, ...data });
      (data.categories || []).forEach(c => categoriesSet.add(c));
    });
    renderMovies();
    rebuildCategoryOptions();
  } catch (e) {
    console.error(e);
    showToast("Erro ao carregar filmes", "error");
    if (movieGrid) movieGrid.innerHTML = `<div class="col-span-full text-center text-neutral-400 py-8">Erro ao carregar. Tente novamente.</div>`;
  }
}

/* ---------------- RENDER CARDS ---------------- */
function renderMovies() {
  const texts = textMap[currentLang];
  if (!movieGrid) return;

  movieGrid.innerHTML = "";

  const term = (document.querySelector("#searchInput")?.value || "").toLowerCase();
  const isFilteringByCategories = activeCategoryFilters.size > 0;

  let sortedMovies = [...movies];
  if (currentSortBy === "title") {
    sortedMovies.sort((a, b) => {
      const titleA = ((currentLang === "en-US" ? a.originalTitle : a.title) || "").toLowerCase();
      const titleB = ((currentLang === "en-US" ? b.originalTitle : b.title) || "").toLowerCase();
      return titleA.localeCompare(titleB);
    });
  } else {
    sortedMovies.sort((a, b) => b.createdAt - a.createdAt);
  }

  const filtered = sortedMovies.filter(m => {
    const titleMatch = (m.title || "").toLowerCase().includes(term);
    const descMatch  = (m.description || "").toLowerCase().includes(term);
    const catMatch   = !isFilteringByCategories || (m.categories || []).some(cat => activeCategoryFilters.has(cat));
    // ❤️ Filtro de favoritos
    const favMatch   = !showOnlyFavorites || m.favorite === true;
    return (titleMatch || descMatch) && catMatch && favMatch;
  });

  if (!filtered.length) {
    movieGrid.innerHTML = `<div class="col-span-full text-center text-neutral-400 py-8">Nenhum filme encontrado.</div>`;
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement("div");
    card.className = "poster-card relative";

    const isSelected = selectedMovies.has(m.id);

    if (multiSelectMode) {
      card.innerHTML += `
        <input type="checkbox" id="select-${m.id}"
               class="absolute top-2 right-2 w-5 h-5 z-20 cursor-pointer checked:accent-red-600"
               ${isSelected ? "checked" : ""} />
      `;
      if (isSelected) card.classList.add("ring-4", "ring-red-600");
      else card.classList.remove("ring-4", "ring-red-600");
    }

    const desc = (m.description || "").substring(0, 120);
    const displayTitle = escapeHtml(currentLang === "en-US" && m.originalTitle ? m.originalTitle : m.title);

    const posterHtml = `
      <div class="poster-link" style="position:relative; cursor:pointer; display:block;" title="▶ Assistir agora">
        <img src="${m.poster}" class="poster-image" alt="${escapeHtml(m.title)}" onerror="this.style.opacity='.3'" />
        <div style="
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          width:52px; height:52px;
          background:rgba(0,0,0,0.65);
          border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity 0.2s; pointer-events:none;
        " class="play-overlay">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    `;

    card.innerHTML += `
      ${posterHtml}
      <div class="poster-info">
        <div class="poster-fav-row">
          <div>
            <div class="poster-title">${displayTitle}</div>
            <div class="poster-description">${escapeHtml(desc)}</div>
          </div>
        </div>
        <div class="mt-3 flex justify-between items-center">
          <button class="read-more-btn">${texts.read_more}</button>
          <div class="flex items-center gap-2">
            <button class="fav-btn-inline">${m.favorite ? "❤️" : "🤍"}</button>
            <div class="actions-menu">
              <button class="actions-menu-btn">...</button>
              <div class="actions-dropdown">
                <button class="edit-btn">Editar</button>
                <button class="delete-btn">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ❤️ Evento do botão de favorito inline
    const favBtnInline = card.querySelector(".fav-btn-inline");
    if (favBtnInline) {
      favBtnInline.onclick = async (e) => {
        e.stopPropagation();
        favBtnInline.disabled = true;
        await toggleFavorite(m.id, m.favorite || false);
        favBtnInline.disabled = false;
      };
    }

    // Hover no pôster
    const posterDiv   = card.querySelector(".poster-link");
    const playOverlay = card.querySelector(".play-overlay");
    if (posterDiv && playOverlay) {
      posterDiv.addEventListener("mouseenter", () => { playOverlay.style.opacity = "1"; });
      posterDiv.addEventListener("mouseleave", () => { playOverlay.style.opacity = "0"; });
    }

    // Click principal do card
    card.onclick = (e) => {
      if (e.target.closest(".actions-menu") || e.target.closest(".actions-dropdown")) return;
      if (e.target.closest(".fav-btn")) return; // ❤️ não propaga para o card
      if (multiSelectMode) {
        if (e.target.type === "checkbox") return;
        if (selectedMovies.has(m.id)) selectedMovies.delete(m.id);
        else selectedMovies.add(m.id);
        updateDeleteSelectedButton();
        renderMovies();
      } else {
        if (e.target.closest(".poster-link")) openPlayerModal(m);
      }
    };

    const checkbox = card.querySelector(`#select-${m.id}`);
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation();
        if (e.target.checked) selectedMovies.add(m.id);
        else selectedMovies.delete(m.id);
        updateDeleteSelectedButton();
        renderMovies();
      };
    }

    const menuBtn  = card.querySelector(".actions-menu-btn");
    const dropdown = card.querySelector(".actions-dropdown");

    menuBtn.onclick = (e) => {
      if (!multiSelectMode) {
        e.stopPropagation();
        document.querySelectorAll(".actions-dropdown.show").forEach(menu => { if (menu !== dropdown) menu.classList.remove("show"); });
        dropdown.classList.toggle("show");
      }
    };

    card.querySelector(".edit-btn").onclick   = () => { if (!multiSelectMode) { dropdown.classList.remove("show"); openMainModal(m, true); } };
    card.querySelector(".delete-btn").onclick  = () => { if (!multiSelectMode) { dropdown.classList.remove("show"); deleteMovieConfirm(m.id); } };
    card.querySelector(".read-more-btn").onclick = () => { if (!multiSelectMode) openMainModal(m, false); };

    movieGrid.appendChild(card);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".actions-menu")) {
      document.querySelectorAll(".actions-dropdown.show").forEach(menu => menu.classList.remove("show"));
    }
  });
}

/* ---------------- MAIN MODAL ---------------- */
function openMainModal(movie, editable = false) {
  if (multiSelectMode) return;
  editingId = movie.id;
  const modalContent = $("modalContent");
  const editElements     = modalContent.querySelectorAll(".edit-element");
  const editElementsFlex = modalContent.querySelectorAll(".edit-element-flex");
  if (editable) {
    modalContent.classList.remove("modal-view-mode");
    modalSinopse.readOnly = false;
    editElements.forEach(el => (el.style.display = "block"));
    editElementsFlex.forEach(el => (el.style.display = "flex"));
    $("modalCategories").style.display = "none";
  } else {
    modalContent.classList.add("modal-view-mode");
    modalSinopse.readOnly = true;
    editElements.forEach(el => (el.style.display = "none"));
    editElementsFlex.forEach(el => (el.style.display = "none"));
    $("modalCategories").style.display = "flex";
  }
  modalPoster.src = movie.poster || "";
  modalTitle.textContent = currentLang === "en-US" && movie.originalTitle ? movie.originalTitle : movie.title || "";
  modalSinopse.value = movie.description || "";
  modalSinopse.dataset.lang = "pt-BR";
  modalStreaming.value = movie.streamingUrl ?? "";
  rememberStreaming.checked = movie.remember ?? false;
  if (modalPosterUrl) modalPosterUrl.value = movie.poster || "";

  modalCategories.innerHTML = "";
  const categoryTexts = textMap[currentLang];
  (movie.categories || []).forEach(c => {
    const x = document.createElement("span");
    x.className = "px-2 py-1 bg-neutral-700 rounded text-sm mr-2";
    x.textContent = categoryTexts[c] || c;
    modalCategories.appendChild(x);
  });

  modalCategorySelectContainer.innerHTML = "";
  [...categoriesSet].sort().forEach(c => {
    const lbl = document.createElement("label");
    lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex";
    lbl.innerHTML = `
      <input type="checkbox" value="${c}" ${(movie.categories || []).includes(c) ? "checked" : ""} />
      <span class="text-sm">${categoryTexts[c] || c}</span>
    `;
    modalCategorySelectContainer.appendChild(lbl);
  });

  btnSaveMovie.onclick   = () => saveModalChanges();
  btnDeleteMovie.onclick = () => deleteMovieConfirm(editingId);
  mainModal.classList.remove("hidden");
}

/* ---------------- SAVE EDIT ---------------- */
async function saveModalChanges() {
  if (!editingId) return;
  const cats = Array.from(modalCategorySelectContainer.querySelectorAll("input[type=checkbox]:checked")).map(i => i.value);
  const newPosterUrl = modalPosterUrl ? modalPosterUrl.value.trim() : modalPoster.src || "";
  const newTitle = modalTitle.textContent.trim();
  const movieToUpdate = movies.find(m => m.id === editingId);
  const originalTitleToSave = currentLang === "en-US" ? newTitle : movieToUpdate.originalTitle || movieToUpdate.title;
  try {
    const ref = doc(db, "users", userId, "movies", editingId);
    await updateDoc(ref, {
      title: newTitle,
      description: modalSinopse.value.trim(),
      categories: cats,
      streamingUrl: modalStreaming.value || null,
      remember: rememberStreaming.checked,
      poster: newPosterUrl,
      originalTitle: originalTitleToSave,
      tmdbId: movieToUpdate.tmdbId || "",
      mediaType: movieToUpdate.mediaType || "movie",  // 📺 preserva tipo ao editar
      favorite: movieToUpdate.favorite || false
    });
    showToast("Alterações salvas!", "success");
    mainModal.classList.add("hidden");
    await loadMovies();
  } catch (e) {
    console.error(e);
    showToast("Erro ao salvar", "error");
  }
}

/* ---------------- DELETE MOVIE ---------------- */
async function deleteMovieConfirm(id) {
  if (!id) return;
  const confirmed = await showCustomConfirm("Confirmação de Exclusão", "Deseja realmente excluir esse filme?", "Excluir");
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "users", userId, "movies", id));
    showToast("Filme excluído", "success");
    mainModal.classList.add("hidden");
    await loadMovies();
  } catch (e) {
    console.error(e);
    showToast("Erro ao excluir", "error");
  }
}

/* ============================================================
              EDIÇÃO DO POSTER (MODAL PRINCIPAL)
============================================================ */
async function handleEditFetchPoster() {
  const title = modalTitle.textContent.trim();
  if (!title) return showToast("Erro: Título do modal está vazio", "warning");
  showToast("Buscando detalhes do filme e pôster...");
  const searchResults = await searchMoviesTMDb(title);
  if (!searchResults || searchResults.length === 0) return showToast("Nenhum filme encontrado na TMDb com esse título.", "warning");
  const movieId = searchResults[0].id;
  const movieDetails = await fetchMovieDetailsTMDb(movieId, currentLang);
  const posterUrl = movieDetails.poster_path ? `${TMDB_IMG_BASE_URL}${movieDetails.poster_path}` : "";
  if (movieDetails) {
    const apiTitle = movieDetails.title || movieDetails.original_title || "";
    tmpOriginalTitle = movieDetails.original_title || apiTitle;
    tmpTmdbId = String(movieId);
    modalTitle.textContent = apiTitle;
    modalSinopse.value = movieDetails.overview || "Sinopse não disponível.";
    modalPoster.src = posterUrl;
    if (modalPosterUrl) modalPosterUrl.value = posterUrl;
    const newCategories = movieDetails.genres ? movieDetails.genres.map(g => g.name) : [];
    newCategories.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions();
    const categoryTexts = textMap[currentLang];
    modalCategorySelectContainer.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
      const lbl = document.createElement("label");
      lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex";
      lbl.innerHTML = `<input type="checkbox" value="${c}" ${newCategories.includes(c) ? "checked" : ""} /><span class="text-sm">${categoryTexts[c] || c}</span>`;
      modalCategorySelectContainer.appendChild(lbl);
    });
    showToast("Filme preenchido!", "success");
  } else {
    showToast("Nenhum pôster ou detalhes encontrados para o título.", "warning");
  }
}

async function handleEditPosterUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = await fileToDataURL(file);
    modalPoster.src = data;
    if (modalPosterUrl) modalPosterUrl.value = data;
    showToast("Upload do pôster concluído!");
  } catch (err) {
    console.error("Erro no upload:", err);
    showToast("Erro ao carregar imagem", "error");
  }
}

function handleEditRemovePoster() {
  modalPoster.src = "";
  if (modalPosterUrl) modalPosterUrl.value = "";
  showToast("Pôster removido");
}

/* ---------------- GLOBAL EVENTS ---------------- */
function attachGlobalEvents() {
  const searchInput = document.querySelector("#searchInput");
  if (searchInput) searchInput.oninput = () => renderMovies();

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const playerModal = $("playerModal");
      if (playerModal && playerModal.style.display === "flex") { closePlayerModal(); return; }
      if (mainModal && !mainModal.classList.contains("hidden")) mainModal.classList.add("hidden");
      const addModal = $("addModal");
      if (addModal && !addModal.classList.contains("hidden")) addModal.classList.add("hidden");
      if (confirmDialog && !confirmDialog.classList.contains("hidden")) confirmDialog.classList.add("hidden");
    }
  });

  const toggleBtn = $("toggleSelectModeBtn");
  if (toggleBtn) toggleBtn.onclick = toggleMultiSelectMode;

  deleteSelectedBtn = document.createElement("button");
  deleteSelectedBtn.id = "deleteSelectedBtn";
  deleteSelectedBtn.textContent = textMap[currentLang].delete_selected + " (0)";
  deleteSelectedBtn.className = "fixed bottom-6 left-6 bg-red-700 text-white px-5 py-3 rounded-full shadow-xl hover:scale-105 hidden z-40";
  deleteSelectedBtn.onclick = deleteSelectedMoviesConfirm;
  document.body.appendChild(deleteSelectedBtn);

  if (modalPosterUrl) modalPosterUrl.oninput = (e) => { modalPoster.src = e.target.value; };
  const langBtn = $("toggleLanguageBtn");
  if (langBtn) langBtn.onclick = toggleLanguage;
  if (closeModalBtn) closeModalBtn.onclick = () => { mainModal.classList.add("hidden"); editingId = null; };
  if (mainModal) mainModal.onclick = (e) => { if (e.target === mainModal) { mainModal.classList.add("hidden"); editingId = null; } };

  if (btnGerarSinopse) {
    btnGerarSinopse.onclick = async () => {
      const title = modalTitle.textContent.trim();
      if (!title) return showToast("O título está vazio.", "warning");
      showToast("Buscando sinopse padrão (PT-BR)...");
      const searchResults = await searchMoviesTMDb(title, "pt-BR");
      if (!searchResults || searchResults.length === 0) return showToast("Filme não encontrado na API.", "error");
      const movieId = searchResults[0].id;
      const movieDetails = await fetchMovieDetailsTMDb(movieId, "pt-BR");
      if (movieDetails && movieDetails.overview) {
        modalSinopse.value = movieDetails.overview;
        modalSinopse.dataset.lang = "pt-BR";
        showToast("Sinopse padrão (PT-BR) carregada!", "success");
      } else {
        showToast("Sinopse padrão não encontrada.", "warning");
      }
    };
  }

  if (btnLimparSinopse) btnLimparSinopse.onclick = () => { modalSinopse.value = ""; showToast("Sinopse limpa"); };

  if (btnTranslateSinopse) {
    btnTranslateSinopse.onclick = async () => {
      if (!editingId) return;
      const currentSynopsisLang = modalSinopse.dataset.lang || "pt-BR";
      const targetLang = currentSynopsisLang === "pt-BR" ? "en-US" : "pt-BR";
      showToast(`Traduzindo para ${targetLang}...`);
      const currentTitle = $("modalTitle").textContent;
      let searchResults = await searchMoviesTMDb(currentTitle, targetLang);
      if (!searchResults || searchResults.length === 0) {
        searchResults = await searchMoviesTMDb(currentTitle, currentSynopsisLang);
        if (!searchResults || searchResults.length === 0) return showToast("Erro: Não foi possível encontrar o filme para traduzir.", "error");
      }
      const tmdb_id = searchResults[0].id;
      const movieDetails = await fetchMovieDetailsTMDb(tmdb_id, targetLang);
      if (movieDetails) {
        modalTitle.textContent = movieDetails.title;
        modalSinopse.value = movieDetails.overview || "Tradução da sinopse não encontrada.";
        modalSinopse.dataset.lang = targetLang;
        showToast(`Título e Sinopse atualizados para ${targetLang}!`, "success");
      } else {
        showToast("Tradução não encontrada.", "warning");
      }
    };
  }

  if (modalFetchPoster)  modalFetchPoster.onclick = handleEditFetchPoster;
  if (modalUploadBtn)    modalUploadBtn.onclick    = () => modalUploadInput.click();
  if (modalUploadInput)  modalUploadInput.onchange = handleEditPosterUpload;
  if (modalRemovePoster) modalRemovePoster.onclick  = handleEditRemovePoster;

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try { await signOut(auth); }
      catch (e) { console.error("Erro ao sair:", e); showToast("Erro ao tentar sair.", "error"); }
    };
  }
}

/* ============================================================
             MODAL DE CONFIRMAÇÃO CUSTOMIZADO
============================================================ */
function showCustomConfirm(title, message, okText = "Confirmar") {
  return new Promise(resolve => {
    if (!confirmDialog) return resolve(window.confirm(message));
    confirmTitle.textContent   = title;
    confirmMessage.textContent = message;
    confirmOKBtn.textContent   = okText;
    confirmDialog.classList.remove("hidden");
    const cleanup = (result) => {
      confirmDialog.classList.add("hidden");
      confirmOKBtn.onclick = null;
      confirmCancelBtn.onclick = null;
      resolve(result);
    };
    confirmOKBtn.onclick     = () => cleanup(true);
    confirmCancelBtn.onclick = () => cleanup(false);
  });
}

/* ============================================================
            LÓGICA DE EXCLUSÃO MÚLTIPLA
============================================================ */
function toggleMultiSelectMode() {
  multiSelectMode = !multiSelectMode;
  selectedMovies.clear();
  const texts = textMap[currentLang];
  const toggleBtn = $("toggleSelectModeBtn");
  if (multiSelectMode) {
    toggleBtn.textContent = texts.select_toggle_on;
    toggleBtn.className = "px-3 py-2 bg-red-600 text-white rounded flex-shrink-0";
    $("addMovieFab").classList.add("hidden");
    deleteSelectedBtn.classList.remove("hidden");
  } else {
    toggleBtn.textContent = texts.select_toggle_off;
    toggleBtn.className = "px-3 py-2 bg-neutral-700 text-white rounded flex-shrink-0";
    $("addMovieFab").classList.remove("hidden");
    deleteSelectedBtn.classList.add("hidden");
  }
  updateDeleteSelectedButton();
  renderMovies();
}

function updateDeleteSelectedButton() {
  const texts = textMap[currentLang];
  deleteSelectedBtn.textContent = `${texts.delete_selected} (${selectedMovies.size})`;
  deleteSelectedBtn.disabled = selectedMovies.size === 0;
}

async function deleteSelectedMoviesConfirm() {
  if (selectedMovies.size === 0) return showToast("Selecione pelo menos um filme.", "warning");
  const message = `Deseja realmente excluir ${selectedMovies.size} filme(s)?`;
  const confirmed = await showCustomConfirm("Confirmação de Exclusão", message, "Excluir");
  if (!confirmed) return;
  try {
    let deletedCount = 0;
    const promises = [];
    selectedMovies.forEach(movieId => {
      const ref = doc(db, "users", userId, "movies", movieId);
      promises.push(deleteDoc(ref).then(() => { deletedCount++; }));
    });
    await Promise.all(promises);
    showToast(`${deletedCount} filme(s) excluído(s) com sucesso!`, "success");
    toggleMultiSelectMode();
    await loadMovies();
  } catch (e) {
    console.error(e);
    showToast("Erro ao excluir filmes selecionados.", "error");
  }
}

/* ---------------- DEBUG ---------------- */
window.__movieApp = { getMovies: () => movies, reload: loadMovies };