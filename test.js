
const crypto = require("crypto");

class Registro {
  #itens = new Map();

  credenciar(id, chave = true) {
    if (this.#itens.has(id)) throw Error("Já cadastrado.");
    this.#itens.set(id, chave);
  }

  revogar(id) { this.#itens.delete(id); }
  estaCredenciado(id) { return this.#itens.has(id); }
  chave(id) { return this.#itens.get(id); }
}

class Receita {
  #validada = false;

  constructor(id, medicoId, hash, assinatura) {
    this.id = id;
    this.medicoId = medicoId;
    this.hash = hash;
    this.assinatura = assinatura;
    this.emitidaEm = new Date().toISOString();
  }

  get validada() { return this.#validada; }

  validar(farmaciaId) {
    if (this.#validada) throw Error("Receita já utilizada.");
    this.#validada = true;
    this.validadaPor = farmaciaId;
  }
}

class LivroDeReceitas {
  #blockchain = new Map();
  #offChain = new Map();

  constructor(medicos, farmacias) {
    this.medicos = medicos;
    this.farmacias = farmacias;
  }

  #hash(id, medicoId, dados, salt) {
    return crypto.createHash("sha256")
      .update(JSON.stringify({ id, medicoId, dados, salt }))
      .digest("hex");
  }

  emitir({ id, medicoId, dadosClinicos, chavePrivadaMedico }) {
    const chave = this.medicos.chave(medicoId);

    if (!chave) throw Error("Médico não credenciado.");
    if (this.#blockchain.has(id)) throw Error("Receita já existe.");

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.#hash(id, medicoId, dadosClinicos, salt);
    const assinatura = crypto.sign(null, Buffer.from(hash), chavePrivadaMedico);

    if (!crypto.verify(null, Buffer.from(hash), chave, assinatura))
      throw Error("Assinatura inválida.");

    this.#offChain.set(id, { dados: structuredClone(dadosClinicos), salt });

    const receita = new Receita(id, medicoId, hash, assinatura.toString("hex"));
    this.#blockchain.set(id, receita);

    return receita;
  }

  validar({ id, farmaciaId }) {
    if (!this.farmacias.estaCredenciado(farmaciaId))
      throw Error("Farmácia não credenciada.");

    const receita = this.#blockchain.get(id);
    if (!receita) throw Error("Receita não encontrada.");
    if (receita.validada) throw Error("Receita já utilizada.");

    const chave = this.medicos.chave(receita.medicoId);
    if (!chave) throw Error("Médico não credenciado.");

    if (!crypto.verify(null, Buffer.from(receita.hash), chave,
      Buffer.from(receita.assinatura, "hex")))
      throw Error("Assinatura inválida.");

    const dados = this.#offChain.get(id);

    if (!dados || this.#hash(id, receita.medicoId, dados.dados, dados.salt) !== receita.hash)
      throw Error("Dados clínicos não conferem.");

    receita.validar(farmaciaId);
    return receita;
  }
}

if (require.main === module) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const medicos = new Registro();
  const farmacias = new Registro();
  const livro = new LivroDeReceitas(medicos, farmacias);

  medicos.credenciar("CRM-123", publicKey);
  farmacias.credenciar("FARM-1");
  farmacias.credenciar("FARM-2");

  const testar = (nome, fn) => {
    try {
      fn();
      console.log("OK:", nome);
    } catch (e) {
      console.log("ERRO:", nome, e.message);
    }
  };

  testar("Médico não credenciado", () =>
    livro.emitir({ id: "r0", medicoId: "CRM-999", dadosClinicos: {}, chavePrivadaMedico: privateKey })
  );

  testar("Emissão da receita", () =>
    livro.emitir({
      id: "r1",
      medicoId: "CRM-123",
      dadosClinicos: { paciente: "Maria", medicamento: "Amoxicilina 500mg" },
      chavePrivadaMedico: privateKey
    })
  );

  testar("Farmácia não credenciada", () =>
    livro.validar({ id: "r1", farmaciaId: "FARM-X" })
  );

  testar("Primeira validação", () =>
    livro.validar({ id: "r1", farmaciaId: "FARM-1" })
  );

  testar("Segunda validação", () =>
    livro.validar({ id: "r1", farmaciaId: "FARM-2" })
  );
}

module.exports = { Registro, Receita, LivroDeReceitas };
