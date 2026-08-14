const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// ADMIN CONFIG
// ========================================

// Change this to your own secret.
const ADMIN_SECRET = "MySuperSecret12345";

// Change this to a long random value.
const SESSION_SECRET =
  "movie-hub-session-secret-change-this";

// ========================================
// DATA FILE
// ========================================

const DATA_FILE = path.join(
  __dirname,
  "movie.json"
);

// ========================================
// MIDDLEWARE
// ========================================

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  session({
    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// ========================================
// MOVIE DATA FUNCTIONS
// ========================================

function getMovie() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const emptyMovie = {
        name: "",
        description: "",
        poster: "",
        video: ""
      };

      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          emptyMovie,
          null,
          2
        )
      );

      return emptyMovie;
    }

    return JSON.parse(
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      )
    );

  } catch (error) {

    console.error(
      "Movie data error:",
      error
    );

    return {
      name: "",
      description: "",
      poster: "",
      video: ""
    };
  }
}


function saveMovie(movie) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      movie,
      null,
      2
    )
  );
}

// ========================================
// PUBLIC API
// ========================================

app.get(
  "/api/movie",
  (req, res) => {

    res.json(
      getMovie()
    );

  }
);

// ========================================
// ADMIN LOGIN
// ========================================

app.post(
  "/api/admin/login",
  (req, res) => {

    const secret =
      req.body.secret;

    if (
      !secret ||
      secret !== ADMIN_SECRET
    ) {

      return res.status(401).json({
        success: false,
        message: "Wrong secret"
      });
    }

    req.session.admin = true;

    res.json({
      success: true
    });
  }
);

// ========================================
// ADMIN STATUS
// ========================================

app.get(
  "/api/admin/status",
  (req, res) => {

    res.json({
      loggedIn:
        req.session.admin === true
    });

  }
);

// ========================================
// ADMIN LOGOUT
// ========================================

app.post(
  "/api/admin/logout",
  (req, res) => {

    req.session.destroy(
      () => {

        res.json({
          success: true
        });

      }
    );

  }
);

// ========================================
// ADMIN SECURITY
// ========================================

function adminOnly(
  req,
  res,
  next
) {

  if (
    req.session.admin !== true
  ) {

    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });

  }

  next();
}

// ========================================
// SAVE MOVIE
// ========================================

app.post(
  "/api/admin/save",
  adminOnly,
  (req, res) => {

    const {
      name,
      description,
      poster,
      video
    } = req.body;

    if (
      !name ||
      !name.trim()
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Movie name is required"
      });

    }

    const oldMovie =
      getMovie();

    const movie = {

      name:
        name.trim(),

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      poster:
        poster ||
        oldMovie.poster ||
        "",

      video:
        video ||
        oldMovie.video ||
        ""

    };

    saveMovie(movie);

    res.json({
      success: true,
      movie
    });

  }
);

// ========================================
// CLEAR MOVIE
// ========================================

app.post(
  "/api/admin/clear",
  adminOnly,
  (req, res) => {

    const emptyMovie = {

      name: "",

      description: "",

      poster: "",

      video: ""

    };

    saveMovie(emptyMovie);

    res.json({
      success: true,
      movie: emptyMovie
    });

  }
);

// ========================================
// SERVER
// ========================================

app.get(
  "/",
  (req, res) => {

    res.json({
      name: "Movie Hub Server",
      status: "online"
    });

  }
);


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Movie Hub Server running on port ${PORT}`
    );

  }
);
