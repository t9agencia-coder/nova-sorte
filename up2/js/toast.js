// Variável de controle para não duplicar os popups
let intervaloGanhadores = null;

const listaGanhadores = [
    { nome: "Raphael L.", valor: "R$ 2.029,02" },
    { nome: "Jaqueline M.", valor: "R$ 1.733,92" },
    { nome: "Herbet G.", valor: "R$ 5.496,72" },
    { nome: "Fabiana S.", valor: "R$ 850,50" },
    { nome: "Marcelo J.", valor: "R$ 3.120,00" },
    { nome: "Gabriela M.", valor: "R$ 1.050,00" }
];

function mostrarGanhador() {
    const toast = document.getElementById('toast-saque');
    const toastImg = document.getElementById('toast-img');
    const toastMensagem = document.getElementById('toast-mensagem');
    
    if (!toast || !toastImg || !toastMensagem) return;

    const ganhador = listaGanhadores[Math.floor(Math.random() * listaGanhadores.length)];
    const seed = Math.floor(Math.random() * 1000);
    toastImg.src = 'https://i.pravatar.cc/150?img=' + (seed % 70 + 1);
    toastMensagem.innerHTML = ganhador.nome + ' sacou <strong class="texto-verde">' + ganhador.valor + '</strong>';

    toast.classList.remove('hide');
    toast.classList.add('show');

    setTimeout(function() {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 3000);
}

// Inicia o loop para mostrar a cada 8 segundos
if (!intervaloGanhadores) {
    // Mostra o primeiro após 2 segundos de página carregada
    setTimeout(mostrarGanhador, 2000);
    // Repete o processo
    intervaloGanhadores = setInterval(mostrarGanhador, 8000);
}