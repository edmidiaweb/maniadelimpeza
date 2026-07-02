let listaProdutosOriginal = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let ordenacao = localStorage.getItem('ordenacao') || 'az';
let _debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    configurarFiltroPesquisa();
    configurarBuscaMobile();
    atualizarInterfaceCarrinho();
    atualizarUIOrdenacao();
});

// ── Carregamento ──────────────────────────────────────────────────────────────
async function carregarProdutos() {
    try {
        const resposta = await fetch('produtos.json');
        if (!resposta.ok) throw new Error('Falha ao ler arquivo de produtos.');
        listaProdutosOriginal = await resposta.json();
        aplicarFiltros(document.getElementById('searchBarDesktop').value || '');
    } catch (erro) {
        console.error(erro);
        document.getElementById('gridProdutos').innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Erro ao carregar o catálogo. Certifique-se de usar um servidor local (Live Server).</p>
            </div>
        `;
    }
}

// ── Ordenação ─────────────────────────────────────────────────────────────────
function definirOrdenacao(modo) {
    ordenacao = modo;
    localStorage.setItem('ordenacao', modo);
    atualizarUIOrdenacao();
    aplicarFiltros(document.getElementById('searchBarDesktop').value || '');
}

function atualizarUIOrdenacao() {
    ['az', 'menor', 'maior'].forEach(modo => {
        const btn = document.getElementById(`ord-${modo}`);
        if (!btn) return;
        if (modo === ordenacao) {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white transition';
        } else {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition';
        }
    });
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function obterPreco(item) {
    const raw = item["Valor de venda (R$)"] !== undefined ? item["Valor de venda (R$)"] : item["Valor de venda"];
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
}

function normalizarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterProdutosBase() {
    let produtos = [...listaProdutosOriginal];

    if (ordenacao === 'az') {
        produtos.sort((a, b) => a.Produto.localeCompare(b.Produto, 'pt-BR'));
    } else if (ordenacao === 'menor') {
        produtos.sort((a, b) => obterPreco(a) - obterPreco(b));
    } else if (ordenacao === 'maior') {
        produtos.sort((a, b) => obterPreco(b) - obterPreco(a));
    }
    return produtos;
}

// ── Pesquisa ──────────────────────────────────────────────────────────────────
function obterCamposPesquisa() {
    return Array.from(document.querySelectorAll('[data-search-input]'));
}

function obterBotoesLimpar() {
    return Array.from(document.querySelectorAll('[data-clear-search]'));
}

function sincronizarCamposPesquisa(valor, campoOrigem = null) {
    obterCamposPesquisa().forEach(input => {
        if (input !== campoOrigem) input.value = valor;
    });
}

function atualizarBotoesLimpar(valor) {
    const deveExibir = valor.trim().length > 0;
    obterBotoesLimpar().forEach(botao => botao.classList.toggle('hidden', !deveExibir));
}

function configurarFiltroPesquisa() {
    obterCamposPesquisa().forEach(searchBar => {
        searchBar.addEventListener('input', (e) => {
            const valor = e.target.value;
            sincronizarCamposPesquisa(valor, e.target);
            atualizarBotoesLimpar(valor);
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(() => aplicarFiltros(valor), 200);
        });
    });

    obterBotoesLimpar().forEach(botao => {
        botao.addEventListener('click', () => limparPesquisa(botao.getAttribute('data-target-input')));
    });
}

function configurarBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    if (toggle) toggle.addEventListener('click', alternarBuscaMobile);
}

function abrirBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.remove('hidden');
    toggle.classList.remove('bg-white', 'border', 'border-indigo-100', 'text-indigo-900', 'hover:bg-indigo-50');
    toggle.classList.add('bg-indigo-600', 'text-white');
    setTimeout(() => mobileInput.focus(), 50);
}

function fecharBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.add('hidden');
    toggle.classList.remove('bg-indigo-600', 'text-white');
    toggle.classList.add('bg-white', 'border', 'border-indigo-100', 'text-indigo-900', 'hover:bg-indigo-50');
    mobileInput.blur();
}

function alternarBuscaMobile() {
    const container = document.getElementById('mobileSearchContainer');
    if (!container) return;
    container.classList.contains('hidden') ? abrirBuscaMobile() : fecharBuscaMobile();
}

function aplicarFiltros(termo = '') {
    const termoBuscado = normalizarTexto(termo.trim());
    let produtosFiltrados = obterProdutosBase();

    if (termoBuscado) {
        produtosFiltrados = produtosFiltrados.filter(item =>
            normalizarTexto(item.Produto).includes(termoBuscado)
        );
        produtosFiltrados.sort((a, b) => {
            const aComeca = normalizarTexto(a.Produto).startsWith(termoBuscado) ? 1 : 0;
            const bComeca = normalizarTexto(b.Produto).startsWith(termoBuscado) ? 1 : 0;
            return bComeca - aComeca;
        });
    }

    renderizarProdutos(produtosFiltrados, termoBuscado);
}

function limparPesquisa(inputIdParaFoco = 'searchBarDesktop') {
    sincronizarCamposPesquisa('');
    atualizarBotoesLimpar('');
    aplicarFiltros('');
    const input = document.getElementById(inputIdParaFoco);
    if (input && !input.closest('.hidden')) input.focus();
}

// ── Renderização ──────────────────────────────────────────────────────────────
function renderizarProdutos(produtos, termoBuscado = '') {
    const grid = document.getElementById('gridProdutos');
    grid.innerHTML = '';

    if (termoBuscado) {
        const contador = document.createElement('div');
        contador.className = 'col-span-full mb-1';
        const label = `<span class="font-bold text-indigo-700">${produtos.length}</span> produto${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''} para <span class="font-bold text-indigo-700">"${termoBuscado}"</span>`;
        contador.innerHTML = `<p class="text-xs text-gray-500">${label}</p>`;
        grid.appendChild(contador);
    }

    if (produtos.length === 0) {
        grid.innerHTML += `
            <div class="col-span-full text-center py-14 text-gray-400 flex flex-col items-center gap-3">
                <i class="fas fa-search text-4xl text-indigo-200"></i>
                <p class="font-semibold text-gray-500">Nenhum produto encontrado</p>
                <p class="text-xs text-gray-400">${termoBuscado ? `Nenhum resultado para "${termoBuscado}"` : 'O catálogo está vazio.'}</p>
                ${termoBuscado ? `<button onclick="limparPesquisa()" class="mt-1 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition">Limpar busca</button>` : ''}
            </div>
        `;
        return;
    }

    produtos.forEach((item, idx) => {
        const preco = obterPreco(item);
        const itemNoCarrinho = carrinho.find(c => c.nome === item.Produto);
        const qtd = itemNoCarrinho ? itemNoCarrinho.qtd : 0;
        const wrapId = `wrap-img-${idx}`;
        const btnId  = `btn-container-${idx}`;

        const card = document.createElement('div');
        card.className = "bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition duration-200";
        card.innerHTML = `
            <div>
                <div id="${wrapId}"
                     class="w-full h-32 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center cursor-zoom-in select-none"
                     data-nome="${item.Produto.replace(/"/g, '&quot;')}"
                     onclick="abrirLightbox(this)">
                    <i class="fas fa-spinner fa-spin text-indigo-300 text-xl pointer-events-none"></i>
                </div>
                <h3 class="text-xs font-bold text-gray-700 mt-2 line-clamp-2 uppercase h-8">${item.Produto}</h3>
            </div>
            <div class="mt-2">
                <p class="text-indigo-900 font-extrabold text-base">R$ ${preco.toFixed(2).replace('.', ',')}</p>
                <div class="mt-2" id="${btnId}">
                    ${renderizarBotaoAcao(item.Produto, preco, qtd, btnId)}
                </div>
            </div>
        `;
        grid.appendChild(card);
        carregarImagemCard(wrapId, item.imagem || null, item.Produto, item.Categoria || '', btnId);
    });
}

// ── Botões de ação ────────────────────────────────────────────────────────────
function renderizarBotaoAcao(nome, preco, qtd, btnId = '') {
    const nomeEsc = nome.replace(/'/g, "\\'");
    if (qtd > 0) {
        return `
            <div class="flex items-center justify-between bg-indigo-50 rounded-xl p-1 border border-indigo-200">
                <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, -1, '${btnId}')" aria-label="Diminuir quantidade"
                    class="w-8 h-8 flex items-center justify-center bg-white text-indigo-900 rounded-lg shadow-xs hover:bg-indigo-100 font-bold transition">-</button>
                <span class="font-bold text-sm text-indigo-950">${qtd}</span>
                <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, 1, '${btnId}')" aria-label="Aumentar quantidade"
                    class="w-8 h-8 flex items-center justify-center bg-white text-indigo-900 rounded-lg shadow-xs hover:bg-indigo-100 font-bold transition">+</button>
            </div>
        `;
    }
    return `
        <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, 1, '${btnId}')"
            class="btn-adicionar w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs">
            <i class="fas fa-plus text-[10px]"></i> Adicionar
        </button>
    `;
}

function alterarQuantidade(nome, preco, alterar, btnId) {
    const index = carrinho.findIndex(item => item.nome === nome);
    if (index > -1) {
        carrinho[index].qtd += alterar;
        if (carrinho[index].qtd <= 0) carrinho.splice(index, 1);
    } else if (alterar > 0) {
        carrinho.push({ nome, preco, qtd: 1 });
    }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));

    const container = document.getElementById(btnId);
    const itemAtualizado = carrinho.find(item => item.nome === nome);
    const novaQtd = itemAtualizado ? itemAtualizado.qtd : 0;

    if (container) {
        if (alterar > 0 && novaQtd === 1) {
            container.innerHTML = `
                <div class="w-full bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs">
                    <i class="fas fa-check text-[10px]"></i> Adicionado!
                </div>
            `;
            setTimeout(() => {
                container.innerHTML = renderizarBotaoAcao(nome, preco, novaQtd, btnId);
            }, 700);
        } else {
            container.innerHTML = renderizarBotaoAcao(nome, preco, novaQtd, btnId);
        }
    }
    atualizarInterfaceCarrinho();
}

function atualizarInterfaceCarrinho() {
    const badge = document.getElementById('badgeCarrinho');
    const barraMobile = document.getElementById('barraFixaMobile');
    const labelQtdMobile = document.getElementById('qtdItensMobile');
    const totalInferior = document.getElementById('totalFixInferior');

    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const valorTotal = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco), 0);

    if (badge) {
        badge.innerText = totalItens;
        badge.classList.toggle('hidden', totalItens === 0);
    }

    if (barraMobile && labelQtdMobile && totalInferior) {
        if (totalItens > 0) {
            labelQtdMobile.innerText = totalItens;
            totalInferior.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
            barraMobile.classList.remove('hidden');
        } else {
            barraMobile.classList.add('hidden');
        }
    }
}

// ── Imagens ───────────────────────────────────────────────────────────────────
const _catCfg = {
    'Automotivo e Pedras':        ['#1e3a5f','#a8c8f0','🚗'],
    'Desinfetantes e Alvejantes': ['#0d4f3c','#86efb8','🧴'],
    'Elétrica e Eletrônicos':     ['#3b1f6e','#c4b5fd','🔌'],
    'Higiene e Cuidados':         ['#6b2d6b','#f0abfc','🧼'],
    'Lavanderia e Louça':         ['#1a4f6e','#7dd3fc','🫧'],
    'Outros':                     ['#3d3d3d','#d1d5db','📦'],
    'Panos e Esponjas':           ['#4a3728','#fbbf80','🧽'],
    'Papelaria e Escritório':     ['#1e4a2e','#86efac','📝'],
    'Papéis':                     ['#555555','#e5e7eb','🧻'],
    'Sacos e Lixeiras':           ['#2d2d1f','#bef264','🗑️'],
    'Utensílios de Limpeza':      ['#1a3a5c','#93c5fd','🧹'],
    'Vestuário e Têxtil':         ['#5c1a3a','#fda4af','👕'],
};
const _catDefault = ['#374151','#d1d5db','🏷️'];

function gerarImagemCanvas(nome, categoria) {
    const [bg, fg, emoji] = _catCfg[categoria] || _catDefault;
    const W = 200, H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.font = '44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, W / 2, H / 2 - 14);

    ctx.fillStyle = fg;
    ctx.font = 'bold 10px sans-serif';
    ctx.textBaseline = 'top';
    const maxW = W - 16;
    const palavras = nome.split(' ');
    let linha = '';
    const linhas = [];
    for (const p of palavras) {
        const teste = linha ? linha + ' ' + p : p;
        if (ctx.measureText(teste).width > maxW && linha) {
            linhas.push(linha);
            linha = p;
        } else {
            linha = teste;
        }
        if (linhas.length >= 2) break;
    }
    if (linha && linhas.length < 2) linhas.push(linha);
    linhas.forEach((l, i) => ctx.fillText(l.toUpperCase(), W / 2, H - 30 + i * 13));

    return canvas.toDataURL();
}

async function carregarImagemCard(wrapId, srcLocal, nomeProduto, categoria) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    if (srcLocal) {
        const ok = await testarImagem(srcLocal);
        if (ok) {
            const img = document.createElement('img');
            img.src = srcLocal;
            img.alt = nomeProduto;
            img.className = 'w-full h-32 object-contain p-2 bg-gray-50 rounded-xl pointer-events-none';
            wrap.innerHTML = '';
            wrap.appendChild(img);
            wrap.setAttribute('data-pronta', '1');
            return;
        }
    }

    const dataUrl = gerarImagemCanvas(nomeProduto, categoria);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = nomeProduto;
    img.className = 'w-full h-32 object-cover rounded-xl pointer-events-none';
    wrap.innerHTML = '';
    wrap.appendChild(img);
    wrap.setAttribute('data-pronta', '1');
}

function testarImagem(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function abrirLightbox(wrapEl) {
    if (!wrapEl.getAttribute('data-pronta')) return;

    const lb     = document.getElementById('lightbox');
    const lbImg  = document.getElementById('lightboxImg');
    const lbNome = document.getElementById('lightboxNome');
    const imgEl  = wrapEl.querySelector('img');
    if (!imgEl) return;

    lbImg.src  = imgEl.src;
    lbImg.alt  = wrapEl.getAttribute('data-nome') || '';
    lbNome.textContent = wrapEl.getAttribute('data-nome') || '';

    lb.classList.remove('hidden');
    lb.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function fecharLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.add('hidden');
    lb.classList.remove('flex');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharLightbox();
});
