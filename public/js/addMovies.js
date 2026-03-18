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
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let logoutBtn, movieGrid, mainModal, closeModalBtn, modalPoster, modalTitle;
let modalCategories, modalStreaming, rememberStreaming, modalSinopse;
let btnGerarSinopse, btnLimparSinopse, modalCategorySelectContainer;
let btnDeleteMovie, btnSaveMovie, modalFetchPoster, modalUploadBtn;
let modalUploadInput, modalRemovePoster, toastEl, btnTranslateSinopse;
let confirmDialog, confirmTitle, confirmMessage, confirmOKBtn, confirmCancelBtn, modalPosterUrl;

const TMDB_API_KEY     = "fc5a1abc31f9c3ba52d39c83b6892956";
const TMDB_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_LANGUAGE    = "pt-BR";
let genreMap = new Map();

const PLAYERS_MOVIE = [
  { name: "VidSrc.cc",  url: (id) => `https://vidsrc.cc/v2/embed/movie/${id}` },
  { name: "VidLink",    url: (id) => `https://vidlink.pro/movie/${id}?autoplay=false` },
  { name: "VidSrc.icu", url: (id) => `https://vidsrc.icu/embed/movie/${id}` },
  { name: "VidFast",    url: (id) => `https://vidfast.pro/movie/${id}?autoPlay=false` },
  { name: "VidSrc",     url: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { name: "MultiEmbed", url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
];
const PLAYERS_SERIES = [
  { name: "VidSrc.cc",  url: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { name: "VidLink",    url: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=false` },
  { name: "VidSrc.icu", url: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` },
  { name: "VidFast",    url: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=false` },
  { name: "VidSrc",     url: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { name: "MultiEmbed", url: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
];

let currentMediaType = "movie";
const $ = id => document.getElementById(id);

/* ---- TOAST ---- */
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

function safeText(s) { return (s || "").toString(); }
function escapeHtml(s) {
  return (s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/* ---- TMDB ---- */
async function searchMoviesTMDb(term, lang = TMDB_LANGUAGE) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`);
    const d = await r.json();
    return d?.results?.length ? d.results : [];
  } catch(e) { console.error(e); return []; }
}
async function searchTVTMDb(term, lang = TMDB_LANGUAGE) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`);
    const d = await r.json();
    return d?.results?.length ? d.results : [];
  } catch(e) { console.error(e); return []; }
}
async function fetchMovieDetailsTMDb(id, lang = TMDB_LANGUAGE) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=${lang}`);
    const d = await r.json();
    return d?.id ? d : null;
  } catch(e) { return null; }
}
async function fetchTVDetailsTMDb(id, lang = TMDB_LANGUAGE) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=${lang}`);
    const d = await r.json();
    return d?.id ? d : null;
  } catch(e) { return null; }
}

// 📺 Busca quantos episódios tem uma temporada específica
async function fetchTVSeasonDetails(tvId, season) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}`);
    const d = await r.json();
    return d?.episodes ? d : null;
  } catch(e) { return null; }
}

