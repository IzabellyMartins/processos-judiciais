if (process.env.NODE_ENV === "production") {
    module.exports = {
        mongoURI: "mongodb+srv://banco:1234@judicial.kn3mcrr.mongodb.net/"
    }
} else {
    module.exports = {mongoURI: "mongodb://localhost/judicial"};
}



