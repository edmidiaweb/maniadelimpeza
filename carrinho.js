let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
let etapaAtual = 1;

const TAXA_OUTROS_BAIRROS = 15;
const MINIMO_FRETE_GRATIS = 30;

const tabelaTaxas = {
    "Umuarama": 5, "Iemanjá": 5, "Guapiranga": 5, "Coronel": 5,
    "Belas Artes": 5, "Corumbá": 5, "Ieda": 5,
    "Praia dos Sonhos": 5, "Cibratel 1": 5, "Chácara Cibratel": 5,
    "Outros": TAXA_OUTROS_BAIRROS
};

document.addEventListener('DOMContentLoaded', () => {
    renderizarItensCarrinho();
    recuperarEnderecoSalvo();
    atualizarStepper(1);
    atualizarResumoFinanceiro();
});

function atualizarStepper(etapa) {
    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById(`step-circle-${i}`);
        const label = document.getElementById(`step-label-${i}`);
        if (i < etapa) {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-emerald-600 border-emerald-600 text-white";
            circle.innerHTML = '<i class="fas fa-check text-xs"></i>';
            label.className = "text-xs font-semibold text-emerald-600";
        } else if (i === etapa) {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-indigo-700 border-indigo-700 text-white";
            const icons = ['fa-shopping-basket', 'fa-map-marker-alt', 'fa-check'];
            circle.innerHTML = `<i class="fas ${icons[i - 1]} text-xs"></i>`;
            label.className = "text-xs font-semibold text-indigo-700";
        } else {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-white border-gray-300 text-gray-400";
            const icons = ['fa-shopping-basket', 'fa-map-marker-alt', 'fa-check'];
            circle.innerHTML = `<i class="fas ${icons[i - 1]} text-xs"></i>`;
            label.className = "text-xs font-semibold text-gray-400";
        }
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById(`step-line-${i}`);
        line.style.background = i < etapa ? '#059669' : '#e0e7ff';
    }
}

function irParaEtapa(destino) {
    if (destino === 2 && !validarEtapa1()) return;
    if (destino === 3 && !validarEtapa2()) return;
    if (destino === 3) preencherResumo();

    document.getElementById(`etapa-${etapaAtual}`).classList.add('hidden');
    document.getElementById(`etapa-${destino}`).classList.remove('hidden');
    etapaAtual = destino;
    atualizarStepper(destino);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarEtapa1() {
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio! Adicione produtos antes de continuar.");
        return false;
    }
    return true;
}

function validarEtapa2() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const ref = document.getElementById('referencia').value.trim();
    const bairroOutro = document.getElementById('bairroOutro').value.trim();

    if (!nome || !rua || !num || !bairro || !ref) {
        alert("Por favor, preencha todos os campos: Nome, Rua, Número, Bairro e Ponto de Referência.");
        return false;
    }

    if (bairro === 'Outros') {
        if (!bairroOutro) {
            alert("Digite o bairro para continuar.");
            return false;
        }
        const confirma = document.getElementById('confirmaOutrosBairros').value;
        if (confirma !== 'sim') {
            alert("Para continuar com entrega em outro bairro, confirme que aceita as condições (Pix exclusivo + taxa R$ 15,00).");
            return false;
        }
        document.getElementById('pagamento').value = 'Pix';
        document.getElementById('containerTroco').classList.add('hidden');
    }

    return true;
}

