// Variável de controle para não duplicar os popups
let intervaloGanhadores = null;

const listaGanhadores = [
    { nome: "Raphael L.", valor: "R$ 2.029,02", img: "https://i.pinimg.com/736x/bf/cf/00/bfcf0091e3fde7ae4fd98a4efa6c6ced.jpg" },
    { nome: "Jaqueline M.", valor: "R$ 1.733,92", img: "https://i.pinimg.com/1200x/62/93/3f/62933f96683e1065ca2bb3662a971002.jpg" },
    { nome: "Herbet G.", valor: "R$ 5.496,72", img: "https://i.pinimg.com/736x/36/fd/3b/36fd3bec57222979aa5dfb618756af17.jpg" },
    { nome: "Fabiana S.", valor: "R$ 850,50", img: "https://i.pinimg.com/736x/e2/dd/f2/e2ddf2cd860d356bb4bff51055b5e051.jpg" },
    { nome: "Marcelo J.", valor: "R$ 3.120,00", img: "https://i.pinimg.com/736x/22/79/12/227912e007f507dcf4e64c052cfbcf29.jpg" },
    { nome: "Gabriela M.", valor: "R$ 1.050,00", img: "https://i.pinimg.com/736x/2e/35/d2/2e35d234a5b7e01aba0021d19a12b57a.jpg" }
];

function mostrarGanhador() {
    const toast = document.getElementById('toast-saque');
    const toastImg = document.getElementById('toast-img');
    const toastMensagem = document.getElementById('toast-mensagem');
    
    if (!toast || !toastImg || !toastMensagem) return;

    // Sorteia um ganhador
    const ganhador = listaGanhadores[Math.floor(Math.random() * listaGanhadores.length)];
    
    // Atualiza os dados (Note as CRASES aqui embaixo)
    toastImg.src = ganhador.img;
    toastMensagem.innerHTML = `${ganhador.nome} sacou <strong class="texto-verde">${ganhador.valor}</strong>`;

    // Mostra o toast
    toast.style.display = "flex"; // Garante que ele apareça caso esteja como none
    toast.classList.add('show');

    // Esconde depois de 3 segundos
    setTimeout(() => { 
        toast.classList.remove('show'); 
    }, 3000);
}

// Inicia o loop para mostrar a cada 8 segundos
if (!intervaloGanhadores) {
    // Mostra o primeiro após 2 segundos de página carregada
    setTimeout(mostrarGanhador, 2000);
    // Repete o processo
    intervaloGanhadores = setInterval(mostrarGanhador, 8000);
}