// 🇺🇸 Busca o título de lançamento nos EUA (para filmes de outros países)
async function fetchEnglishTitle(movieId, mediaType = "movie") {
  try {
    const endpoint = mediaType === "tv"
      ? `https://api.themoviedb.org/3/tv/${movieId}/alternative_titles?api_key=${TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/movie/${movieId}/alternative_titles?api_key=${TMDB_API_KEY}`;
    const r = await fetch(endpoint);
    const d = await r.json();
    const titles = mediaType === "tv" ? (d?.results || []) : (d?.titles || []);
    // Procura título US primeiro, depois GB
    const us = titles.find(t => t.iso_3166_1 === "US");
    const gb = titles.find(t => t.iso_3166_1 === "GB");
    return us?.title || gb?.title || null;
  } catch(e) { return null; }
}
async function loadGenresTMDb() {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}`);
    const d = await r.json();
    d?.genres?.forEach(g => genreMap.set(g.id, g.name));
  } catch(e) {}
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ---- STATE ---- */
let userId = null;
let movies = [];
let editingId = null;
let userPreferences = {};
// 🧹 categorias normalizadas para evitar duplicatas por case
let categoriesSet = new Set([
  "Ação","Terror","Comédia","Romance","Fantasia",
  "Thriller","Suspense","Drama","Ficção Científica"
]);
let tmpPosterDataUrl = "", tmpPosterUrl = "";
let multiSelectMode = false;
let selectedMovies = new Set();
let deleteSelectedBtn;
let currentSortBy = "date";
let activeCategoryFilters = new Set();
let currentLang = "pt-BR";
let tmpOriginalTitle = "", tmpTmdbId = "";
let currentPlayerIndex = 0;
let playingTmdbId = "", playingMovieId = "";
let playingSeason = 1, playingEpisode = 1;
let playingTotalSeasons = 0;
let playingTotalEpisodes = 0;
let showOnlyFavorites = false;
let addMediaType = "movie";
let unsubscribeMovies = null;

/* 🧹 Mapa de normalização — converte variações da TMDB para o nome canônico */
const GENRE_NORMALIZE_MAP = {
  // Português — variações → canônico
  "ação": "Ação", "accao": "Ação",
  "comedia": "Comédia", "comédia": "Comédia",
  "ficção científica": "Ficção Científica", "ficção-científica": "Ficção Científica",
  "ficcao cientifica": "Ficção Científica", "sci-fi": "Ficção Científica",
  "terror": "Terror", "horror": "Terror",
  "romance": "Romance",
  "fantasia": "Fantasia",
  "thriller": "Thriller",
  "suspense": "Suspense",
  "drama": "Drama",
  "animação": "Animação", "animacao": "Animação",
  "documentário": "Documentário", "documentario": "Documentário",
  "aventura": "Aventura",
  "crime": "Crime",
  "mistério": "Mistério", "misterio": "Mistério",
  "música": "Música", "musica": "Música",
  "faroeste": "Faroeste", "western": "Faroeste",
  "guerra": "Guerra",
  "história": "História", "historia": "História",
  "família": "Família", "familia": "Família",
  "comédia dramática": "Comédia Dramática",
  // Inglês (TMDB retorna em inglês em alguns casos)
  "action": "Ação",
  "comedy": "Comédia",
  "science fiction": "Ficção Científica",
  "fantasy": "Fantasia",
  "animation": "Animação",
  "documentary": "Documentário",
  "adventure": "Aventura",
  "mystery": "Mistério",
  "music": "Música",
  "history": "História",
  "family": "Família",
  "war": "Guerra",
};

function normalizeCategory(cat) {
  if (!cat) return "";
  const key = cat.trim().toLowerCase();
  // Se tiver no mapa de normalização, usa o canônico
  if (GENRE_NORMALIZE_MAP[key]) return GENRE_NORMALIZE_MAP[key];
  // Caso contrário capitaliza só a primeira letra (preserva acentos)
  const s = cat.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* 🚀 Debounce */
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const textMap = {
  "pt-BR": {
    brand:"Meus Filmes", select_toggle_off:"Selecionar", select_toggle_on:"✕ Seleção",
    delete_selected:"Excluir Selecionados", sort_by:"Ordenar por:", sort_date:"Mais Recentes",
    sort_title:"Título (A-Z)", logout:"Sair", read_more:"Leia mais",
    favorites_filter:"❤️ Favoritos", favorites_filter_active:"❤️ Favoritos",
    "Todos":"Todos",
    // Gêneros PT
    "Ação":"Ação","Terror":"Terror","Comédia":"Comédia","Romance":"Romance",
    "Fantasia":"Fantasia","Thriller":"Thriller","Suspense":"Suspense",
    "Drama":"Drama","Ficção Científica":"Ficção Científica",
    "Animação":"Animação","Documentário":"Documentário","Aventura":"Aventura",
    "Crime":"Crime","Mistério":"Mistério","Música":"Música","Faroeste":"Faroeste",
    "Guerra":"Guerra","História":"História","Família":"Família",
    "Comédia Dramática":"Comédia Dramática",
  },
  "en-US": {
    brand:"My Watchlist", select_toggle_off:"Select", select_toggle_on:"✕ Select",
    delete_selected:"Delete Selected", sort_by:"Sort by:", sort_date:"Most Recent",
    sort_title:"Title (A-Z)", logout:"Logout", read_more:"Read more",
    favorites_filter:"❤️ Favorites", favorites_filter_active:"❤️ Favorites",
    "Todos":"All",
    // Gêneros EN
    "Ação":"Action","Terror":"Horror","Comédia":"Comedy","Romance":"Romance",
    "Fantasia":"Fantasy","Thriller":"Thriller","Suspense":"Suspense",
    "Drama":"Drama","Ficção Científica":"Science Fiction",
    "Animação":"Animation","Documentário":"Documentary","Aventura":"Adventure",
    "Crime":"Crime","Mistério":"Mystery","Música":"Music","Faroeste":"Western",
    "Guerra":"War","História":"History","Família":"Family",
    "Comédia Dramática":"Dramedy",
  }
};

/* ---- AUTH ---- */
auth.onAuthStateChanged(async user => {
  if (!user) { window.location.href = "login.html"; return; }
  userId = user.uid;
  await initApp();
});

/* ---- INIT ---- */
async function initApp() {
  logoutBtn = $("logoutBtn"); movieGrid = $("movieGrid"); mainModal = $("modal");
  closeModalBtn = $("closeModal"); modalPoster = $("modalPoster"); modalTitle = $("modalTitle");
  modalCategories = $("modalCategories"); modalStreaming = $("modalStreaming");
  rememberStreaming = $("rememberStreaming"); modalSinopse = $("modalSinopse");
  btnGerarSinopse = $("btnGerarSinopse"); btnLimparSinopse = $("btnLimparSinopse");
  modalCategorySelectContainer = $("modalCategorySelect");
  btnDeleteMovie = $("btnDeleteMovie"); btnSaveMovie = $("btnSaveMovie");
  modalFetchPoster = $("modalFetchPoster"); modalUploadBtn = $("modalUploadBtn");
  modalUploadInput = $("modalUploadInput"); modalRemovePoster = $("modalRemovePoster");
  toastEl = $("toast"); btnTranslateSinopse = $("btnTranslateSinopse");
  modalPosterUrl = $("modalPosterUrl"); confirmDialog = $("confirmDialog");
  confirmTitle = $("confirmTitle"); confirmMessage = $("confirmMessage");
  confirmOKBtn = $("confirmOKBtn"); confirmCancelBtn = $("confirmCancelBtn");

  await loadGenresTMDb();
  await loadUserPreferences();
  buildAddMovieUI();
  createPlayerModal();
  startRealtimeSync();   // 🔄 inicia sync em tempo real (substitui loadMovies)
  applyLocalization();
  rebuildCategoryOptions();
  renderSortFilters();
  attachGlobalEvents();
}

async function loadUserPreferences() {
  if (!userId) return;
  const snap = await getDoc(doc(db, "users", userId, "preferences", "main"));
  userPreferences = snap.exists() ? snap.data() : { defaultStreaming: "", defaultCategories: [] };
}
async function saveUserPreferences() {
  if (!userId) return;
  try { await setDoc(doc(db, "users", userId, "preferences", "main"), userPreferences); }
  catch(e) { showToast("Erro ao salvar suas preferências", "error"); }
}

/* ============================================================
   🔄 SYNC EM TEMPO REAL (onSnapshot)
============================================================ */
function startRealtimeSync() {
  if (!userId) return;

  // Mostra skeletons na primeira carga
  showSkeletons(12);

  // Cancela listener anterior se existir
  if (unsubscribeMovies) unsubscribeMovies();

  const q = query(collection(db, "users", userId, "movies"));

  let firstLoad = true;
  unsubscribeMovies = onSnapshot(q, (snap) => {
    movies = [];
    snap.forEach(d => {
      const data = d.data();
      const cats = (data.categories || []).map(normalizeCategory).filter(Boolean);
      movies.push({ id: d.id, ...data, categories: cats });
      cats.forEach(c => categoriesSet.add(c));
    });
    debouncedRender();

    // 🔧 Roda a migração de títulos silenciosamente só na primeira carga
    if (firstLoad) {
      firstLoad = false;
      setTimeout(() => autoFixOriginalTitles(), 2000);
    }
  }, (err) => {
    console.error("Erro no sync:", err);
    showToast("Erro ao sincronizar filmes", "error");
  });
}

/* ---- loadMovies mantido para compatibilidade (usado em alguns saves) ---- */
async function loadMovies() {
  renderMovies();
  rebuildCategoryOptions();
}

/* 🚀 Versão debounced do renderMovies — evita renders em cascata */
const debouncedRender = debounce(() => {
  renderMovies();
  rebuildCategoryOptions();
}, 80);

/* ============================================================
   PLAYER
============================================================ */
function createPlayerModal() {
  if ($("playerModal")) return;
  const modal = document.createElement("div");
  modal.id = "playerModal";
  modal.style.cssText = `display:none;position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.92);z-index:99999;align-items:center;
    justify-content:center;flex-direction:column;`;
  modal.innerHTML = `
    <div style="position:relative;width:96%;max-width:1100px;border-radius:12px;
      overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,0.9);display:flex;flex-direction:column;">

      <!-- TOPO -->
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 16px;background:#0e0e14;border-bottom:0.5px solid rgba(167,139,250,0.12);flex-shrink:0;">
        <span id="playerTitle" style="color:#f0eeff;font-weight:800;font-size:15px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%;letter-spacing:-0.01em;"></span>
        <button id="playerCloseBtn" style="background:#dc2626;color:white;border:none;
          border-radius:8px;padding:5px 14px;cursor:pointer;font-size:13px;font-weight:700;">
          ✕ Fechar</button>
      </div>

      <!-- CORPO -->
      <div style="display:flex;flex:1;min-height:0;">

        <!-- ESQUERDA: vídeo + controles -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
          <div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;">
            <iframe id="playerIframe" style="width:100%;height:100%;border:none;display:block;"
              allowfullscreen allow="autoplay;encrypted-media;fullscreen;picture-in-picture"
              referrerpolicy="no-referrer"></iframe>
            <div id="playerSpinner" style="position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%);color:#aaa;font-size:14px;pointer-events:none;">
              Carregando player...</div>
          </div>

          <!-- Barra de episódio (séries) -->
          <div id="playerEpisodeRow" style="display:none;align-items:center;gap:8px;
            padding:8px 14px;background:#111;border-top:0.5px solid rgba(167,139,250,0.08);flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">T</span>
              <div style="display:flex;align-items:center;background:#1e1e2a;border:0.5px solid rgba(255,255,255,0.12);border-radius:20px;overflow:hidden;">
                <button onclick="window.__stepSeason(-1)" style="background:none;border:none;color:#666;width:24px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">‹</button>
                <span id="playerSeasonDisplay" style="color:#fff;font-size:12px;font-weight:700;min-width:16px;text-align:center;user-select:none;">1</span>
                <input id="playerSeasonInput" type="hidden" value="1"/>
                <button onclick="window.__stepSeason(1)" style="background:none;border:none;color:#666;width:24px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">›</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="color:#666;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">E</span>
              <div style="display:flex;align-items:center;background:#1e1e2a;border:0.5px solid rgba(255,255,255,0.12);border-radius:20px;overflow:hidden;">
                <button onclick="window.__stepEpisode(-1)" style="background:none;border:none;color:#666;width:24px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">‹</button>
                <span id="playerEpisodeDisplay" style="color:#fff;font-size:12px;font-weight:700;min-width:16px;text-align:center;user-select:none;">1</span>
                <input id="playerEpisodeInput" type="hidden" value="1"/>
                <button onclick="window.__stepEpisode(1)" style="background:none;border:none;color:#666;width:24px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">›</button>
              </div>
            </div>
            <span id="playerEpInfo" style="color:#555;font-size:10px;"></span>
            <button onclick="window.__loadEpisode()" style="padding:4px 14px;border-radius:20px;
              border:0.5px solid rgba(99,102,241,0.5);background:transparent;color:#c7d2fe;
              font-size:10px;font-weight:700;cursor:pointer;transition:all 0.15s;"
              onmouseover="this.style.background='rgba(79,70,229,0.8)';this.style.color='#fff'"
              onmouseout="this.style.background='transparent';this.style.color='#c7d2fe'">▶ IR</button>
            <!-- Próximo pill -->
            <button onclick="window.__nextEpisode()" id="playerNextBtn"
              style="display:flex;align-items:center;gap:7px;padding:4px 12px 4px 4px;
              border-radius:8px;background:rgba(0,0,0,0.5);border:0.5px solid rgba(255,255,255,0.1);
              color:#fff;cursor:pointer;margin-left:auto;transition:border-color 0.2s,background 0.2s;"
              onmouseover="this.style.borderColor='rgba(167,139,250,0.5)';this.style.background='rgba(20,16,40,0.9)'"
              onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(0,0,0,0.5)'">
              <div id="playerNextThumb" style="width:36px;height:22px;border-radius:4px;background:linear-gradient(160deg,#1a2e48,#0a1428);flex-shrink:0;"></div>
              <div style="text-align:left;">
                <div style="font-size:7px;color:rgba(255,255,255,0.3);margin-bottom:1px;">A seguir</div>
                <div id="playerNextLabel" style="font-size:10px;font-weight:700;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">—</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="opacity:0.35;margin-left:2px;"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
          </div>

          <!-- Barra servidores -->
          <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;
            background:#0e0e14;flex-wrap:wrap;border-top:0.5px solid rgba(167,139,250,0.08);">
            <span style="color:#555;font-size:11px;">Trocar servidor:</span>
            <div id="playerServerBtns" style="display:flex;gap:5px;flex-wrap:wrap;"></div>
            <span id="playerServerLabel" style="color:#444;font-size:11px;margin-left:auto;"></span>
          </div>
        </div>

        <!-- PAINEL LATERAL (só séries) -->
        <div id="playerSidePanel" style="display:none;width:220px;flex-shrink:0;
          background:#111;border-left:0.5px solid rgba(167,139,250,0.1);
          flex-direction:column;max-height:100%;">
          <div style="padding:10px 12px;border-bottom:0.5px solid rgba(167,139,250,0.08);">
            <div id="playerSideTitle" style="font-size:11px;font-weight:800;color:#f0eeff;
              margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
            <div id="playerSeasonTabs" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
          </div>
          <div id="playerEpList" style="flex:1;overflow-y:auto;padding:6px 8px;
            scrollbar-width:thin;scrollbar-color:rgba(167,139,250,0.2) transparent;"></div>
        </div>

      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) handleClosePlayer(); });
  modal.querySelector("#playerCloseBtn").addEventListener("click", handleClosePlayer);
}

