require('dotenv').config()
var express = require('express')
var app = express()
var cors = require('cors')
var mongoose = require('mongoose')
var bodyParser = require('body-parser')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

var userSchema = new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: String,
    _id: false
  }]
})

var User = mongoose.model("User", userSchema)

// Adds user to the database
app.post("/api/users", function(req, res) {
  User.findOne({username: req.body.username}, function(err, data) {
    if (err) return console.error(err)

    if (data) {
      res.send("Username is taken.")
    } else{
        var newUser = new User({username: req.body.username})

        newUser.save(function(err, save) {
          if (err) return console.error(err)
          console.log("Username saved in database")

          res.json({
            username: req.body.username,
            _id: save._id
          })
        })
    }
  })
})
  
// Displays user in JSON format on /api/users
app.get("/api/users", function(req, res) {
    User.find({}, function(err, users) {
    
    if (users) {
      var userList = users.map(u => ({username: u.username, _id: u._id}))
    }
    res.json(userList)
  })
})

// Add exercises to database
app.post("/api/users/:_id/exercises", function(req, res) {
  (req.body.date === '' || typeof req.body.date == 'undefined') ? 
      todaysDate = new Date().toDateString() : 
      todaysDate = new Date(req.body.date).toDateString()

  User.findById(req.params._id, function(err, data) {
    if (err || data == null) {
      console.error(err + " error code: 1")
      res.json({message: "Unable to find userId"})
    } else {
        data.log.push({
          description: req.body.description,
          duration: parseInt(req.body.duration),
          date: todaysDate,
        })

        data.save(function(err, save) {
          if (err) return console.error(err)
          console.log("Exercise data saved")
        })

        res.json({
          _id: req.params._id,
          username: data.username,
          date: todaysDate,
          duration: parseInt(req.body.duration),
          description: req.body.description
        })
    }
  })
})

// Display exercise logs based on unique id
app.get("/api/users/:_id/logs", function(req, res) {
    var userId = req.params._id
    User.findById(userId, function(err, data) {
      if (err || data == null) {
        console.error(err + " error code: 2")
        res.json({message: "Invalid user ID"})
      } else {
      
        var fromDate = new Date(req.query.from) == 'Invalid Date' ? 0 : new Date(req.query.from).getTime()
        var toDate = new Date(req.query.to) ? new Date().getTime() : new Date(req.query.to).getTime()
        var limit = isNaN(parseInt(req.query.limit)) ? 0: parseInt(req.query.limit)
        var username = data.username
        var log = []
        
        for (let i=0; i<data.log.length; i++) {
            if (fromDate <= new Date(data.log[i].date) && toDate >= new Date(data.log[i].date)) {
              log.push(data.log[i])
            }
        }

        if (limit) {
          log = log.slice(0, limit)
        }
        var count = data.log.length

        res.json({
          username: username,
          count: count,
          _id: userId,
          log: log
        })
      }
    })
})

var listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