function renderizarItensCarrinho() {
    const listaItens = document.getElementById('listaItens');

    if (carrinho.length === 0) {
        listaItens.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-shopping-cart text-3xl mb-2"></i>
                <p>Seu carrinho está vazio.</p>
                <a href="index.html" class="text-indigo-600 hover:underline font-semibold text-xs inline-block mt-2">Voltar para escolher produtos</a>
            </div>`;
        atualizarResumoFinanceiro();
        document.getElementById('btnAvancarEtapa1').disabled = true;
        return;
    }

    document.getElementById('btnAvancarEtapa1').disabled = false;

    listaItens.innerHTML = carrinho.map(item => {
        const totalItem = item.preco * item.qtd;
        return `
            <div class="flex justify-between items-center py-3">
                <div class="pr-2">
                    <p class="font-semibold text-gray-800">${item.nome}</p>
                    <p class="text-xs text-gray-400">${item.qtd}x R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span class="font-bold text-indigo-800">R$ ${totalItem.toFixed(2).replace('.', ',')}</span>
                    <button onclick="removerItemCarrinho('${item.nome}')" class="text-red-400 hover:text-red-600 transition text-xs p-1">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    atualizarResumoFinanceiro();
}

function atualizarResumoFinanceiro() {
    const labelProdutos = document.getElementById('valorProdutos');
    const labelTotalGeral = document.getElementById('valorTotalGeral');
    const banner = document.getElementById('bannerFrete');

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    labelProdutos.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    labelTotalGeral.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const bairroSelecionado = document.getElementById('bairro')?.value || '';
    const bairroOutro = document.getElementById('bairroOutro')?.value.trim() || '';
    const confirmaOutros = document.getElementById('confirmaOutrosBairros')?.value || '';

    const possuiKit = carrinho.some(item => item.nome.toUpperCase().trim() === "KIT LIMPEZA");
    const freteGratis = possuiKit || subtotal >= MINIMO_FRETE_GRATIS;

    if (!bairroSelecionado) {
        banner.classList.add('hidden');
        return;
    }

    if (bairroSelecionado === 'Outros') {
        banner.classList.add('hidden');
        return;
    }

    if (freteGratis) {
        banner.className = "flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3";
        banner.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i><span>🎉 <strong>Parabéns!</strong> Você conseguiu frete grátis!</span>`;
        banner.classList.remove('hidden');
    } else {
        const faltam = (MINIMO_FRETE_GRATIS - subtotal).toFixed(2).replace('.', ',');
        banner.className = "flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3";
        banner.innerHTML = `<i class="fas fa-truck text-amber-500"></i><span>Faltam <strong>R$ ${faltam}</strong> para conseguir frete grátis!</span>`;
        banner.classList.remove('hidden');
    }
}

function removerItemCarrinho(nomeDoProduto) {
    carrinho = carrinho.filter(item => item.nome !== nomeDoProduto);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    renderizarItensCarrinho();
}

function onBairroChange() {
    const bairro = document.getElementById('bairro').value;
    const aviso = document.getElementById('avisoOutrosBairros');
    const campoOutro = document.getElementById('campoOutroBairro');
    const selectPagamento = document.getElementById('pagamento');

    if (bairro === 'Outros') {
        aviso.classList.remove('hidden');
        campoOutro.classList.remove('hidden');
        selectPagamento.value = 'Pix';
        selectPagamento.disabled = true;
        selectPagamento.classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('containerTroco').classList.add('hidden');
    } else {
        aviso.classList.add('hidden');
        campoOutro.classList.add('hidden');
        document.getElementById('bairroOutro').value = '';
        document.getElementById('confirmaOutrosBairros').value = '';
        selectPagamento.disabled = false;
        selectPagamento.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    atualizarBotaoEtapa2();
    atualizarResumoFinanceiro();
}

function atualizarBotaoEtapa2() {
    const bairro = document.getElementById('bairro').value;
    const btn = document.getElementById('btnAvancarEtapa2');

    if (bairro === 'Outros') {
        const confirma = document.getElementById('confirmaOutrosBairros').value;
        btn.disabled = confirma !== 'sim';
        btn.classList.toggle('opacity-40', confirma !== 'sim');
        btn.classList.toggle('cursor-not-allowed', confirma !== 'sim');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-40', 'cursor-not-allowed');
    }

    atualizarResumoFinanceiro();
}

function verificarPagamento() {
    const pag = document.getElementById('pagamento').value;
    const containerTroco = document.getElementById('containerTroco');
    containerTroco.classList.toggle('hidden', pag !== 'Dinheiro');
}

function salvarDadosEndereco(nome, rua, numero, bairro, referencia, bairroOutro) {
    localStorage.setItem('endereco_cliente', JSON.stringify({ nome, rua, numero, bairro, referencia, bairroOutro }));
}

function recuperarEnderecoSalvo() {
    const dados = JSON.parse(localStorage.getItem('endereco_cliente'));
    if (dados) {
        document.getElementById('nomeRecebedor').value = dados.nome || '';
        document.getElementById('rua').value = dados.rua || '';
        document.getElementById('numero').value = dados.numero || '';
        document.getElementById('bairro').value = dados.bairro || '';
        document.getElementById('referencia').value = dados.referencia || '';
        document.getElementById('bairroOutro').value = dados.bairroOutro || '';
        if (dados.bairro === 'Outros') onBairroChange();
    }
}

function calcularTaxa(bairro, subtotal) {
    const possuiKit = carrinho.some(item => item.nome.toUpperCase().trim() === "KIT LIMPEZA");
    if (bairro === 'Outros') return TAXA_OUTROS_BAIRROS;
    if (possuiKit || subtotal >= MINIMO_FRETE_GRATIS) return 0;
    return tabelaTaxas[bairro] || 0;
}

function preencherResumo() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const bairroOutro = document.getElementById('bairroOutro').value.trim();
    const ref = document.getElementById('referencia').value.trim();
    const pag = document.getElementById('pagamento').value;
    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const taxa = calcularTaxa(bairro, subtotal);
    const total = subtotal + taxa;

    document.getElementById('resumoItens').innerHTML = carrinho.map(item => {
        const t = item.preco * item.qtd;
        return `<div class="flex justify-between items-center py-2"><span class="text-gray-700">${item.qtd}x ${item.nome}</span><span class="font-semibold text-indigo-800">R$ ${t.toFixed(2).replace('.', ',')}</span></div>`;
    }).join('');

    document.getElementById('resumoNome').textContent = nome;
    document.getElementById('resumoEndereco').textContent = `${rua}, Nº ${num}`;
    document.getElementById('resumoBairro').textContent = bairro === 'Outros' ? `${bairroOutro} (Itanhaém)` : bairro;
    document.getElementById('resumoReferencia').textContent = ref;
    document.getElementById('resumoSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const taxaEl = document.getElementById('resumoTaxa');
    const blocoEl = document.getElementById('resumoBlocoTaxa');
    if (taxa === 0) {
        taxaEl.textContent = 'GRÁTIS';
        taxaEl.className = 'text-emerald-600 font-bold';
        blocoEl.className = 'flex justify-between font-medium text-emerald-600';
    } else {
        taxaEl.textContent = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
        taxaEl.className = 'text-gray-800 font-semibold';
        blocoEl.className = 'flex justify-between font-medium text-gray-600';
    }

    document.getElementById('resumoPagamento').textContent = pag;
    document.getElementById('resumoTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function confirmarPedido() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const bairroOutro = document.getElementById('bairroOutro').value.trim();
    const ref = document.getElementById('referencia').value.trim();
    const pag = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value.trim();

    salvarDadosEndereco(nome, rua, num, bairro, ref, bairroOutro);

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const taxa = calcularTaxa(bairro, subtotal);
    const total = subtotal + taxa;

    let msg = `🛍️ *NOVO PEDIDO - MANIA DE LIMPEZA*\n\n`;
    msg += `📋 *ITENS COMPRADOS:*\n`;
    carrinho.forEach(item => {
        const t = item.preco * item.qtd;
        msg += `• ${item.qtd}x ${item.nome} — R$ ${t.toFixed(2).replace('.', ',')}\n`;
    });

    msg += `\n💰 *RESUMO DO PEDIDO:*`;
    msg += `\n• Subtotal Itens: R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const possuiKit = carrinho.some(i => i.nome.toUpperCase().trim() === "KIT LIMPEZA");
    let motivoTaxa;
    if (bairro === 'Outros') {
        motivoTaxa = `R$ ${taxa.toFixed(2).replace('.', ',')} (outro bairro)`;
    } else if (taxa === 0) {
        motivoTaxa = possuiKit ? 'GRÁTIS (Kit Limpeza)' : 'GRÁTIS (Pedido acima de R$ 30)';
    } else {
        motivoTaxa = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
    }

    msg += `\n• Taxa de Entrega: ${motivoTaxa}`;
    msg += `\n• *Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    msg += `📍 *ENDEREÇO DE ENTREGA:*\n`;
    msg += `👤 Recebedor: ${nome}\n`;
    msg += `🏠 Rua: ${rua}, Nº ${num}\n`;
    msg += `🏘️ Bairro: ${bairro === 'Outros' ? bairroOutro : bairro}\n`;
    msg += `🚩 Referência: ${ref}\n`;
    msg += `\n💳 *FORMA DE PAGAMENTO:*\n• ${pag}`;

    if (pag === 'Dinheiro' && troco) msg += ` (troco para R$ ${troco})`;

    // Inclusão da mensagem de Pix junto ao texto enviado para o WhatsApp
    msg += `\n\n⚠️ *Para pagamentos via Pix o pedido será liberado após envio do comprovante.*\n🔑 *Chave pix: 01399172-7089*`;

    window.open(`https://wa.me/5513991727089?text=${encodeURIComponent(msg)}`, '_blank');
}