/* ⚠️ Pergunta confirmação antes de fechar o player */
async function handleClosePlayer() {
  const confirmed = await showCustomConfirm(
    "Fechar player?",
    "Deseja fechar o player? O progresso será salvo automaticamente.",
    "Fechar"
  );
  if (confirmed) await closePlayerModal();
}

async function openPlayerModal(movie) {
  const modal = $("playerModal");
  if (!modal) return;
  let tmdbId = movie.tmdbId || "";
  if (!tmdbId) {
    const isTV = movie.mediaType === "tv";
    showToast(isTV ? "Buscando série na base de dados..." : "Buscando filme na base de dados...");
    const results = isTV ? await searchTVTMDb(movie.title) : await searchMoviesTMDb(movie.title);
    if (results?.length) tmdbId = String(results[0].id);
  }
  if (!tmdbId) { showToast("Não foi possível encontrar este filme para reproduzir.", "warning"); return; }

  playingTmdbId  = tmdbId;
  playingMovieId = movie.id || "";
  currentPlayerIndex = 0;
  currentMediaType = movie.mediaType || "movie";
  playingTotalSeasons  = 0;
  playingTotalEpisodes = 0;

  // 📺 Busca dados da série para limitar inputs
  if (currentMediaType === "tv") {
    fetchTVDetailsTMDb(tmdbId).then(async details => {
      if (details) {
        playingTotalSeasons = details.number_of_seasons || 0;
        // Busca episódios da temporada atual
        const seasonData = await fetchTVSeasonDetails(tmdbId, playingSeason);
        playingTotalEpisodes = seasonData?.episodes?.length || 0;
        updateEpisodeInfo();
      }
    });
  }

  let startSeason = 1, startEpisode = 1;
  if (currentMediaType === "tv" && movie.watchProgress?.season) {
    const { season, episode } = movie.watchProgress;
    const resume = await showCustomConfirm(
      "Continuar assistindo?",
      `Você parou na Temporada ${season}, Episódio ${episode}. Deseja continuar daqui?`,
      "Continuar"
    );
    if (resume) { startSeason = season; startEpisode = episode; }
  }

  playingSeason = startSeason;
  playingEpisode = startEpisode;

  // Mostra painel lateral e barra de episódios para séries
  const sidePanel = $("playerSidePanel");
  const epRow     = $("playerEpisodeRow");
  if (sidePanel) sidePanel.style.display = currentMediaType === "tv" ? "flex" : "none";
  if (epRow)     epRow.style.display     = currentMediaType === "tv" ? "flex" : "none";

  if (currentMediaType === "tv") {
    setSeasonValue(startSeason);
    setEpisodeValue(startEpisode);
    updateEpisodeInfo();
    buildSidePanel(tmdbId, movie.title || "");
  }

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
  playingSeason = s; playingEpisode = e;
  if (playingTmdbId) {
    loadPlayer(playingTmdbId, currentPlayerIndex);
    updateEpisodeInfo();
  }
};

// Helpers para sincronizar input hidden e span de display
function setSeasonValue(val) {
  const input = $("playerSeasonInput");
  const display = $("playerSeasonDisplay");
  if (input) input.value = val;
  if (display) display.textContent = val;
}
function setEpisodeValue(val) {
  const input = $("playerEpisodeInput");
  const display = $("playerEpisodeDisplay");
  if (input) input.value = val;
  if (display) display.textContent = val;
}

// ▶️ Avança/retrocede temporada com limites
window.__stepSeason = function(delta) {
  let val = (parseInt($("playerSeasonInput")?.value) || 1) + delta;
  val = Math.max(1, playingTotalSeasons > 0 ? Math.min(val, playingTotalSeasons) : val);
  setSeasonValue(val);
  // Ao trocar temporada, busca total de episódios da nova temporada
  fetchTVSeasonDetails(playingTmdbId, val).then(season => {
    playingTotalEpisodes = season?.episodes?.length || 0;
    setEpisodeValue(1); // reseta episódio para 1
    updateEpisodeInfo();
  });
};

// ▶️ Avança/retrocede episódio com limites
window.__stepEpisode = function(delta) {
  let val = (parseInt($("playerEpisodeInput")?.value) || 1) + delta;
  val = Math.max(1, playingTotalEpisodes > 0 ? Math.min(val, playingTotalEpisodes) : val);
  setEpisodeValue(val);
};

// ▶️ Próximo episódio — pula para T+1 E1 se for o último ep da temporada
window.__nextEpisode = async function() {
  let season  = parseInt($("playerSeasonInput")?.value)  || 1;
  let episode = parseInt($("playerEpisodeInput")?.value) || 1;

  if (playingTotalEpisodes > 0 && episode >= playingTotalEpisodes) {
    if (playingTotalSeasons > 0 && season >= playingTotalSeasons) {
      showToast("Você chegou ao fim da série! 🎉", "success");
      return;
    }
    season  = season + 1;
    episode = 1;
    const newSeason = await fetchTVSeasonDetails(playingTmdbId, season);
    playingTotalEpisodes = newSeason?.episodes?.length || 0;
    setSeasonValue(season);
    setEpisodeValue(episode);
    showToast(`Temporada ${season}, Episódio 1`, "info");
  } else {
    episode = episode + 1;
    setEpisodeValue(episode);
  }

  playingSeason  = season;
  playingEpisode = episode;
  loadPlayer(playingTmdbId, currentPlayerIndex);
  updateEpisodeInfo();
  updateEpOverlay();
};

// Atualiza o texto info e os limites
function updateEpisodeInfo() {
  const info = $("playerEpInfo");
  if (info) {
    const season = parseInt($("playerSeasonInput")?.value) || 1;
    const parts = [];
    if (playingTotalSeasons  > 0) parts.push(`${playingTotalSeasons} temp.`);
    if (playingTotalEpisodes > 0) parts.push(`T${season}: ${playingTotalEpisodes} ep.`);
    info.textContent = parts.length ? parts.join(" · ") : "";
  }
  updateNextLabel();
}

// Atualiza o label do próximo episódio no pill
async function updateNextLabel() {
  const nextLabel = $("playerNextLabel");
  if (!nextLabel || !playingTmdbId) return;
  const season  = parseInt($("playerSeasonInput")?.value)  || playingSeason;
  const episode = parseInt($("playerEpisodeInput")?.value) || playingEpisode;
  const nextEp  = episode < (playingTotalEpisodes || 999) ? episode + 1 : 1;
  const nextSea = episode < (playingTotalEpisodes || 999) ? season : season + 1;
  try {
    const data = await fetchTVSeasonDetails(playingTmdbId, nextSea);
    const ep   = data?.episodes?.find(e => e.episode_number === nextEp);
    nextLabel.textContent = ep ? `E${nextEp} · ${ep.name}` : `E${nextEp}`;
  } catch(e) {
    nextLabel.textContent = `E${nextEp}`;
  }
}

// Constrói o painel lateral com tabs de temporada e lista de episódios
async function buildSidePanel(tmdbId, seriesTitle) {
  const sideTitle  = $("playerSideTitle");
  const seasonTabs = $("playerSeasonTabs");
  const epList     = $("playerEpList");
  if (!sideTitle || !seasonTabs || !epList) return;

  sideTitle.textContent = seriesTitle;
  seasonTabs.innerHTML  = "";
  epList.innerHTML      = "<div style='color:#555;font-size:11px;padding:8px;'>Carregando...</div>";

  const details = await fetchTVDetailsTMDb(tmdbId);
  if (!details) { epList.innerHTML = ""; return; }

  const totalSeasons = details.number_of_seasons || 1;
  playingTotalSeasons = totalSeasons;

  // Cria tabs de temporada
  for (let s = 1; s <= totalSeasons; s++) {
    const tab = document.createElement("button");
    tab.textContent = `T${s}`;
    tab.dataset.season = s;
    tab.style.cssText = `font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;
      cursor:pointer;border:none;transition:all 0.15s;`;
    const isActive = s === (parseInt($("playerSeasonInput")?.value) || 1);
    tab.style.background = isActive ? "rgba(167,139,250,0.15)" : "transparent";
    tab.style.color      = isActive ? "#a78bfa" : "rgba(255,255,255,0.25)";
    tab.onclick = () => loadEpListForSeason(tmdbId, s);
    seasonTabs.appendChild(tab);
  }

  // Carrega episódios da temporada atual
  await loadEpListForSeason(tmdbId, parseInt($("playerSeasonInput")?.value) || 1);
}

