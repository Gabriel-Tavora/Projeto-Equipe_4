const { createHash } = require("crypto");

class RegistroDeReceitas {
  constructor(admin) {
    this.admin = admin;
    this.medicos = new Set();
    this.receitas = new Map();
  }

  credenciar(solicitante, medico) {
    if (solicitante !== this.admin)
      throw new Error("Apenas o administrador pode credenciar médicos.");

    this.medicos.add(medico);
  }

  descredenciar(solicitante, medico) {
    if (solicitante !== this.admin)
      throw new Error("Apenas o administrador pode descredenciar médicos.");

    this.medicos.delete(medico);
  }

  ehCredenciado(medico) {
    return this.medicos.has(medico);
  }

  emitir(medico, dados) {
    if (!this.ehCredenciado(medico))
      throw new Error("esse médico não é credenciado.");

    const hash = createHash("sha256")
      .update(JSON.stringify(dados))
      .digest("hex");

    if (this.receitas.has(hash))
      throw new Error("essa receita já está registrada.");

    this.receitas.set(hash, {
      medico: medico,
      data: Date.now(),
      validada: false,
    });

    return hash;
  }

  validar(hash) {
    const receita = this.receitas.get(hash);

    if (!receita) throw new Error("essa receita não foi encontrada.");

    if (receita.validada) throw new Error("essa receita já foi utilizada.");

    receita.validada = true;

    return {
      medico: receita.medico,
      data: receita.data,
    };
  }
}

module.exports = RegistroDeReceitas;

if (require.main === module) {
  const registro = new RegistroDeReceitas("0xADMIN");

  const receita = {
    paciente: "id-123",
    medicamento: "Amoxicilina 500mg",
    nonce: 1,
  };

  try {
    registro.emitir("0xMEDICO", receita);
  } catch (e) {
    console.log("Bloqueado: ", e.message);
  }

  registro.credenciar("0xADMIN", "0xMEDICO");

  const hash = registro.emitir("0xMEDICO", receita);

  console.log("Receita: ", hash);
  console.log("Validada: ", registro.validar(hash));
}
