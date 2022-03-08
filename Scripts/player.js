const redirect_uri = "http://127.0.0.1:5500/Views/player.html";
const client_id = "your_cliente_id";
const client_secret = "your_client_secret";
const autorizarEndPoint = "https://accounts.spotify.com/authorize"
const tokenEndPoint = "https://accounts.spotify.com/api/token";
const dispositivosEndPoint = "https://api.spotify.com/v1/me/player/devices";
const tocarEndPoint = "https://api.spotify.com/v1/me/player/play";
const pausarEndPoint = "https://api.spotify.com/v1/me/player/pause";
const pularMusicaEndPoint = "https://api.spotify.com/v1/me/player/next";
const voltarMusicaEndPoint = "https://api.spotify.com/v1/me/player/previous";
const playerEndPoint = "https://api.spotify.com/v1/me/player";
const mudarPosicaoEndPoint = "https://api.spotify.com/v1/me/player/seek";
let access_token = null;
let device_id = null;

inicializar = function() {
    access_token = localStorage.getItem("access_token");
    const redirecionar = localStorage.getItem("redirecionar");

    if (redirecionar == "true") {
        redirecionamento();
    } else if (access_token == null) {
        autorizarToken();
    } else {
        atualizarDispositivos();
    }

};

autorizarToken = function() {
    let url = autorizarEndPoint;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    localStorage.setItem("redirecionar", true);
    window.location.href = url;
};

redirecionamento = function() {
    let codigo = pegarCodigo();
    buscarTokenDeAcesso(codigo);
}

pegarCodigo = function() {
    let codigo = null;
    const texto = window.location.search;
    if (texto.length > 0) {
        const urlParams = new URLSearchParams(texto);
        codigo = urlParams.get('code')
    }
    return codigo;
}

buscarTokenDeAcesso = function(codigo) {
    let corpo = "grant_type=authorization_code";
    corpo += "&code=" + codigo;
    corpo += "&redirect_uri=" + encodeURI(redirect_uri);
    corpo += "&client_id=" + client_id;
    corpo += "&client_secret=" + client_secret;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", tokenEndPoint, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(corpo);
    xhr.onload = respostaTokenAcesso;
}

