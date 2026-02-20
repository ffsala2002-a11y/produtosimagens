// =============================
// CONFIG SUPABASE
// =============================
const SUPABASE_URL = "https://lergjqrwzdzxvuxfqiss.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlcmdqcXJ3emR6eHZ1eGZxaXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQyNDQsImV4cCI6MjA4NjM4MDI0NH0.GdnCgSuyRoa7Ea6t5ps7YfK7H6JHd1EPp9p6Y0geQYQ";

if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

var supabase = window.supabaseClient;

// =============================
// CACHE GLOBAL (PERFORMANCE)
// =============================
let cacheProdutos = null;


// =============================
// MODAL NOTIFICAÇÃO
// =============================
function mostrarModal(texto, cor = "#2196f3") {
    let modal = document.getElementById("modalAviso");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modalAviso";
        modal.innerHTML = `<button onclick="fecharModal()">×</button><span id="modalTexto"></span>`;
        modal.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 250px;
        max-width: 350px;
        background: #fff;
        border-left: 5px solid ${cor};
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        padding: 15px 20px;
        z-index: 9999;
        font-family: sans-serif;
        display: none;
        border-radius: 5px;
        color: #333;
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = "block";
    modal.querySelector("button").style.cursor = "pointer";
    modal.querySelector("span").innerHTML = texto;

    setTimeout(() => {
        modal.style.display = "none";
    }, 3000);
}

// =============================
// LOADING GLOBAL
// =============================
function showLoading(texto = "Carregando...") {
    let loader = document.getElementById("globalLoader");

    if (!loader) {
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.innerHTML = `
        <div class="loaderBox">
        <div class="spinner"></div>
        <div class="loaderText">${texto}</div>
        </div>`;

        const style = document.createElement("style");
        style.innerHTML = `
        #globalLoader{
        position:fixed;
        top: 14rem;
        left: 0;
        right: 0;
        bottom: 0;
        background:rgba(255,255,255,0.7);
        backdrop-filter: blur(3px);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:99999;
        font-family:sans-serif;
        }
        .loaderBox{text-align:center;}
        .spinner{
        width:45px;
        height:45px;
        border:5px solid #ddd;
        border-top:5px solid #2196f3;
        border-radius:50%;
        animation:spin .8s linear infinite;
        margin:0 auto 10px;
        }
        @keyframes spin{
        from{transform:rotate(0deg);}
        to{transform:rotate(360deg);}
        }`;
        document.head.appendChild(style);
        document.body.appendChild(loader);
    } else {
        loader.querySelector(".loaderText").innerHTML = texto;
        loader.style.display = "flex";
    }
}

function hideLoading() {
    const loader = document.getElementById("globalLoader");
    if (loader) loader.style.display = "none";
}

// =============================
// FUNÇÃO MODAL DE CONFIRMAÇÃO
// =============================
function mostrarConfirmacao(texto, callback) {
    let modal = document.createElement("div");
    modal.style = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: sans-serif;
    `;

    modal.innerHTML = `
    <div style="background:#fff; padding:20px 30px; border-radius:8px; max-width:400px; text-align:center;">
    <p style="margin-bottom:20px;">${texto}</p>
    <button id="modalOk" style="margin-right:10px; padding:8px 16px; background:#4caf50; color:#fff; border:none; border-radius:4px; cursor:pointer;">OK</button>
    <button id="modalCancelar" style="padding:8px 16px; background:#e53935; color:#fff; border:none; border-radius:4px; cursor:pointer;">Cancelar</button>
    </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#modalOk").onclick = () => {
        callback(true);
        modal.remove();
    };

    modal.querySelector("#modalCancelar").onclick = () => {
        callback(false);
        modal.remove();
    };
}

// =============================
// LIMPAR PRODUTOS COM MODAL
// =============================
async function limparProdutosBanco() {
    mostrarConfirmacao("Tem certeza que deseja apagar TODOS os produtos?", async (res) => {
        if (!res) return;

        const {
            error
        } = await supabase.from("produtos").delete().not("id", "is", null);
        if (error) {
            console.error(error);
            mostrarModal("Erro ao limpar produtos", "#e53935");
            return;
        }

        mostrarModal("Produtos removidos com sucesso!", "#4caf50");
        renderAdminGrid();
    });
}

