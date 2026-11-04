"""Sistema Loja Escolar Modelo - servidor local (nome fictício para portfólio). Só usa a biblioteca padrão do Python (3.8+)."""
import json, re, shutil, sqlite3, sys, threading, webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE = Path(__file__).parent
DB = BASE / "dados" / "loja.db"
PORTA = 8765

SCHEMA = """
CREATE TABLE IF NOT EXISTS funcionarios(id INTEGER PRIMARY KEY, nome TEXT UNIQUE NOT NULL, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS alunos(id INTEGER PRIMARY KEY, nome TEXT NOT NULL, turma TEXT NOT NULL, ano INTEGER NOT NULL, UNIQUE(nome, turma, ano));
CREATE TABLE IF NOT EXISTS produtos(id INTEGER PRIMARY KEY, nome TEXT UNIQUE NOT NULL, observacao TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS variacoes(id INTEGER PRIMARY KEY, produto_id INTEGER NOT NULL REFERENCES produtos(id),
  tamanho TEXT NOT NULL, preco_centavos INTEGER NOT NULL, estoque INTEGER NOT NULL DEFAULT 0, estoque_minimo INTEGER NOT NULL DEFAULT 3);
CREATE TABLE IF NOT EXISTS vendas(id INTEGER PRIMARY KEY, data TEXT NOT NULL, aluno_id INTEGER NOT NULL REFERENCES alunos(id),
  funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id), pagamento TEXT NOT NULL, parcelas INTEGER DEFAULT 1,
  total_centavos INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ativa');
CREATE TABLE IF NOT EXISTS venda_itens(id INTEGER PRIMARY KEY, venda_id INTEGER NOT NULL REFERENCES vendas(id),
  variacao_id INTEGER NOT NULL REFERENCES variacoes(id), quantidade INTEGER NOT NULL, preco_centavos INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS mov_estoque(id INTEGER PRIMARY KEY, data TEXT NOT NULL, variacao_id INTEGER NOT NULL, delta INTEGER NOT NULL, motivo TEXT NOT NULL, venda_id INTEGER);
CREATE TABLE IF NOT EXISTS chaves(id INTEGER PRIMARY KEY, numero TEXT UNIQUE NOT NULL, descricao TEXT DEFAULT '', copias INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS chave_mov(id INTEGER PRIMARY KEY, chave_id INTEGER NOT NULL REFERENCES chaves(id),
  funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id), registrado_por_id INTEGER NOT NULL REFERENCES funcionarios(id),
  saida TEXT NOT NULL, retorno TEXT, recebido_por_id INTEGER REFERENCES funcionarios(id));
"""

PAGAMENTOS = ("Débito", "Crédito", "Pix", "Dinheiro")

def agora(): return datetime.now().isoformat(timespec="seconds")

def conectar():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; c.execute("PRAGMA foreign_keys=ON"); return c

def iniciar():
    DB.parent.mkdir(exist_ok=True)
    if DB.exists():  # backup a cada abertura, guarda os 30 mais recentes
        pasta = DB.parent / "backups"; pasta.mkdir(exist_ok=True)
        shutil.copy(DB, pasta / f"loja_{datetime.now():%Y%m%d_%H%M%S}.db")
        for velho in sorted(pasta.glob("*.db"))[:-30]: velho.unlink()
    with conectar() as c:
        c.executescript(SCHEMA)
        if not c.execute("SELECT 1 FROM produtos").fetchone():  # carga inicial do catálogo antigo
            for p in json.loads((BASE / "catalogo.json").read_text(encoding="utf-8")):
                pid = c.execute("INSERT INTO produtos(nome, observacao) VALUES(?,?)", (p["nome"], p["observacao"])).lastrowid
                for v in p["variacoes"]:
                    c.execute("INSERT INTO variacoes(produto_id, tamanho, preco_centavos, estoque) VALUES(?,?,?,?)",
                              (pid, v["tamanho"], round(v["preco"] * 100), v["estoque"]))

def linhas(c, sql, *a): return [dict(r) for r in c.execute(sql, a)]

# ---------- rotas ----------
def get_catalogo(c, q):
    prods = linhas(c, "SELECT * FROM produtos ORDER BY id")
    for p in prods: p["variacoes"] = linhas(c, "SELECT * FROM variacoes WHERE produto_id=? ORDER BY id", p["id"])
    return prods

def post_estoque(c, d):  # entrada de mercadoria ou ajuste: define a nova quantidade
    v = c.execute("SELECT estoque FROM variacoes WHERE id=?", (d["variacao_id"],)).fetchone()
    nova = int(d["quantidade"])
    if nova < 0: raise ValueError("A quantidade não pode ser negativa.")
    c.execute("UPDATE variacoes SET estoque=? WHERE id=?", (nova, d["variacao_id"]))
    c.execute("INSERT INTO mov_estoque(data, variacao_id, delta, motivo) VALUES(?,?,?,?)",
              (agora(), d["variacao_id"], nova - v["estoque"], d.get("motivo", "ajuste")))
    return {"ok": True}

