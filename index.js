import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "prachii25",
  port: 5432,
});
db.connect();

let books = [];
app.get("/", async(req, res) => {
    try{
      
      res.render("index.ejs");
      
    }
    catch(err){
      console.log(err);
    }
    
  });
app.get("/about", async(req, res) => {
    try{
      const result = await db.query("Select * from book");
      books = result.rows;
      
      //const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
      res.render("about.ejs", {
    //   bookisbn:books.isbn,
    //   booktitle:books.title,
    //   bookreview:books.review,
    //   bookrating:books.rating,
    //   bookcover:url,
    bookitems:books,
      });
    }
    catch(err){
      console.log(err);
    }
    
  });
  app.get("/new", async(req, res) => {
    try{
      
      res.render("new.ejs");
    }
    catch(err){
      console.log(err);
    }
    
  });
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  
  