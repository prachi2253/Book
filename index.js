import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import "dotenv/config";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

async function fetchAndSaveCover(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  const fileName = isbn;
  const imagePath = `\\public\\assets\\images\\covers\\${fileName}.jpg`;

  try {
    const response = await axios.get(url, { responseType: "stream" });
    const fileStream = fs.createWriteStream(__dirname + imagePath);

    // Pipe the image data from the API response to the file stream.
    response.data.pipe(fileStream);

    console.log(`Image saved: ${fileName}.jpg`);
  } catch (error) {
    console.log("Error fetching or saving cover image: ", error);
  }
}

async function fetchnotes(id) {
  try {
    const result = await db.query(
      "SELECT notes.id, notes.book_id, title, author, image_path, date_read, notes.note FROM books LEFT JOIN notes ON books.id = notes.book_id WHERE books.id = $1 ORDER BY id DESC",
      [id]);
    return result.rows;
  } catch (error) {
    console.log("Error fetching notes: ", error);
  }
}
function formatData(data) {
  if (data[0].description || data[0].review || data[0].note) {
    data.forEach((item) => {
      
      if (item.description) {
        item.description = item.description.replace(/<br>/g, ""); 
        if (item.description.includes("\n")) {
          item.description = item.description.split("\n").join("<br>"); 
        }
      }

      
      if (item.review) {
        item.review = item.review.replace(/<br>/g, "");
        if (item.review.includes("\n")) {
          item.review = item.review.split("\n").join("<br>");
        }
      }

      
      if (item.note) {
        item.note = item.note.replace(/<br>/g, "");
        if (item.note.includes("\n")) {
          item.note = item.note.split("\n").join("<br>");
        }
      }
    });
  }
  return data;
}
app.get('/', async (req, res) => {
  const currentSortOption = req.query.sort; 
  let result = null;

  try {
      
      if (currentSortOption === undefined || currentSortOption === 'title') {
          result = await db.query(
              'SELECT * FROM books ORDER BY title ASC');
      }
      else if (currentSortOption === 'date') {
          result = await db.query(
              'SELECT * FROM books ORDER BY date_read DESC');
      }
      else if (currentSortOption === 'rating') {
          result = await db.query(
              'SELECT * FROM books ORDER BY rating DESC');
      }
      
      const formattedDetails = result.rows; 

      res.render('index.ejs', { data: formattedDetails, sortOption: currentSortOption }); 
  } catch (error) {
      console.log(error);
  }
});

app.get('/new-entry', (req, res) => {
  res.render('new.ejs');
});

app.post('/new-entry/add', async (req, res) => {
  const newEntry = req.body; 
  fetchAndSaveCover(newEntry.isbn); 
  const imagePath = `assets/images/covers/${newEntry.isbn}.jpg`; 
  const timeStamp = new Date();

  try {
      
      await db.query('INSERT INTO books (isbn, title, author, description, review, rating, image_path, date_read) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [   newEntry.isbn,
              newEntry.title,
              newEntry.author,
              newEntry.description,
              newEntry.review,
              newEntry.rating,
              imagePath,
              timeStamp
          ]);
      res.redirect('/')
  } catch (error) {
      console.log(error);
  }
});


app.get('/notes/:bookId', async (req, res) => {
    
    const bookId = req.params.bookId;

    try {
        const notes = await fetchnotes(bookId); 
        const formattedNotes = await formatData(notes); 

        res.render('notes.ejs', { data: formattedNotes }); 
    } catch (error) {
        console.log(error);
    }
});


app.post('/notes/:bookId/add', async (req, res) => {
    const bookId = req.params.bookId; 
    const note = req.body.newNote;
    

    try {
        await db.query('INSERT INTO notes (note, book_id) VALUES ($1, $2)', [note, bookId]);

        res.redirect(`/notes/${bookId}`); 
    } catch (error) {
        console.log(error);
    }
});

app.post('/notes/:noteId/update', async (req, res) => {
    const updatedNote = req.body.noteToUpdate;
    const updateNoteId = req.params.noteId;
    const bookId = req.body.bookId;
    
    
    try {
        await db.query('UPDATE notes SET note = ($1) WHERE id = $2', [updatedNote, updateNoteId]);
        res.redirect(`/notes/${bookId}`);
    } catch (error) {
        console.log(error);
    }
});


app.post('/notes/:noteId/delete', async (req, res) => {
    const deleteNoteId = req.params.noteId;
    const bookId = req.body.bookId;
    
    try {
       await db.query('DELETE FROM notes WHERE id = $1', [deleteNoteId]);
       res.redirect(`/notes/${bookId}`);
    } catch (error) {
       console.log(error);
    }
   });


app.post('/reviews/:bookId/update', async (req, res) => {
    const updatedReview = req.body.reviewToUpdate;
    const bookId = req.params.bookId;
    
    try {
        await db.query('UPDATE books SET review = ($1) WHERE id = $2', [updatedReview, bookId]);
        res.redirect('/');
    } catch (error) {
        console.log(error);
    }
});


app.post('/books/:bookId/delete', async (req, res) => {
 const deleteBookId = req.params.bookId;
   
 try {
    await db.query('DELETE FROM notes WHERE book_id = $1', [deleteBookId]);

    await db.query('DELETE FROM books WHERE id = $1', [deleteBookId]);

    res.redirect('/')
 } catch (error) {
    console.log(error);
 }
});


app.listen(port, () => {
    console.log('Server running on port 3000');
});
  