def post_venda(c, d):
    if not d["itens"]: raise ValueError("O carrinho está vazio.")
    if d["pagamento"] not in PAGAMENTOS: raise ValueError("Forma de pagamento inválida.")
    if int(d.get("parcelas", 1)) not in range(1, 7): raise ValueError("Número de parcelas inválido.")
    for it in d["itens"]:  # antes não havia checagem: quantidade negativa AUMENTAVA o estoque
        if int(it["quantidade"]) < 1: raise ValueError("A quantidade de cada item deve ser de pelo menos 1.")
    a = d["aluno"]
    c.execute("INSERT OR IGNORE INTO alunos(nome, turma, ano) VALUES(?,?,?)", (a["nome"].strip(), a["turma"], int(a["ano"])))
    aluno_id = c.execute("SELECT id FROM alunos WHERE nome=? AND turma=? AND ano=?", (a["nome"].strip(), a["turma"], int(a["ano"]))).fetchone()["id"]
    vid = c.execute("INSERT INTO vendas(data, aluno_id, funcionario_id, pagamento, parcelas, total_centavos) VALUES(?,?,?,?,?,0)",
                    (agora(), aluno_id, d["funcionario_id"], d["pagamento"], d.get("parcelas", 1))).lastrowid
    total = 0
    for it in d["itens"]:  # o estoque só é descontado aqui, ao finalizar
        v = c.execute("SELECT * FROM variacoes WHERE id=?", (it["variacao_id"],)).fetchone()
        if not v: raise ValueError("Produto não encontrado.")
        if it["quantidade"] > v["estoque"]: raise ValueError(f"Estoque insuficiente (tamanho {v['tamanho']}).")
        c.execute("UPDATE variacoes SET estoque=estoque-? WHERE id=?", (it["quantidade"], v["id"]))
        c.execute("INSERT INTO venda_itens(venda_id, variacao_id, quantidade, preco_centavos) VALUES(?,?,?,?)", (vid, v["id"], it["quantidade"], v["preco_centavos"]))
        c.execute("INSERT INTO mov_estoque(data, variacao_id, delta, motivo, venda_id) VALUES(?,?,?,?,?)", (agora(), v["id"], -it["quantidade"], "venda", vid))
        total += it["quantidade"] * v["preco_centavos"]
    c.execute("UPDATE vendas SET total_centavos=? WHERE id=?", (total, vid))
    return get_venda(c, vid)

def get_venda(c, vid):
    v = linhas(c, """SELECT v.*, a.nome aluno, a.turma, a.ano, f.nome funcionario FROM vendas v
        JOIN alunos a ON a.id=v.aluno_id JOIN funcionarios f ON f.id=v.funcionario_id WHERE v.id=?""", vid)[0]
    v["itens"] = linhas(c, """SELECT i.quantidade, i.preco_centavos, va.tamanho, p.nome produto FROM venda_itens i
        JOIN variacoes va ON va.id=i.variacao_id JOIN produtos p ON p.id=va.produto_id WHERE i.venda_id=?""", vid)
    return v

def get_vendas(c, q):
    sql, a = "SELECT v.id FROM vendas v JOIN alunos a ON a.id=v.aluno_id WHERE 1=1", []
    if q.get("aluno"): sql += " AND a.nome LIKE ?"; a.append(f"%{q['aluno'][0]}%")
    if q.get("turma"): sql += " AND a.turma=?"; a.append(q["turma"][0])
    if q.get("de"): sql += " AND date(v.data)>=?"; a.append(q["de"][0])
    if q.get("ate"): sql += " AND date(v.data)<=?"; a.append(q["ate"][0])
    return [get_venda(c, r["id"]) for r in c.execute(sql + " ORDER BY v.data DESC", a)]

def post_cancelar(c, vid):  # devolve as peças ao estoque
    v = c.execute("SELECT status FROM vendas WHERE id=?", (vid,)).fetchone()
    if not v: raise ValueError("Venda não encontrada.")
    if v["status"] != "ativa": raise ValueError("Esta venda já foi cancelada.")
    for it in linhas(c, "SELECT variacao_id, quantidade FROM venda_itens WHERE venda_id=?", vid):
        c.execute("UPDATE variacoes SET estoque=estoque+? WHERE id=?", (it["quantidade"], it["variacao_id"]))
        c.execute("INSERT INTO mov_estoque(data, variacao_id, delta, motivo, venda_id) VALUES(?,?,?,?,?)", (agora(), it["variacao_id"], it["quantidade"], "cancelamento", vid))
    c.execute("UPDATE vendas SET status='cancelada' WHERE id=?", (vid,))
    return {"ok": True}

def get_chaves(c, q):
    return linhas(c, """SELECT k.*, (SELECT COUNT(*) FROM chave_mov m WHERE m.chave_id=k.id AND m.retorno IS NULL) fora,
        (SELECT group_concat(f.nome, ', ') FROM chave_mov m JOIN funcionarios f ON f.id=m.funcionario_id WHERE m.chave_id=k.id AND m.retorno IS NULL) com
        FROM chaves k ORDER BY k.numero""")