function fecharModal() {
    const modal = document.getElementById("modalAviso");
    if (modal) modal.style.display = "none";
}

// =============================
// NORMALIZADOR DE NCE
// =============================
function normalizarNCE(valor) {
    if (!valor) return null;
    const numeros = String(valor).match(/\d+/g);
    if (!numeros) return null;
    return numeros[numeros.length - 1].replace(/^0+/, "");
}

// =============================
// CONTROLE PAGINA
// =============================
let page = "home";

async function setPage(p) {
    if (p === "admin" && !(await isAdminLogado())) {
        page = "login";
    } else {
        page = p;
    }
    render();
}

// =============================
// AUTH ADMIN
// =============================
async function loginAdmin(email, senha) {
    const {
        error
    } = await supabase.auth.signInWithPassword({
            email, password: senha
        });
    if (error) return mostrarModal(error.message, "#e53935");
    setPage("admin");
}

async function logoutAdmin() {
    await supabase.auth.signOut();
    setPage("home");
}

async function isAdminLogado() {
    const {
        data
    } = await supabase.auth.getSession();
    return !!data.session;
}

// =============================
// DINHEIRO BR
// =============================
function dinheiroBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency", currency: "BRL"
    });
}

// =============================
// BUSCAR PRODUTOS OTIMIZADO (COM CACHE)
// =============================
async function getProdutosBanco(force = false) {

    // usa cache se existir
    if (cacheProdutos && !force) return cacheProdutos;

    const {
        data: produtos,
        error
    } = await supabase
    .from("produtos")
    .select("*")
    .order("descricao", {
        ascending: true
    });

    if (error) {
        console.log(error);
        return [];
    }

    const {
        data: imagens
    } = await supabase
    .from("produto_imagens")
    .select("produto_id,nce,url,id");

    // MAPA DE IMAGENS (muito mais rápido que filter)
    const mapa = {};

    for (const img of imagens || []) {
        const chave = img.produto_id || normalizarNCE(img.nce);

        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(img);
    }

    for (const p of produtos) {
        const chave = normalizarNCE(p.nce);
        p.produto_imagens = mapa[p.id] || mapa[chave] || [];
    }

    cacheProdutos = produtos;

    return produtos;
}


// =============================
// SALVAR PRODUTOS
// =============================
async function salvarProdutosBanco(produtos) {
    if (!produtos.length) return;

    const dados = produtos.map(p => ({
        nce: normalizarNCE(p.nce),
        descricao: p.descricao?.trim() || "",
        saldo: Number(p.saldo) || 0,
        preco: Number(p.preco) || 0
    })).filter(p => p.nce);

    const tamanhoLote = 500;

    for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);
        const {
            error
        } = await supabase.from("produtos").insert(lote);
        if (error) {
            console.error(error); mostrarModal("Erro ao salvar produtos — veja console", "#e53935"); return;
        }
    }

    mostrarModal("Importação finalizada!", "#4caf50");
}

// =============================
// PARSER TXT
// =============================
function parseTxt(text) {
    const linhas = text.split(/\r?\n/);
    const produtos = [];

    linhas.forEach(linha => {
        const clean = linha.trim();
        if (!clean.startsWith("*")) return;

        const conteudo = clean.replace(/^\*/, "").trim();
        const partes = conteudo.split(/\s+/);

        if (partes.length < 5) return;

        // =============================
        // PROCURA O PRIMEIRO NÚMERO GRANDE (>=5 dígitos)
        // =============================
        let nce = null;
        let indexNCE = -1;

        for (let i = 0; i < partes.length; i++) {
            if (/^\d{5,}$/.test(partes[i])) {
                nce = normalizarNCE(partes[i]);
                indexNCE = i;
                break;
            }
        }

        if (!nce) return;

        // =============================
        // SALDO E PREÇO NO FINAL
        // =============================
        const precoRaw = partes[partes.length - 1];
        const saldoRaw = partes[partes.length - 3];

        function limparNumero(valor) {
            if (!valor) return 0;

            valor = valor.trim();

            const temVirgula = valor.includes(",");
            const temPonto = valor.includes(".");

            // Caso 1: Tem vírgula e ponto (ex: 1,344.00)
            if (temVirgula && temPonto) {
                if (valor.lastIndexOf(",") > valor.lastIndexOf(".")) {
                    // Formato BR: 1.344,00
                    valor = valor.replace(/\./g, "").replace(",", ".");
                } else {
                    // Formato US: 1,344.00
                    valor = valor.replace(/,/g, "");
                }
            }

            // Caso 2: Só vírgula (ex: 1,22 ou 1,2)
            else if (temVirgula && !temPonto) {
                valor = valor.replace(",", ".");
            }

            // Caso 3: Só ponto (ex: 849.00)
            // já está correto

            return parseFloat(valor) || 0;
        }

        const preco = limparNumero(precoRaw);
        const saldo = limparNumero(saldoRaw);
        // =============================
        // DESCRIÇÃO = depois do NCE até o saldo
        // =============================
        const descricao = partes.slice(indexNCE + 1, partes.length - 3).join(" ").trim();

        console.log("NCE CERTO =>", nce);

        produtos.push({
            nce,
            descricao,
            saldo: isNaN(saldo) ? 0: saldo,
            preco: isNaN(preco) ? 0: preco
        });
    });

    return produtos;
}

