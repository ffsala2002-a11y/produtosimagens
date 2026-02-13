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
// MODAL NOTIFICAÇÃO
// =============================
function mostrarModal(texto, cor="#2196f3") {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return mostrarModal(error.message, "#e53935");
    setPage("admin");
}

async function logoutAdmin() {
    await supabase.auth.signOut();
    setPage("home");
}

async function isAdminLogado() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
}

// =============================
// DINHEIRO BR
// =============================
function dinheiroBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// =============================
// BUSCAR PRODUTOS + IMAGENS
// =============================
async function getProdutosBanco() {
    let todos = [];
    let inicio = 0;
    const tamanho = 1000;

    while (true) {
        const { data, error } = await supabase.from("produtos")
            .select("*")
            .range(inicio, inicio + tamanho - 1)
            .order("descricao");

        if (error) { console.log(error); break; }
        if (!data || data.length === 0) break;

        todos = [...todos, ...data];
        inicio += tamanho;
    }

    const { data: imagens } = await supabase.from("produto_imagens")
        .select("produto_id, nce, url, id");

    for (const p of todos) {
        const chave = normalizarNCE(p.nce);
        p.produto_imagens = (imagens || []).filter(img => img.produto_id === p.id || normalizarNCE(img.nce) === chave);
    }

    return todos;
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
        const { error } = await supabase.from("produtos").insert(lote);
        if (error) { console.error(error); mostrarModal("Erro ao salvar produtos — veja console", "#e53935"); return; }
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

        const nce = normalizarNCE(partes[0]);
        const precoRaw = partes[partes.length - 1];
        const saldoRaw = partes[partes.length - 3];
        const saldo = parseFloat(saldoRaw.replace(",", "."));
        const preco = parseFloat(precoRaw.replace(",", "."));
        const descricao = partes.slice(1, partes.length - 3).join(" ").trim();

        produtos.push({ nce, descricao, saldo: isNaN(saldo) ? 0 : saldo, preco: isNaN(preco) ? 0 : preco });
    });

    return produtos;
}

// =============================
// ATUALIZAR BASE
// =============================
async function atualizarBase() {
    document.getElementById("duplicadosView").innerHTML = "";
    await renderAdminGrid();
    mostrarModal("Base atualizada!", "#4caf50");
}

// =============================
// UPLOAD IMAGEM
// =============================
async function uploadImagemProduto(produtoId, input) {
    const files = input.files;
    if (!files || !files.length) return;

    const { data: produto } = await supabase.from("produtos").select("nce").eq("id", produtoId).single();

    for (const file of files) {
        const nomeArquivo = produtoId + "_" + Date.now() + "_" + file.name;

        const { error: uploadError } = await supabase.storage.from("produtos").upload(nomeArquivo, file);
        if (uploadError) { console.error(uploadError); mostrarModal("Erro upload: " + uploadError.message, "#e53935"); return; }

        const publicUrlData = supabase.storage.from("produtos").getPublicUrl(nomeArquivo);
        const url = publicUrlData?.data?.publicUrl;

        const { error: insertError } = await supabase.from("produto_imagens").insert({ produto_id: produtoId, nce: produto?.nce, url });
        if (insertError) { console.error(insertError); mostrarModal("Erro ao salvar imagem", "#e53935"); return; }
    }

    mostrarModal("Imagem enviada!", "#4caf50");
    renderAdminGrid();
}

// =============================
// DELETAR IMAGEM
// =============================
async function deletarImagem(id, produtoId) {
    if (!confirm("Excluir imagem?")) return;

    await supabase.from("produto_imagens").delete().eq("id", id);
    mostrarModal("Imagem removida!", "#e53935");
    renderAdminGrid();
}

// =============================
// CARROSSEL GLOBAL
// =============================
const carouselIndex = {};
function nextImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]+1) % lista.length;
    const el = document.getElementById("img-"+produtoId); if(el) el.src = lista[carouselIndex[produtoId]].url;
}
function prevImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]-1+lista.length)%lista.length;
    const el = document.getElementById("img-"+produtoId); if(el) el.src = lista[carouselIndex[produtoId]].url;
}

// =============================
// RENDER CARROSSEL
// =============================
function renderCarousel(imagens, produtoId) {
    if (!window.carouselData) window.carouselData = {};
    window.carouselData[produtoId] = imagens || [];

    if (!imagens || !imagens.length) return `
        <div class="carousel" style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;margin-bottom:10px;">Sem imagem</div>
    `;

    return `
    <div class="carousel" style="display:flex;align-items:center;justify-content:center;">
        <button onclick="prevImg('${produtoId}')">◀</button>
        <img id="img-${produtoId}" src="${imagens[0].url}" onclick="openZoom('${imagens[0].url}')" style="width:150px;height:150px;object-fit:cover;margin:0 10px;cursor:pointer;">
        <button onclick="nextImg('${produtoId}')">▶</button>
    </div>
    `;
}

