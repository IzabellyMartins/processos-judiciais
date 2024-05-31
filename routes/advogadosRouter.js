// Carregando alguns módulos
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { Cliente, Advogado, Documento, ProcessoJudicial } = require('../models/Banco');
const passport = require("passport");
const bodyParser = require('body-parser');

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

// Rota de cadastro de advogado
router.get('/registroadvogado', (req, res) => {
    res.render('cadastroadvogado');
});

router.post('/registroadvogado', (req, res) => {
    let erros = [];
    if (!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null) {
        erros.push({ texto: "Nome inválido!" });
    }
    if (!req.body.cpf || typeof req.body.cpf == undefined || req.body.cpf == null) {
        erros.push({ texto: "CPF inválido!" });
    }
    if (!req.body.oab || typeof req.body.oab == undefined || req.body.oab == null) {
        erros.push({ texto: "OAB inválido!" });
    }
    if (!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        erros.push({ texto: "E-mail inválido!" });
    }
    if (!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null) {
        erros.push({ texto: "Senha inválida!" });
    }
    if (req.body.senha.length < 4) {
        erros.push({ texto: "Senha muito curta!" });
    }
    if (req.body.senha != req.body.senha2) {
        erros.push({ texto: "Senhas diferentes, tente novamente!" });
    }

    if (erros.length > 0) {
        res.render('cadastroadvogado', { erros: erros });
    } else {
        Advogado.findOne({ email: req.body.email }).then((advogado) => {
            if (advogado) {
                req.flash('error_msg', 'Já existe uma conta registrada com esse e-mail no nosso sistema!');
                res.redirect('/advogados/registroadvogado');
            } else {
                const novoAdvogado = new Advogado({
                    nome: req.body.nome,
                    cpf: req.body.cpf,
                    oab: req.body.oab,
                    email: req.body.email,
                    senha: req.body.senha
                });

                bcrypt.genSalt(10, (erro, salt) => {
                    bcrypt.hash(novoAdvogado.senha, salt, (erro, hash) => {
                        if (erro) {
                            req.flash('error_msg', 'Houve um erro durante o salvamento do usuário');
                            res.redirect('/');
                        }
                        novoAdvogado.senha = hash;

                        novoAdvogado.save().then(() => {
                            req.flash("success_msg", "Advogado cadastrado com sucesso!");
                            res.redirect("/");
                        }).catch((err) => {
                            req.flash("error_msg", "Houve um erro ao cadastrar o advogado, tente novamente!");
                            res.redirect("/advogados/registroadvogado");
                        });
                    });
                });
            }
        }).catch((err) => {
            req.flash('error_msg', 'Houve um erro interno');
            res.redirect('/');
        });
    }
});

// Rota de login e autenticação
router.get('/login', (req, res) => {
    res.render('advogados-login');
});

router.post('/login/advogado', passport.authenticate('advogado-local', {
    successRedirect: '/advogados/advogadodashboard',
    failureRedirect: '/advogados/login',
    failureFlash: true
}));

// Rota de dashboard
router.get('/advogadodashboard', (req, res) => {
    res.render('advogadodashboard', { isAuthenticated: req.isAuthenticated() });
});


// Rota de cadastro de processos
router.get('/cadastrarprocessos', (req, res) => {
    res.render('addprocessos');
});

