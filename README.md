# 🎬 Minha Lista de Filmes

Um aplicativo web completo para gerenciar, organizar e assistir filmes e séries, com autenticação, player integrado e sincronização em tempo real.

![Demo do Projeto](imagens/demo.png)

### 🔗 Acesse o site: [Clique aqui para interagir com o projeto!](https://ramalho-sites.github.io/LISTA-DE-FILMES/public/login.html)

---

## 📜 Sobre o Projeto

Aplicativo pessoal de watchlist construído com HTML, CSS, JavaScript e Firebase. Permite adicionar filmes e séries via integração com a TMDB, assistir com player embutido, organizar por categorias e favoritos, e acompanhar o progresso de séries — tudo sincronizado em tempo real entre dispositivos.

---

## ✨ Funcionalidades

### 🎬 Filmes & Séries
- Adição de filmes e séries com busca automática na **TMDB**
- Pôster, sinopse e categorias preenchidos automaticamente
- Suporte a títulos de lançamento nos **EUA** para filmes estrangeiros
- Tradução de sinopse e título entre **PT-BR** e **EN**

### ▶️ Player Integrado
- Múltiplos servidores de streaming com fallback automático: **EmbedAPI, VidSrc, MultiEmbed, AutoEmbed**
- Seletor de temporada e episódio para séries com limites vindos da TMDB
- Botão **Próximo Episódio** com avanço automático de temporada
- **Continuar assistindo** — salva e retoma do episódio onde parou

### ❤️ Organização
- **Favoritos** com filtro rápido na barra de categorias
- Filtro por categoria, ordenação por data ou título (A-Z)
- Pesquisa por título ou sinopse em tempo real
- Modo de seleção múltipla para exclusão em lote

### 🔄 Sincronização
- Autenticação com **email/senha** ou **Google**
- Dados sincronizados em **tempo real** via Firestore `onSnapshot`
- Funciona em múltiplos dispositivos simultaneamente

### 📱 Interface
- Layout responsivo — **2 colunas no mobile**, até 6 no desktop
- **Skeleton loading** animado enquanto os filmes carregam
- Badge **T2 E5** no pôster de séries com progresso salvo
- Performance otimizada com **DOM diffing** e **debounce**

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| **HTML5 / CSS3** | Estrutura e estilização |
| **Tailwind CSS** | Classes utilitárias |
| **JavaScript ES6+** | Lógica da aplicação |
| **Firebase Auth** | Autenticação de usuários |
| **Cloud Firestore** | Banco de dados em tempo real |
| **TMDB API** | Dados de filmes e séries |

---

## 🚀 Como Usar

Acesse o site, crie uma conta com email/senha ou entre com Google — e pronto, já pode começar a adicionar filmes e séries.

### Quer rodar sua própria versão?

<details>
<summary>Clique para ver as instruções</summary>

**Pré-requisitos**
- Conta no [Firebase](https://firebase.google.com/) com projeto criado
- Chave de API da [TMDB](https://www.themoviedb.org/)

**Passos**

1. Clone o repositório:
   ```bash
   git clone https://github.com/Ramalho-Sites/LISTA-DE-FILMES.git
   cd LISTA-DE-FILMES
   ```

2. Configure o Firebase em `public/js/firebase-config.js` com as credenciais do seu projeto.

3. Configure a TMDB API Key em `public/js/addMovies.js`:
   ```js
   const TMDB_API_KEY = "sua_chave_aqui";
   ```

4. Abra `public/login.html` no navegador ou faça deploy via GitHub Pages.

</details>

---

## 👨‍💻 Autor

Feito por **Davi Ramalho**.

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Ramalho-Sites)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/davi-ramalho-146221379/)