respostaTokenAcesso = function() {
    localStorage.setItem("redirecionar", false);
    if (this.status == 200) {
        const data = JSON.parse(this.responseText);
        if (data.access_token != undefined) {
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token != undefined) {
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        inicializar();
    }
}

atualizarDispositivos = function() {
    requisicaoApi('GET', dispositivosEndPoint, null, respostaDispositivos);
}

respostaDispositivos = function() {

    if (this.status == 200) {
        const dispositivosArray = JSON.parse(this.responseText).devices;
        if (dispositivosArray.length == 0) {
            ocultarDispositivosTela();
        } else {
            mostrarDispositivosTela(dispositivosArray);
        }
    } else {
        autorizarToken().then(function() {
            redirecionamento();
        });
    }
}

ocultarDispositivosTela = function() {
    document.getElementById('zero-dispositivos').style.display = 'block';
}

mostrarDispositivosTela = function(dispositivosArray) {

    document.getElementById('tabelaDispositivos').style.display = 'inline-table';
    const tabelaDispositivo = document.getElementById('bodyTabelaDispositivos');

    for (let index = 0; index < dispositivosArray.length; index++) {
        let tr = document.createElement('tr');
        tr.append(criarNomeDispositivo(dispositivosArray[index].name));
        tr.append(criarTipoDispositivo(dispositivosArray[index].type));
        tr.append(criarBotaoConectarDispositivo(dispositivosArray[index].id));
        tabelaDispositivo.append(tr);
    }
}

criarNomeDispositivo = function(nomeValue) {
    let nome = document.createElement('td');
    nome.innerHTML = nomeValue;
    return nome;
}

criarTipoDispositivo = function(tipoValue) {
    let tipo = document.createElement('td');
    tipo.innerHTML = tipoValue;
    return tipo;
}

criarBotaoConectarDispositivo = function(idDispositivo) {
    let botaoTd = document.createElement('td');
    let botaoConectar = document.createElement('button');
    botaoConectar.onclick = conectarDispositivo;
    botaoConectar.className = 'button';
    botaoConectar.id = idDispositivo;
    botaoConectar.innerHTML = 'Conectar';
    botaoTd.append(botaoConectar)
    return botaoTd;
}

conectarDispositivo = function() {
    device_id = this.id;
    document.getElementById('dispositivos').style.display = 'none';
    setInterval(chamarPlayer, 100);
}

chamarPlayer = function() {
    requisicaoApi('GET', playerEndPoint, null, respostaPlayer);
}

respostaPlayer = function() {
    if (this.status == 200) {
        const data = JSON.parse(this.responseText);
        calcularTempoMusica(data.item.duration_ms, data.progress_ms);
        rotaDoRangeTempoMusica(data.item.duration_ms, data.progress_ms);
        const musicaAtual = data.item;
        botaoPausarPlay(data.is_playing);
        criarPlayer(musicaAtual);
        document.getElementById('dispositivo-conectado').innerHTML = "Conectado no dispositivo: " + data.device.name;
    }
}

calcularTempoMusica = function(duracaoTotal, duracaoAtual) {
    let segundosAtual = ((duracaoAtual % 60000) / 1000).toFixed(0);
    let minutosAtual = Math.floor(duracaoAtual / 60000);

    segundosAtual = segundosAtual < 10 ? '0' + segundosAtual : segundosAtual;
    document.getElementById('posicao-atual').innerHTML = minutosAtual +
        ':' + segundosAtual;

    let segundosRestante = ((duracaoTotal % 60000) / 1000).toFixed(0) - segundosAtual;
    let minutosRestante = Math.floor(duracaoTotal / 60000) - minutosAtual;

    if (segundosRestante < 0) {
        segundosRestante = 60 + segundosRestante;
        minutosRestante -= 1;
    }

    segundosRestante = segundosRestante < 10 ? '0' + segundosRestante : segundosRestante;
    document.getElementById('posicao-restante').innerHTML = minutosRestante +
        ':' + segundosRestante;
}

rotaDoRangeTempoMusica = function(duracaoTotal, duracaoAtual) {
    let inputRange = document.getElementById('tempo-range');
    inputRange.max = duracaoTotal;
    inputRange.value = duracaoAtual;
};

converterParaInteiro = function(valor) {
    return Math.floor(valor);
}

converterMsParaSeg = function(tempoEmMs) {
    return tempoEmMs / 1000;
}

botaoPausarPlay = function(estaTocandoMusica) {
    if (!estaTocandoMusica) {
        document.getElementById('tocar').style.display = 'inline-block';
        document.getElementById('pausar').style.display = 'none';
    } else {
        document.getElementById('tocar').style.display = 'none';
        document.getElementById('pausar').style.display = 'inline-block';

    }
}

tocarMusica = function() {
    requisicaoApi('PUT', tocarEndPoint, null, respostaPlayer);
}

criarPlayer = function(musicaAtual) {
    document.getElementById('music-player').style.display = 'block';
    preencherNomeMusica(musicaAtual.name);
    preencherArtistas(musicaAtual.artists);
    preencherCapaAlbum(musicaAtual.album.images[1].url);
}

pausarMusica = function() {
    requisicaoApi('PUT', pausarEndPoint + "?device_id=" + device_id, null, respostaRequisicao);
}

requisicaoApi = function(tipo, funcionalidade, corpo, resposta) {
    let xhr = new XMLHttpRequest();
    xhr.open(tipo, funcionalidade, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(corpo);
    xhr.onload = resposta;
}

respostaRequisicao = function() {
    if (this.status == 200) {}
}

preencherArtistas = function(artistasArray) {
    let artistas = "";
    for (let index = 0; index < artistasArray.length; index++) {
        if (artistas != "") {
            artistas = artistas + ", ";
            artistas = artistas + artistasArray[index].name;
        } else {
            artistas = artistasArray[index].name;
        }
    }
    document.getElementById('artista').innerHTML = artistas;
}

preencherNomeMusica = function(nomeMusica) {
    document.getElementById('nome-musica').innerHTML = nomeMusica;
}

preencherCapaAlbum = function(capaAlbum) {
    document.getElementById('capa-album').src = capaAlbum;
}

pularMusica = function() {
    requisicaoApi('POST', pularMusicaEndPoint + "?device_id=" + device_id, null, respostaRequisicao);
}

voltarMusica = function() {
    requisicaoApi('POST', voltarMusicaEndPoint + "?device_id=" + device_id, null, respostaRequisicao);
}

mudarPosicao = function(posicao) {
    document.getElementById('tempo-range').value = posicao;
    requisicaoApi('PUT', mudarPosicaoEndPoint + "?position_ms=" + posicao + "&device_id=" + device_id, null, respostaRequisicao);
}