const localStrategy = require("passport-local").Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Cliente, Advogado } = require('../models/Banco');

module.exports = function(passport) {
    // Estratégia para Clientes
    passport.use('cliente-local', new localStrategy({ usernameField: 'email', passwordField: 'senha' }, (email, senha, done) => {
        Cliente.findOne({ email: email }).then(cliente => {
            if (!cliente) {
                return done(null, false, { message: 'Esta conta não existe!' });
            }
            bcrypt.compare(senha, cliente.senha, (erro, batem) => {
                if (batem) {
                    return done(null, cliente);
                } else {
                    return done(null, false, { message: 'Senha incorreta!' });
                }
            });
        }).catch(err => {
            return done(err);
        });
    }));

    // Estratégia para Advogados
    passport.use('advogado-local', new localStrategy({ usernameField: 'email', passwordField: 'senha' }, (email, senha, done) => {
        Advogado.findOne({ email: email }).then(advogado => {
            if (!advogado) {
                return done(null, false, { message: 'Esta conta não existe!' });
            }
            bcrypt.compare(senha, advogado.senha, (erro, batem) => {
                if (batem) {
                    return done(null, advogado);
                } else {
                    return done(null, false, { message: 'Senha incorreta!' });
                }
            });
        }).catch(err => {
            return done(err);
        });
    }));

    // Serialização do usuário
    passport.serializeUser((user, done) => {
        done(null, { id: user.id, type: user instanceof Cliente ? 'Cliente' : 'Advogado' });
    });

    // Desserialização do usuário
    passport.deserializeUser((obj, done) => {
        if (obj.type === 'Cliente') {
            Cliente.findById(obj.id).then(cliente => {
                done(null, cliente);
            }).catch(err => {
                done(err, false);
            });
        } else {
            Advogado.findById(obj.id).then(advogado => {
                done(null, advogado);
            }).catch(err => {
                done(err, false);
            });
        }
    });
};