async function loadEpListForSeason(tmdbId, season) {
  const epList     = $("playerEpList");
  const seasonTabs = $("playerSeasonTabs");
  if (!epList) return;

  // Atualiza tab ativa
  if (seasonTabs) {
    Array.from(seasonTabs.children).forEach(tab => {
      const isActive = parseInt(tab.dataset.season) === season;
      tab.style.background = isActive ? "rgba(167,139,250,0.15)" : "transparent";
      tab.style.color      = isActive ? "#a78bfa" : "rgba(255,255,255,0.25)";
    });
  }

  epList.innerHTML = "<div style='color:#555;font-size:11px;padding:8px;'>Carregando...</div>";
  const data = await fetchTVSeasonDetails(tmdbId, season);
  if (!data?.episodes) { epList.innerHTML = ""; return; }

  playingTotalEpisodes = data.episodes.length;
  updateEpisodeInfo();
  epList.innerHTML = "";

  const currentEp = parseInt($("playerEpisodeInput")?.value) || 1;
  const currentS  = parseInt($("playerSeasonInput")?.value)  || 1;

  data.episodes.forEach(ep => {
    const isActive = ep.episode_number === currentEp && season === currentS;
    const item = document.createElement("div");
    item.style.cssText = `display:flex;align-items:center;gap:8px;padding:7px 8px;
      border-radius:7px;cursor:pointer;transition:background 0.15s;margin-bottom:2px;
      ${isActive ? "background:rgba(167,139,250,0.1);border:0.5px solid rgba(167,139,250,0.25);" : ""}`;
    item.onmouseover = () => { if (!isActive) item.style.background = "rgba(255,255,255,0.04)"; };
    item.onmouseout  = () => { if (!isActive) item.style.background = ""; };
    item.innerHTML = `
      <span style="font-size:10px;font-weight:700;width:22px;flex-shrink:0;
        color:${isActive ? "#a78bfa" : "rgba(255,255,255,0.2)"};">E${ep.episode_number}</span>
      <span style="font-size:10px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        color:${isActive ? "#f0eeff" : "rgba(255,255,255,0.4)"};">${ep.name}</span>
      ${isActive ? `<span style="font-size:8px;padding:1px 6px;border-radius:5px;background:rgba(167,139,250,0.9);color:#1a1025;font-weight:700;flex-shrink:0;">▶</span>` : ""}`;
    item.onclick = () => {
      setSeasonValue(season);
      setEpisodeValue(ep.episode_number);
      playingSeason  = season;
      playingEpisode = ep.episode_number;
      loadPlayer(playingTmdbId, currentPlayerIndex);
      updateEpisodeInfo();
      loadEpListForSeason(tmdbId, season);
    };
    epList.appendChild(item);
  });

  // Scroll para o episódio ativo
  const activeEl = epList.querySelector(`[style*="rgba(167,139,250,0.1)"]`);
  if (activeEl) activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
}

// Função legada mantida — chama updateNextLabel
async function updateEpOverlay() { updateNextLabel(); }

async function closePlayerModal() {
  const modal = $("playerModal");
  if (!modal) return;
  const iframe = $("playerIframe");
  if (iframe) iframe.src = "about:blank";
  modal.style.display = "none";
  document.body.style.overflow = "";

  if (currentMediaType === "tv" && playingMovieId && userId) {
    const season  = parseInt($("playerSeasonInput")?.value)  || playingSeason;
    const episode = parseInt($("playerEpisodeInput")?.value) || playingEpisode;
    try {
      await updateDoc(doc(db, "users", userId, "movies", playingMovieId), { watchProgress: { season, episode } });
      const mv = movies.find(m => m.id === playingMovieId);
      if (mv) mv.watchProgress = { season, episode };
      renderMovies();
    } catch(e) { console.error("Erro ao salvar progresso:", e); }
  }

  playingTmdbId = ""; playingMovieId = "";
  currentPlayerIndex = 0; currentMediaType = "movie";
  playingSeason = 1; playingEpisode = 1;
  playingTotalSeasons = 0; playingTotalEpisodes = 0;

  const sidePanel = $("playerSidePanel");
  const epRow     = $("playerEpisodeRow");
  if (sidePanel) sidePanel.style.display = "none";
  if (epRow)     epRow.style.display     = "none";
}

function loadPlayer(tmdbId, index) {
  const iframe = $("playerIframe"), spinner = $("playerSpinner"), label = $("playerServerLabel");
  if (!iframe) return;
  currentPlayerIndex = index;
  const activeList = currentMediaType === "tv" ? PLAYERS_SERIES : PLAYERS_MOVIE;
  const player = activeList[index];
  if (spinner) spinner.style.display = "block";
  iframe.src = "about:blank";
  setTimeout(() => {
    iframe.src = currentMediaType === "tv"
      ? player.url(tmdbId, playingSeason || 1, playingEpisode || 1)
      : player.url(tmdbId);
    if (label) label.textContent = player.name;
    if (spinner) setTimeout(() => { spinner.style.display = "none"; }, 2000);
  }, 150);
  updateServerButtonsState(index);
}

function buildServerButtons(tmdbId) {
  // Usa container do overlay para séries, barra de filmes para filmes
  const containerId = currentMediaType === "tv" ? "playerServerBtns" : "playerServerBtnsMovie";
  const container = $(containerId);
  // Limpa ambos
  const c1 = $("playerServerBtns"), c2 = $("playerServerBtnsMovie");
  if (c1) c1.innerHTML = "";
  if (c2) c2.innerHTML = "";
  if (!container) return;
  const activeList = currentMediaType === "tv" ? PLAYERS_SERIES : PLAYERS_MOVIE;
  activeList.forEach((player, index) => {
    const btn = document.createElement("button");
    btn.textContent = player.name;
    btn.style.cssText = `padding:3px 10px;border-radius:20px;border:0.5px solid rgba(255,255,255,0.1);
      cursor:pointer;font-size:9px;font-weight:700;transition:all 0.15s;
      background:rgba(30,30,42,0.85);color:rgba(255,255,255,0.4);backdrop-filter:blur(4px);`;
    btn.onclick = () => loadPlayer(tmdbId, index);
    container.appendChild(btn);
  });
  updateServerButtonsState(0);
}

function updateServerButtonsState(activeIndex) {
  const containerId = currentMediaType === "tv" ? "playerServerBtns" : "playerServerBtnsMovie";
  const container = $(containerId);
  if (!container) return;
  Array.from(container.children).forEach((btn, i) => {
    if (i === activeIndex) {
      btn.style.background = "rgba(79,70,229,0.85)";
      btn.style.color = "#fff";
      btn.style.borderColor = "transparent";
    } else {
      btn.style.background = "rgba(30,30,42,0.85)";
      btn.style.color = "rgba(255,255,255,0.4)";
      btn.style.borderColor = "rgba(255,255,255,0.1)";
    }
  });
}

/* ============================================================
   ❤️ FAVORITOS
============================================================ */
async function toggleFavorite(movieId, currentFav) {
  if (!userId || !movieId) return;
  const newFav = !currentFav;
  const movie = movies.find(m => m.id === movieId);
  if (movie) movie.favorite = newFav;
  try {
    await updateDoc(doc(db, "users", userId, "movies", movieId), { favorite: newFav });
  } catch(e) {
    if (movie) movie.favorite = currentFav;
    showToast("Erro ao atualizar favorito", "error");
  }
  renderMovies();
}

function createFavoriteBtn(movie) {
  const btn = document.createElement("button");
  btn.className = "fav-btn";
  btn.innerHTML = movie.favorite ? "❤️" : "🤍";
  btn.dataset.movieId = movie.id;
  btn.onclick = async (e) => {
    e.stopPropagation();
    btn.disabled = true;
    await toggleFavorite(movie.id, movie.favorite || false);
    btn.disabled = false;
  };
  return btn;
}

