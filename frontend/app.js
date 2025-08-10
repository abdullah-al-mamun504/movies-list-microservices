const apiBase = '/api';

const showMessage = (msg, isError = true) => {
  const el = document.getElementById('messages');
  el.style.color = isError ? 'red' : 'green';
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 5000);
};

const token = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);
const clearToken = () => localStorage.removeItem('token');
const setUsername = (username) => localStorage.setItem('username', username);
const getUsername = () => localStorage.getItem('username');
const clearUsername = () => localStorage.removeItem('username');

const showApp = (show) => {
  document.getElementById('auth-section').style.display = show ? 'none' : 'block';
  document.getElementById('app-section').style.display = show ? 'block' : 'none';
  
  if (show && getUsername()) {
    document.getElementById('current-username').textContent = getUsername();
  }
};

const switchTab = (evt, tabName) => {
  const tabContents = document.querySelectorAll('#auth-section .tab-content');
  const tabs = document.querySelectorAll('#auth-section .tab');
  
  tabContents.forEach(content => content.classList.remove('active'));
  tabs.forEach(tab => tab.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  evt.currentTarget.classList.add('active');
};

const switchAppTab = (evt, tabName) => {
  const tabContents = document.querySelectorAll('#app-section .tab-content');
  const tabs = document.querySelectorAll('#app-section .tab');
  
  tabContents.forEach(content => content.classList.remove('active'));
  tabs.forEach(tab => tab.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  evt.currentTarget.classList.add('active');
};

const fetchMovies = async () => {
  try {
    const res = await fetch(`${apiBase}/movies`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const movies = await res.json();

    const list = document.getElementById('movies-list');
    list.innerHTML = '';

    movies.forEach(movie => {
      const li = document.createElement('li');
      li.className = 'movie-item';
      
      const movieInfo = document.createElement('div');
      movieInfo.className = 'movie-info';
      movieInfo.innerHTML = `
        <div class="movie-title">${movie.name}</div>
        <div class="movie-details">Actor: ${movie.actor}, Genre: ${movie.genre}</div>
        <div class="movie-desc">${movie.description}</div>
      `;

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => populateForm(movie);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = () => deleteMovie(movie.id);

      li.appendChild(movieInfo);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  } catch (err) {
    showMessage('Failed to load movies: ' + err.message);
  }
};

const deleteMovie = async (movieId) => {
  if (!confirm('Are you sure you want to delete this movie?')) return;
  
  try {
    const res = await fetch(`${apiBase}/movies/${movieId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    
    if (!res.ok) throw new Error('Failed to delete movie');
    
    showMessage('Movie deleted successfully!', false);
    fetchMovies();
  } catch (err) {
    showMessage('Error deleting movie: ' + err.message);
  }
};

const populateForm = (movie) => {
  document.getElementById('movie-id').value = movie.id;
  document.getElementById('movie-name').value = movie.name;
  document.getElementById('movie-actor').value = movie.actor;
  document.getElementById('movie-genre').value = movie.genre;
  document.getElementById('movie-description').value = movie.description;
  document.getElementById('form-title').textContent = 'Update Movie';
  
  // Switch to add movie tab
  const addMovieTab = document.querySelectorAll('#app-section .tab')[1];
  switchAppTab({ currentTarget: addMovieTab }, 'add-movie-content');
};

const clearForm = () => {
  document.getElementById('movie-id').value = '';
  document.getElementById('movie-name').value = '';
  document.getElementById('movie-actor').value = '';
  document.getElementById('movie-genre').value = '';
  document.getElementById('movie-description').value = '';
  document.getElementById('form-title').textContent = 'Add / Update Movie';
};

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = e.target['reg-username'].value.trim();
  const password = e.target['reg-password'].value.trim();

  try {
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Register failed');
    }

    showMessage('Registration successful! Please login.', false);
    e.target.reset();
    
    // Switch to login tab
    const loginTab = document.querySelector('#auth-section .tab');
    switchTab({ currentTarget: loginTab }, 'login-content');
  } catch (err) {
    showMessage(err.message);
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = e.target['login-username'].value.trim();
  const password = e.target['login-password'].value.trim();

  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUsername(username);
    showApp(true);
    fetchMovies();
  } catch (err) {
    showMessage(err.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    const res = await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error('Logout failed');
  } catch {}

  clearToken();
  clearUsername();
  showApp(false);
  clearForm();
});

document.getElementById('movie-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('movie-id').value;
  const movie = {
    name: document.getElementById('movie-name').value.trim(),
    actor: document.getElementById('movie-actor').value.trim(),
    genre: document.getElementById('movie-genre').value.trim(),
    description: document.getElementById('movie-description').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${apiBase}/movies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`
        },
        body: JSON.stringify(movie)
      });
    } else {
      res = await fetch(`${apiBase}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`
        },
        body: JSON.stringify(movie)
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save movie failed');
    }

    showMessage('Movie saved successfully!', false);
    clearForm();
    fetchMovies();
    
    // Switch back to movies tab
    const moviesTab = document.querySelector('#app-section .tab');
    switchAppTab({ currentTarget: moviesTab }, 'movies-content');
  } catch (err) {
    showMessage(err.message);
  }
});

document.getElementById('clear-form-btn').addEventListener('click', (e) => {
  e.preventDefault();
  clearForm();
});

// On load: if token exists, show app, else show auth
window.onload = () => {
  if (token()) {
    showApp(true);
    fetchMovies();
  }
};
