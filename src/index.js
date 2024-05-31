// Carregando alguns módulos
const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash'); 
const mongoose = require('mongoose');
const passport = require("passport");
require('../config/auth')(passport);
const db = require('../config/db');
const app = express();

// Conexão com o banco de dados
mongoose.Promise = global.Promise;
mongoose.connect(db.mongoURI).then(() => {
    console.log("Conectado ao MongoDB");
}).catch((err) => {
    console.log("Erro ao conectar ao MongoDB:", err);
});


// Middleware de Sessão
app.use(session({
    secret: 'processosjudiciais',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Middleware global para mensagens flash e logs de depuração
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Servir arquivos estáticos (CSS, imagens, etc.)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static('uploads'));
// Configuração do body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurando o Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    partialsDir: path.join(__dirname, '../views/partials'),
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

// Rotas para clientes
const clientesRouter = require('../routes/clientesRouter');
app.use("/clientes", clientesRouter);

// Rotas para advogados
const advogadosRouter = require('../routes/advogadosRouter');
app.use("/advogados", advogadosRouter);

// Rotas de autenticação
const auth = require('../config/auth');
app.use("/auth", auth);

app.get('/', (req, res) => {
    res.render('inicio');
});

app.get('/sobre', (req, res) => {
    res.render('sobre');
});

// Servidor
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor rodando na url: http://localhost:${PORT}/`);
});