router.post('/cadastrarprocessos', upload, async (req, res) => {
    let erros = [];
    if (req.body.numeroProcesso == "0") {
        erros.push({ texto: "Número de processo inválido, registre um número de processo!" });
    }

    if (erros.length > 0) {
        res.render('addprocessos', { erros: erros });
    } else {
        try {
            const cliente = await Cliente.findOne({ nome: req.body.cliente });
            const advogado = await Advogado.findOne({ nome: req.body.advogado });

            if (!cliente) {
                throw new Error("Cliente não encontrado!");
            }
            if (!advogado) {
                throw new Error("Advogado não encontrado!");
            }

            const clienteId = cliente._id;
            const advogadoId = advogado._id;

            const novoProcesso = new ProcessoJudicial({
                numeroProcesso: req.body.numeroProcesso,
                cliente: clienteId,
                advogado: advogadoId,
                tema: req.body.tema,
                valorCausa: req.body.valorCausa,
                descricao: req.body.descricao
            });

            if (req.files) {
                const documentos = await Promise.all(req.files.map(async (file) => {
                    const documento = new Documento({
                        nome: file.originalname,
                        caminho: file.filename, 
                        extensao: file.mimetype,
                        originalName: file.originalname,
                        cliente: clienteId,
                        advogado: advogadoId
                    });
                    await documento.save();
                    return documento._id;
                }));
                novoProcesso.documentos = documentos;
            }

            await novoProcesso.save();
            req.flash('success_msg', 'Processo cadastrado com sucesso!');
            res.redirect('/advogados/advogadodashboard');
        } catch (err) {
            console.error("Erro ao salvar o processo:", err.message);
            req.flash("error_msg", "Erro ao cadastrar processo!");
            res.redirect('/advogados/cadastrarprocessos');
        }
    }
});

// Rota para exibir lista de processos
router.get('/verprocessosseparados', async (req, res) => {
    try {
        const advogadoId = req.user.id; 
        const processos = await ProcessoJudicial.find({ advogado: advogadoId }).populate('cliente').populate('advogado');

        if (processos.length === 0) {
            res.render('listadeprocessos', { nenhumProcesso: true });
        } else {
            res.render('listadeprocessos', { processos: processos });
        }
    } catch (err) {
        console.error("Erro ao buscar processos:", err.message);
        req.flash("error_msg", "Erro ao buscar processos!");
        res.redirect('/advogados/advogadodashboard');
    }
});

// Rota para exibir detalhes completos de um processo
router.get('/processo/:id', async (req, res) => {
    try {
        const processo = await ProcessoJudicial.findById(req.params.id)
            .populate('cliente')
            .populate('advogado')
            .populate('documentos');
        
        if (!processo) {
            req.flash('error_msg', 'Processo não encontrado');
            return res.redirect('/advogados/verprocessosseparados');
        }

        res.render('detalhesprocesso', { processo });
    } catch (err) {
        console.error("Erro ao buscar detalhes do processo:", err.message);
        req.flash("error_msg", "Erro ao buscar detalhes do processo");
        res.redirect('/advogados/verprocessosseparados');
    }
});



// Rota para editar processos
router.get('/verprocessosseparados/edit/:id', async (req, res) => {
    try {
        const processo = await ProcessoJudicial.findById(req.params.id).populate('cliente').populate('advogado').populate('documentos');
        if (!processo) {
            req.flash('error_msg', 'Processo não encontrado');
            return res.redirect('/advogados/verprocessosseparados');
        }
        res.render('editprocessos', { processo });
    } catch (err) {
        console.error("Erro ao buscar detalhes do processo:", err.message);
        req.flash("error_msg", "Houve um erro ao carregar o formulário de edição");
        res.redirect('/advogados/verprocessosseparados');
    }
});

router.post('/verprocessosseparados/edit/:id', upload, async (req, res) => {
    try {
        const processoId = req.params.id;
        const processo = await ProcessoJudicial.findById(processoId);
        if (!processo) {
            req.flash("error_msg", "Processo não encontrado.");
            return res.redirect('/advogados/verprocessosseparados');
        }

        const cliente = await Cliente.findOne({ nome: req.body.cliente });
        const advogado = await Advogado.findOne({ nome: req.body.advogado });

        if (!cliente) {
            throw new Error("Cliente não encontrado!");
        }
        if (!advogado) {
            throw new Error("Advogado não encontrado!");
        }

        processo.numeroProcesso = req.body.numeroProcesso;
        processo.cliente = cliente._id;
        processo.advogado = advogado._id;
        processo.tema = req.body.tema;
        processo.descricao = req.body.descricao;
        processo.valorCausa = req.body.valorCausa;

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
        req.flash('success_msg', 'Processo editado com sucesso!');
        res.redirect('/advogados/verprocessosseparados');
    } catch (err) {
        req.flash('error_msg', 'Erro ao editar processo: ' + err.message);
        res.redirect('/advogados/verprocessosseparados');
    }
});



