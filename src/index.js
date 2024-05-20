const express = require('express');
const path = require('path');
const { engine } = require ('express-handlebars');
const bodyParser = require('body-parser');
const app = express();

// Servir arquivos estáticos (CSS, imagens, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Configuração do body-parser
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

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

// Rotas
app.get('/inicio', (req, res) => {
    res.render('inicio');
});

app.get('/registro', (req, res) => {
    res.render('formulario');
})

app.post('/addregistro', (req, res) => {
    res.send('Registrado com sucesso!');
});

// Servidor
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}!`)
});