// =============================
// ATUALIZAR BASE
// =============================
async function atualizarBase() {
    cacheProdutos = null; // limpa cache

    document.getElementById("duplicadosView").innerHTML = "";
    await renderAdminGrid();

    mostrarModal("Base atualizada!",
        "#4caf50");
}

// =============================
// UPLOAD IMAGEM
// =============================
async function uploadImagemProduto(produtoId, input) {
    const files = input.files;
    if (!files || !files.length) return;

    if (!produtoId) {
        mostrarModal("Produto inválido!", "#e53935");
        return;
    }

    showLoading("Enviando imagem(s)...");

    try {
        // 🔎 Busca NCE do produto
        const { data: produto, error: produtoError } = await supabase
            .from("produtos")
            .select("id,nce")
            .eq("id", produtoId)
            .single();

        if (produtoError || !produto) {
            console.error(produtoError);
            hideLoading();
            mostrarModal("Produto não encontrado!", "#e53935");
            return;
        }

        for (const file of files) {

            const nomeArquivo = `${produtoId}_${Date.now()}_${file.name}`;

            // 🔼 Upload
            const { error: uploadError } = await supabase
                .storage
                .from("produtos")
                .upload(nomeArquivo, file);

            if (uploadError) {
                console.error(uploadError);
                continue; // continua para próxima imagem
            }

            // 🔗 URL pública
            const { data } = supabase
                .storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);

            const url = data?.publicUrl;

            if (!url) {
                console.error("URL inválida");
                continue;
            }

            // 🚫 DUPLICIDADE (opcional mas recomendado)
            const { data: jaExiste } = await supabase
                .from("produto_imagens")
                .select("id")
                .eq("url", url)
                .maybeSingle();

            if (jaExiste) continue;

            // 💾 INSERT SEGURO
            const { error: insertError } = await supabase
                .from("produto_imagens")
                .insert({
                    produto_id: produto.id,   // 🔥 FORÇA ID CORRETO
                    nce: produto.nce,
                    url: url
                });

            if (insertError) {
                console.error(insertError);
                continue;
            }
        }

        mostrarModal("Imagem(s) enviada(s)!", "#4caf50");

    } catch (err) {
        console.error(err);
        mostrarModal("Erro inesperado no upload", "#e53935");
    }

    hideLoading();
    cacheProdutos = null;
    await renderAdminGrid();
}




// =============================
// DELETAR IMAGEM
// =============================
async function deletarImagem(id, produtoId) {
    if (!confirm("Excluir imagem?")) return;

    await supabase.from("produto_imagens").delete().eq("id", id);

    mostrarModal("Imagem removida!", "#e53935");

    cacheProdutos = null;
    await renderAdminGrid();
  
}

// =============================
// CARROSSEL GLOBAL
// =============================
const carouselIndex = {};
function nextImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]+1) % lista.length;
    const el = document.getElementById("img-"+produtoId); if (el) el.src = lista[carouselIndex[produtoId]].url;
}
function prevImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]-1+lista.length)%lista.length;
    const el = document.getElementById("img-"+produtoId); if (el) el.src = lista[carouselIndex[produtoId]].url;
}