/* ============================================================
   MODAL DE ADIÇÃO
============================================================ */
function buildAddMovieUI() {
  if (!$("addMovieFab")) {
    const fab = document.createElement("button");
    fab.id = "addMovieFab";
    fab.textContent = "+ Adicionar";
    fab.className = "fixed bottom-6 right-6 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-xl hover:scale-105";
    fab.onclick = () => openAddModal();
    document.body.appendChild(fab);
  }
  if ($("addModal")) return;

  const modal = document.createElement("div");
  modal.id = "addModal";
  modal.className = "hidden fixed inset-0 z-60 flex items-center justify-center modal-overlay p-4";
  modal.innerHTML = `
    <div class="bg-neutral-800 w-full max-w-2xl rounded-xl p-4 md:p-6 relative max-h-[95vh] h-full overflow-y-auto flex flex-col overscroll-contain">
      <button id="closeAddModal" class="absolute top-4 right-4 text-gray-300 hover:text-white">✕</button>
      <h3 id="addModalTitle" class="text-2xl font-bold mb-4 flex-shrink-0">Adicionar filme</h3>
      <div class="flex gap-2 mb-4 flex-shrink-0">
        <button id="addTypeMovie" type="button" class="px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white">🎬 Filme</button>
        <button id="addTypeSeries" type="button" class="px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300">📺 Série</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
        <div class="relative">
          <label class="block mb-1">Título</label>
          <input id="addTitle" class="w-full rounded p-2 bg-neutral-700" autocomplete="off" />
          <div id="addTitleSuggestions" class="absolute z-10 w-full bg-neutral-800 border border-neutral-600 rounded-b-md shadow-lg max-h-48 overflow-y-auto hidden"></div>
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
          <img id="addPosterPreview" class="w-full h-44 object-cover rounded mt-3 bg-neutral-700" style="display:none" />
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
    </div>`;
  document.body.appendChild(modal);

  $("closeAddModal").onclick = () => modal.classList.add("hidden");
  $("cancelAddBtn").onclick  = () => modal.classList.add("hidden");
  $("addFetchPoster").onclick = handleFetchPoster;
  $("addUploadBtn").onclick   = () => $("addUploadInput").click();
  $("addUploadInput").onchange = handlePosterUpload;
  $("addRemovePoster").onclick = () => resetPosterPreview("");

  const btnTypeMovie  = $("addTypeMovie");
  const btnTypeSeries = $("addTypeSeries");
  const addModalTitle = $("addModalTitle");

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
  $("addClearSynopsis").onclick = () => { $("addSynopsis").value = ""; showToast("Sinopse limpa"); };
  $("addCategoryBtnLocal").onclick = () => {
    const v = normalizeCategory($("addNewCategory").value);
    if (!v) return showToast("Digite um nome para categoria");
    categoriesSet.add(v);
    $("addNewCategory").value = "";
    rebuildCategoryOptions();
    showToast("Categoria criada!");
  };
  $("confirmAddBtn").onclick = () => handleAddConfirm();

  let typingTimer;
  const addTitleInput = $("addTitle");
  const addTitleSuggestions = $("addTitleSuggestions");

  addTitleInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    if (addTitleInput.value.length < 3) { addTitleSuggestions.classList.add("hidden"); return; }
    typingTimer = setTimeout(async () => {
      const term = addTitleInput.value.trim();
      if (term.length >= 3) {
        const suggestions = addMediaType === "tv" ? await searchTVTMDb(term) : await searchMoviesTMDb(term);
        renderSuggestions(suggestions);
      }
    }, 500);
  });
  addTitleInput.addEventListener("blur",  () => { setTimeout(() => addTitleSuggestions.classList.add("hidden"), 150); });
  addTitleInput.addEventListener("focus", () => {
    if (addTitleSuggestions.innerHTML.trim() !== "" && addTitleInput.value.length >= 3)
      addTitleSuggestions.classList.remove("hidden");
  });

  async function renderSuggestions(suggestions) {
    addTitleSuggestions.innerHTML = "";
    if (!suggestions.length) { addTitleSuggestions.classList.add("hidden"); return; }
    addTitleSuggestions.classList.remove("hidden");
    suggestions.slice(0, 5).forEach(item => {
      const div = document.createElement("div");
      div.className = "px-4 py-2 cursor-pointer hover:bg-neutral-700 flex items-center";
      div.onmousedown = (e) => { e.preventDefault(); selectSuggestedItem(item.id); };
      const posterPath = item.poster_path ? `${TMDB_IMG_BASE_URL}${item.poster_path}` : "https://via.placeholder.com/50x75?text=NP";
      const displayName = item.title || item.name || "";
      const dateField = item.release_date || item.first_air_date || "";
      const releaseYear = dateField ? `(${dateField.split("-")[0]})` : "";
      div.innerHTML = `<img src="${posterPath}" class="w-8 h-12 object-cover mr-3 rounded" /><span>${escapeHtml(displayName)} ${releaseYear}</span>`;
      addTitleSuggestions.appendChild(div);
    });
  }

  async function selectSuggestedItem(itemId) {
    const isTV = addMediaType === "tv";
    showToast(isTV ? "Carregando detalhes da série..." : "Carregando detalhes do filme...");
    const details = isTV ? await fetchTVDetailsTMDb(itemId) : await fetchMovieDetailsTMDb(itemId);
    addTitleSuggestions.classList.add("hidden");
    if (details) {
      tmpTmdbId = String(details.id);
      const displayTitle = details.title || details.name || "";
      // 🇺🇸 Busca título EN (US) para filmes não anglófonos (ex: Oldboy → "Oldboy" não "올드보이")
      const enTitle = await fetchEnglishTitle(details.id, isTV ? "tv" : "movie");
      tmpOriginalTitle = enTitle || details.title || details.name || displayTitle;
      $("addTitle").value    = displayTitle;
      $("addSynopsis").value = details.overview || "Sinopse não disponível.";
      const posterUrl = details.poster_path ? `${TMDB_IMG_BASE_URL}${details.poster_path}` : "";
      $("addPosterUrl").value = posterUrl;
      resetPosterPreview(posterUrl);
      const newCats = (details.genres || []).map(g => normalizeCategory(g.name));
      newCats.forEach(c => categoriesSet.add(c));
      rebuildCategoryOptions();
      const addSel = $("addCategories");
      if (addSel) Array.from(addSel.options).forEach(o => { o.selected = newCats.includes(o.value); });
      showToast(isTV ? "Série preenchida automaticamente!" : "Filme preenchido automaticamente!", "success");
    } else {
      showToast("Não foi possível carregar os detalhes.", "warning");
    }
  }
}

/* ---- POSTER ACTIONS ---- */
async function handleFetchPoster() {
  const title = $("addTitle").value.trim();
  if (!title) return showToast("Digite o título primeiro");
  const isTV = addMediaType === "tv";
  showToast(isTV ? "Buscando detalhes da série..." : "Buscando detalhes do filme...");
  const results = isTV ? await searchTVTMDb(title) : await searchMoviesTMDb(title);
  if (!results?.length) return showToast(isTV ? "Nenhuma série encontrada." : "Nenhum filme encontrado.", "warning");
  const itemId = results[0].id;
  tmpTmdbId = String(itemId);
  const details = isTV ? await fetchTVDetailsTMDb(itemId) : await fetchMovieDetailsTMDb(itemId);
  if (details) {
    const displayTitle = details.title || details.name || "";
    const enTitle = await fetchEnglishTitle(itemId, isTV ? "tv" : "movie");
    tmpOriginalTitle = enTitle || details.title || details.name || displayTitle;
    $("addTitle").value = displayTitle;
    const posterUrl = details.poster_path ? `${TMDB_IMG_BASE_URL}${details.poster_path}` : "";
    resetPosterPreview(posterUrl);
    $("addSynopsis").value = details.overview || "Sinopse não disponível.";
    const newCats = (details.genres || []).map(g => normalizeCategory(g.name));
    newCats.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions();
    const addSel = $("addCategories");
    if (addSel) Array.from(addSel.options).forEach(o => { o.selected = newCats.includes(o.value); });
    showToast(isTV ? "Série preenchida!" : "Filme preenchido!", "success");
  } else {
    showToast("Nenhum detalhe encontrado.", "warning");
  }
}

async function handlePosterUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const data = await fileToDataURL(file);
  tmpPosterDataUrl = data; tmpPosterUrl = "";
  const prev = $("addPosterPreview");
  if (prev) { prev.src = data; prev.style.display = "block"; }
  const url = $("addPosterUrl");
  if (url) url.value = "";
}

function resetPosterPreview(posterUrl = "") {
  tmpPosterDataUrl = ""; tmpPosterUrl = posterUrl;
  const prev = $("addPosterPreview");
  if (prev) { prev.src = posterUrl; prev.style.display = posterUrl ? "block" : "none"; }
  const url = $("addPosterUrl");
  if (url) url.value = posterUrl;
}

/* ---- LOCALIZATION ---- */
function applyLocalization() {
  const texts = textMap[currentLang];
  const brand = $("brand"); if (brand) brand.textContent = texts.brand;
  const lb = $("logoutBtn"); if (lb) lb.textContent = texts.logout;
  const tb = $("toggleSelectModeBtn");
  if (tb) tb.textContent = multiSelectMode ? texts.select_toggle_on : texts.select_toggle_off;
  if (deleteSelectedBtn) updateDeleteSelectedButton();
  rebuildCategoryOptions(); renderSortFilters(); renderMovies();
}
function toggleLanguage() {
  currentLang = currentLang === "pt-BR" ? "en-US" : "pt-BR";
  activeCategoryFilters.clear(); currentSortBy = "date"; applyLocalization();
}

