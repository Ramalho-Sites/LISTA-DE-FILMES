// public/js/addMovies.js
/* eslint-disable no-unused-vars */

import { auth, db } from "./firebase-config.js";
// [MUDANÇA 1] Importar o 'signOut' para fazer o logout
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// [CORREÇÃO FINAL] Declaramos as variáveis aqui, mas sem valor.
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

// ==================================================
// 💎 CONFIGURAÇÕES DA NOVA API (TMDb) 💎
// ==================================================
// [MUDANÇA] Nova Chave de API
const TMDB_API_KEY = "fc5a1abc31f9c3ba52d39c83b6892956"; 
const TMDB_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500"; // Base para pôsteres
const TMDB_LANGUAGE = "pt-BR"; // BUSCAR EM PORTUGUÊS!
let genreMap = new Map();
// ==================================================


/* ------------------------- HELPERS ------------------------- */
// A função $ helper pode ficar aqui
const $ = id => document.getElementById(id);

function showToast(msg, type = "info") {
  // Inicializa o toastEl na primeira vez que for usado
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

// [MELHORIA 5] Nova função: Busca por termos (lista de filmes) NA TMDb
async function searchMoviesTMDb(term, lang = TMDB_LANGUAGE) {
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(term)}&language=${lang}&page=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data?.results && data.results.length > 0) return data.results; // Retorna uma array de filmes
    return [];
  } catch (e) {
    console.error("Erro ao buscar sugestões:", e);
    return [];
  }
}

