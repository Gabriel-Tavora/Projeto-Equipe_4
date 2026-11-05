const crypto = require("crypto");

class Registro {
  medicos = new Map();
  farmacias = new Set();

  credenciarMedico(id, chave) {
    this.medicos.set(id, chave);
  }

  credenciarFarmacia(id) {
    this.farmacias.add(id);
  }
}

class Receita {
  constructor(id, medico, hash, assinatura) {
    this.id = id;
    this.medico = medico;
    this.hash = hash;
    this.assinatura = assinatura;
    this.utilizada = false;
  }
}

class Sistema {
  receitas = new Map();
  dados = new Map();

  constructor(registro) {
    this.registro = registro;
  }

  emitir(id, medico, dados, chavePrivada) {
    if (!this.registro.medicos.has(medico))
      throw Error("Médico não credenciado.");

    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(dados))
      .digest("hex");

    const assinatura = crypto.sign(null, Buffer.from(hash), chavePrivada);

    this.dados.set(id, dados);
    this.receitas.set(id, new Receita(id, medico, hash, assinatura));
  }

  validar(id, farmacia) {
    const receita = this.receitas.get(id);

    if (!this.registro.farmacias.has(farmacia))
      throw Error("Farmácia não credenciada.");

    if (!receita || receita.utilizada)
      throw Error("Receita inválida ou já utilizada.");

    const chave = this.registro.medicos.get(receita.medico);

    if (
      !crypto.verify(null, Buffer.from(receita.hash), chave, receita.assinatura)
    )
      throw Error("Assinatura inválida.");

    receita.utilizada = true;
    return true;
  }
}