/* ---- CATEGORY OPTIONS ---- */
function rebuildCategoryOptions() {
  const texts = textMap[currentLang];
  const addSel = $("addCategories");
  if (addSel) {
    addSel.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = texts[c] || c;
      addSel.appendChild(opt);
    });
  }
  const fc = $("categoryFilters");
  if (!fc) return;
  fc.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = texts.Todos;
  allBtn.className = (!activeCategoryFilters.size && !showOnlyFavorites) ? "filter-btn-active" : "filter-btn";
  allBtn.onclick = () => { activeCategoryFilters.clear(); showOnlyFavorites = false; rebuildCategoryOptions(); renderMovies(); };
  fc.appendChild(allBtn);

  const favBtn = document.createElement("button");
  favBtn.textContent = texts.favorites_filter;
  favBtn.className = showOnlyFavorites ? "filter-btn-active fav-filter-btn" : "filter-btn fav-filter-btn";
  favBtn.onclick = () => { showOnlyFavorites = !showOnlyFavorites; if (showOnlyFavorites) activeCategoryFilters.clear(); rebuildCategoryOptions(); renderMovies(); };
  fc.appendChild(favBtn);

  [...categoriesSet].sort().forEach(category => {
    const btn = document.createElement("button");
    btn.textContent = texts[category] || category;
    btn.className = activeCategoryFilters.has(category) ? "filter-btn-active" : "filter-btn";
    btn.onclick = () => setCategoryFilter(category);
    fc.appendChild(btn);
  });
}

function setCategoryFilter(category) {
  showOnlyFavorites = false;
  if (activeCategoryFilters.has(category)) activeCategoryFilters.delete(category);
  else activeCategoryFilters.add(category);
  rebuildCategoryOptions(); renderMovies();
}

/* ---- SORT ---- */
function renderSortFilters() {
  const texts = textMap[currentLang];
  const db2 = $("sortByDateBtn"), tb = $("sortByTitleBtn");
  if (db2) { db2.textContent = texts.sort_date; db2.className = currentSortBy === "date" ? "filter-btn-active" : "filter-btn"; db2.onclick = () => setSortBy("date"); }
  if (tb)  { tb.textContent  = texts.sort_title; tb.className = currentSortBy === "title" ? "filter-btn-active" : "filter-btn"; tb.onclick = () => setSortBy("title"); }
}
function setSortBy(s) { if (currentSortBy === s) return; currentSortBy = s; renderSortFilters(); renderMovies(); }

/* ---- OPEN ADD MODAL ---- */
async function openAddModal() {
  const at = $("addTitle");
  if (!at) return;
  at.value = ""; $("addSynopsis").value = ""; $("addPosterUrl").value = "";
  resetPosterPreview(); tmpTmdbId = ""; tmpOriginalTitle = "";
  addMediaType = "movie";
  const m2 = $("addTypeMovie"), s2 = $("addTypeSeries"), t2 = $("addModalTitle");
  if (m2) m2.className = "px-4 py-2 rounded font-semibold text-sm bg-indigo-600 text-white";
  if (s2) s2.className = "px-4 py-2 rounded font-semibold text-sm bg-neutral-700 text-neutral-300";
  if (t2) t2.textContent = "Adicionar filme";
  $("addStreaming").value = userPreferences.defaultStreaming || "";
  $("addRemember").checked = !!(userPreferences.defaultStreaming);
  const defaultCats = userPreferences.defaultCategories || [];
  const addSel = $("addCategories");
  if (addSel) Array.from(addSel.options).forEach(o => { o.selected = defaultCats.includes(o.value); });
  $("addModal").classList.remove("hidden");
}

async function handleAddConfirm() {
  if (!userId) return;
  const title = safeText($("addTitle").value).trim();
  if (!title) return showToast("Digite o título", "warning");
  const synopsis = safeText($("addSynopsis").value).trim();
  const addSel = $("addCategories");
  // 🧹 Normaliza categorias ao salvar
  const categories = addSel ? Array.from(addSel.selectedOptions).map(o => normalizeCategory(o.value)) : [];
  categories.forEach(c => categoriesSet.add(c));
  const streamingUrlVal = safeText($("addStreaming").value).trim() || null;
  const remember = $("addRemember").checked;
  const poster = tmpPosterDataUrl || $("addPosterUrl").value.trim() || tmpPosterUrl || "";
  const payload = {
    title, description: synopsis, categories,
    streamingUrl: streamingUrlVal, remember, poster,
    createdAt: Date.now(), originalTitle: tmpOriginalTitle || title,
    tmdbId: tmpTmdbId || "", mediaType: addMediaType || "movie", favorite: false
  };
  try {
    await addDoc(collection(db, "users", userId, "movies"), payload);
    showToast("Adicionado!", "success");
    $("addModal").classList.add("hidden");
    if (remember) { userPreferences.defaultStreaming = streamingUrlVal; userPreferences.defaultCategories = categories; }
    else { userPreferences.defaultStreaming = ""; userPreferences.defaultCategories = []; }
    await saveUserPreferences();
    // onSnapshot atualiza automaticamente — não precisa de loadMovies()
  } catch(e) { console.error(e); showToast("Erro ao salvar filme", "error"); }
}

/* ---- SKELETON ---- */
function createSkeletonCard() {
  const card = document.createElement("div");
  card.className = "skeleton-card";
  card.innerHTML = `<div class="skeleton-shimmer skeleton-poster"></div>
    <div class="skeleton-footer"><div class="skeleton-shimmer skeleton-title"></div>
    <div class="skeleton-shimmer skeleton-subtitle"></div></div>`;
  return card;
}
function showSkeletons(count = 12) {
  if (!movieGrid) return;
  movieGrid.innerHTML = "";
  for (let i = 0; i < count; i++) movieGrid.appendChild(createSkeletonCard());
}

/* ---- RENDER CARDS ---- */
/* Cria um card novo do zero e registra seus eventos */
function createMovieCard(m, texts) {
  const card = document.createElement("div");
  card.className = "poster-card relative";
  card.dataset.movieId = m.id;

  const isSelected = selectedMovies.has(m.id);
  const desc = (m.description || "").substring(0, 120);
  const displayTitle = escapeHtml(currentLang === "en-US" && m.originalTitle ? m.originalTitle : m.title);

  const progressBadge = (m.mediaType === "tv" && m.watchProgress?.season)
    ? `<div class="progress-badge" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.82);
        color:#fff;font-size:0.7rem;font-weight:700;padding:3px 7px;border-radius:5px;
        border:1px solid rgba(255,255,255,0.15);pointer-events:none;letter-spacing:0.03em;">
        T${m.watchProgress.season} E${m.watchProgress.episode}</div>` : "";

  if (multiSelectMode) {
    card.innerHTML += `<input type="checkbox" id="select-${m.id}"
      class="absolute top-2 right-2 w-5 h-5 z-20 cursor-pointer checked:accent-red-600"
      ${isSelected ? "checked" : ""} />`;
    if (isSelected) card.classList.add("ring-4", "ring-red-600");
  }

  card.innerHTML += `
    <div class="poster-link" style="position:relative;cursor:pointer;display:block;" title="▶ Assistir agora">
      <img src="${m.poster}" class="poster-image" alt="${escapeHtml(m.title)}" loading="lazy" decoding="async" onerror="this.style.opacity='.3'" />
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:52px;height:52px;background:rgba(0,0,0,0.65);border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        opacity:0;transition:opacity 0.2s;pointer-events:none;" class="play-overlay">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
      ${progressBadge}
    </div>
    <div class="poster-info">
      <div><div class="poster-title">${displayTitle}</div>
        <div class="poster-description">${escapeHtml(desc)}</div></div>
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
    </div>`;

  card.querySelector(".fav-btn-inline").onclick = async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.disabled = true;
    await toggleFavorite(m.id, m.favorite || false);
    btn.disabled = false;
  };

  const posterDiv = card.querySelector(".poster-link");
  const playOverlay = card.querySelector(".play-overlay");
  if (posterDiv && playOverlay) {
    posterDiv.addEventListener("mouseenter", () => { playOverlay.style.opacity = "1"; });
    posterDiv.addEventListener("mouseleave", () => { playOverlay.style.opacity = "0"; });
  }

  card.onclick = (e) => {
    if (e.target.closest(".actions-menu") || e.target.closest(".actions-dropdown")) return;
    if (e.target.closest(".fav-btn-inline")) return;
    if (multiSelectMode) {
      if (e.target.type === "checkbox") return;
      if (selectedMovies.has(m.id)) selectedMovies.delete(m.id);
      else selectedMovies.add(m.id);
      updateDeleteSelectedButton(); renderMovies();
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
      updateDeleteSelectedButton(); renderMovies();
    };
  }

  const menuBtn  = card.querySelector(".actions-menu-btn");
  const dropdown = card.querySelector(".actions-dropdown");
  menuBtn.onclick = (e) => {
    if (!multiSelectMode) {
      e.stopPropagation();
      document.querySelectorAll(".actions-dropdown.show").forEach(mn => { if (mn !== dropdown) mn.classList.remove("show"); });
      dropdown.classList.toggle("show");
    }
  };
  card.querySelector(".edit-btn").onclick      = () => { if (!multiSelectMode) { dropdown.classList.remove("show"); openMainModal(m, true); } };
  card.querySelector(".delete-btn").onclick    = () => { if (!multiSelectMode) { dropdown.classList.remove("show"); deleteMovieConfirm(m.id); } };
  card.querySelector(".read-more-btn").onclick = () => { if (!multiSelectMode) openMainModal(m, false); };

  return card;
}

