document.addEventListener('DOMContentLoaded', () => {
    const base = 2693.82;
    const percentual = 0.05;
    
    const resultado = base * percentual;

    // Formatação para Moeda Brasileira (R$)
    const formatador = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const elementoResultado = document.getElementById('taxa-resultado');
    
    // Insere o valor calculado: R$ 134,69
    elementoResultado.innerText = formatador.format(resultado);
});