// =============================
// RENDER CARROSSEL
// =============================
function renderCarousel(imagens, produtoId) {
    if (!window.carouselData) window.carouselData = {};
    window.carouselData[produtoId] = imagens || [];

    if (!imagens || !imagens.length) return `
    <div class="carousel" style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;margin-bottom:10px;">
    Sem imagem
    </div>
    `;

    return `
    <div class="carousel" style="display:flex;align-items:center;justify-content:center;">
    <button onclick="prevImg('${produtoId}')">◀</button>

    <img loading="lazy"
    id="img-${produtoId}"
    src="${imagens[0].url}"

    onclick="openZoom('${produtoId}', carouselIndex['${produtoId}'] || 0)"
    style="width:150px;height:150px;object-fit:cover;margin:0 10px;cursor:pointer;">

    <button onclick="nextImg('${produtoId}')">▶</button>
    </div>
    `;
}


// =============================
// ZOOM COM CARROSSEL (FIX UI)
// =============================
function openZoom(produtoId, index = 0) {
    const imagens = (window.carouselData || {})[produtoId];
    if (!imagens || !imagens.length) return;

    let atual = index;

    const modal = document.createElement("div");
    modal.style = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.95);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:99999;
    font-family:sans-serif;
    `;

    modal.innerHTML = `
    <!-- BOTÃO FECHAR -->
    <button id="zoomClose" style="
    position:absolute;
    top:60px;
    right:50px;
    font-size:18px;
    background:rgba(143, 143, 143, 0.55);
    color:#fff;
    border:2px solid #fff;
    width:100px;
    height:100px;
    border-radius:20px;
    font-size: 25px;
    cursor:pointer;
    z-index:100000;
    ">X</button>

    <!-- BOTÃO ANTERIOR -->
    <button id="zoomPrev" style="
    display:flex;
    align-items:center;
    justify-content:center;
    position:absolute;
    left:20px;
    top:50%;
    transform:translateY(-50%);
    font-size:45px;
    background:rgba(143, 143, 143, 0.97);
    color:rgb(0, 0, 0);
    border:none;
    width:70px;
    height:70px;
    border-radius:8px;
    cursor:pointer;
    z-index:100000;
    ">◀</button>

    <!-- IMAGEM -->
    <img id="zoomImg" src="${imagens[atual].url}"
    style="
    max-width:60%;
    max-height:60%;
    border-radius: 25px;
    object-fit:contain;
    z-index: -1;
    ">

    <!-- BOTÃO PRÓXIMO -->
    <button id="zoomNext" style="
    display:flex;
    align-items:center;
    justify-content:center;
    position:absolute;
    right:20px;
    top:50%;
    transform:translateY(-50%);
    font-size:45px;
    background:rgba(143, 143, 143, 0.97);
    color:rgb(0, 0, 0);
    border:none;
    width:70px;
    height:70px;
    border-radius:8px;
    cursor:pointer;
    z-index:100000;
    ">▶</button>
    `;

    document.body.appendChild(modal);

    // fechar apenas no X
    modal.querySelector("#zoomClose").onclick = () => modal.remove();

    modal.querySelector("#zoomNext").onclick = () => {
        atual = (atual + 1) % imagens.length;
        modal.querySelector("#zoomImg").src = imagens[atual].url;
    };

    modal.querySelector("#zoomPrev").onclick = () => {
        atual = (atual - 1 + imagens.length) % imagens.length;
        modal.querySelector("#zoomImg").src = imagens[atual].url;
    };
}            
    
// =============================
// DEBOUNCE (EVITA TRAVAMENTOS)
// =============================
function debounce(fn, delay = 300) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// =============================
// VIEWS
// =============================
function renderLogin() {
    return `
    <div class="container" style="max-width:400px">
    <h2>Login Admin</h2>
    <input class="input" id="emailAdmin" placeholder="Email"><br><br>
    <input class="input" id="senhaAdmin" type="password" placeholder="Senha"><br><br>
    <button onclick="loginAdmin(document.getElementById('emailAdmin').value,document.getElementById('senhaAdmin').value)">Entrar</button>
    </div>
    `;
}

function renderHome() {
    return `
    <div class="container">
    <h2>Sistema Catálogo Finance AUG</h2>
    <div id="totalCatalogo"></div>
    <button onclick="setPage('carrinho')" class="btn-carrinho" style="position:relative;">
  🛒 Ver Carrinho
  <span id="contadorCarrinho" style="
      position:absolute;
      top:-5px;
      right:-10px;
      background:red;
      color:white;
      border-radius:50%;
      padding:2px 6px;
      font-size:12px;
      font-weight:bold;
  ">0</span>