function patchMovieCard(card, m, texts) {
  // Título — atualiza sempre (muda com idioma)
  const titleEl = card.querySelector(".poster-title");
  if (titleEl) {
    const displayTitle = escapeHtml(currentLang === "en-US" && m.originalTitle ? m.originalTitle : m.title);
    titleEl.innerHTML = displayTitle;
  }

  // Botão "Leia mais" — atualiza texto com idioma
  const readMoreBtn = card.querySelector(".read-more-btn");
  if (readMoreBtn) readMoreBtn.textContent = texts.read_more;

  // Favorito
  const favBtn = card.querySelector(".fav-btn-inline");
  if (favBtn) favBtn.textContent = m.favorite ? "❤️" : "🤍";

  // Badge de progresso
  const existingBadge = card.querySelector(".progress-badge");
  if (m.mediaType === "tv" && m.watchProgress?.season) {
    const badgeText = `T${m.watchProgress.season} E${m.watchProgress.episode}`;
    if (existingBadge) {
      existingBadge.textContent = badgeText;
    } else {
      const posterLink = card.querySelector(".poster-link");
      if (posterLink) {
        const badge = document.createElement("div");
        badge.className = "progress-badge";
        badge.style.cssText = "position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.82);color:#fff;font-size:0.7rem;font-weight:700;padding:3px 7px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);pointer-events:none;letter-spacing:0.03em;";
        badge.textContent = badgeText;
        posterLink.appendChild(badge);
      }
    }
  } else if (existingBadge) {
    existingBadge.remove();
  }

  // Seleção (multiselect)
  const checkbox = card.querySelector(`#select-${m.id}`);
  const isSelected = selectedMovies.has(m.id);
  if (checkbox) checkbox.checked = isSelected;
  if (isSelected) card.classList.add("ring-4", "ring-red-600");
  else card.classList.remove("ring-4", "ring-red-600");
}

function renderMovies() {
  const texts = textMap[currentLang];
  if (!movieGrid) return;

  const term = (document.querySelector("#searchInput")?.value || "").toLowerCase();

  let sorted = [...movies];
  if (currentSortBy === "title") {
    sorted.sort((a, b) => ((currentLang === "en-US" ? a.originalTitle : a.title) || "").toLowerCase()
      .localeCompare(((currentLang === "en-US" ? b.originalTitle : b.title) || "").toLowerCase()));
  } else {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }

  const filtered = sorted.filter(m => {
    const titleMatch = (m.title || "").toLowerCase().includes(term);
    const descMatch  = (m.description || "").toLowerCase().includes(term);
    const catMatch   = !activeCategoryFilters.size || (m.categories || []).some(cat => activeCategoryFilters.has(cat));
    const favMatch   = !showOnlyFavorites || m.favorite === true;
    return (titleMatch || descMatch) && catMatch && favMatch;
  });

  // Caso vazio — limpa e mostra mensagem
  if (!filtered.length) {
    movieGrid.innerHTML = `<div class="col-span-full text-center text-neutral-400 py-8">Nenhum filme encontrado.</div>`;
    return;
  }

  // Remove mensagem de "vazio" se existir antes do diffing
  const emptyMsg = movieGrid.querySelector(".col-span-full");
  if (emptyMsg) emptyMsg.remove();

  // 🚀 DOM DIFFING — só mexe no que mudou
  const filteredIds = filtered.map(m => m.id);

  // Remove cards que não estão mais na lista filtrada
  Array.from(movieGrid.querySelectorAll(".poster-card")).forEach(card => {
    if (!filteredIds.includes(card.dataset.movieId)) card.remove();
  });

  // Adiciona/reordena cards
  filtered.forEach((m, index) => {
    const existingCard = movieGrid.querySelector(`.poster-card[data-movie-id="${m.id}"]`);

    if (existingCard) {
      // Card já existe — só atualiza partes dinâmicas
      patchMovieCard(existingCard, m, texts);

      // Reordena se necessário (compara posição atual com a esperada)
      const currentCards = Array.from(movieGrid.querySelectorAll(".poster-card"));
      if (currentCards.indexOf(existingCard) !== index) {
        movieGrid.insertBefore(existingCard, currentCards[index] || null);
      }
    } else {
      // Card novo — cria do zero e insere na posição correta
      const newCard = createMovieCard(m, texts);
      const currentCards = Array.from(movieGrid.querySelectorAll(".poster-card"));
      movieGrid.insertBefore(newCard, currentCards[index] || null);
    }
  });

  // Registra listener global de fechar dropdown (uma vez só)
  if (!movieGrid._clickListenerAdded) {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".actions-menu"))
        document.querySelectorAll(".actions-dropdown.show").forEach(mn => mn.classList.remove("show"));
    });
    movieGrid._clickListenerAdded = true;
  }
}

/* ---- MAIN MODAL ---- */
function openMainModal(movie, editable = false) {
  if (multiSelectMode) return;
  editingId = movie.id;
  const mc = $("modalContent");
  const ee = mc.querySelectorAll(".edit-element");
  const ef = mc.querySelectorAll(".edit-element-flex");
  if (editable) {
    mc.classList.remove("modal-view-mode");
    modalSinopse.readOnly = false;
    ee.forEach(el => (el.style.display = "block"));
    ef.forEach(el => (el.style.display = "flex"));
    $("modalCategories").style.display = "none";
  } else {
    mc.classList.add("modal-view-mode");
    modalSinopse.readOnly = true;
    ee.forEach(el => (el.style.display = "none"));
    ef.forEach(el => (el.style.display = "none"));
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
  const ct = textMap[currentLang];
  (movie.categories || []).forEach(c => {
    const x = document.createElement("span");
    x.className = "px-2 py-1 bg-neutral-700 rounded text-sm mr-2";
    x.textContent = ct[c] || c;
    modalCategories.appendChild(x);
  });
  modalCategorySelectContainer.innerHTML = "";
  [...categoriesSet].sort().forEach(c => {
    const lbl = document.createElement("label");
    lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex";
    lbl.innerHTML = `<input type="checkbox" value="${c}" ${(movie.categories||[]).includes(c)?"checked":""} /><span class="text-sm">${ct[c]||c}</span>`;
    modalCategorySelectContainer.appendChild(lbl);
  });
  btnSaveMovie.onclick   = () => saveModalChanges();
  btnDeleteMovie.onclick = () => deleteMovieConfirm(editingId);
  mainModal.classList.remove("hidden");
}

async function saveModalChanges() {
  if (!editingId) return;
  const cats = Array.from(modalCategorySelectContainer.querySelectorAll("input[type=checkbox]:checked"))
    .map(i => normalizeCategory(i.value)); // 🧹 normaliza ao salvar
  const newPosterUrl = modalPosterUrl ? modalPosterUrl.value.trim() : modalPoster.src || "";
  const newTitle = modalTitle.textContent.trim();
  const mv = movies.find(m => m.id === editingId);
  const origTitle = currentLang === "en-US" ? newTitle : mv.originalTitle || mv.title;
  try {
    await updateDoc(doc(db, "users", userId, "movies", editingId), {
      title: newTitle, description: modalSinopse.value.trim(),
      categories: cats, streamingUrl: modalStreaming.value || null,
      remember: rememberStreaming.checked, poster: newPosterUrl,
      originalTitle: origTitle, tmdbId: mv.tmdbId || "",
      mediaType: mv.mediaType || "movie", favorite: mv.favorite || false
    });
    showToast("Alterações salvas!", "success");
    mainModal.classList.add("hidden");
    // onSnapshot atualiza automaticamente
  } catch(e) { console.error(e); showToast("Erro ao salvar", "error"); }
}

async function deleteMovieConfirm(id) {
  if (!id) return;
  const confirmed = await showCustomConfirm("Confirmação de Exclusão", "Deseja realmente excluir esse filme?", "Excluir");
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "users", userId, "movies", id));
    showToast("Filme excluído", "success");
    mainModal.classList.add("hidden");
  } catch(e) { console.error(e); showToast("Erro ao excluir", "error"); }
}