def get_chave_hist(c, q):
    sql, a = """SELECT m.*, k.numero, k.descricao, f.nome pegou, r.nome registrou, b.nome recebeu FROM chave_mov m
        JOIN chaves k ON k.id=m.chave_id JOIN funcionarios f ON f.id=m.funcionario_id JOIN funcionarios r ON r.id=m.registrado_por_id
        LEFT JOIN funcionarios b ON b.id=m.recebido_por_id WHERE 1=1""", []
    if q.get("chave"): sql += " AND m.chave_id=?"; a.append(q["chave"][0])
    if q.get("funcionario"): sql += " AND m.funcionario_id=?"; a.append(q["funcionario"][0])
    return linhas(c, sql + " ORDER BY m.saida DESC LIMIT 300", *a)

def post_retirar(c, d):
    k = c.execute("SELECT copias FROM chaves WHERE id=?", (d["chave_id"],)).fetchone()
    fora = c.execute("SELECT COUNT(*) n FROM chave_mov WHERE chave_id=? AND retorno IS NULL", (d["chave_id"],)).fetchone()["n"]
    if fora >= k["copias"]: raise ValueError("Todas as cópias desta chave já estão fora.")
    c.execute("INSERT INTO chave_mov(chave_id, funcionario_id, registrado_por_id, saida) VALUES(?,?,?,?)",
              (d["chave_id"], d["funcionario_id"], d["registrado_por_id"], agora()))
    return {"ok": True}

def post_devolver(c, d):
    r = c.execute("UPDATE chave_mov SET retorno=?, recebido_por_id=? WHERE id=? AND retorno IS NULL", (agora(), d["recebido_por_id"], d["mov_id"]))
    if r.rowcount == 0: raise ValueError("Essa chave já foi devolvida ou o registro não existe.")
    return {"ok": True}

def get_abertas(c, q):
    return linhas(c, """SELECT m.id, m.saida, k.numero, k.descricao, f.nome pegou FROM chave_mov m JOIN chaves k ON k.id=m.chave_id
        JOIN funcionarios f ON f.id=m.funcionario_id WHERE m.retorno IS NULL ORDER BY m.saida""")

def post_func(c, d):
    if not d["nome"].strip(): raise ValueError("Informe o nome do funcionário.")
    c.execute("INSERT INTO funcionarios(nome) VALUES(?)", (d["nome"].strip(),)); return {"ok": True}

def post_chave(c, d):
    c.execute("INSERT INTO chaves(numero, descricao, copias) VALUES(?,?,?)", (d["numero"].strip(), d.get("descricao", ""), int(d["copias"]))); return {"ok": True}

GET = {"/api/catalogo": get_catalogo, "/api/vendas": get_vendas, "/api/chaves": get_chaves, "/api/chaves/historico": get_chave_hist,
       "/api/chaves/abertas": get_abertas, "/api/funcionarios": lambda c, q: linhas(c, "SELECT id, nome FROM funcionarios WHERE ativo=1 ORDER BY nome")}
POST = {"/api/estoque": post_estoque, "/api/vendas": post_venda, "/api/chaves/retirar": post_retirar, "/api/chaves/devolver": post_devolver,
        "/api/funcionarios": post_func, "/api/chaves": post_chave}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def enviar(self, codigo, corpo, tipo="application/json; charset=utf-8"):
        b = corpo if isinstance(corpo, bytes) else json.dumps(corpo, ensure_ascii=False).encode()
        self.send_response(codigo); self.send_header("Content-Type", tipo); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path in GET:
            with conectar() as c: return self.enviar(200, GET[u.path](c, parse_qs(u.query)))
        if u.path == "/": return self.enviar(200, (BASE / "static" / "index.html").read_bytes(), "text/html; charset=utf-8")
        self.enviar(404, {"erro": "Não encontrado"})
    def do_POST(self):
        u = urlparse(self.path)
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            m = re.fullmatch(r"/api/vendas/(\d+)/cancelar", u.path)
            with conectar() as c:  # uma transação por requisição: ou grava tudo ou nada
                if m: r = post_cancelar(c, int(m[1]))
                elif u.path in POST: r = POST[u.path](c, d)
                else: return self.enviar(404, {"erro": "Não encontrado"})
            self.enviar(200, r)
        except sqlite3.IntegrityError: self.enviar(400, {"erro": "Esse registro já existe."})
        except (ValueError, KeyError, TypeError) as e: self.enviar(400, {"erro": str(e) or "Dados inválidos."})

if __name__ == "__main__":
    iniciar()
    srv = ThreadingHTTPServer(("127.0.0.1", PORTA), H)
    print(f"Sistema Loja Escolar Modelo rodando em http://127.0.0.1:{PORTA}  (feche esta janela para encerrar)")
    if "--sem-navegador" not in sys.argv: threading.Timer(1, lambda: webbrowser.open(f"http://127.0.0.1:{PORTA}")).start()
    srv.serve_forever()
