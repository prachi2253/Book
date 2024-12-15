import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import "dotenv/config";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from 'path';

import { createClient } from '@supabase/supabase-js'


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const supabaseUrl = 'https://oygjjxtplaviilmynbwg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "books",
//   password: "prachii25",
//   port: 5432,
// });
// db.connect();

// async function fetchAndSaveCover(isbn) {
//   const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
//   const fileName = isbn;
//   const imagePath = `\\public\\assets\\images\\covers\\${fileName}.jpg`;

//   try {
//     const response = await axios.get(url, { responseType: "stream" });
//     const fileStream = fs.createWriteStream(__dirname + imagePath);

//     // Pipe the image data from the API response to the file stream.
//     response.data.pipe(fileStream);

//     console.log(`Image saved: ${fileName}.jpg`);
//   } catch (error) {
//     console.log("Error fetching or saving cover image: ", error);
//   }
// }
async function fetchAndSaveCover(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  const fileName = `${isbn}.jpg`;
  const tempDir = path.join(__dirname, 'temp');  // Path to temporary directory
  const tempFilePath = path.join(tempDir, fileName);  // Full path for storing the image

  // Ensure the 'temp' directory exists, if not create it
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    const response = await axios.get(url, { responseType: 'stream' });
    const fileStream = fs.createWriteStream(tempFilePath);

    // Pipe the image data from the API response to the file stream
    response.data.pipe(fileStream);

    fileStream.on('finish', () => {
      console.log(`Image saved: ${fileName}`);
    });

    fileStream.on('error', (err) => {
      console.log("Error writing file:", err);
    });
  } catch (error) {
    console.log("Error fetching or saving cover image: ", error);
  }
}
// Function to fetch notes
async function fetchNotes(bookId) {
  try {
    // Query the books table and join notes
    const result = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        image_path,
        date_read,
        description,
        review,
        notes (
          id,
          book_id,
          note
        )
      `)
      .eq('id', bookId) // Filter by the book's ID
      .order('id', { ascending: false });

    if (result.error) throw result.error;

    console.log(result.notes);
    return result.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
  }
}


// Function to format data (no changes needed here)
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

// Fetch and display books on the homepage
app.get('/', async (req, res) => {
  const currentSortOption = req.query.sort;
  let result = null;

  try {
    if (currentSortOption === undefined || currentSortOption === 'title') {
      result = await supabase.from('books').select('*').order('title', { ascending: true });
    } else if (currentSortOption === 'date') {
      result = await supabase.from('books').select('*').order('date_read', { ascending: false });
    } else if (currentSortOption === 'rating') {
      result = await supabase.from('books').select('*').order('rating', { ascending: false });
    }

    const formattedDetails = result.data || [];
    res.render('index.ejs', { data: formattedDetails, sortOption: currentSortOption });
  } catch (error) {
    console.log(error);
  }
});

// Render the new entry page
app.get('/new-entry', (req, res) => {
  res.render('new.ejs');
});

// Add a new book entry
app.post('/new-entry/add', async (req, res) => {
  const newEntry = req.body;
  fetchAndSaveCover(newEntry.isbn); // Assuming this is a function to download book cover
  const imagePath = `assets/images/covers/${newEntry.isbn}.jpg`;
  const timeStamp = new Date();

  try {
    const { error } = await supabase.from('books').insert([
      {
        isbn: newEntry.isbn,
        title: newEntry.title,
        author: newEntry.author,
        description: newEntry.description,
        review: newEntry.review,
        rating: newEntry.rating,
        image_path: imagePath,
        date_read: timeStamp,
      }
    ]);

    if (error) throw error;
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
});

// Fetch and display notes for a book
app.get('/notes/:bookId', async (req, res) => {
  const bookId = req.params.bookId;

  try {
    const notes = await fetchNotes(bookId);
    const formattedNotes = await formatData(notes);
    res.render('notes.ejs', { data: formattedNotes});
  } catch (error) {
    console.log(error);
  }
});

// Add a new note for a book
app.post('/notes/:bookId/add', async (req, res) => {
  const bookId = req.params.bookId; // Get the bookId from URL parameter.
  const note = req.body.newNote;
  // Pass the note string from HTML input to server and save to database using the bookId.

  try {
    await supabase
    .from('notes')  
    .insert([
      { note: note, book_id: bookId }  
    ]);

      res.redirect(`/notes/${bookId}`); // res.redirect reloads the page by hitting the GET route /notes/:bookId.
  } catch (error) {
      console.log(error);
  }
});

// Update an existing note
app.post('/notes/:noteId/update', async (req, res) => {
  const updatedNote = req.body.noteToUpdate;
  const updateNoteId = req.params.noteId;
  const bookId = req.body.bookId;

  try {
    const { error } = await supabase.from('notes').update({ note: updatedNote }).eq('id', updateNoteId);
    if (error) throw error;

    res.redirect(`/notes/${bookId}`);
  } catch (error) {
    console.log(error);
  }
});

// Delete a note
app.post('/notes/:noteId/delete', async (req, res) => {
  const deleteNoteId = req.params.noteId;
  const bookId = req.body.bookId;

  try {
    const { error } = await supabase.from('notes').delete().eq('id', deleteNoteId);
    if (error) throw error;

    res.redirect(`/notes/${bookId}`);
  } catch (error) {
    console.log(error);
  }
});

// Update a book review
app.post('/reviews/:bookId/update', async (req, res) => {
  const updatedReview = req.body.reviewToUpdate;
  const bookId = req.params.bookId;

  try {
    const { error } = await supabase.from('books').update({ review: updatedReview }).eq('id', bookId);
    if (error) throw error;

    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
});

// Delete a book and its associated notes
app.post('/books/:bookId/delete', async (req, res) => {
  const deleteBookId = req.params.bookId;

  try {
    await supabase.from('notes').delete().eq('book_id', deleteBookId); // Delete associated notes
    const { error } = await supabase.from('books').delete().eq('id', deleteBookId); // Delete the book

    if (error) throw error;
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
});


app.listen(port, () => {
    console.log('Server running on port 3000');
});
  