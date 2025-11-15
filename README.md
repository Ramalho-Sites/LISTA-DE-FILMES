# 🎬 Davi-ListMovie: Lista de Filmes

Um aplicativo web interativo para pesquisar e exibir informações de filmes, criado com HTML, CSS e JavaScript puro.

![Demo do Projeto](imagens/Demo.png)

### 🔗 Acesse o site: [Clique aqui para interagir com o projeto!](https://ramalho-sites.github.io/Davi-ListMovie/)

---
## 📜 Sobre o Projeto

Este projeto foi desenvolvido como um exercício prático para consumir dados de uma API de filmes ([The Movie Database - TMDB](https://www.themoviedb.org/)) e exibi-los de forma amigável. O usuário pode pesquisar por um filme específico e a aplicação retorna uma grade com os resultados correspondentes.

---

## ✨ Funcionalidades Principais

* **Busca em tempo real:** Pesquise filmes dinamicamente através do campo de busca.
* **Layout Responsivo:** O design se adapta perfeitamente a telas de desktops, tablets e dispositivos móveis.
* **Consumo de API:** Demonstração prática de como realizar requisições assíncronas (`fetch` em JavaScript) para uma API externa.
* **Manipulação Dinâmica do DOM:** Atualiza o conteúdo da página com os resultados da busca em tempo real, sem a necessidade de recarregar a página.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **HTML5** | Estrutura semântica e esqueleto do site. |
| **CSS3** | Estilização, layout em grade (Grid/Flexbox) e responsividade da interface. |
| **JavaScript (ES6+)** | Lógica de aplicação, manipulação do DOM e a camada de comunicação com a API. |

---

## 🚀 Como Executar Localmente

Siga estes passos para rodar o projeto em sua máquina:

1.  **Clone o novo repositório:**
    ```bash
    git clone [https://github.com/Ramalho-Sites/Davi-ListMovie.git](https://github.com/Ramalho-Sites/Davi-ListMovie.git)
    ```

2.  **Navegue até a pasta do projeto:**
    ```bash
    cd Davi-ListMovie
    ```

3.  **Abra o `index.html`:**
    Basta abrir arquivo `index.html` diretamente no seu navegador de preferência.

> **⚠️ Configuração da API Key (Chave de API):**
>
> **Onde Mudar:** Dentro do arquivo **`script.js`**
>
> Se o projeto não estiver carregando os filmes, você precisa obter uma chave de API gratuita no [site do TMDB](https://www.themoviedb.org/). Localize a variável da chave (ex: `const API_KEY = "SUA_CHAVE_AQUI"`) no seu arquivo `script.js` e substitua o *placeholder* pela sua chave pessoal para permitir o acesso aos dados dos filmes.

---

## 👨‍💻 Autor

###### Feito por **Davi Ramalho**.

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Ramalho-Sites)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/davi-ramalho-146221379/)