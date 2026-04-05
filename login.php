<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AIT Pune | Events</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <nav class="navbar">
      <h1>Eventify</h1>
      <div class="AIT-logo">
         <img src="" alt="AIT Pune logo" height="100px" width="1436px">
      </div>
      </nav>
  </header>

      <div class="login">
        <div class="form-box active" id="login-form">
            <form action="Website.php" method="post">
                <h2 id="Login">Login</h2>
                <input type="email" placeholder="Email"></br>
                <input type="password" placeholder="password"></br>
                <button type="submit">Login</button></br>
                <p id="login-p">If you don't have account </br><a href="#" onclick="showForm('register-form')">Register</a></p>
            </form>
        </div>
        <div class="form-box" id="register-form">
            <form action="Website.php" method="post">
                <h2 id="Login">Register</h2>
                <input type="text" placeholder="Username">
                <input type="email" placeholder="Email">
                <input type="password" placeholder="password">
                <select name="role">
                  <option value="">--Select Role--</option>
                  <option value="Secretary">Secretary</option>
                 <option value="Joint Secretary">Joint Secretary</option>
                  <option value="Student">Student</option>
                </select>
                <button type="submit">Register</button>
                <p id="login-p">Already registered </br><a href="#" onclick="showForm('login-form')">Login</a></p>
                
            </form>
        </div>
    </div>
    
    
</body>
<script src="script.js"></script>
</html>