</button>
    <div class="box-input" style="padding: 1rem 0;">
    <input class="input" placeholder="Buscar por NCE ou DESCRIÇÃO" id="filtro" style="
    width: 300px;

    ">
    </div id="box-catalago">
    <div class="grid" id="catalogGrid"></div>
    </div>
    `;
}

function renderAdmin() {
    return `
    <div class="container">
    <div id="box-config">
    <button onclick="logoutAdmin()" style="font-weight:bold;">Sair</button>
    <button onclick="atualizarBase()" style="background:#2196f3;font-weight:bold;color:#ffff;">Atualizar Base</button>
    <h2>Admin produtos</h2>
    <div id="totalAdmin"></div>
    <input type="file" id="txtUpload">
    <input class="input" placeholder="Buscar por NCE ou DESCRIÇÃO" id="filtro" style="width:300px;">
    <div id="importInfo"></div>
    <div id="duplicadosView"></div>
    <div style="padding:1rem 0;">
    <button onclick="limparProdutosBanco()" style="background:#e53935; color:#ffff; font-weight:bold;">Limpar Produtos</button>
    </div>
    </div>
    <div class="grid" id="adminGrid"></div>
    </div>
    `;
}

// =============================
// RENDER PRINCIPAL
// =============================
async function render() {
    const app = document.getElementById("app");

    if (page === "login") {
        app.innerHTML = renderLogin();
    } 
    else if (page === "admin") {
        app.innerHTML = renderAdmin();
        setupAdmin();
    }
    else if (page === "carrinho") {
        app.innerHTML = renderCarrinho();
        setupCarrinho();
    }
    else if (page === "financiamento") {
        app.innerHTML = renderFinanciamento();
        calcularFinanciamento();
    }
    else {
        app.innerHTML = renderHome();
        setupCatalogo();
    }
}

// =============================
// ADMIN
// =============================
function setupAdmin() {
    const upload = document.getElementById("txtUpload");
    const filtro = document.getElementById("filtro");

    upload.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
    showLoading("Importando arquivo...");

    try {
        const novos = parseTxt(reader.result);

        await salvarProdutosBanco(novos);

        cacheProdutos = null;

        mostrarModal("Importação concluída!", "#4caf50");

        setTimeout(() => {
            window.location.reload(); // 🔥 atualização real
        }, 300);

    } catch (e) {
        console.error(e);
        mostrarModal("Erro durante importação.", "#e53935");
    }
};
        reader.readAsText(file);
    };

    filtro.oninput = debounce(renderAdminGrid, 300);
    renderAdminGrid();
}

async function renderAdminGrid() {
    showLoading("Carregando produtos...");

    const filtro = document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if (filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalAdmin").innerHTML = `Total produtos: ${produtos.length}`;

    document.getElementById("adminGrid").innerHTML = produtos.map(p => `
        <div class="card">
        <b>${p.descricao}</b>
        <div class="small">NCE ${p.nce} | Saldo ${p.saldo} | ${dinheiroBR(p.preco)}</div><br>
        <input type="file" multiple onchange="uploadImagemProduto('${p.id}', this)">
        <div style="margin-top:10px;">
        ${(p.produto_imagens || []).map(img => `
            <div style="display:inline-block;margin:5px;text-align:center;">
            <img loading="lazy" src="${img.url}" style="width:70px;height:70px;object-fit:cover;display:block;">
            <button style="background:#e53935;font-size:10px;padding:4px;" onclick="deletarImagem('${img.id}','${p.id}')">Excluir</button>
            </div>
            `).join("")}
        </div>
        <div class="small">${(p.produto_imagens || []).length} imagens</div>
        </div>
        `).join("");

    hideLoading();
}

// =============================
// CATALOGO
// =============================
function setupCatalogo() {
    document.getElementById("filtro").oninput = debounce(renderCatalogGrid, 300);
    renderCatalogGrid();
    atualizarContadorCarrinho();
}


async function renderCatalogGrid() {
    showLoading("Carregando catálogo...");

    const filtro = document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if (filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalCatalogo").innerHTML = `Total produtos: ${produtos.length}`;

    document.getElementById("catalogGrid").innerHTML = produtos.map(p => {
        const imagens = p.produto_imagens || [];
        return `
