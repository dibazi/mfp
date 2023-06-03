// Import required modules
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const qrcode = require('qrcode');
const moment = require('moment');
const dotenv = require('dotenv');
let result = dotenv.config();


const app = express();

app.use(express.urlencoded({ extended: true }));
// Create a new Express app
app.use(bodyParser.json());

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_DATABASE;

// Set up session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//acces css file
app.use(express.static(__dirname = "public"));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve the index.ejs file
app.get('/qr', async (req, res) => {
  const url = 'https://express.senga-service.com/';
  const dataURL = await qrcode.toDataURL(url);
  res.render('index', { dataURL });
  
});

//app.post('/check_in', (req, res) => {
  // Process the check-in request and display an alert message
 // res.send("<script>alert('You are checked in');</script>");
//});


// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set up MySQL connection pool
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to check for a session
app.use((req, res, next) => {
  if (req.session.user || req.path === '/login' || req.path === '/register') {
    next();
  } else {
    res.redirect('/login');
  }
});

// Middleware to check for a session and pass user data to the views
app.use((req, res, next) => {
  res.locals.user = req.session.user; // Pass the user data to the views
  next();
});

app.get('/animation', (req, res) => {
    res.render('animation.ejs');
});

// Render the registration form
app.get('/register', (req, res) => {
    res.render('register.ejs');
});

//qr
app.get('/qr', (req, res) => {
    res.render('qr.ejs');
});

// Process the registration form
app.post('/register', (req, res) => {
    const { user_name, email,password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.log(err);
            res.redirect('/register');
            return;
        }

        // Insert the user into the database
        pool.query('INSERT INTO mfp_users (user_name, email, password) VALUES (?, ?, ?)', [user_name, email,hash], (err, result) => {
            if (err) {
                console.log(err);
                res.redirect('/register');
                return;
            }

            res.redirect('/login');
        });
    });
});

//dashboard route
app.get('/dashboard', (req, res) => {
  res.render('dashboard.ejs');
});

//login route
app.get('/login', (req, res) => {
  res.render('login.ejs');
});

//login function
app.post('/login', (req, res) => {
  const { user_name, password } = req.body;

  pool.query('SELECT * FROM mfp_users WHERE user_name = ?', [user_name], async (error, results) => {
    if (error) {
      console.log(error);
      res.redirect('/login');
      return;
    }

    if (results.length === 0) {
      req.flash('error', 'Incorrect username');
      res.redirect('/login');
      return;
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Incorrect password');
      res.redirect('/login');
      return;
    }

    req.session.user = user;
    res.redirect('/checks');
  });
});

//Acces to check_outs

// Render the check_out.ejs form
app.get('/check_out', (req, res) => {
  res.render('check_out.ejs');
});

// Process the check-out form
app.post('/check_out', (req, res) => {
  // Insert the check-out record into the database
  const { user_id } = req.body;
const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const hours = String(currentDate.getHours()).padStart(2, '0');
const minutes = String(currentDate.getMinutes()).padStart(2, '0');
const seconds = String(currentDate.getSeconds()).padStart(2, '0');

const check_out = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  pool.query(
    'INSERT INTO mfp_check_outs (user_id, check_out) VALUES (?, ?)',
    [user_id, check_out],
    (err, result) => {
      if (err) {
        console.log(err);
        res.redirect('/check');
        return;
      }

      res.redirect('/checks');
    }
  );
});

// Render the check_in.ejs form
app.get('/check_in', (req, res) => {
  res.render('check_in.ejs');
});

// Process the check-in form
app.post('/check_in', (req, res) => {
  // Insert the check-in record into the database
  const { user_id } = req.body;

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const hours = String(currentDate.getHours()).padStart(2, '0');
const minutes = String(currentDate.getMinutes()).padStart(2, '0');
const seconds = String(currentDate.getSeconds()).padStart(2, '0');

const check_in = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  
  pool.query(
    'INSERT INTO mfp_check_ins (user_id, check_in) VALUES (?, ?)',
    [user_id, check_in],
    (err, result) => {
      if (err) {
        console.log(err);
        res.redirect('/check');
        return;
      }

      // Display success message to the user
    //  res.render('success.ejs', { message: 'Check-in successful!' });
    res.redirect('/checks');
    }
  );
});

// Render the check_out.ejs form
app.get('/check_out', (req, res) => {
  res.render('check_out.ejs');
});

// Render the daily form
app.get('/daily', (req, res) => {
  res.render('daily.ejs');
});

// Route to render the view with check-in records and user names
app.get('/dailys', (req, res) => {
  const sql = 'SELECT mfp_check_ins.id, mfp_check_ins.check_in, mfp_users.user_name FROM mfp_check_ins JOIN mfp_users ON mfp_check_ins.user_id = mfp_users.id';

  // Execute the SQL query
  pool.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.redirect('/checks');
      return;
    }

    // Render the view and pass the results to it
    res.render('daily', { check_ins: results });
  });
});

// Render the daily form
app.get('/checkoutdaily', (req, res) => {
  res.render('daily.ejs');
});

// Route to render the view with check-in records and user names
app.get('/checkoutdailys', (req, res) => {
  const sql = 'SELECT mfp_check_outs.id, mfp_check_outs.check_out, mfp_users.user_name FROM mfp_check_outs JOIN mfp_users ON mfp_check_outs.user_id = mfp_users.id';

  // Execute the SQL query
  pool.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.redirect('/checks');
      return;
    }

    // Render the view and pass the results to it
    res.render('checkoutdaily', { check_outs: results });
  });
});

app.get('/daily', (req, res) => {
  res.render('daily.ejs');
});

app.get('/checks', (req, res) => {

    // Query the database to get check-outs created today
  const currentDate = moment().format('YYYY-MM-DD');
  const userId = req.session.user.id; // Assuming user_id is available in the session

  pool.query(
    'SELECT * FROM mfp_check_ins WHERE DATE(check_in) = ? AND user_id = ?',
    [currentDate, userId],
    (err, results) => {
      if (err) {
        console.log(err);
        return;
      }

      // Render the EJS template and pass the checkOuts array
      res.render('check', { checkOuts: results });
    }
  );
});



// logout
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
