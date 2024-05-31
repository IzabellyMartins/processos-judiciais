const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
});

const advogadoSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  oab: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
});

const documentoSchema = new Schema({
  nome: { type: String, required: true },
  caminho: { type: String, required: true },
  extensao: { type: String, required: true },
  originalName: { type: String, required: true }, 
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente' },
  advogado: { type: Schema.Types.ObjectId, ref: 'Advogado' },
  processoJudicial: { type: Schema.Types.ObjectId, ref: 'ProcessoJudicial' },
});

const processoJudicialSchema = new Schema({
  numeroProcesso: { type: String, required: true },
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente' },
  advogado: { type: Schema.Types.ObjectId, ref: 'Advogado' },
  documentos: [{ type: Schema.Types.ObjectId, ref: 'Documento' }],
  tema: { type: String, required: true },
  valorCausa: { type: Number, required: true },
  descricao: { type: String }
});

const Cliente = mongoose.model('Cliente', clienteSchema);
const Advogado = mongoose.model('Advogado', advogadoSchema);
const Documento = mongoose.model('Documento', documentoSchema);
const ProcessoJudicial = mongoose.model('ProcessoJudicial', processoJudicialSchema);

module.exports = { Cliente, Advogado, Documento, ProcessoJudicial };