// Rota para remover documento
router.delete('/verprocessosseparados/delete-doc/:processoId/:documentoId', async (req, res) => {
    try {
        const { processoId, documentoId } = req.params;
        const processo = await ProcessoJudicial.findById(processoId);
        if (!processo) {
            req.flash('error_msg', 'Processo não encontrado');
            return res.redirect('/advogados/verprocessosseparados');
        }

        processo.documentos.pull(documentoId);
        await processo.save();

        await Documento.findByIdAndDelete(documentoId);

        req.flash('success_msg', 'Documento removido com sucesso');
        res.status(200).send('Documento removido com sucesso');
    } catch (err) {
        req.flash('error_msg', 'Erro ao remover documento: ' + err.message);
        res.status(500).send('Erro ao remover documento: ' + err.message);
    }
});

// Rota para remover processos

router.get('/verprocessosseparados/delete/:id', (req, res) => {
    ProcessoJudicial.deleteOne({_id: req.params.id}).then(() => {
        req.flash('success_msg', 'Processo deletado com sucesso!')
        res.redirect('/advogados/verprocessosseparados')
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao deletar o processo!')
        res.redirect('/advogados/verprocessosseparados')
    })
});

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


// Rota para exibir processos de outros advogados
router.get('/outrosprocessos', async (req, res) => {
    try {
        // Busca todos os advogados, excluindo o atualmente logado
        const advogados = await Advogado.find({ _id: { $ne: req.user.id } });

        res.render('outrosprocessos', { advogados });
    } catch (err) {
        console.error("Erro ao buscar processos de outros advogados:", err.message);
        req.flash("error_msg", "Erro ao buscar processos de outros advogados!");
        res.redirect('/advogados/advogadodashboard');
    }
});

// Rota para exibir os processos de um advogado específico
router.get('/outrosprocessos/:advogadoId/processos', async (req, res) => {
    try {
        const { advogadoId } = req.params;
        const advogado = await Advogado.findById(advogadoId);
        if (!advogado) {
            req.flash('error_msg', 'Advogado não encontrado');
            return res.redirect('/advogados/outrosprocessos');
        }

        const processos = await ProcessoJudicial.find({ advogado: advogadoId }).populate('cliente').populate('advogado').populate('documentos');

        console.log(processos); 

        if (processos.length === 0) {
            res.render('processosdeadvogado', { advogado, processos, nenhumProcesso: true });
        } else {
            res.render('processosdeadvogado', { advogado, processos });
        }
    } catch (err) {
        console.error("Erro ao buscar processos do advogado:", err.message);
        req.flash("error_msg", "Erro ao buscar processos do advogado!");
        res.redirect('/advogados/outrosprocessos');
    }
});

// Rota para exibir o formulário de edição de perfil do advogado
router.get('/perfil', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Você precisa estar logado para acessar essa página.');
        return res.redirect('/advogados/login');
    }
    res.render('editarperfiladvogado', { advogado: req.user });
});

// Rota para processar o formulário de edição de perfil do advogado
router.post('/perfil', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Você precisa estar logado para acessar essa página.');
        return res.redirect('/advogados/login');
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
            return res.render('editarperfiladvogado', { erros, advogado: req.user });
        }

        const advogado = await Advogado.findById(req.user._id);

        advogado.nome = nome;
        advogado.email = email;

        if (senha) {
            const salt = await bcrypt.genSalt(10);
            advogado.senha = await bcrypt.hash(senha, salt);
        }

        await advogado.save();
        req.flash('success_msg', 'Perfil atualizado com sucesso!');
        res.redirect('/advogados/advogadodashboard');
    } catch (err) {
        console.error("Erro ao atualizar perfil:", err.message);
        req.flash('error_msg', 'Erro ao atualizar perfil, tente novamente.');
        res.redirect('/advogados/perfil');
    }
});


module.exports = router;