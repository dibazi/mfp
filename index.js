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
app.get('/', async (req, res) => {
  const url = 'https://dl-register.onrender.com/checks';
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

app.get('/checkin-success', (req, res) => {
  res.render('checkin-success.ejs');
});

app.get('/checkout-success', (req, res) => {
  res.render('checkout-success.ejs');
});

// Render the registration form
app.get('/register', (req, res) => {
    res.render('register.ejs');
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
    res.redirect('/dashboard');
  });
});

// Process the check-out form
app.post('/check_out', (req, res) => {
  // Insert the check-out record into the database
  const { user_id } = req.body;
  const currentDate = new Date();
  const johannesburgOffset = 2; // Johannesburg is UTC+2
  const johannesburgTime = new Date(currentDate.getTime() + johannesburgOffset * 60 * 60 * 1000);
  const year = johannesburgTime.getFullYear();
  const month = String(johannesburgTime.getMonth() + 1).padStart(2, '0');
  const day = String(johannesburgTime.getDate()).padStart(2, '0');
  const hours = String(johannesburgTime.getHours()).padStart(2, '0');
  const minutes = String(johannesburgTime.getMinutes()).padStart(2, '0');
  const seconds = String(johannesburgTime.getSeconds()).padStart(2, '0');

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

      res.redirect('/checkout-success');
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
  const johannesburgOffset = 2; // Johannesburg is UTC+2
  const johannesburgTime = new Date(currentDate.getTime() + johannesburgOffset * 60 * 60 * 1000);
  const year = johannesburgTime.getFullYear();
  const month = String(johannesburgTime.getMonth() + 1).padStart(2, '0');
  const day = String(johannesburgTime.getDate()).padStart(2, '0');
  const hours = String(johannesburgTime.getHours()).padStart(2, '0');
  const minutes = String(johannesburgTime.getMinutes()).padStart(2, '0');
  const seconds = String(johannesburgTime.getSeconds()).padStart(2, '0');

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
    res.redirect('/checkin-success');
    }
  );
});



// Route to render the view with check-in records and user names
app.get('/check_ins', (req, res) => {
  const sql = 'SELECT mfp_check_ins.id, mfp_check_ins.check_in, mfp_users.user_name FROM mfp_check_ins JOIN mfp_users ON mfp_check_ins.user_id = mfp_users.id ORDER BY mfp_check_ins.id DESC';

  // Execute the SQL query
  pool.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.redirect('/dashboard');
      return;
    }

    // Render the view and pass the results to it
    res.render('check_ins', { check_ins: results });
  });
});

// Route to render the view with check-in records and user names
app.get('/check_outs', (req, res) => {
  const sql = 'SELECT mfp_check_outs.id, mfp_check_outs.check_out, mfp_users.user_name FROM mfp_check_outs JOIN mfp_users ON mfp_check_outs.user_id = mfp_users.id ORDER BY mfp_check_outs.check_out DESC';

  // Execute the SQL query
  pool.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.redirect('/dashboard');
      return;
    }

    // Render the view and pass the results to it
    res.render('check_outs', { check_outs: results });
  });
});

app.get('/dashboard', (req, res) => {

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
      res.render('dashboard', { checkOuts: results });
    }
  );
});

// Logout route
app.get('/logout', (req, res) => {
  // Destroy the session and logout the user
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      res.redirect('/');
      return;
    }

    // Redirect the user to the desired page after successful logout
    res.redirect('/login');
  });
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});
