// Carregando alguns módulos
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const passport = require('passport');
const { Cliente, Advogado, Documento, ProcessoJudicial } = require('../models/Banco');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage
}).array('documento', 5);

// Rota de cadastro
router.get('/registrocliente', (req, res) => {
    res.render('cadastro');
});

router.post('/registrocliente', (req, res) => {
    let erros = []
    if (!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null) {
        erros.push({ texto: "Nome inválido!" })
    }
    if (!req.body.cpf || typeof req.body.cpf == undefined || req.body.cpf == null) {
        erros.push({ texto: "CPF inválido!" })
    }
    if (!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        erros.push({ texto: "E-mail inválido!" })
    }
    if (!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null) {
        erros.push({ texto: "Senha inválida!" })
    }
    if (req.body.senha.length < 4) {
        erros.push({ texto: "Senha muito curta!" })
    }
    if (req.body.senha != req.body.senha2) {
        erros.push({ texto: "Senhas diferentes, tente novamente!" })
    }

    if (erros.length > 0) {
        res.render('cadastro', { erros: erros })
    } else {
        Cliente.findOne({ email: req.body.email }).then((cliente) => {
            if (cliente) {
                req.flash('error_msg', 'Já existe uma conta registrada com esse e-mail no nosso sistema!')
                res.redirect('/clientes/registrocliente')
            } else {
                const novoCliente = new Cliente({
                    nome: req.body.nome,
                    cpf: req.body.cpf,
                    email: req.body.email,
                    senha: req.body.senha
                })

                bcrypt.genSalt(10, (erro, salt) => {
                    bcrypt.hash(novoCliente.senha, salt, (erro, hash) => {
                        if (erro) {
                            req.flash('error_msg', 'Houve um erro durante o salvamento do usuário')
                            res.redirect('/')
                        }
                        novoCliente.senha = hash

                        novoCliente.save().then(() => {
                            req.flash("success_msg", "Cliente criado com sucesso!")
                            res.redirect("/")
                        }).catch((err) => {
                            req.flash("error_msg", "Houve um erro ao criar o usuário, tente novamente!")
                            res.redirect("/clientes/registrocliente")
                        })
                    })
                })
            }
        }).catch((err) => {
            req.flash('error_msg', 'Houve um erro interno')
            res.redirect('/')
        })
    }
});

// Rota de login e autenticação
router.get('/login', (req, res) => {
    res.render('login')
});

router.post('/login/cliente', passport.authenticate('cliente-local', {
    successRedirect: '/clientes/clientedashboard',
    failureRedirect: '/clientes/login',
    failureFlash: true
}));

// Rota de logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Erro ao deslogar:", err);
            req.flash('error_msg', 'Erro ao deslogar');
            return res.redirect('/');
        }
        req.flash('success_msg', 'Deslogado com sucesso!');
        res.redirect('/');
    });
});

// Rota de dashboard
router.get('/clientedashboard', (req, res) => {
    res.render('clientesdashboard', { isAuthenticated: req.isAuthenticated() })
});

// Rota para mostrar processos relacionados ao cliente
router.get('/meusprocessos', async (req, res) => {
    try {
        const clienteId = req.user._id; 
        const processos = await ProcessoJudicial.find({ cliente: clienteId }).populate('advogado');
        res.render('meusprocessos', { processos });
    } catch (err) {
        console.error("Erro ao buscar processos do cliente:", err.message);
        req.flash("error_msg", "Erro ao buscar processos do cliente!");
        res.redirect('/clientes/clientedashboard');
    }
});

// Rota para exibir os detalhes do processo
router.get('/processo/:id', async (req, res) => {
    try {
        const processo = await ProcessoJudicial.findById(req.params.id).populate('advogado').populate('documentos');
        if (!processo) {
            req.flash('error_msg', 'Processo não encontrado');
            return res.redirect('/clientes/meusprocessos');
        }
        res.render('detalhesprocessocliente', { processo });
    } catch (err) {
        console.error("Erro ao buscar detalhes do processo:", err.message);
        req.flash("error_msg", "Erro ao buscar detalhes do processo");
        res.redirect('/clientes/meusprocessos');
    }
});

// Rota para exibir o formulário de upload de documentos
router.get('/processo/:id/anexar', async (req, res) => {
    try {
        const processo = await ProcessoJudicial.findById(req.params.id).populate('advogado');
        if (!processo) {
            req.flash('error_msg', 'Processo não encontrado');
            return res.redirect('/clientes/meusprocessos');
        }
        res.render('anexardocumentos', { processo });
    } catch (err) {
        console.error("Erro ao buscar detalhes do processo:", err.message);
        req.flash("error_msg", "Erro ao buscar detalhes do processo");
        res.redirect('/clientes/meusprocessos');
    }
});

// Rota para processar o upload de documentos
router.post('/processo/:id/anexar', upload, async (req, res) => {
    try {
        const processoId = req.params.id;
        const processo = await ProcessoJudicial.findById(processoId);
        if (!processo) {
            req.flash("error_msg", "Processo não encontrado.");
            return res.redirect('/clientes/meusprocessos');
        }

        if (req.files) {
            const documentos = await Promise.all(req.files.map(async (file) => {
                const documento = new Documento({
                    nome: file.originalname,
                    caminho: file.path,
                    extensao: file.mimetype,
                    originalName: file.originalname,
                    cliente: processo.cliente,
                    advogado: processo.advogado,
                    ProcessoJudicial: processo._id
                });
                await documento.save();
                return documento._id;
            }));
            processo.documentos.push(...documentos);
        }

        await processo.save();
        req.flash('success_msg', 'Documentos anexados com sucesso!');
        res.redirect('/clientes/meusprocessos');
    } catch (err) {
        req.flash('error_msg', 'Erro ao anexar documentos: ' + err.message);
        res.redirect('/clientes/meusprocessos');
    }
});

// Rota para exibir o formulário de edição de perfil
router.get('/perfil', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Você precisa estar logado para acessar essa página.');
        return res.redirect('/clientes/login');
    }
    res.render('editarperfil', { cliente: req.user });
});

// Rota para processar o formulário de edição de perfil
router.post('/perfil', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Você precisa estar logado para acessar essa página.');
        return res.redirect('/clientes/login');
    }

    try {
        const { nome, email, senha, senha2 } = req.body;
        let erros = [];

        if (!nome || !email) {
            erros.push({ texto: "Nome e e-mail são obrigatórios!" });
        }

        if (senha && senha.length < 4) {
            erros.push({ texto: "Senha muito curta!" });
        }

        if (senha && senha !== senha2) {
            erros.push({ texto: "As senhas não coincidem!" });
        }

        if (erros.length > 0) {
            return res.render('editarperfil', { erros, cliente: req.user });
        }

        const cliente = await Cliente.findById(req.user._id);

        cliente.nome = nome;
        cliente.email = email;

        if (senha) {
            const salt = await bcrypt.genSalt(10);
            cliente.senha = await bcrypt.hash(senha, salt);
        }

        await cliente.save();
        req.flash('success_msg', 'Perfil atualizado com sucesso!');
        res.redirect('/clientes/clientedashboard');
    } catch (err) {
        console.error("Erro ao atualizar perfil:", err.message);
        req.flash('error_msg', 'Erro ao atualizar perfil, tente novamente.');
        res.redirect('/clientes/perfil');
    }
});

module.exports = router;