/* ---- EDIT POSTER ---- */
async function handleEditFetchPoster() {
  const title = modalTitle.textContent.trim();
  if (!title) return showToast("Título vazio", "warning");
  showToast("Buscando...");
  const results = await searchMoviesTMDb(title);
  if (!results?.length) return showToast("Nenhum filme encontrado.", "warning");
  const movieId = results[0].id;
  const details = await fetchMovieDetailsTMDb(movieId, currentLang);
  if (details) {
    const apiTitle = details.title || details.original_title || "";
    const enTitle = await fetchEnglishTitle(movieId, "movie");
    tmpOriginalTitle = enTitle || details.title || apiTitle;
    tmpTmdbId = String(movieId);
    modalTitle.textContent = apiTitle;
    modalSinopse.value = details.overview || "";
    const posterUrl = details.poster_path ? `${TMDB_IMG_BASE_URL}${details.poster_path}` : "";
    modalPoster.src = posterUrl;
    if (modalPosterUrl) modalPosterUrl.value = posterUrl;
    const newCats = (details.genres || []).map(g => normalizeCategory(g.name));
    newCats.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions();
    const ct = textMap[currentLang];
    modalCategorySelectContainer.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
      const lbl = document.createElement("label");
      lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex";
      lbl.innerHTML = `<input type="checkbox" value="${c}" ${newCats.includes(c)?"checked":""}/><span class="text-sm">${ct[c]||c}</span>`;
      modalCategorySelectContainer.appendChild(lbl);
    });
    showToast("Filme preenchido!", "success");
  } else { showToast("Nenhum detalhe encontrado.", "warning"); }
}
async function handleEditPosterUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = await fileToDataURL(file);
    modalPoster.src = data;
    if (modalPosterUrl) modalPosterUrl.value = data;
    showToast("Upload concluído!");
  } catch(err) { showToast("Erro ao carregar imagem", "error"); }
}
function handleEditRemovePoster() {
  modalPoster.src = "";
  if (modalPosterUrl) modalPosterUrl.value = "";
  showToast("Pôster removido");
}

/* ---- GLOBAL EVENTS ---- */
function attachGlobalEvents() {
  const si = document.querySelector("#searchInput");
  if (si) si.oninput = debounce(() => renderMovies(), 120);

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const pm = $("playerModal");
      if (pm && pm.style.display === "flex") { handleClosePlayer(); return; }
      if (mainModal && !mainModal.classList.contains("hidden")) mainModal.classList.add("hidden");
      const am = $("addModal");
      if (am && !am.classList.contains("hidden")) am.classList.add("hidden");
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
      showToast("Buscando sinopse...");
      const results = await searchMoviesTMDb(title, "pt-BR");
      if (!results?.length) return showToast("Filme não encontrado.", "error");
      const details = await fetchMovieDetailsTMDb(results[0].id, "pt-BR");
      if (details?.overview) { modalSinopse.value = details.overview; modalSinopse.dataset.lang = "pt-BR"; showToast("Sinopse carregada!", "success"); }
      else showToast("Sinopse não encontrada.", "warning");
    };
  }
  if (btnLimparSinopse) btnLimparSinopse.onclick = () => { modalSinopse.value = ""; showToast("Sinopse limpa"); };

  if (btnTranslateSinopse) {
    btnTranslateSinopse.onclick = async () => {
      if (!editingId) return;
      const srcLang = modalSinopse.dataset.lang || "pt-BR";
      const tgtLang = srcLang === "pt-BR" ? "en-US" : "pt-BR";
      showToast(`Traduzindo para ${tgtLang}...`);
      const currentT = $("modalTitle").textContent;
      let results = await searchMoviesTMDb(currentT, tgtLang);
      if (!results?.length) results = await searchMoviesTMDb(currentT, srcLang);
      if (!results?.length) return showToast("Não foi possível traduzir.", "error");
      const details = await fetchMovieDetailsTMDb(results[0].id, tgtLang);
      if (details) {
        modalTitle.textContent = details.title;
        modalSinopse.value = details.overview || "Tradução não encontrada.";
        modalSinopse.dataset.lang = tgtLang;
        showToast(`Atualizado para ${tgtLang}!`, "success");
      } else showToast("Tradução não encontrada.", "warning");
    };
  }

  if (modalFetchPoster)  modalFetchPoster.onclick  = handleEditFetchPoster;
  if (modalUploadBtn)    modalUploadBtn.onclick     = () => modalUploadInput.click();
  if (modalUploadInput)  modalUploadInput.onchange  = handleEditPosterUpload;
  if (modalRemovePoster) modalRemovePoster.onclick   = handleEditRemovePoster;

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try { await signOut(auth); }
      catch(e) { showToast("Erro ao tentar sair.", "error"); }
    };
  }
}

/* ---- CUSTOM CONFIRM ---- */
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

/* ---- MULTI SELECT ---- */
function toggleMultiSelectMode() {
  multiSelectMode = !multiSelectMode;
  selectedMovies.clear();
  const texts = textMap[currentLang];
  const tb = $("toggleSelectModeBtn");
  const lb = $("logoutBtn");
  if (multiSelectMode) {
    tb.textContent = texts.select_toggle_on;
    tb.className = "px-2 py-1 md:px-3 md:py-2 bg-red-600 text-white rounded flex-shrink-0 text-xs md:text-sm";
    // Botão Sair fica cinza e desabilitado para não confundir com saída da seleção
    if (lb) {
      lb.className = "px-2 py-1 md:px-3 md:py-2 bg-neutral-600 text-neutral-400 rounded flex-shrink-0 text-xs md:text-sm cursor-not-allowed";
      lb.disabled = true;
      lb.title = "Saia do modo seleção primeiro";
    }
    $("addMovieFab").classList.add("hidden");
    deleteSelectedBtn.classList.remove("hidden");
  } else {
    tb.textContent = texts.select_toggle_off;
    tb.className = "px-2 py-1 md:px-3 md:py-2 bg-neutral-700 text-white rounded flex-shrink-0 text-xs md:text-sm";
    // Restaura botão Sair
    if (lb) {
      lb.className = "px-2 py-1 md:px-3 md:py-2 bg-red-600 rounded flex-shrink-0 text-xs md:text-sm";
      lb.disabled = false;
      lb.title = "";
    }
    $("addMovieFab").classList.remove("hidden");
    deleteSelectedBtn.classList.add("hidden");
  }
  updateDeleteSelectedButton(); renderMovies();
}
function updateDeleteSelectedButton() {
  const texts = textMap[currentLang];
  deleteSelectedBtn.textContent = `${texts.delete_selected} (${selectedMovies.size})`;
  deleteSelectedBtn.disabled = selectedMovies.size === 0;
}
async function deleteSelectedMoviesConfirm() {
  if (!selectedMovies.size) return showToast("Selecione pelo menos um filme.", "warning");
  const confirmed = await showCustomConfirm("Confirmação de Exclusão", `Deseja realmente excluir ${selectedMovies.size} filme(s)?`, "Excluir");
  if (!confirmed) return;
  try {
    await Promise.all([...selectedMovies].map(id => deleteDoc(doc(db, "users", userId, "movies", id))));
    showToast(`${selectedMovies.size} filme(s) excluído(s)!`, "success");
    toggleMultiSelectMode();
  } catch(e) { showToast("Erro ao excluir filmes.", "error"); }
}

/* ---- DEBUG ---- */
window.__movieApp = { getMovies: () => movies, reload: loadMovies };

/* ============================================================
   🔧 MIGRAÇÃO AUTOMÁTICA — corrige originalTitle em background
   Roda silenciosamente uma vez por sessão após carregar os filmes
============================================================ */
async function autoFixOriginalTitles() {
  if (!userId) return;

  // Filmes que têm tmdbId mas o originalTitle parece ser do idioma de origem
  // (não é inglês nem português — contém caracteres não-latinos)
  const needsFix = movies.filter(m => {
    if (!m.tmdbId || !m.originalTitle) return false;
    // Se o originalTitle tem caracteres não-latinos (coreano, japonês, árabe, etc.)
    // ou se é idêntico ao título PT (nunca foi buscado o EN)
    const hasNonLatin = /[^\u0000-\u024F]/.test(m.originalTitle);
    const sameAsPT = m.originalTitle === m.title;
    return hasNonLatin || sameAsPT;
  });

  if (!needsFix.length) return;

  console.log(`🔧 Auto-corrigindo títulos EN de ${needsFix.length} filmes...`);

  for (const m of needsFix) {
    try {
      const enTitle = await fetchEnglishTitle(m.tmdbId, m.mediaType || "movie");
      if (!enTitle || enTitle === m.originalTitle) continue;

      await updateDoc(doc(db, "users", userId, "movies", m.id), {
        originalTitle: enTitle
      });
      // Atualiza localmente também
      m.originalTitle = enTitle;
      console.log(`✅ ${m.title} → "${enTitle}"`);

      await new Promise(r => setTimeout(r, 250));
    } catch(e) {
      console.error(`❌ ${m.title}:`, e);
    }
  }
}