const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// ADMIN CONFIG
// ========================================

const ADMIN_SECRET = "MySuperSecret12345";

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
// RAILWAY PROXY
// ========================================

app.set("trust proxy", 1);

// ========================================
// CORS
// ========================================

app.use((req, res, next) => {

  const origin = req.headers.origin;

  // Netlify + localhost allow
  if (
    origin &&
    (
      origin.endsWith(".netlify.app") ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    )
  ) {
    res.header(
      "Access-Control-Allow-Origin",
      origin
    );

    res.header(
      "Access-Control-Allow-Credentials",
      "true"
    );
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ========================================
// BODY PARSER
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

// ========================================
// SESSION
// ========================================

app.use(
  session({
    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    proxy: true,

    cookie: {
      httpOnly: true,

      // Required when frontend and API
      // are on different sites.
      sameSite: "none",

      // Railway uses HTTPS.
      secure: true,

      maxAge:
        24 * 60 * 60 * 1000
    }
  })
);

// ========================================
// MOVIE DATA
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

// ========================================
// SAVE MOVIE
// ========================================

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
// PUBLIC MOVIE API
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

    req.session.save(
      (error) => {

        if (error) {

          console.error(
            "Session save error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: "Session error"
          });
        }

        res.json({
          success: true
        });

      }
    );
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
      (error) => {

        if (error) {

          return res.status(500).json({
            success: false,
            message: "Logout failed"
          });
        }

        res.clearCookie(
          "connect.sid",
          {
            httpOnly: true,
            sameSite: "none",
            secure: true
          }
        );

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

    saveMovie(
      emptyMovie
    );

    res.json({
      success: true,
      movie: emptyMovie
    });

  }
);

// ========================================
// HEALTH CHECK
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

// ========================================
// SERVER
// ========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Movie Hub Server running on port ${PORT}`
    );

  }
);