// =============================
// ZOOM
// =============================
function openZoom(url) {
    const modal = document.createElement("div");
    modal.style = `position:fixed; inset:0; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9999;`;
    modal.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;cursor:zoom-out;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
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
    <h2>Imagens de Produtos</h2>
    <div id="totalCatalogo"></div>
    <input class="input" placeholder="Buscar" id="filtro">
    <div class="grid" id="catalogGrid"></div>
    </div>
    `;
}

function renderAdmin() {
    return `
    <div class="container">
    <button onclick="logoutAdmin()">Sair</button>
    <button onclick="atualizarBase()" style="background:#2196f3">Atualizar Base</button>
    <h2>Admin Produtos</h2>
    <div id="totalAdmin"></div>
    <input type="file" id="txtUpload">
    <input class="input" placeholder="Filtrar" id="filtro">
    <div id="importInfo"></div>
    <div id="duplicadosView"></div>
    <button onclick="limparProdutosBanco()" style="background:#e53935">Limpar Produtos</button>
    <div class="grid" id="adminGrid"></div>
    </div>
    `;
}

// =============================
// RENDER PRINCIPAL
// =============================
async function render() {
    const app = document.getElementById("app");
    if(page==="login"){ app.innerHTML=renderLogin(); }
    else if(page==="admin"){ app.innerHTML=renderAdmin(); setupAdmin(); }
    else { app.innerHTML=renderHome(); setupCatalogo(); }
}

// =============================
// ADMIN
// =============================
function setupAdmin() {
    const upload=document.getElementById("txtUpload");
    const filtro=document.getElementById("filtro");

    upload.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            const novos = parseTxt(reader.result);
            await salvarProdutosBanco(novos);
            await religarImagensPorNCE();
            await atualizarBase();
            document.getElementById("importInfo").innerHTML = `Importação concluída<br>Total lidos: ${novos.length}`;
        };
        reader.readAsText(file);
    };

    filtro.oninput = renderAdminGrid;
    renderAdminGrid();
}

async function renderAdminGrid() {
    const filtro=document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if(filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalAdmin").innerHTML=`Total: ${produtos.length}`;

    document.getElementById("adminGrid").innerHTML=produtos.map(p => `
        <div class="card">
        <b>${p.descricao}</b>
        <div class="small">NCE ${p.nce} | Saldo ${p.saldo} | ${dinheiroBR(p.preco)}</div><br>
        <input type="file" multiple onchange="uploadImagemProduto('${p.id}', this)">
        <div style="margin-top:10px;">
        ${(p.produto_imagens||[]).map(img=>`
            <div style="display:inline-block;margin:5px;text-align:center;">
                <img src="${img.url}" style="width:70px;height:70px;object-fit:cover;display:block;">
                <button style="background:#e53935;font-size:10px;padding:4px;" onclick="deletarImagem('${img.id}','${p.id}')">Excluir</button>
            </div>
        `).join("")}
        </div>
        <div class="small">${(p.produto_imagens||[]).length} imagens</div>
        </div>
    `).join("");
}

// =============================
// CATALOGO
// =============================
function setupCatalogo() {
    document.getElementById("filtro").oninput = renderCatalogGrid;
    renderCatalogGrid();
}

async function renderCatalogGrid() {
    const filtro=document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if(filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalCatalogo").innerHTML=`Total: ${produtos.length}`;

    document.getElementById("catalogGrid").innerHTML=produtos.map(p=>{
        const imagens=p.produto_imagens||[];
        return `<div class="card">${renderCarousel(imagens,p.id)}<b>${p.descricao}</b>
            <div class="small">NCE ${p.nce}<br>Saldo ${p.saldo}<br><b>${dinheiroBR(p.preco)}</b></div></div>`;
    }).join("");
}

// =============================
// LIMPAR PRODUTOS
// =============================
async function limparProdutosBanco() {
    if(!confirm("Tem certeza que deseja apagar TODOS os produtos?")) return;

    const { error } = await supabase.from("produtos").delete().not("id","is",null);
    if(error){ console.error(error); mostrarModal("Erro ao limpar produtos","#e53935"); return; }

    mostrarModal("Produtos removidos com sucesso!","#4caf50");
    renderAdminGrid();
}

// =============================
// RELIGAR IMAGENS PELO NCE
// =============================
async function religarImagensPorNCE() {
    const { data: produtos } = await supabase.from("produtos").select("id,nce");
    const { data: imagens } = await supabase.from("produto_imagens").select("id,nce");
    if(!produtos||!imagens) return;

    const mapa={};
    for(const p of produtos){
        const chave=normalizarNCE(p.nce);
        if(!chave) continue;
        if(!mapa[chave]) mapa[chave]=[];
        mapa[chave].push(p.id);
    }

    for(const img of imagens){
        const chave=normalizarNCE(img.nce);
        if(!chave) continue;
        const listaIds=mapa[chave]; if(!listaIds) continue;
        for(const novoId of listaIds){
            await supabase.from("produto_imagens").update({produto_id:novoId}).eq("id",img.id);
        }
    }
}

// =============================
// START
// =============================
setPage("home");
