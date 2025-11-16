import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const googleBtn = document.getElementById("googleBtn");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");

  // [MELHORIA] Duas funções para controlar o estado dos botões
  function setButtonsLoading(isLoading) {
    if (isLoading) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Carregando...";
      googleBtn.disabled = true;
      googleBtn.textContent = "Carregando...";
    } else {
      loginBtn.disabled = false;
      loginBtn.textContent = "Entrar / Criar Conta";
      googleBtn.disabled = false;
      googleBtn.textContent = "Entrar com Google";
    }
  }

  /* =========================
     Toast Moderno
  ========================= */
  function showToast(message, type = "info") {
    let toast = document.getElementById("toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show toast-${type}`;

    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.className = "toast";
    }, 2500);
  }

  /* =========================
     Tratamento de Erros
  ========================= */
  function tratarErroFirebase(code) {
    const erros = {
      "auth/invalid-credential": "Email ou senha incorretos.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/email-already-in-use": "Esse email já está em uso.",
      "auth/weak-password": "A senha precisa ter no mínimo 6 caracteres.",
      "auth/invalid-email": "Email inválido.",
      "auth/popup-closed-by-user": "Popup fechado antes de concluir.",
      "auth/cancelled-popup-request": "Popup cancelado.",
      "auth/popup-blocked": "O navegador bloqueou o popup, permita popups.",
    };

    return erros[code] || "Erro inesperado. Tente novamente.";
  }

  /* =========================
     Login / Criacao Automatica
  ========================= */
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const senha = passInput.value.trim();

    if (!email || !senha) {
      showToast("Preencha todos os campos.", "warning");
      return;
    }

    // [MELHORIA] Desabilita os botões antes de tentar o login
    setButtonsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      showToast("Login realizado!", "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);

    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          await createUserWithEmailAndPassword(auth, email, senha);
          showToast("Conta criada com sucesso!", "success");

          setTimeout(() => {
            window.location.href = "index.html";
          }, 700);

        } catch (e2) {
          showToast(tratarErroFirebase(e2.code), "error");
          // [MELHORIA] Reabilita os botões se a CRIAÇÃO falhar
          setButtonsLoading(false);
        }
      } else {
        showToast(tratarErroFirebase(err.code), "error");
        // [MELHORIA] Reabilita os botões se o LOGIN falhar
        setButtonsLoading(false);
      }
    }
    // Nota: Não precisamos reabilitar os botões em caso de SUCESSO,
    // porque a página será redirecionada de qualquer forma.
  });

  /* =========================
     Login com Google
  ========================= */
  googleBtn.addEventListener("click", async () => {
    setButtonsLoading(true); // <-- CHAME AQUI
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      showToast("Login com Google realizado!", "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);

    } catch (err) {
      showToast(tratarErroFirebase(err.code), "error");
      // [MELHORIA] Reabilita os botões se o Google falhar
      setButtonsLoading(false);
    }
  });

  /* =========================
     Esqueci minha senha
  ========================= */
  forgotPasswordLink.addEventListener("click", async () => {
    const email = prompt("Digite seu email:");

    if (!email) return;

    // [MELHORIA] Desabilita os botões (opcional aqui, mas bom)
    setButtonsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Email enviado! Verifique sua caixa de entrada.", "success");
      // [MELHORIA] Reabilita os botões após sucesso
      setButtonsLoading(false);
    } catch (err) {
      showToast(tratarErroFirebase(err.code), "error");
      // [MELHORIA] Reabilita os botões após erro
      setButtonsLoading(false);
    }
  });

});