<div class="card">
    ${renderCarousel(imagens, p.id)}

    <b>${p.descricao}</b>

    <div class="small">
        NCE ${p.nce}<br>
        Saldo ${p.saldo}<br>
        <b>${dinheiroBR(p.preco)}</b>
    </div>

    <br>

    <button 
        onclick="addCarrinho('${p.id}')"
        style="
            color:#000000;
            border:none;
            padding:8px 12px;
            border-radius:5px;
            cursor:pointer;
            font-weight:bold;
            width:100%;
        ">
        🛒 Adicionar ao carrinho
    </button>
</div>
`;
    }).join("");

    hideLoading();
    atualizarContadorCarrinho(); // badge sempre atualizado
        }

// =============================
// LIMPAR PRODUTOS
// =============================
async function limparProdutosBanco() {
    mostrarConfirmacao("Tem certeza que deseja apagar TODOS os produtos?", async (res) => {
        if (!res) return;

        showLoading("Apagando produtos...");

        const {
            error
        } = await supabase
        .from("produtos")
        .delete()
        .not("id", "is", null);

        if (error) {
            console.error(error);
            mostrarModal("Erro ao limpar produtos", "#e53935");
            hideLoading();
            return;
        }

        mostrarModal("Produtos removidos com sucesso!", "#4caf50");

        setTimeout(() => {
            window.location.reload(); // 🔥 RECARREGA A PÁGINA
        }, 800);
    });
}


// =============================
// RELIGAR IMAGENS PELO NCE
// =============================
async function religarImagensPorNCE() {
    showLoading("Religando imagens...");

    const { data: produtos } = await supabase
        .from("produtos")
        .select("id,nce");

    const { data: imagens } = await supabase
        .from("produto_imagens")
        .select("id,nce,produto_id");

    if (!produtos || !imagens) {
        hideLoading();
        return;
    }

    // 🔎 Mapa NCE → produtoId
    const mapa = {};
    for (const p of produtos) {
        const chave = normalizarNCE(p.nce);
        if (!chave) continue;
        mapa[chave] = p.id; // um NCE = um produto
    }

    for (const img of imagens) {

        // só corrige se estiver null
        if (img.produto_id) continue;

        const chave = normalizarNCE(img.nce);
        if (!chave) continue;

        const novoId = mapa[chave];
        if (!novoId) continue;

        await supabase
            .from("produto_imagens")
            .update({ produto_id: novoId })
            .eq("id", img.id);
    }

    hideLoading();
    mostrarModal("Religação finalizada!", "#4caf50");

    cacheProdutos = null;
    await renderAdminGrid();
}


            // ===============================
// UTILITÁRIOS
// ===============================
function dinheiroBR(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ===============================
// CARRINHO
// ===============================
function renderCarrinho() {
    return `
    <div class="container">
        <h2>🛒 Carrinho</h2>

        <button onclick="setPage('home')">← Voltar</button>
        <br><br>
        <div id="listaCarrinho"></div>
        <br>
        <button onclick="setPage('financiamento')">Ir para Financiamento</button>
    </div>
    `;
}

function setupCarrinho() {
    const lista = document.getElementById("listaCarrinho");
    let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");

    if (carrinho.length === 0) {
        lista.innerHTML = "<p>Seu carrinho está vazio.</p>";
        atualizarContadorCarrinho();
        return;
    }

    fetchProdutosCarrinho(carrinho).then(produtos => {
        lista.innerHTML = "";
        let totalCarrinho = 0;

        carrinho.forEach(item => {
            const produto = produtos.find(p => p.id === item.id);
            if (!produto) return;

            const subtotal = produto.preco * item.qtd;
            totalCarrinho += subtotal;

            lista.innerHTML += `
            <div class="card" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;" id="item-${produto.id}">
                <div>
                    <b>${produto.descricao}</b><br>
                    Preço unitário: ${dinheiroBR(produto.preco)}<br>
                    Subtotal: <span id="subtotal-${produto.id}">${dinheiroBR(subtotal)}</span>
                </div>
                <div>
                    <button onclick="diminuirQtd('${produto.id}', ${produto.preco})">-</button>
                    <span id="qtd-${produto.id}" style="margin:0 5px;">${item.qtd}</span>
                    <button onclick="aumentarQtd('${produto.id}', ${produto.preco})">+</button>
                    <button onclick="removerCarrinho('${produto.id}')">Remover</button>
                </div>
            </div>`;
        });

        lista.innerHTML += `
        <div style="margin-top:20px; font-weight:bold; font-size:18px;">
            Total: <span id="totalCarrinho">${dinheiroBR(totalCarrinho)}</span>
        </div>`;

        atualizarContadorCarrinho();
    });
}

async function fetchProdutosCarrinho(carrinho) {
    const { data: produtos } = await supabase.from("produtos").select("*");
    return produtos;
}

function removerCarrinho(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    carrinho = carrinho.filter(p => p.id !== id);
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    render();
    atualizarContadorCarrinho();
}

function addCarrinho(id) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    const item = carrinho.find(p => p.id === id);
    if (item) item.qtd++;
    else carrinho.push({ id, qtd: 1 });

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    mostrarModal("Produto adicionado!", "#4caf50");
    atualizarContadorCarrinho();
}

function atualizarTotalCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    fetchProdutosCarrinho(carrinho).then(produtos => {
        let total = 0;
        carrinho.forEach(item => {
            const produto = produtos.find(p => p.id === item.id);
            if (!produto) return;
            total += produto.preco * item.qtd;
        });
        const el = document.getElementById("totalCarrinho");
        if (el) el.textContent = dinheiroBR(total);
    });
}

function aumentarQtd(id, preco) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    const item = carrinho.find(p => p.id === id);
    if (!item) return;
    item.qtd++;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    document.getElementById(`qtd-${id}`).textContent = item.qtd;
    document.getElementById(`subtotal-${id}`).textContent = dinheiroBR(item.qtd * preco);
    atualizarTotalCarrinho();
    atualizarContadorCarrinho();
}

function diminuirQtd(id, preco) {
    let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    const item = carrinho.find(p => p.id === id);
    if (!item) return;
    if (item.qtd > 1) item.qtd--;
    else {
        carrinho = carrinho.filter(p => p.id !== id);
        const elem = document.getElementById(`item-${id}`);
        if (elem) elem.remove();
    }
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    if (item.qtd > 0) {
        document.getElementById(`qtd-${id}`).textContent = item.qtd;
        document.getElementById(`subtotal-${id}`).textContent = dinheiroBR(item.qtd * preco);
    }
    atualizarTotalCarrinho();
    atualizarContadorCarrinho();
}

function atualizarContadorCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    const badge = document.getElementById("contadorCarrinho");
    if (badge) badge.textContent = carrinho.length || 0;
}

// ===============================
// FINANCIAMENTO AUTOMÁTICO LOJA
// ===============================
function renderFinanciamento() {
    return `
    <div class="container">
        <h2>💰 Financiamento</h2>

        <button onclick="setPage('carrinho')">← Voltar</button>
        <br><br>

        Taxa de juros (%):
        <input id="taxa" value="11.9" oninput="calcularFinanciamentoLoja()">
        <br><br>

        Entrada:
        <input id="entrada" value="R$ 0,00" oninput="formatarEntrada()">
        <br><br>

        Parcelas:
        <select id="parcelas" onchange="calcularFinanciamentoLoja()">
            ${[...Array(12)].map((_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join("")}
        </select>

        <div id="resultadoFinanciamento" style="margin-top:20px; font-weight:bold;"></div>
    </div>`;
}

// Formata o input de entrada em reais e recalcula
function formatarEntrada() {
    const input = document.getElementById("entrada");
    let valor = input.value.replace(/\D/g, ""); // remove tudo que não for número
    let numero = parseFloat(valor) / 100 || 0;   // converte centavos
    input.value = numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    calcularFinanciamentoLoja();
}

// Calcula financiamento com base na tabela de coeficientes da loja
async function calcularFinanciamentoLoja() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    if (carrinho.length === 0) {
        document.getElementById("resultadoFinanciamento").innerHTML = "<b>Seu carrinho está vazio</b>";
        return;
    }

    // entrada em número
    const entradaStr = document.getElementById("entrada").value.replace(/\D/g,"");
    const entrada = parseFloat(entradaStr)/100 || 0;

    // número de parcelas
    const parcelas = parseInt(document.getElementById("parcelas").value) || 1;

    // busca produtos
    const { data: produtos } = await supabase.from("produtos").select("*");
    let totalProdutos = 0;
    carrinho.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if(produto) totalProdutos += parseFloat(produto.preco) * item.qtd;
    });

    // tabela de coeficientes reais 11,9% (exemplo)
    const tabelaCoeficientes = {
        1: 1,     // 1 parcela = preço à vista
        2: 1,     // 2 parcelas = preço à vista
        3: 1,     // 3 parcelas = preço à vista
        4: 0.3285,
        5: 0.2767,
        6: 0.2425,
        7: 0.2184,
        8: 0.2006,
        9: 0.1870,
        10: 0.1763,
        11: 0.1677,
        12: 0.16    // exemplo, ajuste conforme tabela real da loja
    };

    // pega coeficiente para a quantidade de parcelas
    const coef = tabelaCoeficientes[parcelas] || 1;

    // calcula valor da parcela e total do contrato
    let valorParcela = totalProdutos * coef;
    let totalContrato = valorParcela * parcelas;

    // calcula juros aplicado
    const juros = totalContrato - (totalProdutos - entrada);

    // mostra resultado formatado
    document.getElementById("resultadoFinanciamento").innerHTML = `
        Valor financiado: ${totalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Entrada: ${entrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Parcelas: ${parcelas}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Juros: ${juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        <b>Total do contrato: ${totalContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
    `;
}

// Função para formatar a entrada em real brasileiro e recalcular
function formatarEntrada() {
    const input = document.getElementById("entrada");
    let valor = input.value;

    // Remove tudo que não for número
    valor = valor.replace(/\D/g, "");

    // Converte para número em centavos
    let numero = parseFloat(valor) / 100 || 0;

    // Atualiza input formatado em real
    input.value = numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Recalcula financiamento automaticamente
    calcularFinanciamentoLoja();
}

// Função principal de cálculo usando coeficientes reais da loja
async function calcularFinanciamentoLoja() {
    const carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");
    if (carrinho.length === 0) {
        document.getElementById("resultadoFinanciamento").innerHTML = "<b>Seu carrinho está vazio</b>";
        return;
    }

    // Entrada
    const entradaStr = document.getElementById("entrada").value.replace(/\D/g,"");
    const entrada = parseFloat(entradaStr)/100 || 0;

    const parcelas = parseInt(document.getElementById("parcelas").value) || 1;

    // Busca produtos do carrinho
    const { data: produtos } = await supabase.from("produtos").select("*");
    let totalProdutos = 0;
    carrinho.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) totalProdutos += parseFloat(produto.preco) * item.qtd;
    });

    const valorFinanciado = totalProdutos - entrada;
    if (valorFinanciado <= 0) {
        document.getElementById("resultadoFinanciamento").innerHTML = "<b>Valor do financiamento inválido</b>";
        return;
    }

    // Coeficientes reais 11,9% (igual sistema da loja)
    const coeficientes = {
        1: 1.0, // parcelas 1-3 preço à vista
        2: 1.0,
        3: 1.0,
        4: 0.3285,
        5: 0.2767,
        6: 0.2425,
        7: 0.2184,
        8: 0.2006,
        9: 0.1870,
        10: 0.1763,
        11: 0.1677,
        12: 0.1600 // ajuste se necessário
    };

    const coef = coeficientes[parcelas] || 1.0;

    let valorParcela, totalContrato;

    if (parcelas <= 3) {
        valorParcela = valorFinanciado / parcelas;
        totalContrato = valorFinanciado;
    } else {
        valorParcela = valorFinanciado * coef;
        totalContrato = valorParcela * parcelas;
    }

    const juros = totalContrato - valorFinanciado;

    document.getElementById("resultadoFinanciamento").innerHTML = `
        Valor financiado: ${valorFinanciado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Entrada: ${entrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Parcelas: ${parcelas}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        Juros: ${juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
        <b>Total do contrato: ${totalContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
    `;
} 


// =============================
// START
// =============================
setPage("home");