// [MELHORIA 5] Nova função: Busca detalhes de um filme específico NA TMDb
async function fetchMovieDetailsTMDb(movieId, lang = TMDB_LANGUAGE) { // <-- Aceita 'lang'
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

// [MELHORIA 5] Nova função: Carrega a lista de gêneros da TMDb
async function loadGenresTMDb() {
    try {
        const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data?.genres) {
            data.genres.forEach(genre => {
                genreMap.set(genre.id, genre.name); // Mapeia ID -> Nome (ex: 28 -> "Ação")
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
let activeCategoryFilter = "";
let userPreferences = {};
let categoriesSet = new Set([
  "Ação", "Terror", "Comédia", "Romance", "Fantasia",
  "Thriller", "Suspense", "Drama", "Ficção Científica"
]);
let tmpPosterDataUrl = "";
let tmpPosterUrl = "";

/* ------------------------- AUTH ------------------------- */
// Este é o PONTO DE ENTRADA. Fica no topo.
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  userId = user.uid;
  // Agora podemos inicializar o app, pois o HTML já carregou e o usuário existe.
  await initApp();
});

/* ------------------------- INITIALIZATION ------------------------- */

async function initApp() {
  
  // [CORREÇÃO FINAL] Atribuímos os elementos do DOM AQUI!
  // Agora é 100% seguro, pois o HTML já carregou.
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
  toastEl = $("toast"); // Garante que o toast seja pego
  btnTranslateSinopse = $("btnTranslateSinopse"); 
  
  // O resto da inicialização...
  await loadGenresTMDb(); // Carrega os nomes dos gêneros
  await loadUserPreferences();
  buildAddMovieUI(); // Agora vai funcionar
  await loadMovies();
  rebuildCategoryOptions(); // Agora vai funcionar
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
      CRIA BOTÃO E MODAL DE ADIÇÃO (FIQUEM TRANQUILO)
============================================================ */

function buildAddMovieUI() {
  // FAB BUTTON
  if (!$("addMovieFab")) {
    const fab = document.createElement("button");
    fab.id = "addMovieFab";
    fab.textContent = "+ Adicionar";
    fab.className =
      "fixed bottom-6 right-6 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-xl hover:scale-105";
    fab.onclick = () => openAddModal();
    document.body.appendChild(fab);
  }

  // MODAL DE ADIÇÃO
  if (!$("addModal")) {
    // CÓDIGO MODIFICADO (addMovies.js)
    const modal = document.createElement("div");
    modal.id = "addModal";
    modal.className =
      "hidden fixed inset-0 z-60 flex items-center justify-center modal-overlay p-4";

    modal.innerHTML = `
      <div class="bg-neutral-800 w-full max-w-2xl rounded-xl p-4 md:p-6 relative max-h-[95vh] h-full overflow-y-auto flex flex-col overscroll-contain">
        <button id="closeAddModal" class="absolute top-4 right-4 text-gray-300 hover:text-white">✕</button>
        <h3 class="text-2xl font-bold mb-4 flex-shrink-0">Adicionar filme</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">

          <div class="relative"> <label class="block mb-1">Título</label>
            <input id="addTitle" class="w-full rounded p-2 bg-neutral-700" autocomplete="off" />
          
            <div id="addTitleSuggestions"
                class="absolute z-10 w-full bg-neutral-800 border border-neutral-600 rounded-b-md shadow-lg max-h-48 overflow-y-auto hidden">
            </div>
            
            <label class="block mt-3 mb-1">Sinopse</label>
            <textarea id="addSynopsis" class="w-full rounded p-2 bg-neutral-700 min-h-28"></textarea>
            
            <div class="flex gap-2 mt-2">
              <button id="addGenerateSynopsis" class="px-3 py-1 bg-indigo-600 rounded">Gerar</button>
              <button id="addClearSynopsis" class="px-3 py-1 bg-neutral-700 rounded">Limpar</button>
            </div>
          </div>

          <div>
            <label class="block mb-1">Pôster (URL)</label>
            <input id="addPosterUrl" class="w-full rounded p-2 bg-neutral-700" placeholder="https://..." />

            <div class="flex gap-2 mt-2">
              <button id="addFetchPoster" class="px-3 py-1 bg-indigo-600 rounded">Buscar da API</button>
              <button id="addUploadBtn" class="px-3 py-1 bg-neutral-700 rounded">Upload</button>
              <input id="addUploadInput" type="file" accept="image/*" class="hidden" />
              <button id="addRemovePoster" class="px-3 py-1 bg-red-600 rounded">Remover</button>
            </div>

            <img id="addPosterPreview"
              class="w-full h-44 object-cover rounded mt-3 bg-neutral-700"
              style="display:none" />

            <label class="block mt-3 mb-1">Categorias</label>
            <select id="addCategories" multiple class="w-full rounded p-2 bg-neutral-700"></select>

            <div class="flex gap-2 mt-2">
              <input id="addNewCategory" class="rounded p-2 bg-neutral-700 w-full" placeholder="Nova categoria" />
              <button id="addCategoryBtnLocal" class="px-3 py-1 bg-green-600 rounded">Criar</button>
            </div>

            <label class="block mt-3 mb-1">URL streaming</label>
            <input id="addStreaming" class="w-full rounded p-2 bg-neutral-700" />

            <div class="flex items-center gap-2 mt-2">
              <input id="addRemember" type="checkbox" />
              <label class="text-sm">Lembrar preferências</label>
            </div>

          </div>
        </div>

        <div class="flex justify-between mt-6 flex-shrink-0">
          <button id="cancelAddBtn" class="px-4 py-2 bg-neutral-700 rounded">Cancelar</button>
          <button id="confirmAddBtn" class="px-4 py-2 bg-green-600 rounded">Salvar filme</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // EVENTOS
    $("closeAddModal").onclick = () => modal.classList.add("hidden");
    $("cancelAddBtn").onclick = () => modal.classList.add("hidden");

    $("addFetchPoster").onclick = handleFetchPoster; // AGORA USA TMDb
    $("addUploadBtn").onclick = () => $("addUploadInput").click();
    $("addUploadInput").onchange = handlePosterUpload;

    $("addRemovePoster").onclick = () => resetPosterPreview(""); // Limpa o poster

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

    // [MELHORIA 5] Lógica de Autocompletar com TMDb
    let typingTimer;
    const doneTypingInterval = 500; // 0.5 segundos
    const addTitleInput = $("addTitle");
    const addTitleSuggestions = $("addTitleSuggestions");

    addTitleInput.addEventListener("input", () => {
      clearTimeout(typingTimer);
      if (addTitleInput.value.length < 3) { // Começa a sugerir após 3 caracteres
        addTitleSuggestions.classList.add("hidden");
        return;
      }
      typingTimer = setTimeout(async () => {
        const term = addTitleInput.value.trim();
        if (term.length >= 3) {
          const suggestions = await searchMoviesTMDb(term);
          renderSuggestions(suggestions);
        } else {
          addTitleSuggestions.classList.add("hidden");
        }
      }, doneTypingInterval);
    });

    addTitleInput.addEventListener("blur", () => {
      // Esconde as sugestões após um pequeno atraso para permitir cliques
      setTimeout(() => addTitleSuggestions.classList.add("hidden"), 150);
    });
    addTitleInput.addEventListener("focus", () => {
      if (addTitleSuggestions.innerHTML.trim() !== "" && addTitleInput.value.length >= 3) {
        addTitleSuggestions.classList.remove("hidden");
      }
    });

    async function renderSuggestions(suggestions) {
      addTitleSuggestions.innerHTML = "";
      if (suggestions.length === 0) {
        addTitleSuggestions.classList.add("hidden");
        return;
      }
      addTitleSuggestions.classList.remove("hidden");
      suggestions.slice(0, 5).forEach(movie => { // Mostra só as 5 primeiras
        const div = document.createElement("div");
        div.className = "px-4 py-2 cursor-pointer hover:bg-neutral-700 flex items-center";
        // Previne o 'blur' do input antes do 'click'
        div.onmousedown = (e) => {
          e.preventDefault(); 
          selectSuggestedMovie(movie.id); // USA O ID DA TMDb
        }
        
        const posterPath = movie.poster_path ? `${TMDB_IMG_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/50x75?text=NP';
        const releaseYear = movie.release_date ? `(${movie.release_date.split('-')[0]})` : '';

        div.innerHTML = `
          <img src="${posterPath}"
               class="w-8 h-12 object-cover mr-3 rounded" />
          <span>${escapeHtml(movie.title)} ${releaseYear}</span>
        `;
        addTitleSuggestions.appendChild(div);
      });
    }

    async function selectSuggestedMovie(movieId) {
      showToast("Carregando detalhes do filme...");
      const movieDetails = await fetchMovieDetailsTMDb(movieId);
      addTitleSuggestions.classList.add("hidden"); // Esconde as sugestões

      if (movieDetails) {
        $("addTitle").value = movieDetails.title_pt_BR || movieDetails.title || "";
        $("addSynopsis").value = movieDetails.overview || "Sinopse não disponível.";
        
        const posterUrl = movieDetails.poster_path ? `${TMDB_IMG_BASE_URL}${movieDetails.poster_path}` : '';
        $("addPosterUrl").value = posterUrl;
        resetPosterPreview(posterUrl); // Usa a função adaptada

        // Preencher categorias automaticamente
        const newCategories = movieDetails.genres ? movieDetails.genres.map(g => g.name) : [];
        newCategories.forEach(c => categoriesSet.add(c));
        rebuildCategoryOptions(); // Atualiza as opções do select

        // Seleciona as categorias no dropdown
        const addSel = $("addCategories");
        if (addSel) {
            Array.from(addSel.options).forEach(option => {
            option.selected = newCategories.includes(option.value);
            });
        }

        showToast("Filme preenchido automaticamente!", "success");
      } else {
        showToast("Não foi possível carregar os detalhes do filme.", "warning");
      }
    }
  }
  // Fora do 'if (!$("addModal"))'
  // Garante que as categorias sejam construídas mesmo se o modal já existir
  const addSel = $("addCategories");
  if (!addSel) { // Se o modal não foi construído, constrói as categorias
      rebuildCategoryOptions();
  }
}

/* ---------------- POSTER ACTIONS ---------------- */

// [MELHORIA 5] Função 'handleFetchPoster' MODIFICADA para TMDb
async function handleFetchPoster() {
  const title = $("addTitle").value.trim();
  if (!title) return showToast("Digite o título primeiro");

  showToast("Buscando detalhes do filme e pôster...");

  // Busca por termo para achar o ID
  const searchResults = await searchMoviesTMDb(title);
  if (!searchResults || searchResults.length === 0) {
    return showToast("Nenhum filme encontrado na TMDb com esse título.", "warning");
  }

  // Pega o ID do primeiro resultado (o mais relevante)
  const movieId = searchResults[0].id;
  const movieDetails = await fetchMovieDetailsTMDb(movieId);

  if (movieDetails) {
    // Preenche o título com o nome oficial (em PT-BR, se houver)
    $("addTitle").value = movieDetails.title_pt_BR || movieDetails.title || "";
      
    const posterUrl = movieDetails.poster_path ? `${TMDB_IMG_BASE_URL}${movieDetails.poster_path}` : '';
    resetPosterPreview(posterUrl); // Usa a função adaptada

    $("addSynopsis").value = movieDetails.overview || "Sinopse não disponível.";

    const newCategories = movieDetails.genres ? movieDetails.genres.map(g => g.name) : [];
    newCategories.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions(); 

    const addSel = $("addCategories");
    if (addSel) {
        Array.from(addSel.options).forEach(option => {
        option.selected = newCategories.includes(option.value);
        });
    }

    showToast("Filme preenchido!", "success");

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
  if(addPosterPreview) {
    addPosterPreview.src = data;
    addPosterPreview.style.display = "block";
  }
  
  const addPosterUrl = $("addPosterUrl");
  if(addPosterUrl) {
    addPosterUrl.value = "";
  }
}

// [Passo 3] Função 'resetPosterPreview' ADAPTADA
function resetPosterPreview(posterUrl = "") {
  tmpPosterDataUrl = "";
  tmpPosterUrl = posterUrl;
  
  const addPosterPreview = $("addPosterPreview");
  if(addPosterPreview) {
    addPosterPreview.src = posterUrl;
    addPosterPreview.style.display = posterUrl ? "block" : "none";
  }
  
  const addPosterUrl = $("addPosterUrl");
  if(addPosterUrl) {
    addPosterUrl.value = posterUrl;
  }
}

/* ---------------- CATEGORY OPTIONS ---------------- */

function rebuildCategoryOptions() {
  const addSel = $("addCategories");
  if (addSel) {
    addSel.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      addSel.appendChild(opt);
    });
  }

  const filterContainer = $("categoryFilters");
  if (!filterContainer) return;

  filterContainer.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "Todos";
  allBtn.className = activeCategoryFilter === "" ? "filter-btn-active" : "filter-btn";
  allBtn.onclick = () => setCategoryFilter("");
  filterContainer.appendChild(allBtn);

  [...categoriesSet].sort().forEach(category => {
    const btn = document.createElement("button");
    btn.textContent = category;
    btn.className = activeCategoryFilter === category ? "filter-btn-active" : "filter-btn";
    btn.onclick = () => setCategoryFilter(category);
    filterContainer.appendChild(btn);
  });
}

function setCategoryFilter(category) {
  activeCategoryFilter = category;
  rebuildCategoryOptions();
  renderMovies();
}

/* ============================================================
                ADICIONAR FILME
============================================================ */

async function openAddModal() {
  // Garante que os elementos do modal existem antes de usá-los
  const addTitle = $("addTitle");
  if (!addTitle) {
      console.error("Modal de adição não está pronto!");
      return;
  }
  
  addTitle.value = "";
  $("addSynopsis").value = "";
  $("addPosterUrl").value = "";
  resetPosterPreview(); // Limpa o poster ao abrir
  // $("addRating").value = ""; // <--- REMOVIDO
  
  $("addStreaming").value = userPreferences.defaultStreaming || "";
  $("addRemember").checked = !!(userPreferences.defaultStreaming);
  const defaultCats = userPreferences.defaultCategories || [];
  
  // Garante que 'addCategories' existe antes de iterar
  const addSel = $("addCategories");
  if (addSel) {
    Array.from(addSel.options).forEach(o => {
      o.selected = defaultCats.includes(o.value);
    });
  }
  
  const addModal = $("addModal");
  if (addModal) addModal.classList.remove("hidden");
} 

async function handleAddConfirm() {
  if (!userId) return;

  const title = safeText($("addTitle").value).trim();
  if (!title) return showToast("Digite o título", "warning");

  const synopsis = safeText($("addSynopsis").value).trim();
  const addSel = $("addCategories");
  const categories = addSel ? Array.from(addSel.selectedOptions).map(
    o => o.value
  ) : [];

  categories.forEach(c => categoriesSet.add(c));

  // [REMOVIDO]
  // const rating = ...

  const streamingUrlVal = safeText($("addStreaming").value).trim() || null;
  const remember = $("addRemember").checked;

  const poster =
    tmpPosterDataUrl ||
    $("addPosterUrl").value.trim() ||
    tmpPosterUrl ||
    "";

  const payload = {
    title,
    description: synopsis,
    categories,
    // rating, // <--- REMOVIDO
    streamingUrl: streamingUrlVal,
    remember,
    poster,
    createdAt: Date.now()
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

/* ---------------- LOAD MOVIES ---------------- */

async function loadMovies() {
  if (!userId) return;

  if (movieGrid) {
    movieGrid.innerHTML =
      `<div class="col-span-full text-center text-neutral-400 py-8">Carregando…</div>`;
  } else {
      console.error("movieGrid não foi encontrado!");
      return; 
  }

  try {
    const q = query(
      collection(db, "users", userId, "movies"),
      orderBy("createdAt", "desc")
    );

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
  }
}

/* ---------------- RENDER CARDS ---------------- */

// [CORREÇÃO] Esta é a função 'renderMovies' COMPLETA E CORRIGIDA
function renderMovies() {

  if (!movieGrid) return; 

  movieGrid.innerHTML = "";

  const term = (document.querySelector("#searchInput")?.value || "").toLowerCase();
  const filtro = activeCategoryFilter;

  const filtered = movies.filter(m => {
    const titleMatch = (m.title || "").toLowerCase().includes(term);
    const descMatch = (m.description || "").toLowerCase().includes(term);
    const catMatch = !filtro || (m.categories || []).includes(filtro);
    return (titleMatch || descMatch) && catMatch;
  });

  if (!filtered.length) {
    movieGrid.innerHTML = `
      <div class="col-span-full text-center text-neutral-400 py-8">
        Nenhum filme encontrado.
      </div>`;
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement("div");
    card.className = "poster-card";

    const desc = (m.description || "").substring(0, 120);

    // [MELHORIA 5] NOVO HTML DO CARD (Com link no poster)
    
    // Verifica se a URL de streaming existe e é válida
    const hasStreamingUrl = m.streamingUrl && (m.streamingUrl.startsWith('http://') || m.streamingUrl.startsWith('https://'));
    const posterImgHtml = `<img src="${m.poster}" class="poster-image" alt="${escapeHtml(m.title)}" onerror="this.style.opacity='.3'" />`;

    card.innerHTML = `
      ${hasStreamingUrl 
        ? `<a href="${m.streamingUrl}" target="_blank" rel="noopener noreferrer" class="poster-link">${posterImgHtml}</a>` 
        : posterImgHtml
      }

      <div class="poster-info">
        <div>
          <div class="poster-title">${escapeHtml(m.title)}</div>
          <div class="poster-description">${escapeHtml(desc)}</div>
        </div>

        <div class="mt-3 flex justify-between items-center">
          <button class="read-more-btn">Leia mais</button>
          
          <div class="actions-menu">
            <button class="actions-menu-btn">...</button>
            <div class="actions-dropdown">
              <button class="edit-btn">Editar</button>
              <button class="delete-btn">Excluir</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // [MELHORIA 4 & 5] NOVOS EVENTOS DO CARD
    
    // Evento do "Leia mais"
    card.querySelector(".read-more-btn").onclick = () =>
      openMainModal(m, false); // <--- false = MODO LEITURA

    // Eventos do Menu
    const menuBtn = card.querySelector(".actions-menu-btn");
    const dropdown = card.querySelector(".actions-dropdown");

    menuBtn.onclick = (e) => {
      e.stopPropagation(); // Impede o card de fechar o menu
      // Fecha todos os outros menus antes de abrir este
      document.querySelectorAll(".actions-dropdown.show").forEach(menu => {
        if (menu !== dropdown) menu.classList.remove("show");
      });
      // Alterna (abre/fecha) o menu atual
      dropdown.classList.toggle("show");
    };

    card.querySelector(".edit-btn").onclick = () => {
      dropdown.classList.remove("show"); // Fecha o menu
      openMainModal(m, true); // <--- true = MODO EDIÇÃO
    };

    card.querySelector(".delete-btn").onclick = () => {
      dropdown.classList.remove("show"); // Fecha o menu
      deleteMovieConfirm(m.id);
    };

    movieGrid.appendChild(card);
  });
  
  // Adiciona um clique global para fechar menus abertos
  // Usamos um listener 'global' para fechar o menu se clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest('.actions-menu')) {
      document.querySelectorAll(".actions-dropdown.show").forEach(menu => {
        menu.classList.remove("show");
      });
    }
  });
}

/* ---------------- MAIN MODAL ---------------- */

// [MELHORIA 5] Função 'openMainModal' MODIFICADA (Pedido 1)
function openMainModal(movie, editable = false) {
  editingId = movie.id;
  const modalContent = $("modalContent"); // Pega o div de conteúdo

  // Pega todos os elementos de edição
  const editElements = modalContent.querySelectorAll('.edit-element');
  const editElementsFlex = modalContent.querySelectorAll('.edit-element-flex');

  // Configura o modo (visualização ou edição)
  if (editable) {
    // MODO EDIÇÃO
    modalContent.classList.remove("modal-view-mode");
    modalSinopse.readOnly = false; // Permite editar sinopse
    
    // Mostra todos os elementos de edição
    editElements.forEach(el => el.style.display = 'block');
    editElementsFlex.forEach(el => el.style.display = 'flex');
    $("modalCategories").style.display = 'none'; // Esconde pills

  } else {
    // MODO LEIA MAIS (view-mode)
    modalContent.classList.add("modal-view-mode");
    modalSinopse.readOnly = true; // Bloqueia edição da sinopse
    
    // Esconde todos os elementos de edição
    editElements.forEach(el => el.style.display = 'none');
    editElementsFlex.forEach(el => el.style.display = 'none');
    $("modalCategories").style.display = 'flex'; // Mostra pills
  }

  modalPoster.src = movie.poster || "";
  modalTitle.textContent = movie.title || "";
  modalSinopse.value = movie.description || "";
  modalSinopse.dataset.lang = 'pt-BR'; // Reseta o idioma para o padrão
  // modalRating.value = movie.rating ?? ""; // <--- REMOVIDO
  modalStreaming.value = movie.streamingUrl ?? "";
  rememberStreaming.checked = movie.remember ?? false;

  // Popula as pills de categoria (modo visualização)
  modalCategories.innerHTML = "";
  (movie.categories || []).forEach(c => {
    const x = document.createElement("span");
    x.className = "px-2 py-1 bg-neutral-700 rounded text-sm mr-2";
    x.textContent = c;
    modalCategories.appendChild(x);
  });

  // Popula os checkboxes de categoria (modo edição)
  modalCategorySelectContainer.innerHTML = "";
  [...categoriesSet].sort().forEach(c => {
    const lbl = document.createElement("label");
    // Adicionamos as classes de edição aqui
    lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex"; 
    lbl.innerHTML = `
      <input type="checkbox" value="${c}" ${
      (movie.categories || []).includes(c) ? "checked" : ""
    } />
      <span class="text-sm">${c}</span>
    `;
    modalCategorySelectContainer.appendChild(lbl);
  });

  btnSaveMovie.onclick = () => saveModalChanges();
  btnDeleteMovie.onclick = () => deleteMovieConfirm(editingId);

  mainModal.classList.remove("hidden");
}

/* ---------------- SAVE EDIT ---------------- */

async function saveModalChanges() {
  if (!editingId) return;

  const cats = Array.from(
    modalCategorySelectContainer.querySelectorAll("input[type=checkbox]:checked")
  ).map(i => i.value);

  try {
    const ref = doc(db, "users", userId, "movies", editingId);

    const updated = {
      title: modalTitle.textContent.trim(),
      description: modalSinopse.value.trim(),
      categories: cats,
      // rating: modalRating.value ? Number(modalRating.value) : null, // <--- REMOVIDO
      streamingUrl: modalStreaming.value || null,
      remember: rememberStreaming.checked,
      poster: modalPoster.src || ""
    };

    await updateDoc(ref, updated);

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
  if (!confirm("Deseja realmente excluir esse filme?")) return;

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
  if (!searchResults || searchResults.length === 0) {
    return showToast("Nenhum filme encontrado na TMDb com esse título.", "warning");
  }

  const movieId = searchResults[0].id;
  const movieDetails = await fetchMovieDetailsTMDb(movieId);

  if (movieDetails) {
    modalTitle.textContent = movieDetails.title_pt_BR || movieDetails.title || "";
    modalSinopse.value = movieDetails.overview || "Sinopse não disponível.";
    modalPoster.src = movieDetails.poster_path ? `${TMDB_IMG_BASE_URL}${movieDetails.poster_path}` : '';
    
    const newCategories = movieDetails.genres ? movieDetails.genres.map(g => g.name) : [];
    newCategories.forEach(c => categoriesSet.add(c));
    rebuildCategoryOptions(); // Atualiza os filtros globais

    // Atualiza as categorias no modal de edição
    modalCategorySelectContainer.innerHTML = "";
    [...categoriesSet].sort().forEach(c => {
        const lbl = document.createElement("label");
        lbl.className = "flex items-center gap-2 cursor-pointer px-2 py-1 bg-neutral-700 rounded mr-2 mb-2 edit-element-flex";
        lbl.innerHTML = `
        <input type="checkbox" value="${c}" ${newCategories.includes(c) ? "checked" : ""} />
        <span class="text-sm">${c}</span>
        `;
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
    showToast("Upload do pôster concluído!");
  } catch (err) {
    console.error("Erro no upload:", err);
    showToast("Erro ao carregar imagem", "error");
  }
}

function handleEditRemovePoster() {
  modalPoster.src = ""; 
  showToast("Pôster removido");
}

/* ---------------- GLOBAL EVENTS ---------------- */

// [MELHORIA 5] Função 'attachGlobalEvents' MODIFICADA (Pedidos 3 e 4)
function attachGlobalEvents() {
  
  const searchInput = document.querySelector("#searchInput");
  if (searchInput) searchInput.oninput = () => renderMovies();

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (mainModal && !mainModal.classList.contains("hidden"))
        mainModal.classList.add("hidden");

      const addModal = $("addModal");
      if (addModal && !addModal.classList.contains("hidden"))
        addModal.classList.add("hidden");
    }
  });
  
  // [CORREÇÃO] Adiciona evento para o 'X' do modal principal
  if (closeModalBtn) {
    closeModalBtn.onclick = () => {
      mainModal.classList.add("hidden");
      editingId = null;
    };
  }
  
  // [MELHORIA 5] Fechar modal ao clicar fora (Pedido 3)
  if (mainModal) {
    mainModal.onclick = (e) => {
      // Se o alvo do clique for o próprio fundo do modal
      if (e.target === mainModal) {
        mainModal.classList.add("hidden");
        editingId = null;
      }
    };
  }
  
  // [CORREÇÃO DO BUG] Adicionando os eventos que faltavam (Bug 1 e 2)
  if (btnGerarSinopse) {
      btnGerarSinopse.onclick = async () => {
        const title = modalTitle.textContent.trim();
        if (!title) return showToast("O título está vazio.", "warning");
        
        showToast("Buscando sinopse padrão (PT-BR)...");
        
        // 1. Acha o filme pelo título atual
        const searchResults = await searchMoviesTMDb(title, 'pt-BR');
        if (!searchResults || searchResults.length === 0) {
            return showToast("Filme não encontrado na API.", "error");
        }
        
        const movieId = searchResults[0].id;
        
        // 2. Busca os detalhes em pt-BR (o padrão)
        const movieDetails = await fetchMovieDetailsTMDb(movieId, 'pt-BR');
        
        if (movieDetails && movieDetails.overview) {
          modalSinopse.value = movieDetails.overview;
          modalSinopse.dataset.lang = 'pt-BR'; // Reseta o idioma
          showToast("Sinopse padrão (PT-BR) carregada!", "success");
        } else {
          showToast("Sinopse padrão não encontrada.", "warning");
        }
      };
  }

  if (btnLimparSinopse) {
      btnLimparSinopse.onclick = () => {
        modalSinopse.value = "";
        showToast("Sinopse limpa");
      };
  }

  // [MELHORIA 5] Traduzir Sinopse (Pedido 4)
  if (btnTranslateSinopse) {
    btnTranslateSinopse.onclick = async () => {
      if (!editingId) return; // Precisa ter um filme carregado

      const currentLang = modalSinopse.dataset.lang || 'pt-BR';
      const targetLang = currentLang === 'pt-BR' ? 'en-US' : 'pt-BR';
      
      showToast(`Traduzindo para ${targetLang}...`);
      
      // 1. Pega o ID TMDb do filme atual (temos que buscar pelo título)
      const currentTitle = $("modalTitle").textContent;
      // Tenta buscar primeiro no idioma alvo (ex: se o título está em EN, busca em EN)
      let searchResults = await searchMoviesTMDb(currentTitle, targetLang);
      
      if (!searchResults || searchResults.length === 0) {
           // Se falhar, tenta buscar no idioma oposto
           searchResults = await searchMoviesTMDb(currentTitle, currentLang);
           if (!searchResults || searchResults.length === 0) {
                return showToast("Erro: Não foi possível encontrar o filme para traduzir.", "error");
           }
      }
      
      const tmdb_id = searchResults[0].id; // Pega o ID do primeiro resultado

      // 2. Busca os detalhes no novo idioma
      const movieDetails = await fetchMovieDetailsTMDb(tmdb_id, targetLang);
      
      if (movieDetails) {
        // [CORREÇÃO] Atualiza o título e a sinopse
        modalTitle.textContent = movieDetails.title; 
        modalSinopse.value = movieDetails.overview || "Tradução da sinopse não encontrada.";
        modalSinopse.dataset.lang = targetLang; // Salva o idioma atual
        showToast(`Título e Sinopse atualizados para ${targetLang}!`, "success");
      } else {
        showToast("Tradução não encontrada.", "warning");
      }
    };
  }

  if (modalFetchPoster) {
    // Esta é a função do modal de EDIÇÃO
    modalFetchPoster.onclick = handleEditFetchPoster;
  }
  if (modalUploadBtn) {
    modalUploadBtn.onclick = () => modalUploadInput.click();
  }
  if (modalUploadInput) {
    modalUploadInput.onchange = handleEditPosterUpload;
  }
  if (modalRemovePoster) {
    modalRemovePoster.onclick = handleEditRemovePoster;
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Erro ao sair:", e);
        showToast("Erro ao tentar sair.", "error");
      }
    };
  }
}

/* ---------------- DEBUG ---------------- */
window.__movieApp = {
  getMovies: () => movies,
  reload: loadMovies
};